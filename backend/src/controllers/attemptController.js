import sql from '../config/db.js'

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function normalizeAnswer(value) {
  if (value === null || value === undefined) {
    return null
  }

  const answer = String(value).trim().toUpperCase()

  return answer || null
}

function calculateResult(
  answers,
  totalMarks,
  totalQuestions,
) {
  const correct = answers.filter(
    (answer) => answer.is_correct === true,
  ).length

  const wrong = answers.filter(
    (answer) =>
      answer.selected_answer &&
      answer.is_correct === false,
  ).length

  const answered = answers.filter(
    (answer) => answer.selected_answer,
  ).length

  const unattempted = Math.max(
    Number(totalQuestions || 0) - answered,
    0,
  )

  const score = answers.reduce(
    (sum, answer) =>
      sum +
      (answer.is_correct
        ? Number(answer.marks || 0)
        : 0),
    0,
  )

  const percentage =
    Number(totalMarks) > 0
      ? Number(
          (
            (score / Number(totalMarks)) *
            100
          ).toFixed(2),
        )
      : 0

  return {
    correct,
    wrong,
    unattempted,
    score,
    percentage,
  }
}

/* =========================================================
   START ATTEMPT
========================================================= */

export async function startAttempt(req, res) {
  try {
    const {
      studentId,
      studentName,
      instituteCode,
      instituteName,
      quizId,
    } = req.body

    if (!studentId || !quizId) {
      return res.status(400).json({
        success: false,
        message:
          'studentId and quizId are required',
      })
    }

    const quizRows = await sql`
      SELECT
        id,
        title,
        subject,
        teacher_id,
        teacher_name,
        institute_code,
        institute_name,
        question_count,
        duration_minutes,
        randomize,
        active_question_ids,
        status
      FROM quizzes
      WHERE id = ${quizId}
      LIMIT 1
    `

    if (!quizRows.length) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      })
    }

    const quiz = quizRows[0]

    const quizStatus = String(
      quiz.status || '',
    ).toLowerCase()

    if (
      quizStatus !== 'live' &&
      quizStatus !== 'running' &&
      quizStatus !== 'scheduled'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This quiz is not available right now',
      })
    }

    /*
     * The active question list was generated and saved
     * when the teacher started the quiz.
     *
     * This list is now the authoritative question set
     * for this quiz attempt.
     */
    const activeQuestionIds =
      Array.isArray(
        quiz.active_question_ids,
      )
        ? quiz.active_question_ids
        : []

    const previousAttempts = await sql`
      SELECT
        id,
        status,
        started_at,
        submitted_at,
        completed_at
      FROM attempts
      WHERE student_id = ${studentId}
        AND quiz_id = ${quizId}
      ORDER BY started_at DESC
      LIMIT 1
    `

    if (previousAttempts.length) {
      const previousAttempt =
        previousAttempts[0]

      const previousStatus =
        String(
          previousAttempt.status || '',
        ).toLowerCase()

      if (
        previousStatus === 'submitted' ||
        previousStatus === 'completed'
      ) {
        return res.status(409).json({
          success: false,
          message:
            'You have already attempted this quiz. Retake is not allowed.',
          alreadyAttempted: true,
          attemptId:
            previousAttempt.id,
          status:
            previousAttempt.status,
          submittedAt:
            previousAttempt.submitted_at ||
            previousAttempt.completed_at ||
            null,
        })
      }

      /* -----------------------------------------------------
         Resume existing attempt
      ----------------------------------------------------- */

      if (
        previousStatus === 'in_progress'
      ) {
        let existingQuestions

        if (activeQuestionIds.length > 0) {
          existingQuestions = await sql`
            SELECT
              qq.quiz_id,
              qq.question_id,
              qq.question_order,
              q.question,
              q.option_a,
              q.option_b,
              q.option_c,
              q.option_d,
              q.subject,
              q.difficulty,
              q.marks
            FROM quiz_questions qq
            INNER JOIN questions q
              ON q.id = qq.question_id
            WHERE qq.quiz_id = ${quizId}
              AND q.id = ANY(
                ${activeQuestionIds}::text[]
              )
            ORDER BY array_position(
              ${activeQuestionIds}::text[],
              q.id
            ) ASC
          `
        } else {
          existingQuestions = await sql`
            SELECT
              qq.quiz_id,
              qq.question_id,
              qq.question_order,
              q.question,
              q.option_a,
              q.option_b,
              q.option_c,
              q.option_d,
              q.subject,
              q.difficulty,
              q.marks
            FROM quiz_questions qq
            INNER JOIN questions q
              ON q.id = qq.question_id
            WHERE qq.quiz_id = ${quizId}
            ORDER BY qq.question_order ASC
          `
        }

        if (!existingQuestions.length) {
          return res.status(400).json({
            success: false,
            message:
              'No questions found for this quiz',
          })
        }

        const publicQuestions =
          existingQuestions.map(
            (question, index) => ({
              questionId:
                question.question_id,

              order:
                index + 1,

              question:
                question.question,

              optionA:
                question.option_a,

              optionB:
                question.option_b,

              optionC:
                question.option_c,

              optionD:
                question.option_d,

              subject:
                question.subject,

              difficulty:
                question.difficulty,

              marks: Number(
                question.marks || 1,
              ),
            }),
          )

        const totalMarks =
          existingQuestions.reduce(
            (sum, question) =>
              sum +
              Number(
                question.marks || 1,
              ),
            0,
          )

        return res.status(200).json({
          success: true,
          message:
            'Existing attempt found',
          attemptId:
            previousAttempt.id,
          resumed: true,
          startedAt:
            previousAttempt.started_at,
          quiz: {
            id: quiz.id,
            title: quiz.title,
            subject: quiz.subject,
            durationMinutes:
              Number(
                quiz.duration_minutes || 0,
              ),
            questionCount:
              publicQuestions.length,
            totalMarks,
          },
          questions:
            publicQuestions,
        })
      }
    }

    /* -------------------------------------------------------
       Get active quiz questions
    ------------------------------------------------------- */

    let questionRows

    if (activeQuestionIds.length > 0) {
      questionRows = await sql`
        SELECT
          qq.quiz_id,
          qq.question_id,
          qq.question_order,
          q.question,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.subject,
          q.difficulty,
          q.marks
        FROM quiz_questions qq
        INNER JOIN questions q
          ON q.id = qq.question_id
        WHERE qq.quiz_id = ${quizId}
          AND q.id = ANY(
            ${activeQuestionIds}::text[]
          )
        ORDER BY array_position(
          ${activeQuestionIds}::text[],
          q.id
        ) ASC
      `
    } else {
      questionRows = await sql`
        SELECT
          qq.quiz_id,
          qq.question_id,
          qq.question_order,
          q.question,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.subject,
          q.difficulty,
          q.marks
        FROM quiz_questions qq
        INNER JOIN questions q
          ON q.id = qq.question_id
        WHERE qq.quiz_id = ${quizId}
        ORDER BY qq.question_order ASC
      `
    }

    if (!questionRows.length) {
      return res.status(400).json({
        success: false,
        message:
          'No questions found for this quiz',
      })
    }

    const totalMarks =
      questionRows.reduce(
        (sum, question) =>
          sum +
          Number(
            question.marks || 1,
          ),
        0,
      )

    /* -------------------------------------------------------
       Create new attempt
    ------------------------------------------------------- */

    const attemptId =
      generateId('ATTEMPT')

    const startedAt =
      new Date()

    await sql`
      INSERT INTO attempts (
        id,
        student_id,
        student_name,
        institute_code,
        institute_name,
        quiz_id,
        quiz_title,
        teacher_id,
        teacher_name,
        status,
        started_at,
        completed_at,
        submitted_at,
        auto_submitted
      )
      VALUES (
        ${attemptId},
        ${studentId},
        ${studentName || 'Student'},
        ${
          instituteCode ||
          quiz.institute_code ||
          null
        },
        ${
          instituteName ||
          quiz.institute_name ||
          null
        },
        ${quizId},
        ${quiz.title},
        ${quiz.teacher_id || null},
        ${quiz.teacher_name || null},
        'in_progress',
        ${startedAt},
        NULL,
        NULL,
        false
      )
    `

    /* -------------------------------------------------------
       Hide correct answers
    ------------------------------------------------------- */

    const publicQuestions =
      questionRows.map(
        (question, index) => ({
          questionId:
            question.question_id,

          order:
            index + 1,

          question:
            question.question,

          optionA:
            question.option_a,

          optionB:
            question.option_b,

          optionC:
            question.option_c,

          optionD:
            question.option_d,

          subject:
            question.subject,

          difficulty:
            question.difficulty,

          marks: Number(
            question.marks || 1,
          ),
        }),
      )

    return res.status(201).json({
      success: true,
      message:
        'Quiz attempt started',
      attemptId,
      resumed: false,
      startedAt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject,
        durationMinutes:
          Number(
            quiz.duration_minutes || 0,
          ),
        questionCount:
          publicQuestions.length,
        totalMarks,
      },
      questions:
        publicQuestions,
    })
  } catch (error) {
    console.error(
      'Start attempt error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Failed to start quiz attempt',
    })
  }
}

