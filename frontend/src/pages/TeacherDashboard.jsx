import React, { useEffect, useMemo, useState } from 'react'

function TeacherDashboard({
  teacherId = 'KIPM-TCH-001',
  teacherName = 'Demo Teacher',
  instituteCode = 'KIPM',
  instituteName = 'KIPM',
}) {
  const [activeTab, setActiveTab] = useState('overview')

  const [questions, setQuestions] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [students, setStudents] = useState([])
  const [results, setResults] = useState([])
  const [antiCheatLogs, setAntiCheatLogs] = useState([])

  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [showQuizForm, setShowQuizForm] = useState(false)

  const [selectedQuestionIds, setSelectedQuestionIds] = useState([])
  const [selectedResult, setSelectedResult] = useState(null)
  const [resultQuizFilter, setResultQuizFilter] = useState('all')

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [loading, setLoading] = useState(false)

  const readArray = (key) => {
    try {
      const saved = localStorage.getItem(key)

      if (!saved) return []

      const parsed = JSON.parse(saved)

      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()

  const getField = (object, camel, snake, fallback = '') => {
    if (!object) return fallback

    return (
      object[camel] ??
      object[snake] ??
      fallback
    )
  }

  /*
   * ====================================================
   * MESSAGE
   * ====================================================
   */

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)

    setTimeout(() => {
      setMessage('')
    }, 3000)
  }

  /*
   * ====================================================
   * LOAD DATA
   * ====================================================
   */

  const loadData = async ({
    showLoader = false,
    allowFallback = true,
  } = {}) => {
    if (showLoader) {
      setLoading(true)
    }

    try {
      const questionUrl =
        `/api/quizzes/questions?teacherId=${encodeURIComponent(
          teacherId,
        )}&instituteCode=${encodeURIComponent(
          instituteCode,
        )}`

      const quizUrl =
        `/api/quizzes?teacherId=${encodeURIComponent(
          teacherId,
        )}&instituteCode=${encodeURIComponent(
          instituteCode,
        )}`

      const antiCheatUrl =
        `/api/attempts/anti-cheat/logs?instituteCode=${encodeURIComponent(
          instituteCode,
        )}`

      const resultsUrl =
        `/api/attempts/results?teacherId=${encodeURIComponent(
          teacherId,
        )}&instituteCode=${encodeURIComponent(
          instituteCode,
        )}`

        const studentUrl =
  `/api/students?instituteCode=${encodeURIComponent(
    instituteCode,
  )}`

  const [
    questionResponse,
    quizResponse,
    antiCheatResponse,
    resultsResponse,
    studentResponse,
  ] = await Promise.all([
    fetch(questionUrl),
    fetch(quizUrl),
    fetch(antiCheatUrl),
    fetch(resultsUrl),
    fetch(studentUrl),
  ])

      /*
       * QUESTIONS
       */

      const questionData =
        await questionResponse.json()

      if (
        !questionResponse.ok ||
        questionData.success === false
      ) {
        throw new Error(
          questionData.message ||
            'Unable to load questions',
        )
      }

      const backendQuestions =
        Array.isArray(questionData.questions)
          ? questionData.questions
          : Array.isArray(
                questionData.data?.questions,
              )
            ? questionData.data.questions
            : []

      /*
       * QUIZZES
       */

      const quizData =
        await quizResponse.json()

      if (
        !quizResponse.ok ||
        quizData.success === false
      ) {
        throw new Error(
          quizData.message ||
            'Unable to load quizzes',
        )
      }

      const backendQuizzes =
        Array.isArray(quizData.quizzes)
          ? quizData.quizzes
          : Array.isArray(
                quizData.data?.quizzes,
              )
            ? quizData.data.quizzes
            : []

      /*
       * ANTI-CHEAT
       */

      let antiCheatData = {}

      try {
        antiCheatData =
          await antiCheatResponse.json()
      } catch {
        antiCheatData = {}
      }

      const backendAntiCheatLogs =
        Array.isArray(antiCheatData.logs)
          ? antiCheatData.logs
          : Array.isArray(
                antiCheatData.data?.logs,
              )
            ? antiCheatData.data.logs
            : []

      /*
       * RESULTS
       */

      const resultsData =
        await resultsResponse.json()

      if (
        !resultsResponse.ok ||
        resultsData.success === false
      ) {
        throw new Error(
          resultsData.message ||
            'Unable to load results',
        )
      }

      const backendResults =
        Array.isArray(resultsData.results)
          ? resultsData.results
          : Array.isArray(
                resultsData.data?.results,
              )
            ? resultsData.data.results
            : []

            const studentData =
  await studentResponse.json()

if (
  !studentResponse.ok ||
  studentData.success === false
) {
  throw new Error(
    studentData.message ||
      'Unable to load students',
  )
}

const backendStudents =
  Array.isArray(studentData.students)
    ? studentData.students
    : Array.isArray(
          studentData.data?.students,
        )
      ? studentData.data.students
      : []

      /*
       * BACKEND IS PRIMARY SOURCE
       */

      setQuestions(backendQuestions)
      setQuizzes(backendQuizzes)
      setResults(backendResults)
      setAntiCheatLogs(
        backendAntiCheatLogs,
      )

      setStudents(
        backendStudents.map((student) => ({
          id: student.student_id,
          userId: student.user_id,
          name: student.name,
          email: student.email,
          status: student.status,
          instituteCode:
            student.institute_code,
          instituteName:
            student.institute_name,
          yearClass:
            student.year_class || '',
          section:
            student.section || '',
          createdAt:
            student.created_at,
          source: 'backend',
        })),
      )

      /*
       * LOCAL CACHE ONLY
       */

      localStorage.setItem(
        'quizvigil_questions',
        JSON.stringify(
          backendQuestions,
        ),
      )

      localStorage.setItem(
        'quizvigil_quizzes',
        JSON.stringify(
          backendQuizzes,
        ),
      )

      localStorage.setItem(
        'quizvigil_results',
        JSON.stringify(
          backendResults,
        ),
      )

      localStorage.setItem(
        'quizvigil_students',
        JSON.stringify(
          backendStudents.map((student) => ({
            id: student.student_id,
            userId: student.user_id,
            name: student.name,
            email: student.email,
            status: student.status,
            instituteCode:
              student.institute_code,
            instituteName:
              student.institute_name,
            yearClass:
              student.year_class || '',
            section:
              student.section || '',
            createdAt:
              student.created_at,
            source: 'backend',
          })),
        ),
      )

      /*
       * STUDENTS ARE CURRENTLY LOCAL CACHE
       */

      setStudents(
        readArray(
          'quizvigil_students',
        ),
      )

      return true
    } catch (error) {
      console.error(
        'Teacher dashboard backend load failed:',
        error,
      )

      if (allowFallback) {
        setQuestions(
          readArray(
            'quizvigil_questions',
          ),
        )

        setQuizzes(
          readArray(
            'quizvigil_quizzes',
          ),
        )

        setResults(
          readArray(
            'quizvigil_results',
          ),
        )

        setStudents(
          readArray(
            'quizvigil_students',
          ),
        )
      }

      if (showLoader) {
        showMessage(
          error.message ||
            'Unable to refresh dashboard.',
          'error',
        )
      }

      return false
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  /*
   * ====================================================
   * INITIAL LOAD
   * ====================================================
   */

  useEffect(() => {
    loadData()

    const handleStorageChange = () => {
      loadData({
        showLoader: false,
      })
    }

    const handleFocus = () => {
      loadData({
        showLoader: false,
        allowFallback: false,
      })
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        loadData({
          showLoader: false,
          allowFallback: false,
        })
      }
    }

    const handleResultUpdate = () => {
      loadData({
        showLoader: false,
        allowFallback: false,
      })
    }

    const handleQuizUpdate = () => {
      loadData({
        showLoader: false,
        allowFallback: false,
      })
    }

    window.addEventListener(
      'storage',
      handleStorageChange,
    )

    window.addEventListener(
      'focus',
      handleFocus,
    )

    window.addEventListener(
      'quizvigil-result-updated',
      handleResultUpdate,
    )

    window.addEventListener(
      'quizvigil-quiz-updated',
      handleQuizUpdate,
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange,
      )

      window.removeEventListener(
        'focus',
        handleFocus,
      )

      window.removeEventListener(
        'quizvigil-result-updated',
        handleResultUpdate,
      )

      window.removeEventListener(
        'quizvigil-quiz-updated',
        handleQuizUpdate,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [
    teacherId,
    instituteCode,
  ])

  /*
   * ====================================================
   * FILTER DATA
   * ====================================================
   */

  const myQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          normalize(
            getField(
              question,
              'teacherId',
              'teacher_id',
            ),
          ) ===
            normalize(teacherId) &&
          normalize(
            getField(
              question,
              'instituteCode',
              'institute_code',
            ),
          ) ===
            normalize(instituteCode),
      ),
    [
      questions,
      teacherId,
      instituteCode,
    ],
  )

  const myQuizzes = useMemo(
    () =>
      quizzes.filter(
        (quiz) =>
          normalize(
            getField(
              quiz,
              'teacherId',
              'teacher_id',
            ),
          ) ===
            normalize(teacherId) &&
          normalize(
            getField(
              quiz,
              'instituteCode',
              'institute_code',
            ),
          ) ===
            normalize(instituteCode),
      ),
    [
      quizzes,
      teacherId,
      instituteCode,
    ],
  )

  const instituteStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          normalize(
            getField(
              student,
              'instituteCode',
              'institute_code',
            ),
          ) ===
            normalize(instituteCode) &&
          student.status !==
            'Inactive',
      ),
    [
      students,
      instituteCode,
    ],
  )

  const liveQuizzes = myQuizzes.filter(
    (quiz) =>
      normalize(
        getField(
          quiz,
          'status',
          'status',
        ),
      ) === 'live',
  )

  /*
   * ====================================================
   * RESULTS
   * ====================================================
   */

  const myResults = useMemo(() => {
    return results.filter(
      (result) => {
        const resultInstitute =
          getField(
            result,
            'instituteCode',
            'institute_code',
          )

        const resultTeacher =
          getField(
            result,
            'teacherId',
            'teacher_id',
          )

        const sameInstitute =
          !resultInstitute ||
          normalize(
            resultInstitute,
          ) ===
            normalize(
              instituteCode,
            )

        const sameTeacher =
          !resultTeacher ||
          normalize(
            resultTeacher,
          ) ===
            normalize(teacherId)

        return (
          sameInstitute &&
          sameTeacher
        )
      },
    )
  }, [
    results,
    teacherId,
    instituteCode,
  ])

  const filteredResults =
    useMemo(() => {
      if (
        resultQuizFilter ===
        'all'
      ) {
        return myResults
      }

      return myResults.filter(
        (result) =>
          String(
            getField(
              result,
              'quizId',
              'quiz_id',
            ),
          ) ===
          String(
            resultQuizFilter,
          ),
      )
    }, [
      myResults,
      resultQuizFilter,
    ])

  const resultQuizOptions =
    useMemo(() => {
      const quizMap =
        new Map()

      myResults.forEach(
        (result) => {
          const quizId =
            getField(
              result,
              'quizId',
              'quiz_id',
            )

          if (!quizId) return

          if (
            !quizMap.has(
              quizId,
            )
          ) {
            const quiz =
              myQuizzes.find(
                (item) =>
                  String(
                    item.id,
                  ) ===
                  String(
                    quizId,
                  ),
              )

            quizMap.set(
              quizId,
              {
                id: quizId,
                title:
                  getField(
                    result,
                    'quizTitle',
                    'quiz_title',
                  ) ||
                  quiz?.title ||
                  'Untitled Quiz',
              },
            )
          }
        },
      )

      return Array.from(
        quizMap.values(),
      )
    }, [
      myResults,
      myQuizzes,
    ])

  const resultStats =
    useMemo(() => {
      if (
        filteredResults.length ===
        0
      ) {
        return {
          attempts: 0,
          averagePercentage: 0,
          totalScore: 0,
          averageScore: 0,
        }
      }

      const percentages =
        filteredResults.map(
          (result) =>
            Number(
              getField(
                result,
                'percentage',
                'percentage',
                0,
              ),
            ) || 0,
        )

      const scores =
        filteredResults.map(
          (result) =>
            Number(
              getField(
                result,
                'score',
                'score',
                0,
              ),
            ) || 0,
        )

      const totalScore =
        scores.reduce(
          (sum, value) =>
            sum + value,
          0,
        )

      const averagePercentage =
        percentages.reduce(
          (sum, value) =>
            sum + value,
          0,
        ) /
        percentages.length

      const averageScore =
        totalScore /
        scores.length

      return {
        attempts:
          filteredResults.length,
        averagePercentage:
          Number.isFinite(
            averagePercentage,
          )
            ? averagePercentage
            : 0,
        totalScore,
        averageScore:
          Number.isFinite(
            averageScore,
          )
            ? averageScore
            : 0,
      }
    }, [
      filteredResults,
    ])

  /*
   * ====================================================
   * ADD QUESTION
   * ====================================================
   */

  const handleAddQuestion =
    async (e) => {
      e.preventDefault()

      const formData =
        new FormData(
          e.currentTarget,
        )

      const payload = {
        teacherId,
        teacherName,
        instituteCode,
        instituteName,
        question:
          formData
            .get('question')
            ?.toString()
            .trim(),
        optionA:
          formData
            .get('optionA')
            ?.toString()
            .trim(),
        optionB:
          formData
            .get('optionB')
            ?.toString()
            .trim(),
        optionC:
          formData
            .get('optionC')
            ?.toString()
            .trim(),
        optionD:
          formData
            .get('optionD')
            ?.toString()
            .trim(),
        correctAnswer:
          formData.get(
            'correctAnswer',
          ),
        subject:
          formData
            .get('subject')
            ?.toString()
            .trim(),
        difficulty:
          formData.get(
            'difficulty',
          ),
        marks: Number(
          formData.get(
            'marks',
          ),
        ),
      }

      try {
        const response =
          await fetch(
            '/api/quizzes/questions',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                payload,
              ),
            },
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          data.success ===
            false
        ) {
          throw new Error(
            data.message ||
              'Unable to save question',
          )
        }

        const savedQuestion =
          data.question ||
          data.data?.question ||
          data.data

        if (
          !savedQuestion?.id
        ) {
          throw new Error(
            'Question was saved but no question ID was returned.',
          )
        }

        const updatedQuestions =
          [
            ...questions,
            savedQuestion,
          ]

        setQuestions(
          updatedQuestions,
        )

        localStorage.setItem(
          'quizvigil_questions',
          JSON.stringify(
            updatedQuestions,
          ),
        )

        setShowQuestionForm(
          false,
        )

        e.currentTarget.reset()

        showMessage(
          'Question added successfully.',
        )
      } catch (error) {
        console.error(
          'Create question failed:',
          error,
        )

        showMessage(
          error.message ||
            'Unable to save question.',
          'error',
        )
      }
    }

  /*
   * ====================================================
   * DELETE QUESTION
   * ====================================================
   */

  const handleDeleteQuestion =
    async (questionId) => {
      const question =
        questions.find(
          (item) =>
            item.id ===
            questionId,
        )

      if (!question) return

      if (
        normalize(
          getField(
            question,
            'teacherId',
            'teacher_id',
          ),
        ) !==
          normalize(
            teacherId,
          ) ||
        normalize(
          getField(
            question,
            'instituteCode',
            'institute_code',
          ),
        ) !==
          normalize(
            instituteCode,
          )
      ) {
        return
      }

      const usedInQuiz =
        myQuizzes.some(
          (quiz) =>
            Array.isArray(
              quiz.questionIds,
            ) &&
            quiz.questionIds.includes(
              questionId,
            ),
        )

      if (usedInQuiz) {
        showMessage(
          'This question is already used in a quiz.',
          'error',
        )
        return
      }

      try {
        const response =
          await fetch(
            `/api/quizzes/questions/${encodeURIComponent(
              questionId,
            )}`,
            {
              method: 'DELETE',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                teacherId,
                instituteCode,
              }),
            },
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          data.success ===
            false
        ) {
          throw new Error(
            data.message ||
              'Unable to delete question',
          )
        }

        const updatedQuestions =
          questions.filter(
            (item) =>
              item.id !==
              questionId,
          )

        setQuestions(
          updatedQuestions,
        )

        localStorage.setItem(
          'quizvigil_questions',
          JSON.stringify(
            updatedQuestions,
          ),
        )

        showMessage(
          'Question deleted successfully.',
        )
      } catch (error) {
        console.error(
          'Delete question failed:',
          error,
        )

        showMessage(
          error.message ||
            'Unable to delete question.',
          'error',
        )
      }
    }

  /*
   * ====================================================
   * QUESTION SELECTION
   * ====================================================
   */

  const toggleQuestionSelection =
    (questionId) => {
      setSelectedQuestionIds(
        (current) =>
          current.includes(
            questionId,
          )
            ? current.filter(
                (id) =>
                  id !==
                  questionId,
              )
            : [
                ...current,
                questionId,
              ],
      )
    }

  const selectAllQuestions =
    () => {
      setSelectedQuestionIds(
        myQuestions.map(
          (question) =>
            question.id,
        ),
      )
    }

  const clearQuestionSelection =
    () => {
      setSelectedQuestionIds(
        [],
      )
    }

  /*
   * ====================================================
   * CREATE QUIZ
   * ====================================================
   */

  const handleCreateQuiz =
    async (e) => {
      e.preventDefault()

      if (
        selectedQuestionIds.length ===
        0
      ) {
        showMessage(
          'Select at least one question for the quiz.',
          'error',
        )
        return
      }

      const formData =
        new FormData(
          e.currentTarget,
        )

      const title =
        formData
          .get('quizTitle')
          ?.toString()
          .trim()

      const subject =
        formData
          .get('subject')
          ?.toString()
          .trim()

      const durationMinutes =
        Number(
          formData.get(
            'durationMinutes',
          ),
        )

      const questionCount =
        Number(
          formData.get(
            'questionCount',
          ),
        )

      const randomize =
        formData.get(
          'randomize',
        ) === 'on'

      if (!title || !subject) {
        showMessage(
          'Please enter quiz title and subject.',
          'error',
        )
        return
      }

      if (
        durationMinutes <
        1
      ) {
        showMessage(
          'Quiz duration must be at least 1 minute.',
          'error',
        )
        return
      }

      if (
        questionCount <
          1 ||
        questionCount >
          selectedQuestionIds.length
      ) {
        showMessage(
          'Question count cannot be greater than selected questions.',
          'error',
        )
        return
      }

      try {
        const response =
          await fetch(
            '/api/quizzes',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                title,
                subject,
                teacherId,
                teacherName,
                instituteCode,
                instituteName,
                questionIds:
                  selectedQuestionIds,
                questionCount,
                durationMinutes,
                randomize,
                accessMode:
                  'institute',
                status: 'Draft',
              }),
            },
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          data.success ===
            false
        ) {
          throw new Error(
            data.message ||
              'Unable to create quiz',
          )
        }

        const savedQuiz =
          data.quiz ||
          data.data?.quiz ||
          data.data

        if (!savedQuiz?.id) {
          throw new Error(
            'Quiz was created but no quiz ID was returned.',
          )
        }

        const updatedQuizzes =
          [
            ...quizzes,
            savedQuiz,
          ]

        setQuizzes(
          updatedQuizzes,
        )

        localStorage.setItem(
          'quizvigil_quizzes',
          JSON.stringify(
            updatedQuizzes,
          ),
        )

        setSelectedQuestionIds(
          [],
        )

        setShowQuizForm(
          false,
        )

        e.currentTarget.reset()

        showMessage(
          'Quiz created successfully.',
        )
      } catch (error) {
        console.error(
          'Create quiz failed:',
          error,
        )

        showMessage(
          error.message ||
            'Unable to create quiz.',
          'error',
        )
      }
    }

  /*
   * ====================================================
   * START QUIZ
   * ====================================================
   */

  const handleStartQuiz =
    async (quizId) => {
      const quiz =
        myQuizzes.find(
          (item) =>
            item.id ===
            quizId,
        )

      if (!quiz) {
        showMessage(
          'Quiz not found. Please refresh.',
          'error',
        )
        return
      }

      if (
        normalize(
          getField(
            quiz,
            'teacherId',
            'teacher_id',
          ),
        ) !==
          normalize(
            teacherId,
          ) ||
        normalize(
          getField(
            quiz,
            'instituteCode',
            'institute_code',
          ),
        ) !==
          normalize(
            instituteCode,
          )
      ) {
        showMessage(
          'You cannot start this quiz.',
          'error',
        )
        return
      }

      if (
        normalize(
          quiz.status,
        ) === 'live'
      ) {
        showMessage(
          'This quiz is already live.',
          'error',
        )
        return
      }

      if (
        [
          'completed',
          'stopped',
        ].includes(
          normalize(
            quiz.status,
          ),
        )
      ) {
        showMessage(
          'This quiz has already been closed.',
          'error',
        )
        return
      }

      try {
        const response =
          await fetch(
            `/api/quizzes/${encodeURIComponent(
              quizId,
            )}/start`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                teacherId,
                instituteCode,
              }),
            },
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          data.success ===
            false
        ) {
          throw new Error(
            data.message ||
              'Unable to start quiz',
          )
        }

        const updatedQuiz =
          data.quiz ||
          data.data?.quiz ||
          data.data

        const updatedQuizzes =
          quizzes.map(
            (item) =>
              item.id ===
              quizId
                ? {
                    ...item,
                    ...(updatedQuiz ||
                      {}),
                    status:
                      'Live',
                  }
                : item,
          )

        setQuizzes(
          updatedQuizzes,
        )

        localStorage.setItem(
          'quizvigil_quizzes',
          JSON.stringify(
            updatedQuizzes,
          ),
        )

        window.dispatchEvent(
          new Event(
            'quizvigil-quiz-updated',
          ),
        )

        showMessage(
          'Quiz is now LIVE.',
        )
      } catch (error) {
        console.error(
          'Start quiz failed:',
          error,
        )

        showMessage(
          error.message ||
            'Unable to start quiz.',
          'error',
        )
      }
    }

  /*
   * ====================================================
   * STOP QUIZ
   * ====================================================
   */

  const handleStopQuiz =
    async (quizId) => {
      const quiz =
        myQuizzes.find(
          (item) =>
            item.id ===
            quizId,
        )

      if (!quiz) return

      if (
        normalize(
          getField(
            quiz,
            'teacherId',
            'teacher_id',
          ),
        ) !==
          normalize(
            teacherId,
          ) ||
        normalize(
          getField(
            quiz,
            'instituteCode',
            'institute_code',
          ),
        ) !==
          normalize(
            instituteCode,
          )
      ) {
        showMessage(
          'You cannot stop this quiz.',
          'error',
        )
        return
      }

      if (
        normalize(
          quiz.status,
        ) !== 'live'
      ) {
        showMessage(
          'Only a live quiz can be stopped.',
          'error',
        )
        return
      }

      try {
        const response =
          await fetch(
            `/api/quizzes/${encodeURIComponent(
              quizId,
            )}/stop`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                teacherId,
                instituteCode,
              }),
            },
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          data.success ===
            false
        ) {
          throw new Error(
            data.message ||
              'Unable to stop quiz',
          )
        }

        const updatedQuiz =
          data.quiz ||
          data.data?.quiz ||
          data.data

        const updatedQuizzes =
          quizzes.map(
            (item) =>
              item.id ===
              quizId
                ? {
                    ...item,
                    ...(updatedQuiz ||
                      {}),
                    status:
                      'Stopped',
                  }
                : item,
          )

        setQuizzes(
          updatedQuizzes,
        )

        localStorage.setItem(
          'quizvigil_quizzes',
          JSON.stringify(
            updatedQuizzes,
          ),
        )

        window.dispatchEvent(
          new Event(
            'quizvigil-quiz-updated',
          ),
        )

        showMessage(
          'Quiz stopped. New attempts are now closed.',
        )
      } catch (error) {
        console.error(
          'Stop quiz failed:',
          error,
        )

        showMessage(
          error.message ||
            'Unable to stop quiz.',
          'error',
        )
      }
    }

  /*
   * ====================================================
   * DELETE QUIZ
   * ====================================================
   */

  const handleDeleteQuiz =
  async (quizId) => {
    const quiz =
      myQuizzes.find(
        (item) =>
          item.id ===
          quizId,
      )

    if (!quiz) return

    if (
      normalize(
        quiz.status,
      ) === 'live'
    ) {
      showMessage(
        'Stop the live quiz before deleting it.',
        'error',
      )
      return
    }

    try {
      const response =
        await fetch(
          `/api/quizzes/${encodeURIComponent(
            quizId,
          )}?teacherId=${encodeURIComponent(
            teacherId,
          )}&instituteCode=${encodeURIComponent(
            instituteCode,
          )}`,
          {
            method: 'DELETE',
          },
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        data.success ===
          false
      ) {
        throw new Error(
          data.message ||
            'Unable to delete quiz',
        )
      }

      const updatedQuizzes =
        quizzes.filter(
          (item) =>
            item.id !==
            quizId,
        )

      setQuizzes(
        updatedQuizzes,
      )

      localStorage.setItem(
        'quizvigil_quizzes',
        JSON.stringify(
          updatedQuizzes,
        ),
      )

      window.dispatchEvent(
        new Event(
          'quizvigil-quiz-updated',
        ),
      )

      showMessage(
        'Quiz deleted successfully.',
      )
    } catch (error) {
      console.error(
        'Delete quiz failed:',
        error,
      )

      showMessage(
        error.message ||
          'Unable to delete quiz.',
        'error',
      )
    }
  }

  /*
   * ====================================================
   * LOGOUT
   * ====================================================
   */

  const handleLogout = () => {
    localStorage.removeItem(
      'quizvigil_current_user',
    )

    window.location.href = '/'
  }

  /*
   * ====================================================
   * RESULT HELPERS
   * ====================================================
   */

  const getStudentName = (
    result,
  ) =>
    getField(
      result,
      'studentName',
      'student_name',
    ) ||
    result.name ||
    getStudentId(result) ||
    'Unknown Student'

  const getStudentId = (
    result,
  ) =>
    getField(
      result,
      'studentId',
      'student_id',
    ) ||
    result.student?.id ||
    '—'

  const getQuizTitle = (
    result,
  ) => {
    const quizId =
      getField(
        result,
        'quizId',
        'quiz_id',
      )

    const quiz =
      myQuizzes.find(
        (item) =>
          String(item.id) ===
          String(quizId),
      )

    return (
      getField(
        result,
        'quizTitle',
        'quiz_title',
      ) ||
      quiz?.title ||
      'Untitled Quiz'
    )
  }

  const getWarnings = (
    result,
  ) => {
    const attemptId =
      getField(
        result,
        'attemptId',
        'attempt_id',
      ) ||
      result.id

    const backendLogs =
      antiCheatLogs.filter(
        (log) =>
          String(
            getField(
              log,
              'attemptId',
              'attempt_id',
            ),
          ) ===
          String(attemptId),
      )

    if (
      backendLogs.length > 0
    ) {
      return backendLogs
    }

    if (
      Array.isArray(
        result.antiCheatLogs,
      )
    ) {
      return result.antiCheatLogs
    }

    return []
  }

  const getWarningLabel = (
    warning,
  ) => {
    const event =
      typeof warning ===
      'string'
        ? warning
        : getField(
              warning,
              'eventType',
              'event_type',
            ) ||
          warning.event ||
          warning.action ||
          warning.type

    const labels = {
      TAB_SWITCH:
        'Tab Switch Detected',
      WINDOW_BLUR:
        'Window Focus Lost',
      FULLSCREEN_EXIT:
        'Fullscreen Exit Detected',
      COPY_ATTEMPT:
        'Copy Attempt Detected',
      CUT_ATTEMPT:
        'Cut Attempt Detected',
      PASTE_ATTEMPT:
        'Paste Attempt Detected',
    }

    return (
      labels[event] ||
      event ||
      'Suspicious Activity Detected'
    )
  }

  const formatDateTime = (
    value,
  ) => {
    if (!value) return '—'

    const date =
      new Date(value)

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '—'
    }

    return date.toLocaleString()
  }

  const getPercentage = (
    result,
  ) => {
    const value =
      Number(
        getField(
          result,
          'percentage',
          'percentage',
          0,
        ),
      ) || 0

    if (
      !Number.isFinite(value)
    ) {
      return 0
    }

    return Math.round(
      value * 100,
    ) / 100
  }

  /*
   * ====================================================
   * RENDER
   * ====================================================
   */

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-header">
        <div>
          <p className="dashboard-label">
            TEACHER PANEL
          </p>

          <h1>
            Welcome, {teacherName}
          </h1>

          <p>
            {teacherId} • {instituteName}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
          }}
        >
          <button
            className="dashboard-logout"
            onClick={() =>
              loadData({
                showLoader: true,
              })
            }
            disabled={loading}
          >
            {loading
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          <button
            className="dashboard-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* MESSAGE */}

      {message && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background:
              messageType === 'error'
                ? '#fee2e2'
                : '#eff6ff',
            color:
              messageType === 'error'
                ? '#991b1b'
                : '#1d4ed8',
            fontWeight: '600',
            border:
              messageType === 'error'
                ? '1px solid #fecaca'
                : '1px solid #dbeafe',
          }}
        >
          {message}
        </div>
      )}

      {/* TABS */}

      <div className="admin-tabs">

        <button
          className={
            activeTab ===
            'overview'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'overview',
            )
          }
        >
          Overview
        </button>

        <button
          className={
            activeTab ===
            'questions'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'questions',
            )
          }
        >
          Question Bank
        </button>

        <button
          className={
            activeTab ===
            'quizzes'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'quizzes',
            )
          }
        >
          My Quizzes
        </button>

        <button
          className={
            activeTab ===
            'students'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'students',
            )
          }
        >
          Students
        </button>

        <button
          className={
            activeTab ===
            'results'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'results',
            )
          }
        >
          Results
        </button>

        <button
          className={
            activeTab ===
            'anti-cheat'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'anti-cheat',
            )
          }
        >
          Anti-Cheat Monitoring
        </button>

      </div>

      {/* =================================================
          OVERVIEW
      ================================================= */}

      {activeTab ===
        'overview' && (
        <>
          <div className="dashboard-stats">

            <div className="dashboard-stat-card">
              <span>
                Question Bank
              </span>

              <strong>
                {myQuestions.length}
              </strong>
            </div>

            <div className="dashboard-stat-card">
              <span>
                My Quizzes
              </span>

              <strong>
                {myQuizzes.length}
              </strong>
            </div>

            <div className="dashboard-stat-card">
              <span>
                Institute Students
              </span>

              <strong>
                {
                  instituteStudents.length
                }
              </strong>
            </div>

            <div className="dashboard-stat-card">
              <span>
                Live Quizzes
              </span>

              <strong>
                {liveQuizzes.length}
              </strong>
            </div>

          </div>

          <div className="dashboard-card">
            <h2>
              Teacher Workspace
            </h2>

            <p>
              Create questions, build
              quizzes, start live
              assessments and manage
              student activity from
              this panel.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginTop: '24px',
              }}
            >
              <div className="dashboard-stat-card">
                <span>
                  Quiz Access
                </span>

                <strong
                  style={{
                    fontSize:
                      '18px',
                  }}
                >
                  Institute-wide
                </strong>
              </div>

              <div className="dashboard-stat-card">
                <span>
                  Manual Assignment
                </span>

                <strong
                  style={{
                    fontSize:
                      '18px',
                  }}
                >
                  Not Required
                </strong>
              </div>

              <div className="dashboard-stat-card">
                <span>
                  Quiz Control
                </span>

                <strong
                  style={{
                    fontSize:
                      '18px',
                  }}
                >
                  Start / Stop
                </strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================================================
          QUESTION BANK
      ================================================= */}

      {activeTab ===
        'questions' && (
        <div className="dashboard-card">

          <div className="section-header">
            <div>
              <h2>
                Question Bank
              </h2>

              <p>
                Create and manage
                questions for your
                quizzes.
              </p>
            </div>

            <button
              className="dashboard-primary-btn"
              onClick={() =>
                setShowQuestionForm(
                  !showQuestionForm,
                )
              }
            >
              {showQuestionForm
                ? 'Cancel'
                : '+ Add Question'}
            </button>
          </div>

          {showQuestionForm && (
            <form
              className="dashboard-form"
              onSubmit={
                handleAddQuestion
              }
            >
              <label>
                Question
              </label>

              <textarea
                name="question"
                placeholder="Enter your question"
                required
              />

              <label>
                Option A
              </label>

              <input
                type="text"
                name="optionA"
                placeholder="Enter option A"
                required
              />

              <label>
                Option B
              </label>

              <input
                type="text"
                name="optionB"
                placeholder="Enter option B"
                required
              />

              <label>
                Option C
              </label>

              <input
                type="text"
                name="optionC"
                placeholder="Enter option C"
                required
              />

              <label>
                Option D
              </label>

              <input
                type="text"
                name="optionD"
                placeholder="Enter option D"
                required
              />

              <label>
                Correct Answer
              </label>

              <select
                name="correctAnswer"
                required
              >
                <option value="">
                  Select correct option
                </option>

                <option value="A">
                  Option A
                </option>

                <option value="B">
                  Option B
                </option>

                <option value="C">
                  Option C
                </option>

                <option value="D">
                  Option D
                </option>
              </select>

              <label>
                Subject
              </label>

              <input
                type="text"
                name="subject"
                placeholder="e.g. Data Structure"
                required
              />

              <label>
                Difficulty
              </label>

              <select
                name="difficulty"
                required
              >
                <option value="">
                  Select difficulty
                </option>

                <option value="Easy">
                  Easy
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Hard">
                  Hard
                </option>
              </select>

              <label>
                Marks
              </label>

              <input
                type="number"
                name="marks"
                min="1"
                defaultValue="1"
                required
              />

              <button
                type="submit"
                className="dashboard-primary-btn"
              >
                Save Question
              </button>
            </form>
          )}

          {!showQuestionForm &&
            myQuestions.length ===
              0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  📝
                </div>

                <h3>
                  No Questions Yet
                </h3>

                <p>
                  Add your first
                  question to start
                  building quizzes.
                </p>
              </div>
            )}

          {!showQuestionForm &&
            myQuestions.length >
              0 && (
              <div className="institute-list">
                {myQuestions.map(
                  (question) => (
                    <div
                      className="institute-item"
                      key={
                        question.id
                      }
                    >
                      <div>
                        <h3>
                          {getField(
                            question,
                            'question',
                            'question',
                          )}
                        </h3>

                        <p>
                          Subject:{' '}
                          {getField(
                            question,
                            'subject',
                            'subject',
                          )}
                        </p>

                        <p>
                          Difficulty:{' '}
                          {getField(
                            question,
                            'difficulty',
                            'difficulty',
                          )}
                          {' • '}
                          {getField(
                            question,
                            'marks',
                            'marks',
                            0,
                          )}{' '}
                          marks
                        </p>

                        <p>
                          A:{' '}
                          {getField(
                            question,
                            'optionA',
                            'option_a',
                          )}
                        </p>

                        <p>
                          B:{' '}
                          {getField(
                            question,
                            'optionB',
                            'option_b',
                          )}
                        </p>

                        <p>
                          C:{' '}
                          {getField(
                            question,
                            'optionC',
                            'option_c',
                          )}
                        </p>

                        <p>
                          D:{' '}
                          {getField(
                            question,
                            'optionD',
                            'option_d',
                          )}
                        </p>

                        <p>
                          Correct Answer:{' '}
                          {getField(
                            question,
                            'correctAnswer',
                            'correct_answer',
                          )}
                        </p>
                      </div>

                      <div className="institute-actions">
                        <button
                          className="institute-action-btn deactivate"
                          onClick={() =>
                            handleDeleteQuestion(
                              question.id,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
        </div>
      )}

      {/* =================================================
          MY QUIZZES
      ================================================= */}

      {activeTab ===
        'quizzes' && (
        <div className="dashboard-card">

          <div className="section-header">
            <div>
              <h2>
                My Quizzes
              </h2>

              <p>
                Create quizzes and
                control when students
                can attempt them.
              </p>
            </div>

            <button
              className="dashboard-primary-btn"
              onClick={() =>
                setShowQuizForm(
                  !showQuizForm,
                )
              }
            >
              {showQuizForm
                ? 'Close'
                : '+ Create Quiz'}
            </button>
          </div>

          {showQuizForm && (
            <div className="dashboard-card">
              <h2>
                Create New Quiz
              </h2>

              <p className="dashboard-muted">
                Select questions from
                your question bank.
                Students are not
                manually assigned.
              </p>

              <form
                className="dashboard-form"
                onSubmit={
                  handleCreateQuiz
                }
              >
                <label>
                  Quiz Title
                </label>

                <input
                  type="text"
                  name="quizTitle"
                  placeholder="e.g. Data Structure Unit Test 1"
                  required
                />

                <label>
                  Subject
                </label>

                <input
                  type="text"
                  name="subject"
                  placeholder="e.g. Data Structure"
                  required
                />

                <label>
                  Duration (minutes)
                </label>

                <input
                  type="number"
                  name="durationMinutes"
                  min="1"
                  defaultValue="30"
                  required
                />

                <label>
                  Number of Questions
                </label>

                <input
                  type="number"
                  name="questionCount"
                  min="1"
                  max={
                    selectedQuestionIds.length ||
                    1
                  }
                  defaultValue={
                    selectedQuestionIds.length ||
                    1
                  }
                  required
                />

                <label
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: '10px',
                    cursor:
                      'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    name="randomize"
                    defaultChecked
                  />

                  Randomize question
                  order
                </label>

                <div
                  style={{
                    marginTop:
                      '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                      gap: '12px',
                      marginBottom:
                        '12px',
                    }}
                  >
                    <div>
                      <strong>
                        Select Questions
                      </strong>

                      <p
                        style={{
                          margin:
                            '4px 0 0',
                          color:
                            '#64748b',
                          fontSize:
                            '13px',
                        }}
                      >
                        Selected:{' '}
                        {
                          selectedQuestionIds.length
                        }
                      </p>
                    </div>

                    <div
                      style={{
                        display:
                          'flex',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        className="dashboard-logout"
                        onClick={
                          selectAllQuestions
                        }
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        className="dashboard-logout"
                        onClick={
                          clearQuestionSelection
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {myQuestions.length ===
                  0 ? (
                    <div className="empty-state">
                      <h3>
                        No Questions Available
                      </h3>

                      <p>
                        Add questions in
                        the Question Bank
                        first.
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display:
                          'flex',
                        flexDirection:
                          'column',
                        gap: '10px',
                        maxHeight:
                          '430px',
                        overflowY:
                          'auto',
                        padding:
                          '4px',
                      }}
                    >
                      {myQuestions.map(
                        (question) => {
                          const selected =
                            selectedQuestionIds.includes(
                              question.id,
                            )

                          return (
                            <label
                              key={
                                question.id
                              }
                              style={{
                                display:
                                  'flex',
                                gap: '12px',
                                alignItems:
                                  'flex-start',
                                padding:
                                  '14px',
                                border:
                                  selected
                                    ? '1px solid #93c5fd'
                                    : '1px solid #dbe7f8',
                                background:
                                  selected
                                    ? '#eff6ff'
                                    : '#ffffff',
                                borderRadius:
                                  '10px',
                                cursor:
                                  'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={() =>
                                  toggleQuestionSelection(
                                    question.id,
                                  )
                                }
                                style={{
                                  marginTop:
                                    '4px',
                                }}
                              />

                              <span>
                                <strong>
                                  {
                                    question.question
                                  }
                                </strong>

                                <small
                                  style={{
                                    display:
                                      'block',
                                    marginTop:
                                      '5px',
                                    color:
                                      '#64748b',
                                  }}
                                >
                                  {
                                    question.subject
                                  }
                                  {' • '}
                                  {
                                    question.difficulty
                                  }
                                  {' • '}
                                  {
                                    question.marks
                                  }{' '}
                                  marks
                                </small>
                              </span>
                            </label>
                          )
                        },
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="dashboard-primary-btn"
                  disabled={
                    selectedQuestionIds.length ===
                    0
                  }
                  style={{
                    marginTop:
                      '20px',
                    opacity:
                      selectedQuestionIds.length ===
                      0
                        ? 0.55
                        : 1,
                  }}
                >
                  Create Quiz
                </button>
              </form>
            </div>
          )}

          {myQuizzes.length ===
          0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                📚
              </div>

              <h3>
                No Quizzes Yet
              </h3>

              <p>
                Create your first
                quiz using your
                question bank.
              </p>
            </div>
          ) : (
            <div className="institute-list">
              {myQuizzes.map(
                (quiz) => {
                  const status =
                    normalize(
                      quiz.status,
                    )

                  return (
                    <div
                      className="institute-item"
                      key={quiz.id}
                    >
                      <div>
                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: '10px',
                            flexWrap:
                              'wrap',
                          }}
                        >
                          <h3
                            style={{
                              margin:
                                '0',
                            }}
                          >
                            {quiz.title}
                          </h3>

                          <span
                            style={{
                              padding:
                                '5px 10px',
                              borderRadius:
                                '999px',
                              fontSize:
                                '11px',
                              fontWeight:
                                '800',
                              background:
                                status ===
                                'live'
                                  ? '#dcfce7'
                                  : status ===
                                      'stopped'
                                    ? '#fee2e2'
                                    : '#f1f5f9',
                              color:
                                status ===
                                'live'
                                  ? '#166534'
                                  : status ===
                                      'stopped'
                                    ? '#991b1b'
                                    : '#475569',
                            }}
                          >
                            {[
                              'draft',
                              'scheduled',
                            ].includes(
                              status,
                            )
                              ? 'WAITING'
                              : String(
                                  quiz.status ||
                                    '',
                                ).toUpperCase()}
                          </span>
                        </div>

                        <p>
                          Subject:{' '}
                          {
                            quiz.subject
                          }
                        </p>

                        <p>
                          Questions:{' '}
                          {
                            quiz.questionCount
                          }
                          {' / '}
                          {Array.isArray(
                            quiz.questionIds,
                          )
                            ? quiz
                                .questionIds
                                .length
                            : '—'}
                        </p>

                        <p>
                          Duration:{' '}
                          {
                            quiz.durationMinutes
                          }{' '}
                          minutes
                        </p>

                        <p>
                          Randomization:{' '}
                          {quiz.randomize
                            ? 'Enabled'
                            : 'Disabled'}
                        </p>

                        <p>
                          Access:
                          {' '}
                          Institute
                          students
                        </p>

                        {status ===
                          'live' &&
                          quiz.startedAt && (
                            <p
                              style={{
                                color:
                                  '#166534',
                                fontWeight:
                                  '600',
                              }}
                            >
                              Started:{' '}
                              {new Date(
                                quiz.startedAt,
                              ).toLocaleString()}
                            </p>
                          )}
                      </div>

                      <div className="institute-actions">
                        {[
                          'draft',
                          'scheduled',
                        ].includes(
                          status,
                        ) && (
                          <button
                            className="dashboard-primary-btn"
                            onClick={() =>
                              handleStartQuiz(
                                quiz.id,
                              )
                            }
                          >
                            START
                          </button>
                        )}

                        {status ===
                          'live' && (
                          <button
                            className="institute-action-btn deactivate"
                            onClick={() =>
                              handleStopQuiz(
                                quiz.id,
                              )
                            }
                          >
                            STOP
                          </button>
                        )}

                        {status !==
                          'live' && (
                          <button
                            className="institute-action-btn deactivate"
                            onClick={() =>
                              handleDeleteQuiz(
                                quiz.id,
                              )
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================
          STUDENTS
      ================================================= */}

      {activeTab ===
        'students' && (
        <div className="dashboard-card">
          <div className="section-header">
            <div>
              <h2>
                Institute Students
              </h2>

              <p>
                These students can
                access your live
                quizzes.
              </p>
            </div>

            <button
              className="dashboard-logout"
              onClick={() =>
                loadData({
                  showLoader: true,
                })
              }
            >
              Refresh
            </button>
          </div>

          {instituteStudents.length ===
          0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                🎓
              </div>

              <h3>
                No Students Found
              </h3>

              <p>
                Approved students
                from this institute
                will appear here.
              </p>
            </div>
          ) : (
            <div className="institute-list">
              {instituteStudents.map(
                (student) => (
                  <div
                    className="institute-item"
                    key={student.id}
                  >
                    <div>
                      <h3>
                        {student.name}
                      </h3>

                      <p>
                        Student ID:{' '}
                        {student.id}
                      </p>

                      <p>
                        Email:{' '}
                        {student.email}
                      </p>

                      <p>
                        {
                          student.yearClass
                        }
                        {' — '}
                        Section{' '}
                        {
                          student.section
                        }
                      </p>
                    </div>

                    <div className="institute-actions">
                      <span className="institute-status">
                        Active
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================
          RESULTS
      ================================================= */}

      {activeTab ===
        'results' && (
        <div className="dashboard-card">

          <div className="section-header">
            <div>
              <h2>
                Quiz Results
              </h2>

              <p>
                Results are loaded
                directly from the
                backend database.
              </p>
            </div>

            <button
              className="dashboard-logout"
              onClick={() =>
                loadData({
                  showLoader: true,
                  allowFallback:
                    false,
                })
              }
              disabled={loading}
            >
              {loading
                ? 'Refreshing...'
                : 'Refresh'}
            </button>
          </div>

          {/* SUMMARY */}

          <div className="dashboard-stats">

            <div className="dashboard-stat-card">
              <span>
                Total Attempts
              </span>

              <strong>
                {
                  resultStats.attempts
                }
              </strong>
            </div>

            <div className="dashboard-stat-card">
              <span>
                Average Score
              </span>

              <strong>
                {resultStats.averageScore.toFixed(
                  2,
                )}
              </strong>
            </div>

            <div className="dashboard-stat-card">
              <span>
                Average Percentage
              </span>

              <strong>
                {resultStats.averagePercentage.toFixed(
                  2,
                )}
                %
              </strong>
            </div>

            <div className="dashboard-stat-card">
              <span>
                Quizzes Attempted
              </span>

              <strong>
                {
                  resultQuizOptions.length
                }
              </strong>
            </div>

          </div>

          {/* FILTER */}

          <div
            style={{
              marginTop:
                '24px',
              marginBottom:
                '20px',
            }}
          >
            <label
              style={{
                display:
                  'block',
                marginBottom:
                  '8px',
                fontWeight:
                  '700',
                color:
                  '#334155',
              }}
            >
              Filter by Quiz
            </label>

            <select
              value={
                resultQuizFilter
              }
              onChange={(e) =>
                setResultQuizFilter(
                  e.target
                    .value,
                )
              }
              style={{
                width:
                  '100%',
                maxWidth:
                  '420px',
                boxSizing:
                  'border-box',
                padding:
                  '12px 14px',
                border:
                  '1px solid #cbd5e1',
                borderRadius:
                  '10px',
                background:
                  '#ffffff',
                fontSize:
                  '14px',
              }}
            >
              <option value="all">
                All Quizzes
              </option>

              {resultQuizOptions.map(
                (quiz) => (
                  <option
                    key={
                      quiz.id
                    }
                    value={
                      quiz.id
                    }
                  >
                    {
                      quiz.title
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* RESULT LIST */}

          {filteredResults.length ===
          0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                📊
              </div>

              <h3>
                No Results Yet
              </h3>

              <p>
                Student results will
                appear here after
                they submit a quiz.
              </p>
            </div>
          ) : (
            <div className="institute-list">
              {filteredResults.map(
                (result, index) => {
                  const warnings =
                    getWarnings(
                      result,
                    )

                  const percentage =
                    getPercentage(
                      result,
                    )

                  return (
                    <div
                      className="institute-item"
                      key={
                        getField(
                          result,
                          'attemptId',
                          'attempt_id',
                        ) ||
                        result.id ||
                        `${getField(
                          result,
                          'quizId',
                          'quiz_id',
                        )}-${getStudentId(
                          result,
                        )}-${index}`
                      }
                    >
                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <h3>
                          {getStudentName(
                            result,
                          )}
                        </h3>

                        <p>
                          Student ID:{' '}
                          {getStudentId(
                            result,
                          )}
                        </p>

                        <p>
                          Quiz:{' '}
                          {getQuizTitle(
                            result,
                          )}
                        </p>

                        <p>
                          Score:{' '}
                          {getField(
                            result,
                            'score',
                            'score',
                            0,
                          )}
                          {' / '}
                          {getField(
                            result,
                            'totalMarks',
                            'total_marks',
                            '—',
                          )}
                        </p>

                        <p>
                          Correct:{' '}
                          {getField(
                            result,
                            'correct',
                            'correct',
                            0,
                          )}
                          {' • '}
                          Wrong:{' '}
                          {getField(
                            result,
                            'wrong',
                            'wrong',
                            0,
                          )}
                          {' • '}
                          Unattempted:{' '}
                          {getField(
                            result,
                            'unattempted',
                            'unattempted',
                            0,
                          )}
                        </p>

                        <p>
                          Percentage:{' '}
                          <strong>
                            {
                              percentage
                            }
                            %
                          </strong>
                        </p>

                        <p>
                          Submitted:{' '}
                          {formatDateTime(
                            getField(
                              result,
                              'completedAt',
                              'completed_at',
                            ) ||
                              getField(
                                result,
                                'submittedAt',
                                'submitted_at',
                              ),
                          )}
                        </p>

                        {warnings.length >
                          0 && (
                          <p
                            style={{
                              color:
                                '#b45309',
                              fontWeight:
                                '700',
                            }}
                          >
                            ⚠ Anti-cheat
                            warnings:{' '}
                            {
                              warnings.length
                            }
                          </p>
                        )}
                      </div>

                      <div
                        className="institute-actions"
                        style={{
                          alignSelf:
                            'center',
                        }}
                      >
                        <button
                          className="dashboard-primary-btn"
                          onClick={() =>
                            setSelectedResult(
                              result,
                            )
                          }
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          )}

          {/* RESULT DETAILS */}

          {selectedResult && (
            <div
              style={{
                marginTop:
                  '24px',
                padding:
                  '24px',
                border:
                  '1px solid #dbe7f8',
                borderRadius:
                  '16px',
                background:
                  '#f8fbff',
              }}
            >
              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'flex-start',
                  gap:
                    '16px',
                  marginBottom:
                    '20px',
                }}
              >
                <div>
                  <p
                    className="dashboard-label"
                    style={{
                      marginBottom:
                        '6px',
                    }}
                  >
                    RESULT DETAILS
                  </p>

                  <h2
                    style={{
                      margin:
                        0,
                    }}
                  >
                    {getStudentName(
                      selectedResult,
                    )}
                  </h2>

                  <p
                    style={{
                      marginTop:
                        '6px',
                      color:
                        '#64748b',
                    }}
                  >
                    {getStudentId(
                      selectedResult,
                    )}
                    {' • '}
                    {getQuizTitle(
                      selectedResult,
                    )}
                  </p>
                </div>

                <button
                  className="dashboard-logout"
                  onClick={() =>
                    setSelectedResult(
                      null,
                    )
                  }
                >
                  Close
                </button>
              </div>

              <div className="dashboard-stats">

                <div className="dashboard-stat-card">
                  <span>
                    Score
                  </span>

                  <strong>
                    {getField(
                      selectedResult,
                      'score',
                      'score',
                      0,
                    )}
                    {' / '}
                    {getField(
                      selectedResult,
                      'totalMarks',
                      'total_marks',
                      '—',
                    )}
                  </strong>
                </div>

                <div className="dashboard-stat-card">
                  <span>
                    Percentage
                  </span>

                  <strong>
                    {getPercentage(
                      selectedResult,
                    )}
                    %
                  </strong>
                </div>

                <div className="dashboard-stat-card">
                  <span>
                    Correct
                  </span>

                  <strong>
                    {getField(
                      selectedResult,
                      'correct',
                      'correct',
                      0,
                    )}
                  </strong>
                </div>

                <div className="dashboard-stat-card">
                  <span>
                    Wrong
                  </span>

                  <strong>
                    {getField(
                      selectedResult,
                      'wrong',
                      'wrong',
                      0,
                    )}
                  </strong>
                </div>

              </div>

              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                  gap:
                    '14px',
                  marginTop:
                    '20px',
                }}
              >

                <div
                  style={{
                    padding:
                      '16px',
                    background:
                      '#ffffff',
                    border:
                      '1px solid #dbe7f8',
                    borderRadius:
                      '12px',
                  }}
                >
                  <strong>
                    Unattempted
                  </strong>

                  <p>
                    {getField(
                      selectedResult,
                      'unattempted',
                      'unattempted',
                      0,
                    )}
                  </p>
                </div>

                <div
                  style={{
                    padding:
                      '16px',
                    background:
                      '#ffffff',
                    border:
                      '1px solid #dbe7f8',
                    borderRadius:
                      '12px',
                  }}
                >
                  <strong>
                    Attempt ID
                  </strong>

                  <p>
                    {getField(
                      selectedResult,
                      'attemptId',
                      'attempt_id',
                    ) ||
                      selectedResult.id ||
                      '—'}
                  </p>
                </div>

                <div
                  style={{
                    padding:
                      '16px',
                    background:
                      '#ffffff',
                    border:
                      '1px solid #dbe7f8',
                    borderRadius:
                      '12px',
                  }}
                >
                  <strong>
                    Started
                  </strong>

                  <p>
                    {formatDateTime(
                      getField(
                        selectedResult,
                        'startedAt',
                        'started_at',
                      ),
                    )}
                  </p>
                </div>

                <div
                  style={{
                    padding:
                      '16px',
                    background:
                      '#ffffff',
                    border:
                      '1px solid #dbe7f8',
                    borderRadius:
                      '12px',
                  }}
                >
                  <strong>
                    Submitted
                  </strong>

                  <p>
                    {formatDateTime(
                      getField(
                        selectedResult,
                        'completedAt',
                        'completed_at',
                      ) ||
                        getField(
                          selectedResult,
                          'submittedAt',
                          'submitted_at',
                        ),
                    )}
                  </p>
                </div>
              </div>

              {/* ANSWERS */}

              {Array.isArray(
                selectedResult.answers,
              ) &&
                selectedResult
                  .answers.length >
                  0 && (
                  <div
                    style={{
                      marginTop:
                        '24px',
                    }}
                  >
                    <h3>
                      Answer Details
                    </h3>

                    <div
                      style={{
                        display:
                          'flex',
                        flexDirection:
                          'column',
                        gap:
                          '10px',
                        marginTop:
                          '12px',
                      }}
                    >
                      {selectedResult.answers.map(
                        (
                          answer,
                          index,
                        ) => {
                          const selectedAnswer =
                            getField(
                              answer,
                              'selectedAnswer',
                              'selected_answer',
                            )

                          const correctAnswer =
                            getField(
                              answer,
                              'correctAnswer',
                              'correct_answer',
                            )

                          const isCorrect =
                            answer.isCorrect ??
                            answer.is_correct

                          return (
                            <div
                              key={
                                answer.questionId ||
                                answer.question_id ||
                                index
                              }
                              style={{
                                padding:
                                  '14px',
                                border:
                                  '1px solid #dbe7f8',
                                borderRadius:
                                  '10px',
                                background:
                                  '#ffffff',
                              }}
                            >
                              <strong>
                                Q
                                {index +
                                  1}
                                .{' '}
                                {answer.question ||
                                  answer.questionText ||
                                  'Question'}
                              </strong>

                              <p>
                                Student
                                Answer:{' '}
                                {selectedAnswer ||
                                  'Not Attempted'}
                              </p>

                              {correctAnswer && (
                                <p>
                                  Correct
                                  Answer:{' '}
                                  {
                                    correctAnswer
                                  }
                                </p>
                              )}

                              {typeof isCorrect ===
                                'boolean' && (
                                <p
                                  style={{
                                    color:
                                      isCorrect
                                        ? '#166534'
                                        : '#991b1b',
                                    fontWeight:
                                      '700',
                                  }}
                                >
                                  {isCorrect
                                    ? 'Correct'
                                    : 'Wrong'}
                                </p>
                              )}
                            </div>
                          )
                        },
                      )}
                    </div>
                  </div>
                )}

              {/* ANTI CHEAT */}

              <div
                style={{
                  marginTop:
                    '24px',
                }}
              >
                <h3>
                  Anti-Cheat Activity
                </h3>

                {getWarnings(
                  selectedResult,
                ).length ===
                0 ? (
                  <div
                    style={{
                      marginTop:
                        '12px',
                      padding:
                        '14px',
                      borderRadius:
                        '10px',
                      background:
                        '#ecfdf5',
                      border:
                        '1px solid #bbf7d0',
                      color:
                        '#166534',
                      fontWeight:
                        '600',
                    }}
                  >
                    No recorded
                    anti-cheat
                    warnings for
                    this attempt.
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        'flex',
                      flexDirection:
                        'column',
                      gap:
                        '8px',
                      marginTop:
                        '12px',
                    }}
                  >
                    {getWarnings(
                      selectedResult,
                    ).map(
                      (
                        warning,
                        index,
                      ) => {
                        const timestamp =
                          typeof warning ===
                          'object'
                            ? getField(
                                warning,
                                'timestamp',
                                'created_at',
                              ) ||
                              warning.createdAt
                            : null

                        return (
                          <div
                            key={
                              warning.id ||
                              index
                            }
                            style={{
                              padding:
                                '12px 14px',
                              borderRadius:
                                '10px',
                              background:
                                '#fff7ed',
                              border:
                                '1px solid #fed7aa',
                              color:
                                '#9a3412',
                            }}
                          >
                            <strong>
                              {getWarningLabel(
                                warning,
                              )}
                            </strong>

                            {timestamp && (
                              <span
                                style={{
                                  marginLeft:
                                    '8px',
                                  fontSize:
                                    '12px',
                                  color:
                                    '#7c2d12',
                                }}
                              >
                                —
                                {' '}
                                {new Date(
                                  timestamp,
                                ).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )
                      },
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================
          ANTI-CHEAT MONITORING
      ================================================= */}

      {activeTab ===
        'anti-cheat' && (
        <section className="dashboard-card">

          <div className="section-header">
            <div>
              <h2>
                Anti-Cheat Monitoring
              </h2>

              <p>
                Monitor suspicious
                activity recorded
                during student quiz
                attempts.
              </p>
            </div>

            <div className="status-badge">
              {
                antiCheatLogs.length
              }{' '}
              Events
            </div>
          </div>

          {antiCheatLogs.length ===
          0 ? (
            <div className="empty-state">
              <h3>
                No Anti-Cheat Activity
              </h3>

              <p>
                No suspicious events
                have been recorded
                yet.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      Student
                    </th>

                    <th>
                      Quiz
                    </th>

                    <th>
                      Event
                    </th>

                    <th>
                      Timestamp
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {antiCheatLogs.map(
                    (
                      log,
                      index,
                    ) => {
                      const student =
                        getField(
                          log,
                          'studentName',
                          'student_name',
                        ) ||
                        getField(
                          log,
                          'studentId',
                          'student_id',
                        ) ||
                        'Unknown Student'

                      const quiz =
                        getField(
                          log,
                          'quizTitle',
                          'quiz_title',
                        ) ||
                        getField(
                          log,
                          'quizId',
                          'quiz_id',
                        ) ||
                        'Unknown Quiz'

                      const event =
                        getField(
                          log,
                          'eventType',
                          'event_type',
                        ) ||
                        log.event ||
                        log.action ||
                        log.type ||
                        'Suspicious Activity'

                      const timestamp =
                        getField(
                          log,
                          'timestamp',
                          'created_at',
                        ) ||
                        log.createdAt ||
                        null

                      return (
                        <tr
                          key={
                            log.id ||
                            index
                          }
                        >
                          <td>
                            {student}
                          </td>

                          <td>
                            {quiz}
                          </td>

                          <td>
                            {getWarningLabel(
                              log,
                            )}
                          </td>

                          <td>
                            {timestamp
                              ? new Date(
                                  timestamp,
                                ).toLocaleString()
                              : '—'}
                          </td>

                          <td>
                            <span className="status-badge warning">
                              Flagged
                            </span>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default TeacherDashboard