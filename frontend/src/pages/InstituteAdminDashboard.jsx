import React, { useEffect, useMemo, useState } from 'react'

function InstituteAdminDashboard({
  instituteCode,
  instituteName,
}) {
  const [activeTab, setActiveTab] =
    useState('overview')

  const [showTeacherForm, setShowTeacherForm] =
    useState(false)

  const [showStudentForm, setShowStudentForm] =
    useState(false)

  const [teacherSearch, setTeacherSearch] =
    useState('')

  const [studentSearch, setStudentSearch] =
    useState('')

  const [requests, setRequests] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])

  const [loadingRequests, setLoadingRequests] =
    useState(true)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState('success')

  /*
   * ====================================================
   * HELPERS
   * ====================================================
   */

  const normalize = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase()

  const showMessage = (
    text,
    type = 'success'
  ) => {
    setMessage(text)
    setMessageType(type)

    window.clearTimeout(
      window.__quizVigilAdminMessageTimer
    )

    window.__quizVigilAdminMessageTimer =
      window.setTimeout(() => {
        setMessage('')
      }, 3000)
  }

  /*
   * ====================================================
   * LOAD REGISTRATION REQUESTS FROM BACKEND
   * ====================================================
   */

  async function loadRequests() {
    try {
      setLoadingRequests(true)

      const code = String(
        instituteCode || ''
      )
        .trim()
        .toUpperCase()

      if (!code) {
        setRequests([])
        return
      }

      const response = await fetch(
        `/api/registration-requests?instituteCode=${encodeURIComponent(
          code
        )}`
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Failed to load registration requests'
        )
      }

      const backendRequests = Array.isArray(
        data.requests
      )
        ? data.requests
        : []

      const mappedRequests =
        backendRequests.map((request) => ({
          id: request.id,
          role: request.role,
          identityId:
            request.identity_id,
          name: request.name,
          email: request.email,
          instituteCode:
            request.institute_code,
          instituteName:
            request.institute_name,
          yearClass:
            request.year_class || '',
          section:
            request.section || '',
          status: request.status,
          createdAt:
            request.created_at,
          reviewedAt:
            request.reviewed_at,
        }))

      setRequests(mappedRequests)
    } catch (error) {
      console.error(
        'Load registration requests error:',
        error
      )

      showMessage(
        error.message ||
          'Unable to load registration requests.',
        'error'
      )
    } finally {
      setLoadingRequests(false)
    }
  }

  /*
   * ====================================================
   * LOAD LOCAL + BACKEND ACCOUNTS
   * ====================================================
   */

  const loadAccounts = async () => {
    try {
      const code = String(
        instituteCode || ''
      )
        .trim()
        .toUpperCase()

      if (!code) {
        setTeachers([])
        setStudents([])
        return
      }

      let localTeachers = []
      let localStudents = []

      try {
        const savedTeachers =
          localStorage.getItem(
            'quizvigil_teachers'
          )

        const savedStudents =
          localStorage.getItem(
            'quizvigil_students'
          )

        const parsedTeachers =
          savedTeachers
            ? JSON.parse(savedTeachers)
            : []

        const parsedStudents =
          savedStudents
            ? JSON.parse(savedStudents)
            : []

        localTeachers =
          Array.isArray(parsedTeachers)
            ? parsedTeachers
            : []

        localStudents =
          Array.isArray(parsedStudents)
            ? parsedStudents
            : []
      } catch (error) {
        console.error(
          'Unable to load local accounts:',
          error
        )
      }

      const response = await fetch(
        `/api/users?instituteCode=${encodeURIComponent(
          code
        )}`
      )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to load users from backend'
        )
      }

      const backendUsers =
        Array.isArray(data.users)
          ? data.users
          : []

      const backendTeachers =
        backendUsers
          .filter(
            (user) =>
              normalize(user.role) ===
              'teacher'
          )
          .map((user) => ({
            id:
              user.teacher_id ||
              user.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            instituteCode:
              user.institute_code,
            instituteName:
              user.institute_name,
            status:
              user.status || 'Active',
            createdAt:
              user.created_at,
            source: 'backend',
          }))

      const backendStudents =
        backendUsers
          .filter(
            (user) =>
              normalize(user.role) ===
              'student'
          )
          .map((user) => ({
            id:
              user.student_id ||
              user.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            instituteCode:
              user.institute_code,
            instituteName:
              user.institute_name,
            yearClass:
              user.year_class || '',
            section:
              user.section || '',
            status:
              user.status || 'Active',
            createdAt:
              user.created_at,
            source: 'backend',
          }))

      setTeachers([
        ...localTeachers,
        ...backendTeachers,
      ])

      setStudents([
        ...localStudents,
        ...backendStudents,
      ])
    } catch (error) {
      console.error(
        'Load accounts error:',
        error
      )

      showMessage(
        error.message ||
          'Unable to load users.',
        'error'
      )
    }
  }

  /*
   * ====================================================
   * INITIAL LOAD
   * ====================================================
   */

  useEffect(() => {
    loadRequests()
    loadAccounts()
  }, [instituteCode])

  /*
   * ====================================================
   * REFRESH WHEN APPROVAL TAB OPENS
   * ====================================================
   */

  useEffect(() => {
    if (activeTab === 'approvals') {
      loadRequests()
    }
  }, [activeTab])

  /*
   * ====================================================
   * CURRENT INSTITUTE
   * ====================================================
   */

  const currentInstituteCode =
    normalize(instituteCode)

  /*
   * ====================================================
   * BACKEND REQUEST FILTERS
   * ====================================================
   */

  const instituteRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          normalize(
            request.instituteCode
          ) === currentInstituteCode
      ),
    [requests, currentInstituteCode]
  )

  const pendingRequests = useMemo(
    () =>
      instituteRequests.filter(
        (request) =>
          normalize(request.status) ===
          'pending'
      ),
    [instituteRequests]
  )

  /*
   * ====================================================
   * APPROVED BACKEND ACCOUNTS
   * ====================================================
   */

  const approvedTeacherRequests =
    useMemo(
      () =>
        instituteRequests.filter(
          (request) =>
            normalize(request.status) ===
              'approved' &&
            normalize(request.role) ===
              'teacher'
        ),
      [instituteRequests]
    )

  const approvedStudentRequests =
    useMemo(
      () =>
        instituteRequests.filter(
          (request) =>
            normalize(request.status) ===
              'approved' &&
            normalize(request.role) ===
              'student'
        ),
      [instituteRequests]
    )

  /*
   * ====================================================
   * COMBINED TEACHERS
   * ====================================================
   */

  const instituteTeachers =
  useMemo(() => {
    const localTeachers =
      teachers.filter(
        (teacher) =>
          normalize(
            teacher.instituteCode
          ) === currentInstituteCode
      )

    const unique =
      new Map()

    localTeachers.forEach(
      (teacher) => {
        const key =
          normalize(
            teacher.email
          ) ||
          normalize(
            teacher.id
          )

        unique.set(
          key,
          teacher
        )
      }
    )

    return Array.from(
      unique.values()
    )
  }, [
    teachers,
    currentInstituteCode,
  ])