/* =========================================================
   SAVE ANSWER
========================================================= */

export async function saveAnswer(req, res) {
  try {
    const { id: attemptId } =
      req.params

    const {
      questionId,
      selectedAnswer,
    } = req.body

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message:
          'questionId is required',
      })
    }

    const attemptRows = await sql`
      SELECT
        id,
        quiz_id,
        student_id,
        status,
        started_at
      FROM attempts
      WHERE id = ${attemptId}
      LIMIT 1
    `

    if (!attemptRows.length) {
      return res.status(404).json({
        success: false,
        message:
          'Attempt not found',
      })
    }

    const attempt =
      attemptRows[0]

    if (
      attempt.status !==
      'in_progress'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This attempt is already submitted',
      })
    }

    /* -------------------------------------------------------
       SERVER-SIDE TIMER CHECK
    ------------------------------------------------------- */

    const timerRows = await sql`
      SELECT duration_minutes
      FROM quizzes
      WHERE id = ${attempt.quiz_id}
      LIMIT 1
    `

    if (timerRows.length) {
      const durationMinutes =
        Number(
          timerRows[0].duration_minutes || 0,
        )

      const startedAt =
        new Date(
          attempt.started_at,
        )

      const expiresAt =
        startedAt.getTime() +
        durationMinutes * 60 * 1000

      if (
        durationMinutes > 0 &&
        Date.now() >= expiresAt
      ) {
        return res.status(409).json({
          success: false,
          message:
            'Quiz time has expired. Please submit your attempt.',
          timeExpired: true,
        })
      }
    }

    const questionRows = await sql`
      SELECT
        q.id,
        q.correct_answer,
        q.marks
      FROM questions q
      INNER JOIN quiz_questions qq
        ON qq.question_id = q.id
      WHERE q.id = ${questionId}
        AND qq.quiz_id =
            ${attempt.quiz_id}
      LIMIT 1
    `

    if (!questionRows.length) {
      return res.status(404).json({
        success: false,
        message:
          'Question does not belong to this quiz',
      })
    }

    const question =
      questionRows[0]

    const normalizedAnswer =
      normalizeAnswer(
        selectedAnswer,
      )

    const correctAnswer =
      normalizeAnswer(
        question.correct_answer,
      )

    const isCorrect =
      Boolean(
        normalizedAnswer,
      ) &&
      normalizedAnswer ===
        correctAnswer

    const marks = isCorrect
      ? Number(
          question.marks || 1,
        )
      : 0

    const existingAnswer =
      await sql`
        SELECT id
        FROM answers
        WHERE attempt_id =
              ${attemptId}
          AND question_id =
              ${questionId}
        LIMIT 1
      `

    if (existingAnswer.length) {
      await sql`
        UPDATE answers
        SET
          selected_answer =
            ${normalizedAnswer},
          correct_answer =
            ${correctAnswer},
          is_correct =
            ${isCorrect},
          marks =
            ${marks},
          answered_at =
            CURRENT_TIMESTAMP
        WHERE attempt_id =
              ${attemptId}
          AND question_id =
              ${questionId}
      `
    } else {
      const answerId =
        generateId('ANSWER')

      await sql`
        INSERT INTO answers (
          id,
          attempt_id,
          question_id,
          selected_answer,
          correct_answer,
          is_correct,
          marks,
          answered_at
        )
        VALUES (
          ${answerId},
          ${attemptId},
          ${questionId},
          ${normalizedAnswer},
          ${correctAnswer},
          ${isCorrect},
          ${marks},
          CURRENT_TIMESTAMP
        )
      `
    }

    return res.status(200).json({
      success: true,
      message:
        'Answer saved',
      questionId,
      selectedAnswer:
        normalizedAnswer,
      isCorrect,
      marks,
    })
  } catch (error) {
    console.error(
      'Save answer error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Failed to save answer',
    })
  }
}

