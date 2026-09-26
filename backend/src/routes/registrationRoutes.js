import express from 'express'
import {
  createRegistrationRequest,
  getRegistrationRequests,
  updateRegistrationRequest,
} from '../controllers/registrationController.js'

const router = express.Router()

// Create new teacher/student registration request
router.post('/', createRegistrationRequest)

// Get all registration requests
router.get('/', getRegistrationRequests)

// Approve / Reject registration request
router.patch('/:id', updateRegistrationRequest)

export default router