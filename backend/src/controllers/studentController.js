import sql from '../config/db.js'

export async function getStudents(req, res) {
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

    const students = await sql`
      SELECT
        s.id AS student_id,
        s.user_id,
        u.name,
        u.email,
        u.status,
        s.institute_code,
        s.institute_name,
        s.year_class,
        s.section,
        s.created_at
      FROM students s
      INNER JOIN users u
        ON u.id = s.user_id
      WHERE s.institute_code = ${instituteCode}
        AND LOWER(u.role) = 'student'
      ORDER BY u.name ASC
    `

    return res.status(200).json({
      success: true,
      students,
    })
  } catch (error) {
    console.error('Get students error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to load students',
    })
  }
}