/* =========================================================
   SUBMIT ATTEMPT
========================================================= */

export async function submitAttempt(req, res) {
  try {
    const { id: attemptId } =
      req.params

    const attemptRows = await sql`
      SELECT
        id,
        quiz_id,
        status,
        started_at
      FROM attempts
      WHERE id = ${attemptId}
      LIMIT 1
    `

    if (!attemptRows.length) {
      return res.status(404).json({
        success: false,
        message:
          'Attempt not found',
      })
    }

    const attempt =
      attemptRows[0]

    const quizRows = await sql`
      SELECT
        duration_minutes,
        active_question_ids
      FROM quizzes
      WHERE id = ${attempt.quiz_id}
      LIMIT 1
    `

    const durationMinutes =
      Number(
        quizRows[0]?.duration_minutes || 0,
      )

    const activeQuestionIds =
      Array.isArray(
        quizRows[0]?.active_question_ids,
      )
        ? quizRows[0].active_question_ids
        : []

    const startedAt =
      new Date(
        attempt.started_at,
      )

    const expiresAt =
      startedAt.getTime() +
      durationMinutes * 60 * 1000

    const timeExpired =
      durationMinutes > 0 &&
      Date.now() >= expiresAt

    if (
      attempt.status !==
      'in_progress'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Attempt already submitted',
      })
    }

    let questionRows

    if (activeQuestionIds.length > 0) {
      questionRows = await sql`
        SELECT
          q.id,
          q.marks
        FROM quiz_questions qq
        INNER JOIN questions q
          ON q.id = qq.question_id
        WHERE qq.quiz_id =
              ${attempt.quiz_id}
          AND q.id = ANY(
            ${activeQuestionIds}::text[]
          )
      `
    } else {
      questionRows = await sql`
        SELECT
          q.id,
          q.marks
        FROM quiz_questions qq
        INNER JOIN questions q
          ON q.id = qq.question_id
        WHERE qq.quiz_id =
              ${attempt.quiz_id}
      `
    }

    const totalQuestions =
      questionRows.length

    const totalMarks =
      questionRows.reduce(
        (sum, question) =>
          sum +
          Number(
            question.marks || 1,
          ),
        0,
      )

    const answerRows =
      await sql`
        SELECT
          id,
          question_id,
          selected_answer,
          correct_answer,
          is_correct,
          marks,
          answered_at
        FROM answers
        WHERE attempt_id =
              ${attemptId}
        ORDER BY answered_at ASC
      `

    const validQuestionIds =
      new Set(
        questionRows.map(
          (question) => question.id,
        ),
      )

    const validAnswerRows =
      answerRows.filter(
        (answer) =>
          validQuestionIds.has(
            answer.question_id,
          ),
      )

    const result =
      calculateResult(
        validAnswerRows,
        totalMarks,
        totalQuestions,
      )

    const submittedAt =
      new Date()

    await sql`
      UPDATE attempts
      SET
        completed_at =
          ${submittedAt},
        submitted_at =
          ${submittedAt},
        status =
          'submitted',
        auto_submitted =
          ${timeExpired}
      WHERE id =
            ${attemptId}
    `

    const antiCheatRows =
      await sql`
        SELECT
          id,
          attempt_id,
          student_id,
          quiz_id,
          event_type,
          event_details,
          created_at
        FROM anti_cheat_logs
        WHERE attempt_id =
              ${attemptId}
        ORDER BY created_at DESC
      `

    return res.status(200).json({
      success: true,
      message:
        'Quiz submitted successfully',
      result: {
        attemptId,
        totalQuestions,
        totalMarks,
        score:
          result.score,
        correct:
          result.correct,
        wrong:
          result.wrong,
        unattempted:
          result.unattempted,
        percentage:
          result.percentage,
        antiCheatWarnings:
          antiCheatRows.length,
        warnings:
          antiCheatRows.length,
        antiCheatLogs:
          antiCheatRows,
        submittedAt,
        autoSubmitted:
          timeExpired,
      },
    })
  } catch (error) {
    console.error(
      'Submit attempt error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Failed to submit quiz',
    })
  }
}

