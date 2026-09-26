import { useEffect, useState } from 'react'

function Register({ onBackToLogin }) {
  const [role, setRole] = useState('student')
  const [institutes, setInstitutes] = useState([])
  const [loadingInstitutes, setLoadingInstitutes] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    identityId: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    instituteCode: '',
    yearClass: '',
    section: '',
  })

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    loadInstitutes()
  }, [])

  async function loadInstitutes() {
    try {
      setLoadingInstitutes(true)

      const response = await fetch('/api/institutes')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to load institutes')
      }

      setInstitutes(
        Array.isArray(data.institutes)
          ? data.institutes.filter(
              (institute) => institute.status === 'Active',
            )
          : [],
      )
    } catch (error) {
      console.error('Load institutes error:', error)

      setMessage('Unable to load institutes. Please try again.')
      setMessageType('error')
    } finally {
      setLoadingInstitutes(false)
    }
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function handleRoleChange(nextRole) {
    setRole(nextRole)

    setForm((previous) => ({
      ...previous,
      identityId: '',
      yearClass: '',
      section: '',
    }))

    setMessage('')
    setMessageType('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setMessageType('')

    const identityId = form.identityId.trim()
    const fullName = form.fullName.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password
    const confirmPassword = form.confirmPassword
    const instituteCode = form.instituteCode

    if (
      !identityId ||
      !fullName ||
      !email ||
      !password ||
      !confirmPassword ||
      !instituteCode
    ) {
      setMessage('Please fill all required fields.')
      setMessageType('error')
      return
    }

    if (password.length < 6) {
      setMessage('Password must contain at least 6 characters.')
      setMessageType('error')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setMessageType('error')
      return
    }

    if (
      role === 'student' &&
      (!form.yearClass.trim() || !form.section.trim())
    ) {
      setMessage('Please enter your year/class and section.')
      setMessageType('error')
      return
    }

    const selectedInstitute = institutes.find(
      (institute) => institute.code === instituteCode,
    )

    if (!selectedInstitute) {
      setMessage('Please select a valid institute.')
      setMessageType('error')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/registration-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          identityId,
          name: fullName,
          email,
          password,
          instituteCode: selectedInstitute.code,
          instituteName: selectedInstitute.name,
          yearClass:
            role === 'student'
              ? form.yearClass.trim()
              : '',
          section:
            role === 'student'
              ? form.section.trim()
              : '',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Registration request failed',
        )
      }

      setMessage(
        'Registration request submitted successfully. Please wait for institute admin approval.',
      )
      setMessageType('success')

      setForm({
        identityId: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        instituteCode: '',
        yearClass: '',
        section: '',
      })
    } catch (error) {
      console.error('Registration error:', error)

      setMessage(
        error.message ||
          'Unable to submit registration request.',
      )
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-logo">Q</div>

          <h1>Create your QuizVigil account</h1>

          <p>
            Register as a student or teacher and wait for
            institute approval.
          </p>
        </div>

        <div className="auth-role-switch">
          <button
            type="button"
            className={role === 'student' ? 'active' : ''}
            onClick={() => handleRoleChange('student')}
          >
            Student
          </button>

          <button
            type="button"
            className={role === 'teacher' ? 'active' : ''}
            onClick={() => handleRoleChange('teacher')}
          >
            Teacher
          </button>
        </div>

        {message && (
          <div
            className={`auth-message ${
              messageType === 'success'
                ? 'success'
                : 'error'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>
              {role === 'student'
                ? 'Student ID'
                : 'Teacher ID'}
            </label>

            <input
              type="text"
              name="identityId"
              value={form.identityId}
              onChange={handleChange}
              placeholder={
                role === 'student'
                  ? 'Enter student ID'
                  : 'Enter teacher ID'
              }
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Full Name</label>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Institute</label>

            <select
              name="instituteCode"
              value={form.instituteCode}
              onChange={handleChange}
              disabled={
                submitting || loadingInstitutes
              }
            >
              <option value="">
                {loadingInstitutes
                  ? 'Loading institutes...'
                  : 'Select your institute'}
              </option>

              {institutes.map((institute) => (
                <option
                  key={institute.code}
                  value={institute.code}
                >
                  {institute.name} ({institute.code})
                </option>
              ))}
            </select>
          </div>

          {role === 'student' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Year / Class</label>

                  <input
                    type="text"
                    name="yearClass"
                    value={form.yearClass}
                    onChange={handleChange}
                    placeholder="e.g. BCA 2nd Year"
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label>Section</label>

                  <input
                    type="text"
                    name="section"
                    value={form.section}
                    onChange={handleChange}
                    placeholder="e.g. A"
                    disabled={submitting}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || loadingInstitutes}
          >
            {submitting
              ? 'Submitting...'
              : 'Submit Registration'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>

          <button
            type="button"
            className="auth-link"
            onClick={() => {
              if (onBackToLogin) {
                onBackToLogin()
              } else {
                window.history.back()
              }
            }}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default Register