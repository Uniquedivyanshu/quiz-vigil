import express from 'express'
import {
  getUsers,
  toggleUserStatus,
} from '../controllers/userController.js'

const router = express.Router()

router.get('/', getUsers)

router.patch('/:id/status', toggleUserStatus)

export default router