/* =========================================================
   GET SINGLE ATTEMPT
========================================================= */

export async function getAttempt(req, res) {
  try {
    const { id: attemptId } =
      req.params

    const attemptRows =
      await sql`
        SELECT *
        FROM attempts
        WHERE id =
              ${attemptId}
        LIMIT 1
      `

    if (!attemptRows.length) {
      return res.status(404).json({
        success: false,
        message:
          'Attempt not found',
      })
    }

    const answerRows =
      await sql`
        SELECT
          id,
          attempt_id,
          question_id,
          selected_answer,
          correct_answer,
          is_correct,
          marks,
          answered_at
        FROM answers
        WHERE attempt_id =
              ${attemptId}
        ORDER BY answered_at ASC
      `

    const quizId =
      attemptRows[0].quiz_id

    const quizRows =
      await sql`
        SELECT
          active_question_ids
        FROM quizzes
        WHERE id =
              ${quizId}
        LIMIT 1
      `

    const activeQuestionIds =
      Array.isArray(
        quizRows[0]?.active_question_ids,
      )
        ? quizRows[0].active_question_ids
        : []

    let quizTotals

    if (activeQuestionIds.length > 0) {
      quizTotals =
        await sql`
          SELECT
            COUNT(*)::int AS total_questions,
            COALESCE(
              SUM(q.marks),
              0
            ) AS total_marks
          FROM quiz_questions qq
          INNER JOIN questions q
            ON q.id =
               qq.question_id
          WHERE qq.quiz_id =
                ${quizId}
            AND q.id = ANY(
              ${activeQuestionIds}::text[]
            )
        `
    } else {
      quizTotals =
        await sql`
          SELECT
            COUNT(*)::int AS total_questions,
            COALESCE(
              SUM(q.marks),
              0
            ) AS total_marks
          FROM quiz_questions qq
          INNER JOIN questions q
            ON q.id =
               qq.question_id
          WHERE qq.quiz_id =
                ${quizId}
        `
    }

    const totalQuestions =
      Number(
        quizTotals?.[0]
          ?.total_questions || 0,
      )

    const totalMarks =
      Number(
        quizTotals?.[0]
          ?.total_marks || 0,
      )

    const validQuestionIds =
      new Set()

    if (activeQuestionIds.length > 0) {
      activeQuestionIds.forEach(
        (id) =>
          validQuestionIds.add(id),
      )
    } else {
      quizTotals
    }

    const filteredAnswers =
      activeQuestionIds.length > 0
        ? answerRows.filter(
            (answer) =>
              validQuestionIds.has(
                answer.question_id,
              ),
          )
        : answerRows

    const result =
      calculateResult(
        filteredAnswers,
        totalMarks,
        totalQuestions,
      )

    const antiCheatRows =
      await sql`
        SELECT
          id,
          attempt_id,
          student_id,
          quiz_id,
          event_type,
          event_details,
          created_at
        FROM anti_cheat_logs
        WHERE attempt_id =
              ${attemptId}
        ORDER BY created_at DESC
      `

    return res.status(200).json({
      success: true,
      attempt: {
        ...attemptRows[0],
        total_questions:
          totalQuestions,
        total_marks:
          totalMarks,
        score:
          result.score,
        correct:
          result.correct,
        wrong:
          result.wrong,
        unattempted:
          result.unattempted,
        percentage:
          result.percentage,
        antiCheatWarnings:
          antiCheatRows.length,
        warnings:
          antiCheatRows.length,
      },
      answers:
        answerRows,
      antiCheatLogs:
        antiCheatRows,
    })
  } catch (error) {
    console.error(
      'Get attempt error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch attempt',
    })
  }
}

