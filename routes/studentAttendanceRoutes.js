// routes/studentAttendanceRoutes.js
const express = require('express');
const router = express.Router();
const studentAttendanceController = require('../controllers/studentAttendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All student attendance routes require authentication and student role
router.use(verifyToken, requireRole(['student', 'parent']));

// Get current attendance (active term)
router.get('/current', studentAttendanceController.getStudentAttendance);

// Get attendance for specific term
router.get('/term/:term_id', studentAttendanceController.getAttendanceByTerm);

module.exports = router;