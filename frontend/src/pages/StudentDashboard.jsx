import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

function StudentDashboard({
  studentId = 'KIPM-STU-2026-001',
  studentName = 'Demo Student',
  instituteCode = 'KIPM',
  instituteName = 'KIPM',
}) {
  const [activeTab, setActiveTab] = useState('quizzes')

  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [attemptQuestions, setAttemptQuestions] = useState([])
  const [answers, setAnswers] = useState({})

  const [timeLeft, setTimeLeft] = useState(0)

  const [attemptStarted, setAttemptStarted] = useState(false)
  const [attemptCompleted, setAttemptCompleted] = useState(false)

  const [warnings, setWarnings] = useState(0)
  const [antiCheatEvents, setAntiCheatEvents] = useState([])

  const [result, setResult] = useState(null)

  const [attemptId, setAttemptId] = useState('')
  const [attemptStartedAt, setAttemptStartedAt] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitLockRef = useRef(false)

  /*
   * Prevents repeated identical anti-cheat
   * events from firing too quickly.
   */
  const antiCheatThrottleRef = useRef({})

  /*
   * ====================================================
   * HELPERS
   * ====================================================
   */

  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()

  const readArray = (key) => {
    try {
      const saved = localStorage.getItem(key)

      if (!saved) {
        return []
      }

      const parsed = JSON.parse(saved)

      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error(`Unable to read ${key}:`, error)
      return []
    }
  }

  const generateId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`

  const shuffleArray = (array) => {
    const shuffled = [...array]

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const randomIndex = Math.floor(
        Math.random() * (i + 1),
      )

      ;[shuffled[i], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[i],
      ]
    }

    return shuffled
  }

  /*
   * ====================================================
   * LOAD LOCAL QUIZZES
   * ====================================================
   */

  const loadLocalQuizData = useCallback(() => {
    try {
      return readArray('quizvigil_quizzes')
    } catch (error) {
      console.error('Unable to load local quizzes:', error)
      return []
    }
  }, [])

  /*
   * ====================================================
   * LOAD BACKEND QUIZZES
   * ====================================================
   */

  const loadQuizData = useCallback(async () => {
    const localQuizzes = loadLocalQuizData()

    try {
      const response = await fetch(
        `/api/quizzes?instituteCode=${encodeURIComponent(
          instituteCode,
        )}`,
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to load backend quizzes',
        )
      }

      const backendQuizzes = Array.isArray(data.quizzes)
        ? data.quizzes
        : []

      const merged = [...backendQuizzes]

      localQuizzes.forEach((localQuiz) => {
        const alreadyExists = merged.some(
          (quiz) => String(quiz.id) === String(localQuiz.id),
        )

        if (!alreadyExists) {
          merged.push(localQuiz)
        }
      })

      setQuizzes(merged)
    } catch (error) {
      console.error(
        'Unable to load backend quizzes. Using local quizzes:',
        error,
      )

      setQuizzes(localQuizzes)
    }
  }, [instituteCode, loadLocalQuizData])

  /*
   * ====================================================
   * INITIAL QUIZ LOAD
   * ====================================================
   */

  useEffect(() => {
    loadQuizData()
  }, [loadQuizData])

  /*
   * ====================================================
   * QUIZ SYNC
   * ====================================================
   */

  useEffect(() => {
    if (attemptStarted || attemptCompleted) {
      return
    }

    const interval = setInterval(() => {
      loadQuizData()
    }, 5000)

    return () => clearInterval(interval)
  }, [
    attemptStarted,
    attemptCompleted,
    loadQuizData,
  ])

  /*
   * ====================================================
   * KEEP SELECTED QUIZ IN SYNC
   * ====================================================
   */

  useEffect(() => {
    if (!selectedQuiz) {
      return
    }

    const latestQuiz = quizzes.find(
      (quiz) => String(quiz.id) === String(selectedQuiz.id),
    )

    if (!latestQuiz) {
      return
    }

    if (
      latestQuiz.status !== selectedQuiz.status ||
      latestQuiz.startedAt !== selectedQuiz.startedAt ||
      latestQuiz.stoppedAt !== selectedQuiz.stoppedAt
    ) {
      setSelectedQuiz(latestQuiz)
    }
  }, [quizzes, selectedQuiz])

  /*
   * ====================================================
   * INSTITUTE QUIZZES
   * ====================================================
   */

  const instituteQuizzes = quizzes.filter(
    (quiz) =>
      normalize(quiz.instituteCode) ===
      normalize(instituteCode),
  )

  const isLiveStatus = (status) =>
    normalize(status) === 'live'

  const isWaitingStatus = (status) => {
    const normalized = normalize(status)

    return (
      normalized === 'draft' ||
      normalized === 'scheduled' ||
      normalized === 'ready' ||
      normalized === 'running'
    )
  }

  const isCompletedStatus = (status) => {
    const normalized = normalize(status)

    return (
      normalized === 'completed' ||
      normalized === 'stopped' ||
      normalized === 'closed'
    )
  }

  const liveQuizzes = instituteQuizzes.filter((quiz) =>
    isLiveStatus(quiz.status),
  )

  const waitingQuizzes = instituteQuizzes.filter((quiz) =>
    isWaitingStatus(quiz.status),
  )

  const completedQuizzes = instituteQuizzes.filter((quiz) =>
    isCompletedStatus(quiz.status),
  )

  /*
   * ====================================================
   * PREVIOUS ATTEMPT
   * ====================================================
   */

  const hasAlreadyAttempted = (quizId) => {
    const results = readArray('quizvigil_results')

    return results.some(
      (item) =>
        normalize(item.studentId) ===
          normalize(studentId) &&
        String(item.quizId) === String(quizId),
    )
  }

  /*
   * ====================================================
   * ENTER FULLSCREEN
   * ====================================================
   */

  const handleEnterFullscreen = async () => {
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen()
      }
    } catch (error) {
      console.log(
        'Fullscreen request was not available:',
        error,
      )
    }
  }

  /*
   * ====================================================
   * ANTI-CHEAT LOGGER
   * ====================================================
   */

  const logSuspiciousEvent = useCallback(
    async (eventType) => {
      if (
        !attemptStarted ||
        attemptCompleted ||
        !selectedQuiz ||
        !attemptId
      ) {
        return
      }

      const now = Date.now()

      const lastEventTime =
        antiCheatThrottleRef.current[eventType] || 0

      if (now - lastEventTime < 2000) {
        return
      }

      antiCheatThrottleRef.current[eventType] = now

      const timestamp = new Date().toISOString()

      const eventDetails = {
        eventType,
        studentId,
        studentName,
        instituteCode,
        instituteName,
        quizId: selectedQuiz.id || '',
        quizTitle: selectedQuiz.title || '',
        timestamp,
      }

      const newLog = {
        id: generateId('AC'),
        attemptId,
        studentId,
        studentName,
        instituteCode,
        instituteName,
        quizId: selectedQuiz.id || '',
        quizTitle: selectedQuiz.title || '',
        eventType,
        timestamp,
      }

      setAntiCheatEvents((current) => [
        ...current,
        newLog,
      ])

      setWarnings((current) => current + 1)

      try {
        const response = await fetch(
          `/api/attempts/${attemptId}/anti-cheat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentId,
              quizId: selectedQuiz.id,
              eventType,
              eventDetails: JSON.stringify(
                eventDetails,
              ),
            }),
          },
        )

        let data = {}

        try {
          data = await response.json()
        } catch {
          data = {}
        }

        if (!response.ok || !data.success) {
          console.error(
            'Anti-cheat backend logging failed:',
            data.message ||
              `HTTP ${response.status}`,
          )

          return
        }

        console.log(
          'Anti-cheat event saved to Neon:',
          data.log,
        )
      } catch (error) {
        console.error(
          'Unable to save anti-cheat event:',
          error,
        )
      }
    },
    [
      attemptStarted,
      attemptCompleted,
      selectedQuiz,
      attemptId,
      studentId,
      studentName,
      instituteCode,
      instituteName,
    ],
  )

  /*
   * ====================================================
   * START ATTEMPT
   * ====================================================
   */

  const handleStartAttempt = async (quiz) => {
    if (!isLiveStatus(quiz.status)) {
      return
    }

    if (hasAlreadyAttempted(quiz.id)) {
      alert('You have already attempted this quiz.')
      return
    }

    try {
      const response = await fetch('/api/attempts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          studentName,
          instituteCode,
          instituteName,
          quizId: quiz.id,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to start quiz',
        )
      }

      const backendQuestions = Array.isArray(data.questions)
        ? data.questions
        : []

      if (backendQuestions.length === 0) {
        alert('No questions are available for this quiz.')
        return
      }

      const mappedQuestions = backendQuestions.map(
        (question) => ({
          id:
            question.questionId ||
            question.id,

          question:
            question.question || '',

          optionA:
            question.optionA ||
            question.option_a ||
            '',

          optionB:
            question.optionB ||
            question.option_b ||
            '',

          optionC:
            question.optionC ||
            question.option_c ||
            '',

          optionD:
            question.optionD ||
            question.option_d ||
            '',

          marks:
            Number(question.marks || 1),
        }),
      )

      const durationMinutes = Number(
        data.quiz?.durationMinutes ??
          data.quiz?.duration_minutes ??
          quiz.durationMinutes ??
          quiz.duration ??
          0,
      )

      if (durationMinutes <= 0) {
        alert(
          'Quiz duration is not configured correctly.',
        )
        return
      }

      setSelectedQuiz(quiz)
      setAttemptQuestions(mappedQuestions)
      setAnswers({})
      setWarnings(0)
      setAntiCheatEvents([])
      setResult(null)
      setAttemptCompleted(false)
      setIsSubmitting(false)

      submitLockRef.current = false
      antiCheatThrottleRef.current = {}

      setAttemptId(data.attemptId)

      setAttemptStartedAt(
        data.startedAt ||
          data.attempt?.startedAt ||
          new Date().toISOString(),
      )

      setTimeLeft(durationMinutes * 60)

      setAttemptStarted(true)
      setActiveTab('attempt')

      try {
        await handleEnterFullscreen()
      } catch {
        // Fullscreen is optional.
      }
    } catch (error) {
      console.error(
        'Unable to start backend attempt:',
        error,
      )

      alert(
        error.message ||
          'Unable to start quiz. Please try again.',
      )
    }
  }

  /*
   * ====================================================
   * STABLE TIMER
   * ====================================================
   */

  useEffect(() => {
    if (
      !attemptStarted ||
      attemptCompleted ||
      timeLeft <= 0
    ) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [attemptStarted, attemptCompleted])

  /*
   * ====================================================
   * AUTO SUBMIT
   * ====================================================
   */

  useEffect(() => {
    if (
      attemptStarted &&
      !attemptCompleted &&
      timeLeft === 0 &&
      attemptId &&
      !isSubmitting
    ) {
      handleSubmitQuiz(true)
    }
  }, [
    timeLeft,
    attemptStarted,
    attemptCompleted,
    attemptId,
    isSubmitting,
  ])

  /*
   * ====================================================
   * ANTI-CHEAT EVENTS
   * ====================================================
   */

  useEffect(() => {
    if (
      !attemptStarted ||
      attemptCompleted
    ) {
      return
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'hidden'
      ) {
        logSuspiciousEvent(
          'TAB_SWITCH',
        )
      }
    }

    const handleWindowBlur = () => {
      logSuspiciousEvent(
        'WINDOW_BLUR',
      )
    }

    const handleFullscreenChange = () => {
      if (
        document.fullscreenElement === null
      ) {
        logSuspiciousEvent(
          'FULLSCREEN_EXIT',
        )
      }
    }

    const handleCopy = () => {
      logSuspiciousEvent(
        'COPY_ATTEMPT',
      )
    }

    const handleCut = () => {
      logSuspiciousEvent(
        'CUT_ATTEMPT',
      )
    }

    const handlePaste = () => {
      logSuspiciousEvent(
        'PASTE_ATTEMPT',
      )
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    window.addEventListener(
      'blur',
      handleWindowBlur,
    )

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange,
    )

    document.addEventListener(
      'copy',
      handleCopy,
    )

    document.addEventListener(
      'cut',
      handleCut,
    )

    document.addEventListener(
      'paste',
      handlePaste,
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )

      window.removeEventListener(
        'blur',
        handleWindowBlur,
      )

      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange,
      )

      document.removeEventListener(
        'copy',
        handleCopy,
      )

      document.removeEventListener(
        'cut',
        handleCut,
      )

      document.removeEventListener(
        'paste',
        handlePaste,
      )
    }
  }, [
    attemptStarted,
    attemptCompleted,
    logSuspiciousEvent,
  ])

  /*
   * ====================================================
   * FORMAT TIMER
   * ====================================================
   */

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(
      0,
      Number(seconds) || 0,
    )

    const minutes = Math.floor(
      safeSeconds / 60,
    )

    const remainingSeconds =
      safeSeconds % 60

    return `${String(minutes).padStart(
      2,
      '0',
    )}:${String(
      remainingSeconds,
    ).padStart(2, '0')}`
  }

  /*
   * ====================================================
   * SAVE ANSWER
   * ====================================================
   */

  const handleAnswerChange = async (
    questionId,
    answer,
  ) => {
    if (
      !attemptStarted ||
      attemptCompleted ||
      !attemptId ||
      isSubmitting
    ) {
      return
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: answer,
    }))

    try {
      const response = await fetch(
        `/api/attempts/${attemptId}/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            questionId,
            selectedAnswer: answer,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error(
          'Backend answer save failed:',
          data.message,
        )
      }
    } catch (error) {
      console.error(
        'Unable to save answer to backend:',
        error,
      )
    }
  }

  /*
   * ====================================================
   * SUBMIT QUIZ
   * ====================================================
   */

  const handleSubmitQuiz = async (
    autoSubmitted = false,
  ) => {
    if (
      !selectedQuiz ||
      attemptCompleted ||
      isSubmitting ||
      submitLockRef.current
    ) {
      return
    }

    submitLockRef.current = true
    setIsSubmitting(true)

    const completedAt =
      new Date().toISOString()

    const finalAttemptId =
      attemptId ||
      generateId('ATT')

    const total =
      attemptQuestions.length

    const totalMarks =
      attemptQuestions.reduce(
        (sum, question) =>
          sum +
          Number(
            question.marks || 0,
          ),
        0,
      )

    const finalWarnings =
      Number(warnings || 0)

    const finalAntiCheatEvents = [
      ...antiCheatEvents,
    ]

    let backendResult = null

    /*
     * ----------------------------------------------------
     * BACKEND SUBMIT
     * ----------------------------------------------------
     */

    try {
      if (!attemptId) {
        throw new Error(
          'Attempt ID is missing.',
        )
      }

      const response = await fetch(
        `/api/attempts/${attemptId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      )

      const data = await response.json()

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Backend submission failed',
        )
      }

      backendResult =
        data.result || null
    } catch (error) {
      console.error(
        'Backend submit failed:',
        error,
      )

      alert(
        'Quiz could not be finalized on the server. Please try submitting again.',
      )

      submitLockRef.current = false
      setIsSubmitting(false)

      return
    }

    /*
     * ----------------------------------------------------
     * SERVER RESULT
     * ----------------------------------------------------
     */

    const finalScore =
      Number(
        backendResult?.score ?? 0,
      )

    const finalTotalMarks =
      Number(
        backendResult?.totalMarks ??
          totalMarks,
      )

    const finalPercentage =
      Number(
        backendResult?.percentage ??
          (
            finalTotalMarks > 0
              ? Math.round(
                  (finalScore /
                    finalTotalMarks) *
                    100,
                )
              : 0
          ),
      )

    const finalCorrect =
      Number(
        backendResult?.correct ?? 0,
      )

    const finalWrong =
      Number(
        backendResult?.wrong ?? 0,
      )

    const finalUnattempted =
      Number(
        backendResult?.unattempted ??
          Math.max(
            0,
            total -
              finalCorrect -
              finalWrong,
          ),
      )

    /*
     * Do NOT calculate correctness on client.
     * Backend owns the correct answer.
     */

    const answerDetails =
      attemptQuestions.map(
        (question) => ({
          questionId:
            question.id,

          question:
            question.question || '',

          optionA:
            question.optionA || '',

          optionB:
            question.optionB || '',

          optionC:
            question.optionC || '',

          optionD:
            question.optionD || '',

          selectedAnswer:
            answers[question.id] ||
            null,

          marks:
            Number(
              question.marks || 0,
            ),
        }),
      )

    const attemptResult = {
      attemptId:
        finalAttemptId,

      studentId,

      studentName,

      instituteCode,

      instituteName,

      quizId:
        selectedQuiz.id,

      quizTitle:
        selectedQuiz.title,

      subject:
        selectedQuiz.subject || '',

      teacherId:
        selectedQuiz.teacherId || '',

      teacherName:
        selectedQuiz.teacherName ||
        'Teacher',

      totalQuestions:
        total,

      correct:
        finalCorrect,

      wrong:
        finalWrong,

      unattempted:
        finalUnattempted,

      score:
        finalScore,

      totalMarks:
        finalTotalMarks,

      percentage:
        finalPercentage,

      warnings:
        finalWarnings,

      antiCheatWarnings:
        finalWarnings,

      antiCheatEvents:
        finalAntiCheatEvents,

      autoSubmitted,

      startedAt:
        attemptStartedAt ||
        new Date().toISOString(),

      completedAt,

      submittedAt:
        completedAt,

      answers:
        answerDetails,
    }

    /*
     * ----------------------------------------------------
     * SAVE LOCAL RESULT
     * ----------------------------------------------------
     */

    try {
      const results =
        readArray(
          'quizvigil_results',
        )

      const existingResult =
        results.find(
          (item) =>
            item.attemptId ===
            finalAttemptId,
        )

      if (!existingResult) {
        results.push(
          attemptResult,
        )

        localStorage.setItem(
          'quizvigil_results',
          JSON.stringify(
            results,
          ),
        )
      }
    } catch (error) {
      console.error(
        'Unable to save quiz result:',
        error,
      )
    }

    /*
     * ----------------------------------------------------
     * SAVE INDIVIDUAL ANSWERS LOCALLY
     * ----------------------------------------------------
     */

    try {
      const answerRecords =
        readArray(
          'quizvigil_answers',
        )

      answerDetails.forEach(
        (answer) => {
          answerRecords.push({
            id: generateId('ANS'),

            attemptId:
              finalAttemptId,

            studentId,

            studentName,

            instituteCode,

            instituteName,

            quizId:
              selectedQuiz.id,

            quizTitle:
              selectedQuiz.title,

            questionId:
              answer.questionId,

            question:
              answer.question,

            optionA:
              answer.optionA,

            optionB:
              answer.optionB,

            optionC:
              answer.optionC,

            optionD:
              answer.optionD,

            selectedAnswer:
              answer.selectedAnswer,

            marks:
              answer.marks,

            submittedAt:
              completedAt,
          })
        },
      )

      localStorage.setItem(
        'quizvigil_answers',
        JSON.stringify(
          answerRecords,
        ),
      )
    } catch (error) {
      console.error(
        'Unable to save answer records:',
        error,
      )
    }

    /*
     * ----------------------------------------------------
     * SAVE LOCAL ATTEMPT RECORD
     * ----------------------------------------------------
     */

    try {
      const attempts =
        readArray(
          'quizvigil_attempts',
        )

      const existingAttempt =
        attempts.find(
          (item) =>
            item.attemptId ===
            finalAttemptId,
        )

      const attemptRecord = {
        attemptId:
          finalAttemptId,

        studentId,

        studentName,

        instituteCode,

        instituteName,

        quizId:
          selectedQuiz.id,

        quizTitle:
          selectedQuiz.title,

        teacherId:
          selectedQuiz.teacherId ||
          '',

        teacherName:
          selectedQuiz.teacherName ||
          'Teacher',

        startedAt:
          attemptStartedAt ||
          new Date().toISOString(),

        submittedAt:
          completedAt,

        status:
          'Completed',

        autoSubmitted,

        totalQuestions:
          total,

        correct:
          finalCorrect,

        wrong:
          finalWrong,

        unattempted:
          finalUnattempted,

        score:
          finalScore,

        totalMarks:
          finalTotalMarks,

        percentage:
          finalPercentage,

        warnings:
          finalWarnings,
      }

      if (!existingAttempt) {
        attempts.push(
          attemptRecord,
        )

        localStorage.setItem(
          'quizvigil_attempts',
          JSON.stringify(
            attempts,
          ),
        )
      }
    } catch (error) {
      console.error(
        'Unable to save attempt record:',
        error,
      )
    }

    /*
     * ----------------------------------------------------
     * EXIT FULLSCREEN AFTER SUBMISSION
     * ----------------------------------------------------
     */

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      // Fullscreen exit is optional.
    }

    /*
     * ----------------------------------------------------
     * FINISH
     * ----------------------------------------------------
     */

    window.dispatchEvent(
      new Event(
        'quizvigil-result-updated',
      ),
    )

    setResult(
      attemptResult,
    )

    setAttemptCompleted(true)
    setAttemptStarted(false)
    setTimeLeft(0)
    setIsSubmitting(false)
    submitLockRef.current = false
  }

  /*
   * ====================================================
   * BACK TO QUIZZES
   * ====================================================
   */

  const handleBackToQuizzes = () => {
    setSelectedQuiz(null)
    setAttemptQuestions([])
    setAnswers({})
    setResult(null)
    setAttemptCompleted(false)
    setAttemptStarted(false)
    setWarnings(0)
    setAntiCheatEvents([])
    setAttemptId('')
    setAttemptStartedAt(null)
    setTimeLeft(0)
    setIsSubmitting(false)

    submitLockRef.current = false
    antiCheatThrottleRef.current = {}

    loadQuizData()

    setActiveTab('quizzes')
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
   * RENDER
   * ====================================================
   */

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            STUDENT PANEL
          </p>

          <h1>
            Welcome, {studentName}
          </h1>

          <p>
            {studentId} • {instituteName}
          </p>
        </div>

        <button
          className="dashboard-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {!attemptStarted &&
        !attemptCompleted && (
          <>
            <div className="admin-tabs">
              <button
                className={
                  activeTab === 'quizzes'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveTab('quizzes')
                }
              >
                Available Quizzes
              </button>

              <button
                className={
                  activeTab === 'history'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveTab('history')
                }
              >
                My Results
              </button>

              <button
                className={
                  activeTab === 'profile'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveTab('profile')
                }
              >
                Profile
              </button>
            </div>

            {activeTab === 'quizzes' && (
              <div className="dashboard-card">
                <div className="section-header">
                  <div>
                    <h2>
                      Available Quizzes
                    </h2>

                    <p>
                      Quizzes created by
                      teachers in your
                      institute.
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      justifyContent:
                        'flex-end',
                    }}
                  >
                    <span className="institute-status">
                      {liveQuizzes.length}{' '}
                      Live
                    </span>

                    <span
                      className="institute-status inactive"
                      style={{
                        background:
                          '#fef3c7',
                        color:
                          '#92400e',
                      }}
                    >
                      {waitingQuizzes.length}{' '}
                      Waiting
                    </span>

                    <span
                      className="institute-status inactive"
                      style={{
                        background:
                          '#e2e8f0',
                        color:
                          '#475569',
                      }}
                    >
                      {completedQuizzes.length}{' '}
                      Closed
                    </span>
                  </div>
                </div>

                {instituteQuizzes.length ===
                0 ? (
                  <div className="empty-state">
                    <h3>
                      No quizzes available
                    </h3>

                    <p>
                      Your teacher has not
                      created a quiz yet.
                    </p>
                  </div>
                ) : (
                  <div className="institute-list">
                    {instituteQuizzes.map(
                      (quiz) => {
                        const alreadyAttempted =
                          hasAlreadyAttempted(
                            quiz.id,
                          )

                        const live =
                          isLiveStatus(
                            quiz.status,
                          )

                        return (
                          <div
                            className="institute-item"
                            key={quiz.id}
                          >
                            <div>
                              <h3>
                                {quiz.title}
                              </h3>

                              <p>
                                Subject:{' '}
                                {quiz.subject ||
                                  'General'}
                              </p>

                              <p>
                                {quiz.questionCount ||
                                  quiz.question_count ||
                                  0}{' '}
                                questions
                                {' • '}
                                {Number(
                                  quiz.durationMinutes ??
                                    quiz.duration_minutes ??
                                    quiz.duration ??
                                    0,
                                )}{' '}
                                minutes
                              </p>

                              <p>
                                Teacher:{' '}
                                {quiz.teacherName ||
                                  quiz.teacher_name ||
                                  'Teacher'}
                              </p>

                              {quiz.className && (
                                <p>
                                  Class:{' '}
                                  {quiz.className}
                                </p>
                              )}

                              {quiz.section && (
                                <p>
                                  Section:{' '}
                                  {quiz.section}
                                </p>
                              )}

                              <p>
                                Status:{' '}
                                {quiz.status}
                              </p>
                            </div>

                            <div className="institute-actions">
                              <span
                                className={
                                  live
                                    ? 'institute-status'
                                    : isCompletedStatus(
                                        quiz.status,
                                      )
                                    ? 'institute-status inactive'
                                    : 'institute-status'
                                }
                              >
                                {live
                                  ? 'LIVE'
                                  : isWaitingStatus(
                                      quiz.status,
                                    )
                                  ? 'WAITING'
                                  : quiz.status}
                              </span>

                              {live &&
                                (alreadyAttempted ? (
                                  <button
                                    className="institute-action-btn"
                                    disabled
                                    style={{
                                      background:
                                        '#e2e8f0',
                                      color:
                                        '#64748b',
                                      cursor:
                                        'not-allowed',
                                    }}
                                  >
                                    Attempted
                                  </button>
                                ) : (
                                  <button
                                    className="institute-action-btn activate"
                                    onClick={() =>
                                      handleStartAttempt(
                                        quiz,
                                      )
                                    }
                                  >
                                    Start Quiz
                                  </button>
                                ))}
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <StudentHistory
                studentId={studentId}
                instituteCode={
                  instituteCode
                }
              />
            )}

            {activeTab === 'profile' && (
              <div className="dashboard-card">
                <h2>
                  Student Profile
                </h2>

                <div
                  style={{
                    marginTop: '20px',
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  <p>
                    <strong>
                      Student ID:
                    </strong>{' '}
                    {studentId}
                  </p>

                  <p>
                    <strong>
                      Name:
                    </strong>{' '}
                    {studentName}
                  </p>

                  <p>
                    <strong>
                      Institute:
                    </strong>{' '}
                    {instituteName}
                  </p>

                  <p>
                    <strong>
                      Institute Code:
                    </strong>{' '}
                    {instituteCode}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

      {attemptStarted &&
        !attemptCompleted &&
        selectedQuiz && (
          <div className="dashboard-card">
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom:
                  '1px solid #dbe7f8',
              }}
            >
              <div>
                <p className="dashboard-eyebrow">
                  LIVE QUIZ
                </p>

                <h2>
                  {selectedQuiz.title}
                </h2>

                <p>
                  {selectedQuiz.subject ||
                    'General'}
                  {' • '}
                  {selectedQuiz.teacherName ||
                    selectedQuiz.teacher_name ||
                    'Teacher'}
                </p>
              </div>

              <div
                style={{
                  textAlign: 'right',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginBottom:
                      '4px',
                  }}
                >
                  TIME REMAINING
                </div>

                <strong
                  style={{
                    fontSize: '28px',
                    color:
                      timeLeft <= 60
                        ? '#dc2626'
                        : '#2563eb',
                  }}
                >
                  {formatTime(
                    timeLeft,
                  )}
                </strong>
              </div>
            </div>

            <div
              style={{
                marginBottom: '20px',
                padding: '14px 16px',
                borderRadius: '10px',
                background: '#eff6ff',
                border:
                  '1px solid #bfdbfe',
                color: '#1e40af',
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <strong>
                  Quiz Security Active
                </strong>

                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '13px',
                  }}
                >
                  Tab switching, window
                  changes and fullscreen
                  exits are monitored.
                </div>
              </div>

              <button
                className="institute-action-btn activate"
                onClick={
                  handleEnterFullscreen
                }
              >
                Enter Fullscreen
              </button>
            </div>

            {warnings > 0 && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: '#fff7ed',
                  border:
                    '1px solid #fed7aa',
                  color: '#9a3412',
                  fontWeight: '600',
                }}
              >
                Suspicious activity
                detected:{' '}
                {warnings} event
                {warnings > 1
                  ? 's'
                  : ''}
                .
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: '24px',
              }}
            >
              {attemptQuestions.map(
                (question, index) => (
                  <div
                    key={question.id}
                    style={{
                      padding: '22px',
                      border:
                        '1px solid #dbe7f8',
                      borderRadius: '14px',
                      background:
                        '#ffffff',
                    }}
                  >
                    <p
                      style={{
                        marginBottom:
                          '10px',
                        color:
                          '#2563eb',
                        fontWeight:
                          '700',
                        fontSize:
                          '13px',
                      }}
                    >
                      Question{' '}
                      {index + 1}
                      {' • '}
                      {Number(
                        question.marks ||
                          0,
                      )}{' '}
                      marks
                    </p>

                    <h3
                      style={{
                        marginBottom:
                          '18px',
                        color:
                          '#0f172a',
                      }}
                    >
                      {question.question}
                    </h3>

                    <div
                      style={{
                        display: 'grid',
                        gap: '10px',
                      }}
                    >
                      {[
                        [
                          'A',
                          question.optionA,
                        ],
                        [
                          'B',
                          question.optionB,
                        ],
                        [
                          'C',
                          question.optionC,
                        ],
                        [
                          'D',
                          question.optionD,
                        ],
                      ].map(
                        ([letter, text]) => (
                          <label
                            key={letter}
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: '10px',
                              padding:
                                '13px 15px',
                              border:
                                '1px solid #dbe7f8',
                              borderRadius:
                                '9px',
                              cursor:
                                'pointer',
                              background:
                                answers[
                                  question.id
                                ] ===
                                letter
                                  ? '#eff6ff'
                                  : '#ffffff',
                            }}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={
                                letter
                              }
                              checked={
                                answers[
                                  question.id
                                ] ===
                                letter
                              }
                              disabled={
                                isSubmitting
                              }
                              onChange={() =>
                                handleAnswerChange(
                                  question.id,
                                  letter,
                                )
                              }
                            />

                            <span>
                              <strong>
                                {letter}.
                              </strong>{' '}
                              {text}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
                marginTop: '28px',
                paddingTop: '22px',
                borderTop:
                  '1px solid #dbe7f8',
              }}
            >
              <p
                style={{
                  color: '#64748b',
                  margin: 0,
                }}
              >
                Answered:{' '}
                {
                  Object.keys(
                    answers,
                  ).length
                }
                {' / '}
                {attemptQuestions.length}
              </p>

              <button
                className="primary-btn"
                disabled={
                  isSubmitting
                }
                onClick={() => {
                  const confirmed =
                    window.confirm(
                      'Submit this quiz now?',
                    )

                  if (confirmed) {
                    handleSubmitQuiz(
                      false,
                    )
                  }
                }}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : 'Submit Quiz'}
              </button>
            </div>
          </div>
        )}

      {attemptCompleted &&
        result && (
          <div className="dashboard-card">
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
              }}
            >
              <p className="dashboard-eyebrow">
                QUIZ COMPLETED
              </p>

              <h2>
                {result.quizTitle}
              </h2>

              <p>
                Your result has been
                recorded.
              </p>

              <div
                className="dashboard-stats"
                style={{
                  marginTop: '28px',
                }}
              >
                <div className="stat-card">
                  <span>
                    Score
                  </span>

                  <strong>
                    {result.score}/
                    {
                      result.totalMarks
                    }
                  </strong>
                </div>

                <div className="stat-card">
                  <span>
                    Percentage
                  </span>

                  <strong>
                    {
                      result.percentage
                    }%
                  </strong>
                </div>

                <div className="stat-card">
                  <span>
                    Correct
                  </span>

                  <strong>
                    {
                      result.correct
                    }
                  </strong>
                </div>

                <div className="stat-card">
                  <span>
                    Wrong
                  </span>

                  <strong>
                    {result.wrong}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  marginTop: '24px',
                  padding: '16px',
                  borderRadius:
                    '10px',
                  background:
                    '#f8fafc',
                }}
              >
                <p>
                  Total Questions:{' '}
                  <strong>
                    {
                      result.totalQuestions
                    }
                  </strong>
                </p>

                <p>
                  Unattempted:{' '}
                  <strong>
                    {
                      result.unattempted
                    }
                  </strong>
                </p>

                <p>
                  Anti-cheat
                  warnings:{' '}
                  <strong>
                    {result.warnings}
                  </strong>
                </p>

                {result.autoSubmitted && (
                  <p
                    style={{
                      color:
                        '#dc2626',
                      fontWeight:
                        '700',
                    }}
                  >
                    Quiz was
                    automatically
                    submitted
                    because the
                    timer ended.
                  </p>
                )}
              </div>

              <button
                className="primary-btn"
                style={{
                  marginTop: '24px',
                }}
                onClick={
                  handleBackToQuizzes
                }
              >
                Back to Quizzes
              </button>
            </div>
          </div>
        )}
    </div>
  )
}