/* =========================================================
   GET STUDENT ATTEMPTS
========================================================= */

export async function getStudentAttempts(
  req,
  res,
) {
  try {
    const { studentId } =
      req.params

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message:
          'studentId is required',
      })
    }

    const rows =
      await sql`
        SELECT
          a.*
        FROM attempts a
        WHERE a.student_id =
              ${studentId}
        ORDER BY
          a.started_at DESC
      `

    const attempts = []

    for (const attempt of rows) {
      const answers =
        await sql`
          SELECT
            question_id,
            selected_answer,
            correct_answer,
            is_correct,
            marks,
            answered_at
          FROM answers
          WHERE attempt_id =
                ${attempt.id}
          ORDER BY answered_at ASC
        `

      const quizRows =
        await sql`
          SELECT
            active_question_ids
          FROM quizzes
          WHERE id =
                ${attempt.quiz_id}
          LIMIT 1
        `

      const activeQuestionIds =
        Array.isArray(
          quizRows[0]?.active_question_ids,
        )
          ? quizRows[0].active_question_ids
          : []

      let quizTotals

      if (activeQuestionIds.length > 0) {
        quizTotals =
          await sql`
            SELECT
              COUNT(*)::int AS total_questions,
              COALESCE(
                SUM(q.marks),
                0
              ) AS total_marks
            FROM quiz_questions qq
            INNER JOIN questions q
              ON q.id =
                 qq.question_id
            WHERE qq.quiz_id =
                  ${attempt.quiz_id}
              AND q.id = ANY(
                ${activeQuestionIds}::text[]
              )
          `
      } else {
        quizTotals =
          await sql`
            SELECT
              COUNT(*)::int AS total_questions,
              COALESCE(
                SUM(q.marks),
                0
              ) AS total_marks
            FROM quiz_questions qq
            INNER JOIN questions q
              ON q.id =
                 qq.question_id
            WHERE qq.quiz_id =
                  ${attempt.quiz_id}
          `
      }

      const totalQuestions =
        Number(
          quizTotals?.[0]
            ?.total_questions || 0,
        )

      const totalMarks =
        Number(
          quizTotals?.[0]
            ?.total_marks || 0,
        )

      const validQuestionIds =
        new Set(
          activeQuestionIds,
        )

      const filteredAnswers =
        activeQuestionIds.length > 0
          ? answers.filter(
              (answer) =>
                validQuestionIds.has(
                  answer.question_id,
                ),
            )
          : answers

      const result =
        calculateResult(
          filteredAnswers,
          totalMarks,
          totalQuestions,
        )

      const antiCheatRows =
        await sql`
          SELECT
            id,
            attempt_id,
            student_id,
            quiz_id,
            event_type,
            event_details,
            created_at
          FROM anti_cheat_logs
          WHERE attempt_id =
                ${attempt.id}
          ORDER BY
            created_at DESC
        `

      attempts.push({
        ...attempt,

        totalQuestions,
        totalMarks,

        score:
          result.score,
        correct:
          result.correct,
        wrong:
          result.wrong,
        unattempted:
          result.unattempted,
        percentage:
          result.percentage,

        warnings:
          antiCheatRows.length,

        antiCheatWarnings:
          antiCheatRows.length,

        antiCheatLogs:
          antiCheatRows,

        answers,
      })
    }

    return res.status(200).json({
      success: true,
      attempts,
    })
  } catch (error) {
    console.error(
      'Get student attempts error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch student attempts',
    })
  }
}

