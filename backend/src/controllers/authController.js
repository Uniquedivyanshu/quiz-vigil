import bcrypt from 'bcryptjs'
import sql from '../config/db.js'

const BCRYPT_ROUNDS = 12
const RESET_CODE_EXPIRY_MINUTES = 10

function generateResetCode() {
  return Math.floor(
    100000 + Math.random() * 900000,
  ).toString()
}

async function sendResetCodeEmail(
  email,
  name,
  code,
) {
  const emailServiceUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL

  if (!emailServiceUrl) {
    throw new Error(
      'GOOGLE_APPS_SCRIPT_URL is not configured',
    )
  }

  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 15000)

  try {
    const response = await fetch(
      emailServiceUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          name: name || 'User',
          code,
        }),
        signal: controller.signal,
      },
    )

    const responseText =
      await response.text()

    let data

    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(
        `Email service returned invalid response: ${responseText.slice(
          0,
          200,
        )}`,
      )
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          'Google email service failed',
      )
    }

    return data
  } finally {
    clearTimeout(timeout)
  }
}

export async function login(req, res) {
  try {
    const {
      email,
      password,
      role,
    } = req.body

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message:
          'Email, password and role are required',
      })
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase()

    if (
      ![
        'student',
        'teacher',
        'admin',
      ].includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login role',
      })
    }

    const users = await sql`
      SELECT
        id,
        role,
        name,
        email,
        password_hash,
        institute_code,
        institute_name,
        status
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
        AND role = ${role}
      LIMIT 1
    `

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password',
      })
    }

    const user = users[0]

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message:
          'Your account is inactive',
      })
    }

    const storedPassword = String(
      user.password_hash || '',
    )

    let passwordMatches = false

    const isBcryptHash =
      storedPassword.startsWith('$2a$') ||
      storedPassword.startsWith('$2b$') ||
      storedPassword.startsWith('$2y$')

    if (isBcryptHash) {
      passwordMatches =
        await bcrypt.compare(
          String(password),
          storedPassword,
        )
    } else {
      passwordMatches =
        String(password) ===
        storedPassword

      if (passwordMatches) {
        const upgradedPasswordHash =
          await bcrypt.hash(
            String(password),
            BCRYPT_ROUNDS,
          )

        await sql`
          UPDATE users
          SET
            password_hash = ${upgradedPasswordHash},
            updated_at = NOW()
          WHERE id = ${user.id}
        `
      }
    }

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password',
      })
    }

    let profile = null

    if (role === 'student') {
      const students = await sql`
        SELECT
          id,
          year_class,
          section
        FROM students
        WHERE user_id = ${user.id}
        LIMIT 1
      `

      profile = students[0] || null
    }

    if (role === 'teacher') {
      const teachers = await sql`
        SELECT
          id
        FROM teachers
        WHERE user_id = ${user.id}
        LIMIT 1
      `

      profile = teachers[0] || null
    }

    const loggedInUser = {
      role: user.role,
      id: profile?.id || user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      instituteCode:
        user.institute_code || '',
      instituteName:
        user.institute_name || '',
      yearClass:
        profile?.year_class || '',
      section:
        profile?.section || '',
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user: loggedInUser,
    })
  } catch (error) {
    console.error(
      'Login error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: 'Login failed',
    })
  }
}

/*
 * STEP 1
 * Generate OTP and send it through
 * Google Apps Script -> Gmail.
 */
