import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import sql from './config/db.js'
import instituteRoutes from './routes/instituteRoutes.js'
import registrationRoutes from './routes/registrationRoutes.js'
import authRoutes from './routes/authRoutes.js'
import quizRoutes from './routes/quizRoutes.js'
import attemptRoutes from './routes/attemptRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import userRoutes from './routes/userRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

app.use(express.json())

app.get('/', (req, res) => {
  res.status(200).send('QuizVigil Backend API is running')
})

app.get('/api/health', async (req, res) => {
  try {
    const result = await sql`
      SELECT 1 AS connected
    `

    res.status(200).json({
      success: true,
      message: 'QuizVigil API and PostgreSQL database are connected',
      database:
        result?.[0]?.connected === 1
          ? 'connected'
          : 'unknown',
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    res.status(500).json({
      success: false,
      message: 'API is running but database connection failed',
      database: 'disconnected',
    })
  }
})

app.use('/api/institutes', instituteRoutes)
app.use('/api/registration-requests', registrationRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/quizzes', quizRoutes)
app.use('/api/attempts', attemptRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/users', userRoutes)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

app.use((error, req, res, next) => {
  console.error('Server Error:', error)

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`QuizVigil backend running on port ${PORT}`)
})