/* =========================================================
   LOG ANTI-CHEAT EVENT
========================================================= */

export const logAntiCheatEvent =
  async (req, res) => {
    try {
      const {
        id: attemptId,
      } = req.params

      const {
        studentId,
        quizId,
        eventType,
        eventDetails,
      } = req.body

      if (
        !attemptId ||
        !studentId ||
        !quizId ||
        !eventType
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Required anti-cheat fields are missing',
        })
      }

      const attemptRows =
        await sql`
          SELECT
            id,
            student_id,
            quiz_id,
            status
          FROM attempts
          WHERE id =
                ${attemptId}
          LIMIT 1
        `

      if (!attemptRows.length) {
        return res.status(404).json({
          success: false,
          message:
            'Attempt not found',
        })
      }

      const attempt =
        attemptRows[0]

      if (
        String(
          attempt.student_id,
        ) !== String(studentId) ||
        String(
          attempt.quiz_id,
        ) !== String(quizId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Student or quiz does not match this attempt',
        })
      }

      if (
        attempt.status !==
        'in_progress'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Cannot add anti-cheat events to a submitted attempt',
        })
      }

      const logId =
        generateId('AC')

      const result =
        await sql`
          INSERT INTO anti_cheat_logs (
            id,
            attempt_id,
            student_id,
            quiz_id,
            event_type,
            event_details
          )
          VALUES (
            ${logId},
            ${attemptId},
            ${studentId},
            ${quizId},
            ${eventType},
            ${eventDetails || ''}
          )
          RETURNING *
        `

      return res.status(201).json({
        success: true,
        message:
          'Anti-cheat event recorded',
        log:
          result[0],
      })
    } catch (error) {
      console.error(
        'Anti-cheat logging failed:',
        error,
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to record anti-cheat event',
      })
    }
  }

