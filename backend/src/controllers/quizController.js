import sql from '../config/db.js'

const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const mapQuestion = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  teacherName: row.teacher_name,
  instituteCode: row.institute_code,
  instituteName: row.institute_name,
  question: row.question,
  optionA: row.option_a,
  optionB: row.option_b,
  optionC: row.option_c,
  optionD: row.option_d,
  correctAnswer: row.correct_answer,
  subject: row.subject,
  difficulty: row.difficulty,
  marks: Number(row.marks ?? 0),
  createdAt: row.created_at,
})

const mapQuiz = (row) => ({
  id: row.id,
  title: row.title,
  subject: row.subject,
  teacherId: row.teacher_id,
  teacherName: row.teacher_name,
  instituteCode: row.institute_code,
  instituteName: row.institute_name,
  questionCount: Number(row.question_count ?? 0),
  durationMinutes: Number(row.duration_minutes ?? 0),
  randomize: Boolean(row.randomize),
  accessMode: row.access_mode,
  status: row.status,
  startedAt: row.started_at,
  stoppedAt: row.stopped_at,
  createdAt: row.created_at,
  questionIds: Array.isArray(row.question_ids)
    ? row.question_ids
    : [],
  activeQuestionIds: Array.isArray(row.active_question_ids)
    ? row.active_question_ids
    : [],
})

