import { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import Register from './pages/Register'
import FounderDashboard from './pages/FounderDashboard'
import InstituteAdminDashboard from './pages/InstituteAdminDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import StudentDashboard from './pages/StudentDashboard'

function App() {
  const [showLogin, setShowLogin] = useState(false)

  const path = window.location.pathname

  const getCurrentUser = () => {
    const savedUser = localStorage.getItem(
      'quizvigil_current_user'
    )

    if (!savedUser) {
      return null
    }

    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem(
        'quizvigil_current_user'
      )
      return null
    }
  }

  const currentUser = getCurrentUser()

  if (showLogin) {
    return (
      <Login
        onLogin={(role, loggedInUser) => {
          setShowLogin(false)

          if (loggedInUser) {
            localStorage.setItem(
              'quizvigil_current_user',
              JSON.stringify(loggedInUser)
            )
          }

          if (role === 'student') {
            window.location.href = '/student'
          }

          if (role === 'teacher') {
            window.location.href = '/teacher'
          }

          if (role === 'admin') {
            localStorage.setItem(
              'quizvigil_current_user',
              JSON.stringify({
                role: 'admin',
                email: 'admin@kipm.edu.in',
                instituteCode: 'KIPM',
                instituteName: 'KIPM',
              })
            )

            window.location.href =
              '/institute-admin'
          }
        }}
      />
    )
  }

  if (path === '/register') {
    return <Register />
  }

  if (path === '/founder') {
    return <FounderDashboard />
  }

  if (path === '/institute-admin') {
    const instituteCode =
      currentUser?.instituteCode || 'KIPM'

    const instituteName =
      currentUser?.instituteName || 'KIPM'

    return (
      <InstituteAdminDashboard
        instituteCode={instituteCode}
        instituteName={instituteName}
      />
    )
  }

  if (path === '/teacher') {
    const teacherId =
      currentUser?.role === 'teacher'
        ? currentUser.id
        : 'KIPM-TCH-001'

    const teacherName =
      currentUser?.role === 'teacher'
        ? currentUser.name
        : 'Demo Teacher'

    const instituteCode =
      currentUser?.instituteCode || 'KIPM'

    const instituteName =
      currentUser?.instituteName || 'KIPM'

    return (
      <TeacherDashboard
        teacherId={teacherId}
        teacherName={teacherName}
        instituteCode={instituteCode}
        instituteName={instituteName}
      />
    )
  }

  if (path === '/student') {
    const studentId =
      currentUser?.role === 'student'
        ? currentUser.id
        : 'KIPM-STU-2026-001'

    const studentName =
      currentUser?.role === 'student'
        ? currentUser.name
        : 'Demo Student'

    const instituteCode =
      currentUser?.instituteCode || 'KIPM'

    const instituteName =
      currentUser?.instituteName || 'KIPM'

    return (
      <StudentDashboard
        studentId={studentId}
        studentName={studentName}
        instituteCode={instituteCode}
        instituteName={instituteName}
      />
    )
  }

  return (
    <div className="app">
      {/* Navbar */}
      <header className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-icon">Q</span>
            <span>QuizVigil</span>
          </div>

          <nav className="nav-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="nav-actions">
            <button
              className="login-btn"
              onClick={() => setShowLogin(true)}
            >
              Login
            </button>

            <button
              className="signup-btn"
              onClick={() => {
                window.location.href = '/register'
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="hero-badge">
              <span>●</span> Smart & Secure Online Assessment
            </div>

            <h1>
              Test Your Knowledge.
              <span> Stay Vigilant.</span>
            </h1>

            <p>
              QuizVigil is a modern online quiz platform designed for
              secure assessments, randomized questions, timed exams,
              and smart anti-cheat monitoring.
            </p>

            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={() => setShowLogin(true)}
              >
                Start Your Quiz →
              </button>

              <button
                className="secondary-btn"
                onClick={() => {
                  document
                    .getElementById('features')
                    ?.scrollIntoView({
                      behavior: 'smooth',
                    })
                }}
              >
                Explore Features
              </button>
            </div>

            <div className="hero-stats">
              <div>
                <strong>100%</strong>
                <span>Online</span>
              </div>

              <div>
                <strong>Secure</strong>
                <span>Assessment</span>
              </div>

              <div>
                <strong>Smart</strong>
                <span>Monitoring</span>
              </div>
            </div>
          </div>

          {/* Quiz Preview Card */}
          <div className="hero-visual">
            <div className="quiz-card">
              <div className="quiz-card-header">
                <div>
                  <span className="small-label">
                    LIVE QUIZ
                  </span>

                  <h3>
                    Computer Science Test
                  </h3>
                </div>

                <div className="timer">
                  24:38
                </div>
              </div>

              <div className="progress-area">
                <div className="progress-info">
                  <span>
                    Question 7 of 20
                  </span>

                  <span>35%</span>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>

              <h4>
                Which data structure follows the FIFO principle?
              </h4>

              <div className="options">
                <div className="option">
                  <span>A</span>
                  Stack
                </div>

                <div className="option selected">
                  <span>B</span>
                  Queue
                  <b>✓</b>
                </div>

                <div className="option">
                  <span>C</span>
                  Tree
                </div>

                <div className="option">
                  <span>D</span>
                  Graph
                </div>
              </div>

              <button className="next-btn">
                Next Question →
              </button>
            </div>

            <div className="security-card">
              <span className="security-icon">
                ✓
              </span>

              <div>
                <strong>
                  Secure Monitoring
                </strong>

                <small>
                  Anti-cheat protection active
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          className="features-section"
          id="features"
        >
          <div className="section-heading">
            <span>WHY QUIZVIGIL?</span>

            <h2>
              Everything You Need for Better Assessments
            </h2>

            <p>
              A complete platform for students, teachers and administrators.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                🎯
              </div>

              <h3>
                Randomized Questions
              </h3>

              <p>
                Questions and answer order can be randomized for every
                student attempt.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                🛡️
              </div>

              <h3>
                Anti-Cheat Monitoring
              </h3>

              <p>
                Suspicious activities such as tab switching and
                fullscreen exits are logged.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                ⏱️
              </div>

              <h3>
                Smart Timer
              </h3>

              <p>
                Timed assessments automatically submit when the exam
                duration ends.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                📊
              </div>

              <h3>
                Instant Results
              </h3>

              <p>
                Get scores, percentages, correct answers and detailed
                attempt history.
              </p>
            </div>
          </div>
        </section>

        {/* About */}
        <section
          className="about-section"
          id="about"
        >
          <div>
            <span className="section-tag">
              BUILT FOR EDUCATION
            </span>

            <h2>
              A smarter way to conduct
              <span> online examinations.</span>
            </h2>

            <p>
              QuizVigil brings quiz creation, student attempts,
              question randomization, result management and
              anti-cheat activity logging into one platform.
            </p>

            <button
              className="primary-btn"
              onClick={() => {
                document
                  .getElementById('features')
                  ?.scrollIntoView({
                    behavior: 'smooth',
                  })
              }}
            >
              Learn More →
            </button>
          </div>

          <div className="about-box">
            <div className="about-number">
              01
            </div>

            <h3>
              Secure by Design
            </h3>

            <p>
              Every quiz attempt can be monitored and suspicious
              activities can be reviewed by teachers.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="footer"
        id="contact"
      >
        <div>
          <div className="logo">
            <span className="logo-icon">
              Q
            </span>

            <span>
              QuizVigil
            </span>
          </div>

          <p>
            Smart online assessment with secure quiz monitoring.
          </p>
        </div>

        <div className="footer-right">
          © 2026 QuizVigil. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

export default App