/* =========================================================
   GET ANTI-CHEAT LOGS
========================================================= */

export const getAntiCheatLogs =
  async (req, res) => {
    try {
      const {
        instituteCode,
        quizId,
        attemptId,
      } = req.query

      let logs

      if (attemptId) {
        logs = await sql`
          SELECT
            acl.id,
            acl.attempt_id,
            acl.student_id,
            acl.quiz_id,
            acl.event_type,
            acl.event_details,
            acl.created_at,
            a.student_name,
            q.title AS quiz_title
          FROM anti_cheat_logs acl
          LEFT JOIN attempts a
            ON a.id =
               acl.attempt_id
          LEFT JOIN quizzes q
            ON q.id =
               acl.quiz_id
          WHERE acl.attempt_id =
                ${attemptId}
          ORDER BY
            acl.created_at DESC
        `
      } else if (quizId) {
        logs = await sql`
          SELECT
            acl.id,
            acl.attempt_id,
            acl.student_id,
            acl.quiz_id,
            acl.event_type,
            acl.event_details,
            acl.created_at,
            a.student_name,
            q.title AS quiz_title
          FROM anti_cheat_logs acl
          LEFT JOIN attempts a
            ON a.id =
               acl.attempt_id
          LEFT JOIN quizzes q
            ON q.id =
               acl.quiz_id
          WHERE acl.quiz_id =
                ${quizId}
          ORDER BY
            acl.created_at DESC
        `
      } else if (instituteCode) {
        logs = await sql`
          SELECT
            acl.id,
            acl.attempt_id,
            acl.student_id,
            acl.quiz_id,
            acl.event_type,
            acl.event_details,
            acl.created_at,
            a.student_name,
            q.title AS quiz_title
          FROM anti_cheat_logs acl
          INNER JOIN quizzes q
            ON q.id =
               acl.quiz_id
          LEFT JOIN attempts a
            ON a.id =
               acl.attempt_id
          WHERE LOWER(
            q.institute_code
          ) =
            LOWER(${instituteCode})
          ORDER BY
            acl.created_at DESC
        `
      } else {
        logs = await sql`
          SELECT
            acl.id,
            acl.attempt_id,
            acl.student_id,
            acl.quiz_id,
            acl.event_type,
            acl.event_details,
            acl.created_at,
            a.student_name,
            q.title AS quiz_title
          FROM anti_cheat_logs acl
          LEFT JOIN attempts a
            ON a.id =
               acl.attempt_id
          LEFT JOIN quizzes q
            ON q.id =
               acl.quiz_id
          ORDER BY
            acl.created_at DESC
        `
      }

      return res.status(200).json({
        success: true,
        logs,
      })
    } catch (error) {
      console.error(
        'Unable to load anti-cheat logs:',
        error,
      )

      return res.status(500).json({
        success: false,
        message:
          'Unable to load anti-cheat logs',
      })
    }
  }

/* =========================================================
   GET TEACHER RESULTS
========================================================= */

