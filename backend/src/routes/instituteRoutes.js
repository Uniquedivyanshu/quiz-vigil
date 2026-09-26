import express from 'express'
import {
  getInstitutes,
  createInstitute,
  toggleInstituteStatus,
} from '../controllers/instituteController.js'

const router = express.Router()

router.get('/', getInstitutes)
router.post('/', createInstitute)
router.patch('/:code/status', toggleInstituteStatus)

export default router