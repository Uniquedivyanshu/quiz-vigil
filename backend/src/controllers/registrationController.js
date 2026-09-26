import bcrypt from 'bcryptjs'
import sql from '../config/db.js'

const BCRYPT_ROUNDS = 12

export async function createRegistrationRequest(req, res) {
  try {
    const {
      role,
      identityId,
      name,
      email,
      password,
      instituteCode,
      instituteName,
      yearClass,
      section,
    } = req.body

    if (
      !role ||
      !identityId ||
      !name ||
      !email ||
      !password ||
      !instituteCode ||
      !instituteName
    ) {
      return res.status(400).json({
        success: false,
        message: 'All required fields are required',
      })
    }

    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role',
      })
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 6 characters',
      })
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase()

    const normalizedIdentityId = String(identityId).trim()

    const normalizedInstituteCode = String(
      instituteCode,
    )
      .trim()
      .toUpperCase()

    const existingRequest = await sql`
      SELECT id
      FROM registration_requests
      WHERE LOWER(email) = ${normalizedEmail}
         OR identity_id = ${normalizedIdentityId}
      LIMIT 1
    `

    if (existingRequest.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Registration request already exists',
      })
    }

    const existingUser = await sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    const institute = await sql`
      SELECT
        id,
        name,
        code,
        status
      FROM institutes
      WHERE code = ${normalizedInstituteCode}
      LIMIT 1
    `

    if (institute.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found',
      })
    }

    if (institute[0].status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Selected institute is inactive',
      })
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      BCRYPT_ROUNDS,
    )

    const id = `REQ-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`

    const result = await sql`
      INSERT INTO registration_requests (
        id,
        role,
        identity_id,
        name,
        email,
        password_hash,
        institute_code,
        institute_name,
        year_class,
        section,
        status
      )
      VALUES (
        ${id},
        ${role},
        ${normalizedIdentityId},
        ${String(name).trim()},
        ${normalizedEmail},
        ${passwordHash},
        ${normalizedInstituteCode},
        ${institute[0].name},
        ${
          role === 'student'
            ? String(yearClass || '').trim()
            : null
        },
        ${
          role === 'student'
            ? String(section || '').trim()
            : null
        },
        'Pending'
      )
      RETURNING
        id,
        role,
        identity_id,
        name,
        email,
        institute_code,
        institute_name,
        year_class,
        section,
        status,
        created_at
    `

    res.status(201).json({
      success: true,
      message:
        'Registration request submitted successfully',
      request: result[0],
    })
  } catch (error) {
    console.error(
      'Create registration request error:',
      error,
    )

    res.status(500).json({
      success: false,
      message: 'Failed to create registration request',
    })
  }
}

export async function getRegistrationRequests(req, res) {
  try {
    const { instituteCode, role, status } = req.query

    let requests

    if (instituteCode && role && status) {
      requests = await sql`
        SELECT
          id,
          role,
          identity_id,
          name,
          email,
          institute_code,
          institute_name,
          year_class,
          section,
          status,
          created_at,
          reviewed_at
        FROM registration_requests
        WHERE institute_code = ${
          String(instituteCode)
            .trim()
            .toUpperCase()
        }
          AND role = ${role}
          AND status = ${status}
        ORDER BY created_at DESC
      `
    } else if (instituteCode) {
      requests = await sql`
        SELECT
          id,
          role,
          identity_id,
          name,
          email,
          institute_code,
          institute_name,
          year_class,
          section,
          status,
          created_at,
          reviewed_at
        FROM registration_requests
        WHERE institute_code = ${
          String(instituteCode)
            .trim()
            .toUpperCase()
        }
        ORDER BY created_at DESC
      `
    } else {
      requests = await sql`
        SELECT
          id,
          role,
          identity_id,
          name,
          email,
          institute_code,
          institute_name,
          year_class,
          section,
          status,
          created_at,
          reviewed_at
        FROM registration_requests
        ORDER BY created_at DESC
      `
    }

    res.json({
      success: true,
      requests,
    })
  } catch (error) {
    console.error(
      'Get registration requests error:',
      error,
    )

    res.status(500).json({
      success: false,
      message: 'Failed to fetch registration requests',
    })
  }
}

export async function updateRegistrationRequest(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be Approved or Rejected',
      })
    }

    const existing = await sql`
      SELECT *
      FROM registration_requests
      WHERE id = ${id}
      LIMIT 1
    `

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Registration request not found',
      })
    }

    const request = existing[0]

    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message:
          'This request has already been reviewed',
      })
    }

    if (status === 'Rejected') {
      const result = await sql`
        UPDATE registration_requests
        SET
          status = 'Rejected',
          reviewed_at = NOW()
        WHERE id = ${id}
        RETURNING
          id,
          role,
          identity_id,
          name,
          email,
          institute_code,
          institute_name,
          year_class,
          section,
          status,
          created_at,
          reviewed_at
      `

      return res.json({
        success: true,
        message:
          'Registration request rejected',
        request: result[0],
      })
    }

    const userId = `USR-${Date.now()}`
    const identityId = request.identity_id

    const existingEmail = await sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = ${
        String(request.email).toLowerCase()
      }
      LIMIT 1
    `

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          'An account with this email already exists',
      })
    }

    await sql`
      INSERT INTO users (
        id,
        role,
        name,
        email,
        password_hash,
        institute_code,
        institute_name,
        status
      )
      VALUES (
        ${userId},
        ${request.role},
        ${request.name},
        ${String(request.email).toLowerCase()},
        ${request.password_hash},
        ${request.institute_code},
        ${request.institute_name},
        'Active'
      )
    `

    if (request.role === 'student') {
      await sql`
        INSERT INTO students (
          id,
          user_id,
          institute_code,
          institute_name,
          year_class,
          section
        )
        VALUES (
          ${identityId},
          ${userId},
          ${request.institute_code},
          ${request.institute_name},
          ${request.year_class || null},
          ${request.section || null}
        )
      `
    }

    if (request.role === 'teacher') {
      await sql`
        INSERT INTO teachers (
          id,
          user_id,
          institute_code,
          institute_name
        )
        VALUES (
          ${identityId},
          ${userId},
          ${request.institute_code},
          ${request.institute_name}
        )
      `
    }

    const result = await sql`
      UPDATE registration_requests
      SET
        status = 'Approved',
        reviewed_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        role,
        identity_id,
        name,
        email,
        institute_code,
        institute_name,
        year_class,
        section,
        status,
        created_at,
        reviewed_at
    `

    res.json({
      success: true,
      message:
        'Registration request approved successfully',
      request: result[0],
    })
  } catch (error) {
    console.error(
      'Update registration request error:',
      error,
    )

    res.status(500).json({
      success: false,
      message:
        'Failed to update registration request',
    })
  }
}