export const getResults =
  async (req, res) => {
    try {
      const {
        teacherId,
        instituteCode,
        quizId,
      } = req.query

      const attempts =
        await sql`
          SELECT
            a.id AS attempt_id,
            a.student_id,
            a.student_name,
            a.institute_code,
            a.institute_name,
            a.quiz_id,
            a.quiz_title,
            a.teacher_id,
            a.teacher_name,
            a.status,
            a.started_at,
            a.completed_at,
            a.submitted_at,
            a.auto_submitted,
            q.subject,
            q.question_count,
            q.duration_minutes
          FROM attempts a
          INNER JOIN quizzes q
            ON q.id =
               a.quiz_id
          WHERE
            a.status =
              'submitted'
            AND (
              ${teacherId || null}::text
              IS NULL
              OR a.teacher_id =
                 ${teacherId || null}::text
            )
            AND (
              ${instituteCode || null}::text
              IS NULL
              OR LOWER(
                a.institute_code
              ) =
                 LOWER(
                   ${instituteCode || null}::text
                 )
            )
            AND (
              ${quizId || null}::text
              IS NULL
              OR a.quiz_id =
                 ${quizId || null}::text
            )
          ORDER BY
            a.submitted_at DESC
        `

      const results = []

      for (const attempt of attempts) {
        const answers =
          await sql`
            SELECT
              question_id,
              selected_answer,
              correct_answer,
              is_correct,
              marks,
              answered_at
            FROM answers
            WHERE attempt_id =
                  ${attempt.attempt_id}
            ORDER BY
              answered_at ASC
          `

        const quizRows =
          await sql`
            SELECT
              active_question_ids
            FROM quizzes
            WHERE id =
                  ${attempt.quiz_id}
            LIMIT 1
          `

        const activeQuestionIds =
          Array.isArray(
            quizRows[0]?.active_question_ids,
          )
            ? quizRows[0].active_question_ids
            : []

        let quizTotals

        if (activeQuestionIds.length > 0) {
          quizTotals =
            await sql`
              SELECT
                COUNT(*)::int
                  AS total_questions,
                COALESCE(
                  SUM(q.marks),
                  0
                ) AS total_marks
              FROM quiz_questions qq
              INNER JOIN questions q
                ON q.id =
                   qq.question_id
              WHERE qq.quiz_id =
                    ${attempt.quiz_id}
                AND q.id = ANY(
                  ${activeQuestionIds}::text[]
                )
            `
        } else {
          quizTotals =
            await sql`
              SELECT
                COUNT(*)::int
                  AS total_questions,
                COALESCE(
                  SUM(q.marks),
                  0
                ) AS total_marks
              FROM quiz_questions qq
              INNER JOIN questions q
                ON q.id =
                   qq.question_id
            WHERE qq.quiz_id =
                  ${attempt.quiz_id}
          `
        }

        const totalQuestions =
          Number(
            quizTotals?.[0]
              ?.total_questions ||
              attempt.question_count ||
              0,
          )

        const totalMarks =
          Number(
            quizTotals?.[0]
              ?.total_marks ||
              0,
          )

        const validQuestionIds =
          new Set(
            activeQuestionIds,
          )

        const filteredAnswers =
          activeQuestionIds.length > 0
            ? answers.filter(
                (answer) =>
                  validQuestionIds.has(
                    answer.question_id,
                  ),
              )
            : answers

        const result =
          calculateResult(
            filteredAnswers,
            totalMarks,
            totalQuestions,
          )

        const antiCheatRows =
          await sql`
            SELECT
              id,
              attempt_id,
              student_id,
              quiz_id,
              event_type,
              event_details,
              created_at
            FROM anti_cheat_logs
            WHERE attempt_id =
                  ${attempt.attempt_id}
            ORDER BY
              created_at DESC
          `

        results.push({
          attemptId:
            attempt.attempt_id,

          studentId:
            attempt.student_id,

          studentName:
            attempt.student_name,

          instituteCode:
            attempt.institute_code,

          instituteName:
            attempt.institute_name,

          quizId:
            attempt.quiz_id,

          quizTitle:
            attempt.quiz_title,

          subject:
            attempt.subject,

          teacherId:
            attempt.teacher_id,

          teacherName:
            attempt.teacher_name,

          totalQuestions,

          totalMarks,

          correct:
            result.correct,

          wrong:
            result.wrong,

          unattempted:
            result.unattempted,

          score:
            result.score,

          percentage:
            result.percentage,

          warnings:
            antiCheatRows.length,

          antiCheatWarnings:
            antiCheatRows.length,

          antiCheatLogs:
            antiCheatRows,

          autoSubmitted:
            attempt.auto_submitted,

          startedAt:
            attempt.started_at,

          completedAt:
            attempt.completed_at,

          submittedAt:
            attempt.submitted_at,

          answers,
        })
      }

      return res.status(200).json({
        success: true,
        results,
      })
    } catch (error) {
      console.error(
        'Get results error:',
        error,
      )

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch results',
      })
    }
  }