/*
 * ======================================================
 * STUDENT HISTORY
 * ======================================================
 */

function StudentHistory({
  studentId,
  instituteCode,
}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const loadResults = async () => {
    try {
      setLoading(true)

      /*
       * Load student's backend attempts and
       * institute quizzes together.
       *
       * Subject is taken from the quiz record
       * using quizId, so it does not fall back
       * to "General" unnecessarily.
       */
      const [
        attemptsResponse,
        quizzesResponse,
      ] = await Promise.all([
        fetch(
          `/api/attempts/student/${encodeURIComponent(
            studentId,
          )}`,
        ),

        fetch(
          `/api/quizzes?instituteCode=${encodeURIComponent(
            instituteCode,
          )}`,
        ),
      ])

      const attemptsData =
        await attemptsResponse.json()

      const quizzesData =
        await quizzesResponse.json()

      if (
        !attemptsResponse.ok ||
        !attemptsData.success
      ) {
        throw new Error(
          attemptsData.message ||
            'Unable to load student results',
        )
      }

      if (
        !quizzesResponse.ok ||
        !quizzesData.success
      ) {
        throw new Error(
          quizzesData.message ||
            'Unable to load quizzes',
        )
      }

      const backendAttempts =
        Array.isArray(
          attemptsData.attempts,
        )
          ? attemptsData.attempts
          : Array.isArray(
                attemptsData.results,
              )
            ? attemptsData.results
            : Array.isArray(
                  attemptsData.data,
                )
              ? attemptsData.data
              : []

      const backendQuizzes =
        Array.isArray(
          quizzesData.quizzes,
        )
          ? quizzesData.quizzes
          : []

      /*
       * Create quiz lookup by quiz ID.
       */
      const quizMap = new Map()

      backendQuizzes.forEach(
        (quiz) => {
          quizMap.set(
            String(quiz.id),
            quiz,
          )
        },
      )

      /*
       * Only show backend attempts belonging
       * to this institute.
       */
      const filteredAttempts =
        backendAttempts.filter(
          (item) =>
            normalizeValue(
              item.instituteCode ||
                item.institute_code,
            ) ===
            normalizeValue(
              instituteCode,
            ),
        )

      /*
       * Add missing quiz information from
       * the actual quiz record.
       */
      const enrichedResults =
        filteredAttempts.map(
          (item) => {
            const quiz =
              quizMap.get(
                String(
                  item.quizId ||
                    item.quiz_id ||
                    '',
                ),
              )

            return {
              ...item,

              subject:
                item.subject ||
                item.quizSubject ||
                item.quiz_subject ||
                quiz?.subject ||
                '',

              quizTitle:
                item.quizTitle ||
                item.quiz_title ||
                item.title ||
                quiz?.title ||
                'Quiz',

              teacherName:
                item.teacherName ||
                item.teacher_name ||
                quiz?.teacherName ||
                quiz?.teacher_name ||
                'Teacher',
            }
          },
        )

      setResults(
        enrichedResults,
      )
    } catch (error) {
      console.error(
        'Unable to load backend student results:',
        error,
      )

      /*
       * Only use local results if the backend
       * request itself fails.
       *
       * This prevents old local records from
       * being mixed into successful backend data.
       */
      const savedResults =
        readResults()

      const localResults =
        savedResults.filter(
          (item) =>
            normalizeValue(
              item.studentId,
            ) ===
              normalizeValue(
                studentId,
              ) &&
            normalizeValue(
              item.instituteCode,
            ) ===
              normalizeValue(
                instituteCode,
              ),
        )

      setResults(
        localResults,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResults()

    const handleStorageChange =
      () => {
        loadResults()
      }

    const handleFocus = () => {
      loadResults()
    }

    const handleResultUpdated =
      () => {
        loadResults()
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
      handleResultUpdated,
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
        handleResultUpdated,
      )
    }
  }, [
    studentId,
    instituteCode,
  ])

  return (
    <div className="dashboard-card">
      <div
        className="section-header"
        style={{
          alignItems: 'center',
        }}
      >
        <div>
          <h2>
            My Results
          </h2>

          <p>
            Your completed quiz attempts.
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={loadResults}
          disabled={loading}
        >
          {loading
            ? 'Loading...'
            : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <h3>
            Loading results...
          </h3>

          <p>
            Fetching your quiz results from
            the server.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <h3>
            No results yet
          </h3>

          <p>
            Complete a quiz to see your
            results here.
          </p>
        </div>
      ) : (
        <div className="institute-list">
          {results.map(
            (item, index) => {
              const score =
                Number(
                  item.score ??
                    item.total_score ??
                    0,
                )

              const totalMarks =
                Number(
                  item.totalMarks ??
                    item.total_marks ??
                    0,
                )

              const percentage =
                Number(
                  item.percentage ??
                    (
                      totalMarks > 0
                        ? Math.round(
                            (score /
                              totalMarks) *
                              100,
                          )
                        : 0
                    ),
                )

              const correct =
                Number(
                  item.correct ?? 0,
                )

              const wrong =
                Number(
                  item.wrong ?? 0,
                )

              const unattempted =
                Number(
                  item.unattempted ?? 0,
                )

              const warnings =
                Number(
                  item.warnings ??
                    item.antiCheatWarnings ??
                    item.anti_cheat_warnings ??
                    0,
                )

              const quizTitle =
                item.quizTitle ||
                item.quiz_title ||
                item.title ||
                'Quiz'

              const subject =
                item.subject ||
                'Subject not available'

              const teacherName =
                item.teacherName ||
                item.teacher_name ||
                'Teacher'

              const attemptId =
                item.attemptId ||
                item.attempt_id ||
                `attempt-${index}`

              const submittedAt =
                item.submittedAt ||
                item.submitted_at ||
                item.completedAt ||
                item.completed_at

              return (
                <div
                  className="institute-item"
                  key={attemptId}
                >
                  <div>
                    <h3>
                      {quizTitle}
                    </h3>

                    <p>
                      Subject:{' '}
                      {subject}
                    </p>

                    <p>
                      Teacher:{' '}
                      {teacherName}
                    </p>

                    <p>
                      Score:{' '}
                      {score}/
                      {totalMarks}
                      {' • '}
                      {percentage}%
                    </p>

                    <p>
                      Correct:{' '}
                      {correct}
                      {' • '}
                      Wrong:{' '}
                      {wrong}
                      {' • '}
                      Unattempted:{' '}
                      {unattempted}
                    </p>

                    <p>
                      Anti-cheat
                      warnings:{' '}
                      {warnings}
                    </p>

                    {submittedAt && (
                      <p>
                        Submitted:{' '}
                        {new Date(
                          submittedAt,
                        ).toLocaleString()}
                      </p>
                    )}

                    <p>
                      Attempt ID:{' '}
                      {attemptId}
                    </p>
                  </div>

                  <div className="institute-actions">
                    <span className="institute-status">
                      Completed
                    </span>
                  </div>
                </div>
              )
            },
          )}
        </div>
      )}
    </div>
  )
}
/*
 * ======================================================
 * OUTSIDE COMPONENT HELPERS
 * ======================================================
 */

function readResults() {
  try {
    const savedResults =
      localStorage.getItem(
        'quizvigil_results',
      )

    if (!savedResults) {
      return []
    }

    const parsed =
      JSON.parse(savedResults)

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch (error) {
    console.error(
      'Unable to load student results:',
      error,
    )

    return []
  }
}

function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export default StudentDashboard