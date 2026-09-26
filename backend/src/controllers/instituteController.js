import sql from '../config/db.js'

export async function getInstitutes(req, res) {
  try {
    const institutes = await sql`
      SELECT
        id,
        name,
        code,
        email,
        address,
        status,
        created_at
      FROM institutes
      ORDER BY created_at DESC
    `

    res.json({
      success: true,
      institutes,
    })
  } catch (error) {
    console.error('Get institutes error:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch institutes',
    })
  }
}

export async function createInstitute(req, res) {
  try {
    const { name, code, email, address } = req.body

    if (!name || !code || !email || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, email and address are required',
      })
    }

    const normalizedCode = String(code).trim().toUpperCase()
    const normalizedEmail = String(email).trim().toLowerCase()

    const existing = await sql`
      SELECT id
      FROM institutes
      WHERE code = ${normalizedCode}
         OR email = ${normalizedEmail}
      LIMIT 1
    `

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Institute code or email already exists',
      })
    }

    const id = `INST-${Date.now()}`

    const result = await sql`
      INSERT INTO institutes (
        id,
        name,
        code,
        email,
        address,
        status
      )
      VALUES (
        ${id},
        ${String(name).trim()},
        ${normalizedCode},
        ${normalizedEmail},
        ${String(address).trim()},
        'Active'
      )
      RETURNING
        id,
        name,
        code,
        email,
        address,
        status,
        created_at
    `

    res.status(201).json({
      success: true,
      message: 'Institute created successfully',
      institute: result[0],
    })
  } catch (error) {
    console.error('Create institute error:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to create institute',
    })
  }
}

export async function toggleInstituteStatus(req, res) {
  try {
    const { code } = req.params

    const existing = await sql`
      SELECT id, status
      FROM institutes
      WHERE code = ${String(code).trim().toUpperCase()}
      LIMIT 1
    `

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found',
      })
    }

    const newStatus =
      existing[0].status === 'Active' ? 'Inactive' : 'Active'

    const result = await sql`
      UPDATE institutes
      SET status = ${newStatus}
      WHERE id = ${existing[0].id}
      RETURNING
        id,
        name,
        code,
        email,
        address,
        status,
        created_at
    `

    res.json({
      success: true,
      message: `Institute ${newStatus.toLowerCase()} successfully`,
      institute: result[0],
    })
  } catch (error) {
    console.error('Toggle institute status error:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to update institute status',
    })
  }
}