import express from 'express'

import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  getAttempt,
  getStudentAttempts,
  logAntiCheatEvent,
  getAntiCheatLogs,
  getResults,
} from '../controllers/attemptController.js'

const router = express.Router()

/* Start quiz attempt */
router.post('/start', startAttempt)

/* Student attempts */
router.get('/student/:studentId', getStudentAttempts)

/* Results */
router.get('/results', getResults)

/* Anti-cheat logs */
router.get('/anti-cheat/logs', getAntiCheatLogs)

/* Attempt actions */
router.post('/:id/answer', saveAnswer)

router.post('/:id/submit', submitAttempt)

router.post('/:id/anti-cheat', logAntiCheatEvent)

/* Single attempt */
router.get('/:id', getAttempt)

export default router