const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`

/* =========================================================
   GET QUESTIONS
========================================================= */

export async function getQuestions(req, res) {
  try {
    const teacherId = String(
      req.query.teacherId || ''
    ).trim()

    const instituteCode = String(
      req.query.instituteCode || ''
    )
      .trim()
      .toUpperCase()

    if (!teacherId || !instituteCode) {
      return res.status(400).json({
        success: false,
        message:
          'Teacher ID and institute code are required',
      })
    }

    const questions = await sql`
      SELECT
        id,
        teacher_id,
        teacher_name,
        institute_code,
        institute_name,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        subject,
        difficulty,
        marks,
        created_at
      FROM questions
      WHERE teacher_id = ${teacherId}
        AND institute_code = ${instituteCode}
      ORDER BY created_at DESC
    `

    return res.status(200).json({
      success: true,
      questions: questions.map(mapQuestion),
    })
  } catch (error) {
    console.error('Get questions error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to load questions',
    })
  }
}

/* =========================================================
   CREATE QUESTION
========================================================= */

export const createQuestion = async (req, res) => {
  try {
    const {
      teacherId,
      teacherName,
      instituteCode,
      instituteName,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      subject,
      difficulty,
      marks,
    } = req.body

    if (
      !teacherId ||
      !instituteCode ||
      !question ||
      !optionA ||
      !optionB ||
      !optionC ||
      !optionD ||
      !correctAnswer ||
      !subject
    ) {
      return res.status(400).json({
        success: false,
        message: 'Required question fields are missing',
      })
    }

    const id = makeId('Q')

    const rows = await sql`
      INSERT INTO questions (
        id,
        teacher_id,
        teacher_name,
        institute_code,
        institute_name,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        subject,
        difficulty,
        marks
      )
      VALUES (
        ${id},
        ${teacherId},
        ${teacherName || ''},
        ${instituteCode},
        ${instituteName || ''},
        ${question},
        ${optionA},
        ${optionB},
        ${optionC},
        ${optionD},
        ${correctAnswer},
        ${subject},
        ${difficulty || 'Medium'},
        ${Number(marks) || 1}
      )
      RETURNING *
    `

    res.status(201).json({
      success: true,
      question: mapQuestion(rows[0]),
    })
  } catch (error) {
    console.error('Create question failed:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to create question',
    })
  }
}

/* =========================================================
   DELETE QUESTION
========================================================= */

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params
    const { teacherId, instituteCode } = req.body || {}

    const used = await sql`
      SELECT 1
      FROM quiz_questions
      JOIN quizzes
        ON quizzes.id = quiz_questions.quiz_id
      WHERE quiz_questions.question_id = ${id}
      LIMIT 1
    `

    if (used.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This question is already used in a quiz.',
      })
    }

    const rows = await sql`
      DELETE FROM questions
      WHERE
        id = ${id}
        AND teacher_id = ${teacherId || ''}
        AND institute_code = ${instituteCode || ''}
      RETURNING id
    `

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      })
    }

    res.json({
      success: true,
      message: 'Question deleted successfully',
    })
  } catch (error) {
    console.error('Delete question failed:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to delete question',
    })
  }
}

/* =========================================================
   GET QUIZZES
========================================================= */

export const getQuizzes = async (req, res) => {
  try {
    const { teacherId, instituteCode } = req.query

    let rows

    if (teacherId && instituteCode) {
      rows = await sql`
        SELECT
          q.*,
          COALESCE(
            ARRAY_AGG(
              qq.question_id
              ORDER BY qq.question_order
            )
            FILTER (
              WHERE qq.question_id IS NOT NULL
            ),
            ARRAY[]::text[]
          ) AS question_ids
        FROM quizzes q
        LEFT JOIN quiz_questions qq
          ON qq.quiz_id = q.id
        WHERE
          q.teacher_id = ${teacherId}
          AND q.institute_code = ${instituteCode}
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `
    } else if (teacherId) {
      rows = await sql`
        SELECT
          q.*,
          COALESCE(
            ARRAY_AGG(
              qq.question_id
              ORDER BY qq.question_order
            )
            FILTER (
              WHERE qq.question_id IS NOT NULL
            ),
            ARRAY[]::text[]
          ) AS question_ids
        FROM quizzes q
        LEFT JOIN quiz_questions qq
          ON qq.quiz_id = q.id
        WHERE q.teacher_id = ${teacherId}
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `
    } else if (instituteCode) {
      rows = await sql`
        SELECT
          q.*,
          COALESCE(
            ARRAY_AGG(
              qq.question_id
              ORDER BY qq.question_order
            )
            FILTER (
              WHERE qq.question_id IS NOT NULL
            ),
            ARRAY[]::text[]
          ) AS question_ids
        FROM quizzes q
        LEFT JOIN quiz_questions qq
          ON qq.quiz_id = q.id
        WHERE q.institute_code = ${instituteCode}
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `
    } else {
      rows = await sql`
        SELECT
          q.*,
          COALESCE(
            ARRAY_AGG(
              qq.question_id
              ORDER BY qq.question_order
            )
            FILTER (
              WHERE qq.question_id IS NOT NULL
            ),
            ARRAY[]::text[]
          ) AS question_ids
        FROM quizzes q
        LEFT JOIN quiz_questions qq
          ON qq.quiz_id = q.id
        GROUP BY q.id
        ORDER BY q.created_at DESC
      `
    }

    res.json({
      success: true,
      quizzes: rows.map(mapQuiz),
    })
  } catch (error) {
    console.error('Get quizzes failed:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to load quizzes',
    })
  }
}

/* =========================================================
   CREATE QUIZ
========================================================= */

export const createQuiz = async (req, res) => {
  try {
    const {
      title,
      subject,
      teacherId,
      teacherName,
      instituteCode,
      instituteName,
      questionIds,
      questionCount,
      durationMinutes,
      randomize,
      accessMode,
      status,
    } = req.body

    if (
      !title ||
      !subject ||
      !teacherId ||
      !instituteCode
    ) {
      return res.status(400).json({
        success: false,
        message: 'Required quiz fields are missing',
      })
    }

    if (
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one question',
      })
    }

    const requestedCount = Number(questionCount)
    const duration = Number(durationMinutes)

    if (
      !Number.isInteger(requestedCount) ||
      requestedCount < 1 ||
      requestedCount > questionIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question count',
      })
    }

    if (
      !Number.isFinite(duration) ||
      duration < 1
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz duration',
      })
    }

    /*
     * Check selected questions.
     *
     * Explicit ::text[] cast is important here because
     * PostgreSQL/Neon otherwise cannot always determine
     * the type of the array parameter.
     */
    const validQuestions = await sql`
      SELECT id
      FROM questions
      WHERE
        id = ANY(${questionIds}::text[])
        AND institute_code = ${instituteCode}
    `

    if (
      validQuestions.length !==
      questionIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'One or more selected questions are not available to this teacher.',
      })
    }

    const id = makeId('QUIZ')

    const quizStatus =
      normalize(status) || 'draft'

    const quizRows = await sql`
      INSERT INTO quizzes (
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
        access_mode,
        status
      )
      VALUES (
        ${id},
        ${title},
        ${subject},
        ${teacherId},
        ${teacherName || ''},
        ${instituteCode},
        ${instituteName || ''},
        ${requestedCount},
        ${duration},
        ${Boolean(randomize)},
        ${accessMode || 'institute'},
        ${quizStatus}
      )
      RETURNING *
    `

    for (
      let index = 0;
      index < questionIds.length;
      index += 1
    ) {
      await sql`
        INSERT INTO quiz_questions (
          quiz_id,
          question_id,
          question_order
        )
        VALUES (
          ${id},
          ${questionIds[index]},
          ${index + 1}
        )
      `
    }

    const quiz = mapQuiz({
      ...quizRows[0],
      question_ids: questionIds,
    })

    res.status(201).json({
      success: true,
      quiz,
    })
  } catch (error) {
    console.error('Create quiz failed:', error)

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Unable to create quiz',
    })
  }
}

/* =========================================================
   GET QUIZ BY ID
========================================================= */

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params

    const rows = await sql`
      SELECT
        q.*,
        COALESCE(
          ARRAY_AGG(
            qq.question_id
            ORDER BY qq.question_order
          )
          FILTER (
            WHERE qq.question_id IS NOT NULL
          ),
          ARRAY[]::text[]
        ) AS question_ids
      FROM quizzes q
      LEFT JOIN quiz_questions qq
        ON qq.quiz_id = q.id
      WHERE q.id = ${id}
      GROUP BY q.id
      LIMIT 1
    `

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      })
    }

    res.json({
      success: true,
      quiz: mapQuiz(rows[0]),
    })
  } catch (error) {
    console.error('Get quiz failed:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to load quiz',
    })
  }
}

/* =========================================================
   START QUIZ
========================================================= */

export const startQuiz = async (req, res) => {
  try {
    const { id } = req.params

    const {
      teacherId,
      instituteCode,
    } = req.body || {}

    const existing = await sql`
      SELECT *
      FROM quizzes
      WHERE
        id = ${id}
        AND teacher_id = ${teacherId || ''}
        AND institute_code = ${instituteCode || ''}
      LIMIT 1
    `

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      })
    }

    const currentStatus =
      normalize(existing[0].status)

    if (currentStatus === 'live') {
      return res.status(400).json({
        success: false,
        message: 'This quiz is already live.',
      })
    }

    if (
      currentStatus === 'completed' ||
      currentStatus === 'stopped'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This quiz has already been closed.',
      })
    }

    const mappingRows = await sql`
      SELECT question_id
      FROM quiz_questions
      WHERE quiz_id = ${id}
      ORDER BY question_order
    `

    let activeQuestionIds =
      mappingRows.map(
        (row) => row.question_id
      )

    if (Boolean(existing[0].randomize)) {
      for (
        let i =
          activeQuestionIds.length - 1;
        i > 0;
        i -= 1
      ) {
        const j = Math.floor(
          Math.random() * (i + 1)
        )

        ;[
          activeQuestionIds[i],
          activeQuestionIds[j],
        ] = [
          activeQuestionIds[j],
          activeQuestionIds[i],
        ]
      }
    }

    activeQuestionIds =
      activeQuestionIds.slice(
        0,
        Math.min(
          Number(
            existing[0].question_count ||
              activeQuestionIds.length
          ),
          activeQuestionIds.length
        )
      )

    const now =
      new Date().toISOString()

    const rows = await sql`
      UPDATE quizzes
      SET
        status = 'live',
        started_at = ${now},
        stopped_at = NULL,
        active_question_ids = ${activeQuestionIds}
      WHERE id = ${id}
      RETURNING *
    `

    const quiz = mapQuiz({
      ...rows[0],
      question_ids:
        activeQuestionIds,
      active_question_ids:
        activeQuestionIds,
    })

    res.json({
      success: true,
      quiz,
    })
  } catch (error) {
    console.error(
      'Start quiz failed:',
      error
    )

    res.status(500).json({
      success: false,
      message: 'Unable to start quiz',
    })
  }
}

/* =========================================================
   STOP QUIZ
========================================================= */

export const stopQuiz = async (req, res) => {
  try {
    const { id } = req.params

    const {
      teacherId,
      instituteCode,
    } = req.body || {}

    const rows = await sql`
      UPDATE quizzes
      SET
        status = 'stopped',
        stopped_at = ${new Date().toISOString()}
      WHERE
        id = ${id}
        AND teacher_id = ${teacherId || ''}
        AND institute_code = ${instituteCode || ''}
        AND LOWER(status) = 'live'
      RETURNING *
    `

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Live quiz not found',
      })
    }

    res.json({
      success: true,
      quiz: mapQuiz(rows[0]),
    })
  } catch (error) {
    console.error(
      'Stop quiz failed:',
      error
    )

    res.status(500).json({
      success: false,
      message: 'Unable to stop quiz',
    })
  }
}

/* =========================================================
   DELETE QUIZ
========================================================= */

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params

    const teacherId = String(
      req.query.teacherId || '',
    ).trim()
    
    const instituteCode = String(
      req.query.instituteCode || '',
    )
      .trim()
      .toUpperCase()

    const existing = await sql`
      SELECT status
      FROM quizzes
      WHERE
        id = ${id}
        AND teacher_id = ${teacherId || ''}
        AND institute_code = ${instituteCode || ''}
      LIMIT 1
    `

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      })
    }

    if (
      normalize(existing[0].status) ===
      'live'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Stop the live quiz before deleting it.',
      })
    }

    await sql`
      DELETE FROM quiz_questions
      WHERE quiz_id = ${id}
    `

    await sql`
      DELETE FROM quizzes
      WHERE id = ${id}
    `

    res.json({
      success: true,
      message:
        'Quiz deleted successfully',
    })
  } catch (error) {
    console.error(
      'Delete quiz failed:',
      error
    )

    res.status(500).json({
      success: false,
      message: 'Unable to delete quiz',
    })
  }
}