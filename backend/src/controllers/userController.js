import sql from '../config/db.js'

export async function getUsers(req, res) {
  try {
    const instituteCode = String(
      req.query.instituteCode || ''
    )
      .trim()
      .toUpperCase()

    if (!instituteCode) {
      return res.status(400).json({
        success: false,
        message: 'Institute code is required',
      })
    }

    const users = await sql`
      SELECT
        u.id,
        u.role,
        u.name,
        u.email,
        u.institute_code,
        u.institute_name,
        u.status,
        u.created_at,
        u.updated_at,
        s.id AS student_id,
        s.year_class,
        s.section,
        t.id AS teacher_id
      FROM users u
      LEFT JOIN students s
        ON s.user_id = u.id
      LEFT JOIN teachers t
        ON t.user_id = u.id
      WHERE u.institute_code = ${instituteCode}
        AND LOWER(u.role) IN ('student', 'teacher')
      ORDER BY u.role, u.name
    `

    return res.status(200).json({
      success: true,
      users,
    })
  } catch (error) {
    console.error('Get users error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to load users',
    })
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const userId = String(req.params.id || '').trim()

    const instituteCode = String(
      req.query.instituteCode || ''
    )
      .trim()
      .toUpperCase()

    if (!userId || !instituteCode) {
      return res.status(400).json({
        success: false,
        message: 'User ID and institute code are required',
      })
    }

    const existing = await sql`
      SELECT id, role, status
      FROM users
      WHERE id = ${userId}
        AND institute_code = ${instituteCode}
        AND LOWER(role) IN ('student', 'teacher')
      LIMIT 1
    `

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    const currentStatus =
      String(existing[0].status || '').toLowerCase()

    const nextStatus =
      currentStatus === 'active'
        ? 'Inactive'
        : 'Active'

    const updated = await sql`
      UPDATE users
      SET
        status = ${nextStatus},
        updated_at = NOW()
      WHERE id = ${userId}
        AND institute_code = ${instituteCode}
      RETURNING
        id,
        role,
        name,
        email,
        institute_code,
        institute_name,
        status,
        created_at,
        updated_at
    `

    return res.status(200).json({
      success: true,
      message: `User ${nextStatus.toLowerCase()} successfully`,
      user: updated[0],
    })
  } catch (error) {
    console.error('Toggle user status error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to update user status',
    })
  }
}