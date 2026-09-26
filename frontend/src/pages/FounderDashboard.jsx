import React, { useEffect, useMemo, useState } from 'react'

function FounderDashboard() {
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formError, setFormError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [institutes, setInstitutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadInstitutes = async () => {
    try {
      setLoading(true)
      setFormError('')

      const response = await fetch('/api/institutes')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load institutes.')
      }

      setInstitutes(Array.isArray(data.institutes) ? data.institutes : [])
    } catch (error) {
      console.error('Load institutes error:', error)
      setFormError(error.message || 'Unable to load institute data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInstitutes()
  }, [])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredInstitutes = useMemo(() => {
    if (!normalizedSearch) {
      return institutes
    }

    return institutes.filter((institute) =>
      [
        institute.name,
        institute.code,
        institute.email,
        institute.address,
        institute.status,
      ]
        .filter(Boolean)
        .some((value) =>
          value.toString().toLowerCase().includes(normalizedSearch)
        )
    )
  }, [institutes, normalizedSearch])

  const totalInstitutes = institutes.length

  const activeInstitutes = institutes.filter(
    (institute) => institute.status === 'Active'
  ).length

  const inactiveInstitutes = institutes.filter(
    (institute) => institute.status === 'Inactive'
  ).length

  const handleCreateInstitute = async (e) => {
    e.preventDefault()

    const form = e.currentTarget

    setFormError('')
    setActionMessage('')

    const formData = new FormData(e.currentTarget)

    const name = formData.get('instituteName')?.toString().trim()
    const code = formData.get('instituteCode')?.toString().trim()
    const email = formData.get('instituteEmail')?.toString().trim()
    const address = formData.get('instituteAddress')?.toString().trim()

    if (!name || !code || !email || !address) {
      setFormError('Please fill all institute details.')
      return
    }

    const normalizedCode = code.toUpperCase()
    const normalizedEmail = email.toLowerCase()

    try {
      setSaving(true)

      const response = await fetch('/api/institutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          code: normalizedCode,
          email: normalizedEmail,
          address,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to create institute.')
      }

      await loadInstitutes()

      setShowForm(false)
      setActionMessage(
        `${name} has been registered successfully in Neon database.`
      )

      form.reset()
    } catch (error) {
      console.error('Create institute error:', error)
      setFormError(error.message || 'Unable to create institute.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleInstituteStatus = async (code) => {
    const institute = institutes.find(
      (item) =>
        item.code?.toString().toUpperCase() === code.toUpperCase()
    )

    if (!institute) {
      return
    }

    const nextStatus =
      institute.status === 'Active' ? 'Inactive' : 'Active'

    try {
      setFormError('')
      setActionMessage('')

      const response = await fetch(
        `/api/institutes/${encodeURIComponent(code)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to update institute status.'
        )
      }

      await loadInstitutes()

      setActionMessage(
        `${institute.name} is now ${nextStatus.toLowerCase()}.`
      )
    } catch (error) {
      console.error('Update institute status error:', error)
      setFormError(
        error.message || 'Unable to update institute status.'
      )
    }
  }

  const handleRefresh = async () => {
    setActionMessage('')
    await loadInstitutes()
    setActionMessage('Institute data refreshed from Neon database.')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-label">MASTER ADMIN</p>

          <h1>Founder Dashboard</h1>

          <p>
            Manage registered institutes and control platform access.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="dashboard-logout"
            onClick={handleRefresh}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="dashboard-primary-btn"
            onClick={() => {
              setShowForm(!showForm)
              setFormError('')
              setActionMessage('')
            }}
          >
            {showForm ? '✕ Close Form' : '+ Register Institute'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {actionMessage}
        </div>
      )}

      {formError && !showForm && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {formError}
        </div>
      )}

      {showForm && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Register New Institute</h2>

              <p className="dashboard-muted">
                Only the Founder can create an institute on QuizVigil.
              </p>
            </div>
          </div>

          {formError && (
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 14px',
                borderRadius: '9px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {formError}
            </div>
          )}

          <form
            className="dashboard-form"
            onSubmit={handleCreateInstitute}
          >
            <label htmlFor="instituteName">Institute Name</label>

            <input
              id="instituteName"
              type="text"
              name="instituteName"
              placeholder="Enter institute name"
              required
            />

            <label htmlFor="instituteCode">Institute Code</label>

            <input
              id="instituteCode"
              type="text"
              name="instituteCode"
              placeholder="e.g. KIPM"
              maxLength="20"
              required
            />

            <label htmlFor="instituteEmail">Institute Email</label>

            <input
              id="instituteEmail"
              type="email"
              name="instituteEmail"
              placeholder="Enter official institute email"
              required
            />

            <label htmlFor="instituteAddress">Institute Address</label>

            <textarea
              id="instituteAddress"
              name="instituteAddress"
              placeholder="Enter institute address"
              rows="3"
              required
            />

            <button
              className="dashboard-primary-btn"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Institute'}
            </button>
          </form>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span>Total Institutes</span>
          <strong>{totalInstitutes}</strong>
        </div>

        <div className="dashboard-stat-card">
          <span>Active Institutes</span>
          <strong>{activeInstitutes}</strong>
        </div>

        <div className="dashboard-stat-card">
          <span>Inactive Institutes</span>
          <strong>{inactiveInstitutes}</strong>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>Registered Institutes</h2>

            <p className="dashboard-muted">
              Institutes stored in the QuizVigil PostgreSQL database.
            </p>
          </div>
        </div>

        {institutes.length > 0 && (
          <div
            style={{
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search institute, code, email..."
              style={{
                flex: '1',
                minWidth: '240px',
                padding: '12px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                outline: 'none',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />

            {searchTerm && (
              <button
                type="button"
                className="dashboard-logout"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>

            <h3>Loading Institutes...</h3>

            <p>
              Fetching institute data from the QuizVigil database.
            </p>
          </div>
        ) : institutes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏫</div>

            <h3>No Institutes Registered</h3>

            <p>
              Register an institute to start managing its organization.
            </p>

            <button
              type="button"
              className="dashboard-primary-btn"
              onClick={() => {
                setShowForm(true)
                setFormError('')
              }}
            >
              + Register First Institute
            </button>
          </div>
        ) : filteredInstitutes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔎</div>

            <h3>No Matching Institutes</h3>

            <p>
              No institute matches your current search.
            </p>

            <button
              type="button"
              className="dashboard-logout"
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="institute-list">
            {filteredInstitutes.map((institute) => (
              <div
                className="institute-item"
                key={institute.id || institute.code}
              >
                <div>
                  <h3>{institute.name}</h3>

                  <p>
                    <strong>Code:</strong> {institute.code}
                  </p>

                  <p>
                    <strong>Email:</strong> {institute.email}
                  </p>

                  <p>
                    <strong>Address:</strong> {institute.address}
                  </p>

                  {institute.created_at && (
                    <p>
                      <strong>Created:</strong>{' '}
                      {new Date(
                        institute.created_at
                      ).toLocaleDateString()}
                    </p>
                  )}

                  {institute.createdAt && (
                    <p>
                      <strong>Created:</strong>{' '}
                      {new Date(
                        institute.createdAt
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="institute-actions">
                  <span
                    className={`institute-status ${
                      institute.status === 'Inactive'
                        ? 'inactive'
                        : ''
                    }`}
                  >
                    {institute.status || 'Active'}
                  </span>

                  <button
                    type="button"
                    className={
                      institute.status === 'Active'
                        ? 'institute-action-btn deactivate'
                        : 'institute-action-btn activate'
                    }
                    onClick={() =>
                      handleToggleInstituteStatus(institute.code)
                    }
                  >
                    {institute.status === 'Active'
                      ? 'Deactivate'
                      : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FounderDashboard