import { useState } from 'react'

function Login({ onLogin, onRegister }) {
  const [role, setRole] = useState('student')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotStep, setForgotStep] = useState('email')

  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] =
    useState('')

  function clearMessage() {
    setMessage('')
    setMessageType('')
  }

  function showMessage(text, type = 'error') {
    setMessage(text)
    setMessageType(type)
  }

  function handleRoleChange(nextRole) {
    setRole(nextRole)
    clearMessage()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    clearMessage()

    const normalizedEmail = email
      .trim()
      .toLowerCase()

    if (!normalizedEmail || !password) {
      showMessage(
        'Please enter email and password.',
      )
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            role,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Login failed',
        )
      }

      if (!data.user) {
        throw new Error(
          'Login successful but user information was not returned.',
        )
      }

      const loggedInUser = data.user

      localStorage.setItem(
        'quizvigil_current_user',
        JSON.stringify(loggedInUser),
      )

      showMessage(
        'Login successful.',
        'success',
      )

      if (onLogin) {
        onLogin(
          loggedInUser.role,
          loggedInUser,
        )
      } else {
        if (loggedInUser.role === 'student') {
          window.location.href = '/student'
        } else if (
          loggedInUser.role === 'teacher'
        ) {
          window.location.href = '/teacher'
        } else if (
          loggedInUser.role === 'admin'
        ) {
          window.location.href =
            '/institute-admin'
        }
      }
    } catch (error) {
      console.error('Login error:', error)

      showMessage(
        error.message ||
          'Unable to login. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  function openForgotPassword() {
    clearMessage()

    setResetEmail(
      email.trim().toLowerCase(),
    )

    setResetCode('')
    setNewPassword('')
    setConfirmNewPassword('')

    setForgotStep('email')
    setForgotMode(true)
  }

  function closeForgotPassword() {
    clearMessage()

    setForgotMode(false)
    setForgotStep('email')

    setResetCode('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  async function handleSendResetCode(event) {
    event.preventDefault()

    clearMessage()

    const normalizedEmail = resetEmail
      .trim()
      .toLowerCase()

    if (!normalizedEmail) {
      showMessage(
        'Please enter your registered email address.',
      )
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to send verification code.',
        )
      }

      setResetEmail(normalizedEmail)
      setForgotStep('code')

      showMessage(
        'If an account exists with this email, a verification code has been sent.',
        'success',
      )
    } catch (error) {
      console.error(
        'Forgot password error:',
        error,
      )

      showMessage(
        error.message ||
          'Unable to send verification code. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault()

    clearMessage()

    const normalizedEmail = resetEmail
      .trim()
      .toLowerCase()

    const normalizedCode = resetCode.trim()

    if (!normalizedEmail || !normalizedCode) {
      showMessage(
        'Please enter the verification code.',
      )
      return
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      showMessage(
        'Verification code must be 6 digits.',
      )
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        '/api/auth/verify-reset-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            code: normalizedCode,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Invalid verification code.',
        )
      }

      setForgotStep('password')

      showMessage(
        'Verification successful. Create your new password.',
        'success',
      )
    } catch (error) {
      console.error(
        'Verify reset code error:',
        error,
      )

      showMessage(
        error.message ||
          'Unable to verify the code.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault()

    clearMessage()

    if (!newPassword || !confirmNewPassword) {
      showMessage(
        'Please enter and confirm your new password.',
      )
      return
    }

    if (newPassword.length < 6) {
      showMessage(
        'Password must contain at least 6 characters.',
      )
      return
    }

    if (newPassword !== confirmNewPassword) {
      showMessage(
        'New password and confirm password do not match.',
      )
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        '/api/auth/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: resetEmail
              .trim()
              .toLowerCase(),
            code: resetCode.trim(),
            newPassword,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to reset password.',
        )
      }

      setForgotMode(false)
      setForgotStep('email')

      setEmail(
        resetEmail.trim().toLowerCase(),
      )
      setPassword('')

      setResetCode('')
      setNewPassword('')
      setConfirmNewPassword('')

      showMessage(
        'Password reset successfully. You can now login with your new password.',
        'success',
      )
    } catch (error) {
      console.error(
        'Reset password error:',
        error,
      )

      showMessage(
        error.message ||
          'Unable to reset password. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    clearMessage()

    const normalizedEmail = resetEmail
      .trim()
      .toLowerCase()

    if (!normalizedEmail) {
      showMessage(
        'Please enter your email address.',
      )
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to resend verification code.',
        )
      }

      setResetCode('')

      showMessage(
        'A new verification code has been sent to your email.',
        'success',
      )
    } catch (error) {
      console.error(
        'Resend reset code error:',
        error,
      )

      showMessage(
        error.message ||
          'Unable to resend verification code.',
      )
    } finally {
      setLoading(false)
    }
  }

  function renderForgotPassword() {
    if (forgotStep === 'email') {
      return (
        <>
          <div className="auth-header">
            <div className="auth-logo">Q</div>

            <h1>Forgot Password?</h1>

            <p>
              Enter your registered email and
              we'll send you a verification code.
            </p>
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

          <form
            onSubmit={handleSendResetCode}
            className="auth-form"
          >
            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                value={resetEmail}
                onChange={(event) =>
                  setResetEmail(
                    event.target.value,
                  )
                }
                placeholder="Enter your registered email"
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Sending Code...'
                : 'Send Verification Code'}
            </button>
          </form>

          <div className="auth-footer">
            <span>Remember your password?</span>

            <button
              type="button"
              className="auth-link"
              onClick={closeForgotPassword}
              disabled={loading}
            >
              Back to Login
            </button>
          </div>
        </>
      )
    }

    if (forgotStep === 'code') {
      return (
        <>
          <div className="auth-header">
            <div className="auth-logo">Q</div>

            <h1>Verify Email</h1>

            <p>
              Enter the 6-digit verification
              code sent to your email.
            </p>
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

          <form
            onSubmit={handleVerifyCode}
            className="auth-form"
          >
            <div className="form-group">
              <label>Verification Code</label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={resetCode}
                onChange={(event) =>
                  setResetCode(
                    event.target.value.replace(
                      /\D/g,
                      '',
                    ),
                  )
                }
                placeholder="Enter 6-digit code"
                disabled={loading}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Verifying...'
                : 'Verify Code'}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              className="auth-link"
              onClick={handleResendCode}
              disabled={loading}
            >
              Resend Code
            </button>

            <button
              type="button"
              className="auth-link"
              onClick={closeForgotPassword}
              disabled={loading}
            >
              Back to Login
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="auth-header">
          <div className="auth-logo">Q</div>

          <h1>Create New Password</h1>

          <p>
            Enter a new password for your
            QuizVigil account.
          </p>
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

        <form
          onSubmit={handleResetPassword}
          className="auth-form"
        >
          <div className="form-group">
            <label>New Password</label>

            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
              placeholder="Enter new password"
              disabled={loading}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>

            <input
              type="password"
              value={confirmNewPassword}
              onChange={(event) =>
                setConfirmNewPassword(
                  event.target.value,
                )
              }
              placeholder="Confirm new password"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Resetting Password...'
              : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <button
            type="button"
            className="auth-link"
            onClick={closeForgotPassword}
            disabled={loading}
          >
            Back to Login
          </button>
        </div>
      </>
    )
  }

  if (forgotMode) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          {renderForgotPassword()}
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Q</div>

          <h1>Welcome Back</h1>

          <p>
            Login to continue to your QuizVigil
            dashboard.
          </p>
        </div>

        <div className="auth-role-switch">
          <button
            type="button"
            className={
              role === 'student'
                ? 'active'
                : ''
            }
            onClick={() =>
              handleRoleChange('student')
            }
            disabled={loading}
          >
            Student
          </button>

          <button
            type="button"
            className={
              role === 'teacher'
                ? 'active'
                : ''
            }
            onClick={() =>
              handleRoleChange('teacher')
            }
            disabled={loading}
          >
            Teacher
          </button>

          <button
            type="button"
            className={
              role === 'admin'
                ? 'active'
                : ''
            }
            onClick={() =>
              handleRoleChange('admin')
            }
            disabled={loading}
          >
            Admin
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

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="forgot-password-row">
            <button
              type="button"
              className="auth-link"
              onClick={openForgotPassword}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Logging in...'
              : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            className="auth-link"
            onClick={() => {
              if (onRegister) {
                onRegister()
              } else {
                window.location.href =
                  '/register'
              }
            }}
            disabled={loading}
          >
            Create Account
          </button>
        </div>

        {role === 'admin' && (
          <div className="auth-demo-note">
            Admin login is connected to the
            database admin account.
          </div>
        )}
      </div>
    </div>
  )
}

export default Login