export async function forgotPassword(
  req,
  res,
) {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      })
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase()

    const users = await sql`
      SELECT
        id,
        name,
        email,
        status
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `

    /*
     * Do not reveal whether the email exists.
     */
    if (users.length === 0) {
      return res.json({
        success: true,
        message:
          'If an account exists with this email, a verification code has been sent.',
      })
    }

    const user = users[0]

    if (user.status !== 'Active') {
      return res.json({
        success: true,
        message:
          'If an account exists with this email, a verification code has been sent.',
      })
    }

    /*
     * Invalidate previous codes.
     */
    await sql`
      UPDATE password_reset_codes
      SET used = TRUE
      WHERE user_id = ${user.id}
        AND used = FALSE
    `

    const code = generateResetCode()

    const resetId =
      `RESET-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`

    /*
     * Save OTP before sending email.
     */
    await sql`
      INSERT INTO password_reset_codes (
        id,
        user_id,
        email,
        code,
        expires_at,
        used
      )
      VALUES (
        ${resetId},
        ${user.id},
        ${normalizedEmail},
        ${code},
        NOW() + INTERVAL '10 minutes',
        FALSE
      )
    `

    try {
      await sendResetCodeEmail(
        normalizedEmail,
        user.name,
        code,
      )
    } catch (emailError) {
      console.error(
        'Google Apps Script email error:',
        emailError,
      )

      /*
       * If email failed, invalidate OTP.
       */
      await sql`
        UPDATE password_reset_codes
        SET used = TRUE
        WHERE id = ${resetId}
      `

      return res.status(500).json({
        success: false,
        message:
          'Unable to send verification email. Please try again later.',
      })
    }

    return res.json({
      success: true,
      message:
        'If an account exists with this email, a verification code has been sent.',
    })
  } catch (error) {
    console.error(
      'Forgot password error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Unable to process password reset request',
    })
  }
}

/*
 * STEP 2
 * Verify OTP.
 */
export async function verifyResetCode(
  req,
  res,
) {
  try {
    const {
      email,
      code,
    } = req.body

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message:
          'Email and verification code are required',
      })
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase()

    const normalizedCode =
      String(code).trim()

    const resetCodes = await sql`
      SELECT
        id,
        user_id,
        email,
        code,
        expires_at,
        used
      FROM password_reset_codes
      WHERE LOWER(email) = ${normalizedEmail}
        AND code = ${normalizedCode}
        AND used = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (resetCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid verification code',
      })
    }

    const resetCode =
      resetCodes[0]

    if (
      new Date(
        resetCode.expires_at,
      ).getTime() <= Date.now()
    ) {
      await sql`
        UPDATE password_reset_codes
        SET used = TRUE
        WHERE id = ${resetCode.id}
      `

      return res.status(400).json({
        success: false,
        message:
          'Verification code has expired. Please request a new code.',
      })
    }

    return res.json({
      success: true,
      message:
        'Verification code verified successfully',
    })
  } catch (error) {
    console.error(
      'Verify reset code error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Unable to verify verification code',
    })
  }
}

/*
 * STEP 3
 * Reset password.
 */
export async function resetPassword(
  req,
  res,
) {
  try {
    const {
      email,
      code,
      newPassword,
    } = req.body

    if (
      !email ||
      !code ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Email, verification code and new password are required',
      })
    }

    if (
      String(newPassword).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must contain at least 6 characters',
      })
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase()

    const normalizedCode =
      String(code).trim()

    const resetCodes = await sql`
      SELECT
        id,
        user_id,
        email,
        code,
        expires_at,
        used
      FROM password_reset_codes
      WHERE LOWER(email) = ${normalizedEmail}
        AND code = ${normalizedCode}
        AND used = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (resetCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid verification code',
      })
    }

    const resetCode =
      resetCodes[0]

    if (
      new Date(
        resetCode.expires_at,
      ).getTime() <= Date.now()
    ) {
      await sql`
        UPDATE password_reset_codes
        SET used = TRUE
        WHERE id = ${resetCode.id}
      `

      return res.status(400).json({
        success: false,
        message:
          'Verification code has expired. Please request a new code.',
      })
    }

    const passwordHash =
      await bcrypt.hash(
        String(newPassword),
        BCRYPT_ROUNDS,
      )

    await sql`
      UPDATE users
      SET
        password_hash = ${passwordHash},
        updated_at = NOW()
      WHERE id = ${resetCode.user_id}
    `

    /*
     * Consume current OTP.
     */
    await sql`
      UPDATE password_reset_codes
      SET used = TRUE
      WHERE id = ${resetCode.id}
    `

    /*
     * Invalidate all other OTPs.
     */
    await sql`
      UPDATE password_reset_codes
      SET used = TRUE
      WHERE user_id = ${resetCode.user_id}
        AND used = FALSE
    `

    return res.json({
      success: true,
      message:
        'Password reset successfully. You can now login with your new password.',
    })
  } catch (error) {
    console.error(
      'Reset password error:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        'Unable to reset password',
    })
  }
}