const instituteStudents =
  useMemo(() => {
    const localStudents =
      students.filter(
        (student) =>
          normalize(
            student.instituteCode
          ) === currentInstituteCode
      )

    const unique =
      new Map()

    localStudents.forEach(
      (student) => {
        const key =
          normalize(
            student.email
          ) ||
          normalize(
            student.id
          )

        const existing =
          unique.get(key)

        /*
         * Backend/Neon account wins
         * over the old localStorage copy.
         */
        if (
          !existing ||
          student.source ===
            'backend'
        ) {
          unique.set(
            key,
            student
          )
        }
      }
    )

    return Array.from(
      unique.values()
    )
  }, [
    students,
    currentInstituteCode,
  ])
  /*
   * ====================================================
   * SEARCH FILTERS
   * ====================================================
   */

  const filteredTeachers =
    instituteTeachers.filter(
      (teacher) => {
        const search =
          normalize(teacherSearch)

        if (!search) {
          return true
        }

        return (
          normalize(
            teacher.name
          ).includes(search) ||
          normalize(
            teacher.id
          ).includes(search) ||
          normalize(
            teacher.email
          ).includes(search)
        )
      }
    )

  const filteredStudents =
    instituteStudents.filter(
      (student) => {
        const search =
          normalize(studentSearch)

        if (!search) {
          return true
        }

        return (
          normalize(
            student.name
          ).includes(search) ||
          normalize(
            student.id
          ).includes(search) ||
          normalize(
            student.email
          ).includes(search) ||
          normalize(
            student.yearClass
          ).includes(search) ||
          normalize(
            student.section
          ).includes(search)
        )
      }
    )

  /*
   * ====================================================
   * STATS
   * ====================================================
   */

  const activeTeachers =
    instituteTeachers.filter(
      (teacher) =>
        normalize(
          teacher.status
        ) !== 'inactive'
    ).length

  const inactiveTeachers =
    instituteTeachers.filter(
      (teacher) =>
        normalize(
          teacher.status
        ) === 'inactive'
    ).length

  const activeStudents =
    instituteStudents.filter(
      (student) =>
        normalize(
          student.status
        ) !== 'inactive'
    ).length

  const inactiveStudents =
    instituteStudents.filter(
      (student) =>
        normalize(
          student.status
        ) === 'inactive'
    ).length

  /*
   * ====================================================
   * APPROVE REQUEST
   * ====================================================
   */

  const handleApprove = async (
    requestId
  ) => {
    const request =
      instituteRequests.find(
        (item) =>
          item.id === requestId
      )

    if (!request) {
      await loadRequests()

      showMessage(
        'Registration request not found. Please refresh.',
        'error'
      )

      return
    }

    if (
      normalize(request.status) !==
      'pending'
    ) {
      await loadRequests()

      showMessage(
        'This request has already been processed.',
        'error'
      )

      return
    }

    if (
      normalize(
        request.instituteCode
      ) !== currentInstituteCode
    ) {
      await loadRequests()

      showMessage(
        'You cannot approve a request from another institute.',
        'error'
      )

      return
    }

    try {
      const response = await fetch(
        `/api/registration-requests/${encodeURIComponent(
          requestId
        )}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            status: 'Approved',
          }),
        }
      )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Failed to approve registration request'
        )
      }

      await loadRequests()
      await loadAccounts()

      showMessage(
        `${
          normalize(request.role) ===
          'student'
            ? 'Student'
            : 'Teacher'
        } approved successfully.`
      )
    } catch (error) {
      console.error(
        'Approve request error:',
        error
      )

      showMessage(
        error.message ||
          'Unable to approve registration request.',
        'error'
      )
    }
  }

  /*
   * ====================================================
   * REJECT REQUEST
   * ====================================================
   */

  const handleReject = async (
    requestId
  ) => {
    const request =
      instituteRequests.find(
        (item) =>
          item.id === requestId
      )

    if (!request) {
      await loadRequests()

      showMessage(
        'Registration request not found. Please refresh.',
        'error'
      )

      return
    }

    if (
      normalize(request.status) !==
      'pending'
    ) {
      await loadRequests()

      showMessage(
        'This request has already been processed.',
        'error'
      )

      return
    }

    if (
      normalize(
        request.instituteCode
      ) !== currentInstituteCode
    ) {
      await loadRequests()

      showMessage(
        'You cannot reject a request from another institute.',
        'error'
      )

      return
    }

    try {
      const response = await fetch(
        `/api/registration-requests/${encodeURIComponent(
          requestId
        )}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            status: 'Rejected',
          }),
        }
      )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Failed to reject registration request'
        )
      }

      await loadRequests()

      showMessage(
        'Registration request rejected.'
      )
    } catch (error) {
      console.error(
        'Reject request error:',
        error
      )

      showMessage(
        error.message ||
          'Unable to reject registration request.',
        'error'
      )
    }
  }

  /*
   * ====================================================
   * DUPLICATE ACCOUNT CHECK
   * ====================================================
   */

  const isDuplicateAccount = (
    identityId,
    email
  ) => {
    const normalizedId =
      normalize(identityId)

    const normalizedEmail =
      normalize(email)

    const teacherExists =
      instituteTeachers.some(
        (teacher) =>
          normalize(
            teacher.id
          ) === normalizedId
      )

    const studentExists =
      instituteStudents.some(
        (student) =>
          normalize(
            student.id
          ) === normalizedId
      )

    const teacherEmailExists =
      instituteTeachers.some(
        (teacher) =>
          normalize(
            teacher.email
          ) === normalizedEmail
      )

    const studentEmailExists =
      instituteStudents.some(
        (student) =>
          normalize(
            student.email
          ) === normalizedEmail
      )

    const pendingExists =
      pendingRequests.some(
        (request) =>
          normalize(
            request.identityId
          ) === normalizedId
      )

    const pendingEmailExists =
      pendingRequests.some(
        (request) =>
          normalize(
            request.email
          ) === normalizedEmail
      )

    return {
      identityExists:
        teacherExists ||
        studentExists ||
        pendingExists,

      emailExists:
        teacherEmailExists ||
        studentEmailExists ||
        pendingEmailExists,
    }
  }

  /*
   * ====================================================
   * ADD TEACHER
   * ====================================================
   */

  const handleAddTeacher = (
    event
  ) => {
    event.preventDefault()

    const form =
      event.currentTarget

    const formData =
      new FormData(form)

    const teacherId =
      String(
        formData.get(
          'teacherId'
        ) || ''
      ).trim()

    const teacherName =
      String(
        formData.get(
          'teacherName'
        ) || ''
      ).trim()

    const teacherEmail =
      String(
        formData.get(
          'teacherEmail'
        ) || ''
      )
        .trim()
        .toLowerCase()

    const teacherPassword =
      String(
        formData.get(
          'teacherPassword'
        ) || ''
      )

    if (
      !teacherId ||
      !teacherName ||
      !teacherEmail ||
      !teacherPassword
    ) {
      showMessage(
        'Please fill all teacher fields.',
        'error'
      )

      return
    }

    if (
      teacherPassword.length < 6
    ) {
      showMessage(
        'Password must contain at least 6 characters.',
        'error'
      )

      return
    }

    const duplicate =
      isDuplicateAccount(
        teacherId,
        teacherEmail
      )

    if (duplicate.identityExists) {
      showMessage(
        'This Teacher ID is already registered or pending.',
        'error'
      )

      return
    }

    if (duplicate.emailExists) {
      showMessage(
        'This email is already registered or pending.',
        'error'
      )

      return
    }

    let latestTeachers = []

    try {
      const saved =
        localStorage.getItem(
          'quizvigil_teachers'
        )

      latestTeachers =
        saved
          ? JSON.parse(saved)
          : []

      if (
        !Array.isArray(
          latestTeachers
        )
      ) {
        latestTeachers = []
      }
    } catch {
      latestTeachers = []
    }

    const newTeacher = {
      id: teacherId,
      name: teacherName,
      email: teacherEmail,
      password:
        teacherPassword,
      instituteCode,
      instituteName,
      status: 'Active',
      createdAt:
        new Date().toISOString(),
    }

    const updatedTeachers = [
      ...latestTeachers,
      newTeacher,
    ]

    localStorage.setItem(
      'quizvigil_teachers',
      JSON.stringify(
        updatedTeachers
      )
    )

    setTeachers(
      updatedTeachers
    )

    setShowTeacherForm(false)

    form.reset()

    showMessage(
      'Teacher added successfully.'
    )
  }

  /*
   * ====================================================
   * TOGGLE TEACHER STATUS
   * ====================================================
   */

  const handleRemoveTeacher = async (
    teacherId
  ) => {
    const teacher =
      instituteTeachers.find(
        (item) =>
          item.id === teacherId
      )

    if (!teacher) {
      return
    }

    if (
      teacher.source ===
      'backend'
    ) {
      if (!teacher.userId) {
        showMessage(
          'Teacher backend user ID is missing.',
          'error'
        )

        return
      }

      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(
            teacher.userId
          )}/status?instituteCode=${encodeURIComponent(
            instituteCode
          )}`,
          {
            method: 'PATCH',
          }
        )

        const data =
          await response.json()

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to update teacher status'
          )
        }

        await loadAccounts()

        showMessage(
          `Teacher ${String(
            data.user?.status || ''
          ).toLowerCase()} successfully.`
        )
      } catch (error) {
        console.error(
          'Toggle teacher status error:',
          error
        )

        showMessage(
          error.message ||
            'Unable to update teacher status.',
          'error'
        )
      }

      return
    }

    const confirmed =
      window.confirm(
        `Remove teacher "${teacher.name}" from this institute?`
      )

    if (!confirmed) {
      return
    }

    const updatedTeachers =
      teachers.filter(
        (item) =>
          !(
            item.id === teacherId &&
            normalize(
              item.instituteCode
            ) ===
              currentInstituteCode
          )
      )

    localStorage.setItem(
      'quizvigil_teachers',
      JSON.stringify(
        updatedTeachers
      )
    )

    setTeachers(
      updatedTeachers
    )

    showMessage(
      'Teacher removed successfully.'
    )
  }

  /*
   * ====================================================
   * ADD STUDENT
   * ====================================================
   */

  const handleAddStudent = (
    event
  ) => {
    event.preventDefault()

    const form =
      event.currentTarget

    const formData =
      new FormData(form)

    const studentId =
      String(
        formData.get(
          'studentId'
        ) || ''
      ).trim()

    const studentName =
      String(
        formData.get(
          'studentName'
        ) || ''
      ).trim()

    const studentEmail =
      String(
        formData.get(
          'studentEmail'
        ) || ''
      )
        .trim()
        .toLowerCase()

    const studentPassword =
      String(
        formData.get(
          'studentPassword'
        ) || ''
      )

    const yearClass =
      String(
        formData.get(
          'yearClass'
        ) || ''
      ).trim()

    const section =
      String(
        formData.get(
          'section'
        ) || ''
      ).trim()

    if (
      !studentId ||
      !studentName ||
      !studentEmail ||
      !studentPassword ||
      !yearClass ||
      !section
    ) {
      showMessage(
        'Please fill all student fields.',
        'error'
      )

      return
    }

    if (
      studentPassword.length < 6
    ) {
      showMessage(
        'Password must contain at least 6 characters.',
        'error'
      )

      return
    }

    const duplicate =
      isDuplicateAccount(
        studentId,
        studentEmail
      )

    if (duplicate.identityExists) {
      showMessage(
        'This Student ID / Roll No. is already registered or pending.',
        'error'
      )

      return
    }

    if (duplicate.emailExists) {
      showMessage(
        'This email is already registered or pending.',
        'error'
      )

      return
    }

    let latestStudents = []

    try {
      const saved =
        localStorage.getItem(
          'quizvigil_students'
        )

      latestStudents =
        saved
          ? JSON.parse(saved)
          : []

      if (
        !Array.isArray(
          latestStudents
        )
      ) {
        latestStudents = []
      }
    } catch {
      latestStudents = []
    }

    const newStudent = {
      id: studentId,
      name: studentName,
      email: studentEmail,
      password:
        studentPassword,
      instituteCode,
      instituteName,
      yearClass,
      section,
      status: 'Active',
      createdAt:
        new Date().toISOString(),
    }

    const updatedStudents = [
      ...latestStudents,
      newStudent,
    ]

    localStorage.setItem(
      'quizvigil_students',
      JSON.stringify(
        updatedStudents
      )
    )

    setStudents(
      updatedStudents
    )

    setShowStudentForm(false)

    form.reset()

    showMessage(
      'Student added successfully.'
    )
  }

  /*
   * ====================================================
   * TOGGLE STUDENT STATUS
   * ====================================================
   */

  const handleRemoveStudent = async (
    studentId
  ) => {
    const student =
      instituteStudents.find(
        (item) =>
          item.id === studentId
      )

    if (!student) {
      return
    }

    if (
      student.source ===
      'backend'
    ) {
      if (!student.userId) {
        showMessage(
          'Student backend user ID is missing.',
          'error'
        )

        return
      }

      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(
            student.userId
          )}/status?instituteCode=${encodeURIComponent(
            instituteCode
          )}`,
          {
            method: 'PATCH',
          }
        )

        const data =
          await response.json()

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to update student status'
          )
        }

        await loadAccounts()

        showMessage(
          `Student ${String(
            data.user?.status || ''
          ).toLowerCase()} successfully.`
        )
      } catch (error) {
        console.error(
          'Toggle student status error:',
          error
        )

        showMessage(
          error.message ||
            'Unable to update student status.',
          'error'
        )
      }

      return
    }

    const confirmed =
      window.confirm(
        `Remove student "${student.name}" from this institute?`
      )

    if (!confirmed) {
      return
    }

    const updatedStudents =
      students.filter(
        (item) =>
          !(
            item.id === studentId &&
            normalize(
              item.instituteCode
            ) ===
              currentInstituteCode
          )
      )

    localStorage.setItem(
      'quizvigil_students',
      JSON.stringify(
        updatedStudents
      )
    )

    setStudents(
      updatedStudents
    )

    showMessage(
      'Student removed successfully.'
    )
  }

  /*
   * ====================================================
   * LOGOUT
   * ====================================================
   */

  const handleLogout = () => {
    localStorage.removeItem(
      'quizvigil_current_user'
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
          <p className="dashboard-label">
            INSTITUTE ADMIN
          </p>

          <h1>
            Institute Dashboard
          </h1>

          <p>
            Manage {instituteName},
            teachers, students and
            approvals.
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
            className="dashboard-logout"
            onClick={() => {
              loadRequests()
              loadAccounts()
            }}
          >
            Refresh Data
          </button>

          <button
            className="dashboard-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background:
              messageType === 'error'
                ? '#fee2e2'
                : '#eff6ff',
            color:
              messageType === 'error'
                ? '#991b1b'
                : '#1d4ed8',
            fontWeight: '600',
            border:
              messageType === 'error'
                ? '1px solid #fecaca'
                : '1px solid #dbeafe',
          }}
        >
          {message}
        </div>
      )}

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span>
            Total Teachers
          </span>

          <strong>
            {instituteTeachers.length}
          </strong>
        </div>

        <div className="dashboard-stat-card">
          <span>
            Total Students
          </span>

          <strong>
            {instituteStudents.length}
          </strong>
        </div>

        <div className="dashboard-stat-card">
          <span>
            Pending Approvals
          </span>

          <strong>
            {pendingRequests.length}
          </strong>
        </div>

        <div className="dashboard-stat-card">
          <span>
            Active Accounts
          </span>

          <strong>
            {activeTeachers +
              activeStudents}
          </strong>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="admin-tabs">
          <button
            className={
              activeTab === 'overview'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('overview')
            }
          >
            Overview
          </button>

          <button
            className={
              activeTab === 'teachers'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('teachers')
            }
          >
            Teachers
          </button>

          <button
            className={
              activeTab === 'students'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('students')
            }
          >
            Students
          </button>

          <button
            className={
              activeTab === 'approvals'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('approvals')
            }
          >
            Approvals

            {pendingRequests.length >
              0 && (
              <span className="approval-count">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="empty-state">
            <div className="empty-icon">
              🏫
            </div>

            <h3>
              {instituteName}
            </h3>

            <p>
              Institute Code:{' '}
              <strong>
                {instituteCode}
              </strong>
            </p>

            <p>
              Manage teachers, students
              and registration requests
              from this dashboard.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px',
                marginTop: '24px',
                textAlign: 'left',
              }}
            >
              <div className="dashboard-stat-card">
                <span>
                  Teachers
                </span>

                <strong>
                  {instituteTeachers.length}
                </strong>

                <small
                  style={{
                    color: '#64748b',
                  }}
                >
                  {activeTeachers} active
                  {inactiveTeachers >
                    0
                    ? ` · ${inactiveTeachers} inactive`
                    : ''}
                </small>
              </div>

              <div className="dashboard-stat-card">
                <span>
                  Students
                </span>

                <strong>
                  {instituteStudents.length}
                </strong>

                <small
                  style={{
                    color: '#64748b',
                  }}
                >
                  {activeStudents} active
                  {inactiveStudents >
                    0
                    ? ` · ${inactiveStudents} inactive`
                    : ''}
                </small>
              </div>

              <div className="dashboard-stat-card">
                <span>
                  Pending
                </span>

                <strong>
                  {pendingRequests.length}
                </strong>

                <small
                  style={{
                    color: '#64748b',
                  }}
                >
                  Registration requests
                </small>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div>
            <div className="section-header">
              <div>
                <h2>
                  Teachers
                </h2>

                <p>
                  Manage teachers connected
                  with your institute.
                </p>
              </div>

              <button
                className="dashboard-primary-btn"
                onClick={() =>
                  setShowTeacherForm(
                    !showTeacherForm
                  )
                }
              >
                {showTeacherForm
                  ? 'Close'
                  : '+ Add Teacher'}
              </button>
            </div>

            {showTeacherForm && (
              <div className="dashboard-card">
                <h2>
                  Add Teacher
                </h2>

                <p className="dashboard-muted">
                  Add a teacher directly to
                  this institute.
                </p>

                <form
                  className="dashboard-form"
                  onSubmit={
                    handleAddTeacher
                  }
                >
                  <label>
                    Teacher ID
                  </label>

                  <input
                    type="text"
                    name="teacherId"
                    placeholder="e.g. KIPM-TCH-2026-001"
                    required
                  />

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="teacherName"
                    placeholder="Enter teacher name"
                    required
                  />

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="teacherEmail"
                    placeholder="Enter teacher email"
                    required
                  />

                  <label>
                    Password
                  </label>

                  <input
                    type="password"
                    name="teacherPassword"
                    placeholder="Create password"
                    minLength="6"
                    required
                  />

                  <button
                    className="dashboard-primary-btn"
                    type="submit"
                  >
                    Add Teacher
                  </button>
                </form>
              </div>
            )}

            <div
              style={{
                marginBottom: '18px',
              }}
            >
              <input
                type="search"
                value={teacherSearch}
                onChange={(event) =>
                  setTeacherSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, Teacher ID or email..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 14px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '14px',
                }}
              />
            </div>

            {instituteTeachers.length ===
            0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  👨‍🏫
                </div>

                <h3>
                  No Teachers Added
                </h3>

                <p>
                  Approved teachers will
                  appear here.
                </p>
              </div>
            ) : filteredTeachers.length ===
              0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  🔎
                </div>

                <h3>
                  No Teachers Found
                </h3>

                <p>
                  Try a different search
                  term.
                </p>
              </div>
            ) : (
              <div className="institute-list">
                {filteredTeachers.map(
                  (teacher) => {
                    const isInactive =
                      normalize(
                        teacher.status
                      ) === 'inactive'

                    return (
                      <div
                        className="institute-item"
                        key={`${teacher.id}-${teacher.email}`}
                      >
                        <div>
                          <h3>
                            {teacher.name}
                          </h3>

                          <p>
                            Teacher ID:{' '}
                            {teacher.id}
                          </p>

                          <p>
                            Email:{' '}
                            {teacher.email}
                          </p>
                        </div>

                        <div className="institute-actions">
                          <span
                            className={
                              isInactive
                                ? 'institute-status inactive'
                                : 'institute-status'
                            }
                          >
                            {isInactive
                              ? 'Inactive'
                              : 'Active'}
                          </span>

                          <button
                            className="institute-action-btn deactivate"
                            onClick={() =>
                              handleRemoveTeacher(
                                teacher.id
                              )
                            }
                          >
                            {isInactive
                              ? 'Activate'
                              : 'Deactivate'}
                          </button>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <div className="section-header">
              <div>
                <h2>
                  Students
                </h2>

                <p>
                  Manage students connected
                  with your institute.
                </p>
              </div>

              <button
                className="dashboard-primary-btn"
                onClick={() =>
                  setShowStudentForm(
                    !showStudentForm
                  )
                }
              >
                {showStudentForm
                  ? 'Close'
                  : '+ Add Student'}
              </button>
            </div>

            {showStudentForm && (
              <div className="dashboard-card">
                <h2>
                  Add Student
                </h2>

                <p className="dashboard-muted">
                  Add a student directly to
                  this institute.
                </p>

                <form
                  className="dashboard-form"
                  onSubmit={
                    handleAddStudent
                  }
                >
                  <label>
                    Student ID / Roll No.
                  </label>

                  <input
                    type="text"
                    name="studentId"
                    placeholder="e.g. KIPM-STU-2026-00125"
                    required
                  />

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="studentName"
                    placeholder="Enter student name"
                    required
                  />

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="studentEmail"
                    placeholder="Enter student email"
                    required
                  />

                  <label>
                    Password
                  </label>

                  <input
                    type="password"
                    name="studentPassword"
                    placeholder="Create password"
                    minLength="6"
                    required
                  />

                  <label>
                    Year / Class
                  </label>

                  <input
                    type="text"
                    name="yearClass"
                    placeholder="e.g. BCA 2nd Year"
                    required
                  />

                  <label>
                    Section
                  </label>

                  <input
                    type="text"
                    name="section"
                    placeholder="e.g. A"
                    required
                  />

                  <button
                    className="dashboard-primary-btn"
                    type="submit"
                  >
                    Add Student
                  </button>
                </form>
              </div>
            )}

            <div
              style={{
                marginBottom: '18px',
              }}
            >
              <input
                type="search"
                value={studentSearch}
                onChange={(event) =>
                  setStudentSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, Roll No., email, class or section..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 14px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '14px',
                }}
              />
            </div>

            {instituteStudents.length ===
            0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  🎓
                </div>

                <h3>
                  No Students Added
                </h3>

                <p>
                  Approved students will
                  appear here.
                </p>
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  🔎
                </div>

                <h3>
                  No Students Found
                </h3>

                <p>
                  Try a different search
                  term.
                </p>
              </div>
            ) : (
              <div className="institute-list">
                {filteredStudents.map(
                  (student) => {
                    const isInactive =
                      normalize(
                        student.status
                      ) === 'inactive'

                    return (
                      <div
                        className="institute-item"
                        key={`${student.id}-${student.email}`}
                      >
                        <div>
                          <h3>
                            {student.name}
                          </h3>

                          <p>
                            Student ID:{' '}
                            {student.id}
                          </p>

                          <p>
                            Email:{' '}
                            {student.email}
                          </p>

                          <p>
                            {student.yearClass ||
                              'Class not specified'}
                            {' — '}
                            Section{' '}
                            {student.section ||
                              'N/A'}
                          </p>
                        </div>

                        <div className="institute-actions">
                          <span
                            className={
                              isInactive
                                ? 'institute-status inactive'
                                : 'institute-status'
                            }
                          >
                            {isInactive
                              ? 'Inactive'
                              : 'Active'}
                          </span>

                          <button
                            className="institute-action-btn deactivate"
                            onClick={() =>
                              handleRemoveStudent(
                                student.id
                              )
                            }
                          >
                            {isInactive
                              ? 'Activate'
                              : 'Deactivate'}
                          </button>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div>
            <div className="section-header">
              <div>
                <h2>
                  Registration Approvals
                </h2>

                <p>
                  Review teacher and student
                  self-registration requests
                  from Neon database.
                </p>
              </div>

              <button
                className="dashboard-primary-btn"
                onClick={loadRequests}
                disabled={
                  loadingRequests
                }
              >
                {loadingRequests
                  ? 'Loading...'
                  : 'Refresh Requests'}
              </button>
            </div>

            {loadingRequests ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ⏳
                </div>

                <h3>
                  Loading Requests
                </h3>

                <p>
                  Fetching registration
                  requests from database...
                </p>
              </div>
            ) : pendingRequests.length ===
              0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  📋
                </div>

                <h3>
                  No Pending Requests
                </h3>

                <p>
                  Teacher and student
                  registration requests
                  will appear here.
                </p>
              </div>
            ) : (
              <div className="approval-list">
                {pendingRequests.map(
                  (request) => (
                    <div
                      className="approval-item"
                      key={request.id}
                    >
                      <div className="approval-info">
                        <span className="approval-role">
                          {normalize(
                            request.role
                          ) === 'student'
                            ? 'STUDENT'
                            : 'TEACHER'}
                        </span>

                        <h3>
                          {request.name}
                        </h3>

                        <p>
                          {normalize(
                            request.role
                          ) === 'student'
                            ? 'Student ID'
                            : 'Teacher ID'}
                          :{' '}
                          {request.identityId}
                        </p>

                        <p>
                          Email:{' '}
                          {request.email}
                        </p>

                        <p>
                          Institute:{' '}
                          {request.instituteName}
                        </p>

                        {normalize(
                          request.role
                        ) === 'student' && (
                          <p>
                            {request.yearClass ||
                              'Class not specified'}
                            {' — '}
                            Section{' '}
                            {request.section ||
                              'N/A'}
                          </p>
                        )}

                        <p
                          style={{
                            fontSize:
                              '12px',
                            color:
                              '#94a3b8',
                          }}
                        >
                          Requested:{' '}
                          {request.createdAt
                            ? new Date(
                                request.createdAt
                              ).toLocaleString()
                            : 'Recently'}
                        </p>
                      </div>

                      <div className="approval-actions">
                        <button
                          className="approval-approve-btn"
                          onClick={() =>
                            handleApprove(
                              request.id
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="approval-reject-btn"
                          onClick={() =>
                            handleReject(
                              request.id
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default InstituteAdminDashboard