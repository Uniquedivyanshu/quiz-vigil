import express from 'express'

import {
  getQuestions,
  createQuestion,
  deleteQuestion,
  getQuizzes,
  createQuiz,
  getQuizById,
  startQuiz,
  stopQuiz,
  deleteQuiz,
} from '../controllers/quizController.js'

const router = express.Router()

router.get(
  '/questions',
  getQuestions
)

router.post(
  '/questions',
  createQuestion
)

router.delete(
  '/questions/:id',
  deleteQuestion
)

router.get(
  '/',
  getQuizzes
)

router.post(
  '/',
  createQuiz
)

router.post(
  '/:id/start',
  startQuiz
)

router.post(
  '/:id/stop',
  stopQuiz
)

router.delete(
  '/:id',
  deleteQuiz
)

router.get(
  '/:id',
  getQuizById
)

export default router