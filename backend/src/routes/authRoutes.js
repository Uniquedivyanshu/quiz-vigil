import express from 'express'

import {
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from '../controllers/authController.js'

const router = express.Router()

router.post('/login', login)

router.post(
  '/forgot-password',
  forgotPassword,
)

router.post(
  '/verify-reset-code',
  verifyResetCode,
)

router.post(
  '/reset-password',
  resetPassword,
)

export default router