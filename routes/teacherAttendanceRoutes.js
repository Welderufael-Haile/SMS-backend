// backend/routes/teacherAttendanceRoutes.js
const express = require('express');
const router = express.Router();
const teacherAttendanceController = require('../controllers/teacherAttendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All teacher attendance routes require authentication and teacher role
router.use(verifyToken, requireRole(['teacher']));

// Get teacher's assigned sections for dropdown
router.get('/sections', teacherAttendanceController.getTeacherSections);

// Get teacher's assigned terms for dropdown
router.get('/terms', teacherAttendanceController.getTeacherTerms);

// Get students for attendance marking (with filters)
router.get('/students', teacherAttendanceController.getStudentsForAttendance);

// Mark attendance (bulk operation)
router.post('/mark', teacherAttendanceController.markAttendance);

// Get today's attendance summary
router.get('/today-summary', teacherAttendanceController.getTodaySummary);

// Get attendance history for a specific student
router.get('/student/:student_id/history', teacherAttendanceController.getStudentAttendanceHistory);
router.get('/student/:student_id/history/term/:term_id', teacherAttendanceController.getStudentAttendanceHistory);

module.exports = router;