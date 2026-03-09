// routes/adminAttendanceRoutes.js
const express = require('express');
const router = express.Router();
const adminAttendanceController = require('../controllers/adminAttendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All admin attendance routes require authentication and admin role
router.use(verifyToken, requireRole(['admin']));

// Get attendance dashboard data with all analytics
router.get('/dashboard', adminAttendanceController.getAttendanceDashboard);

// Export attendance report (PDF or Excel)
router.get('/export/:format', adminAttendanceController.exportAttendanceReport);

// Get attendance trends by grade/section
router.get('/trends/grade', adminAttendanceController.getGradeTrends);
router.get('/trends/section/:section_id', adminAttendanceController.getSectionTrends);

// Get student-wise attendance details
router.get('/students', adminAttendanceController.getStudentAttendanceDetails);
router.get('/students/:student_id', adminAttendanceController.getStudentAttendanceHistory);

// Get daily attendance summary
router.get('/daily-summary', adminAttendanceController.getDailySummary);
router.get('/daily-summary/:date', adminAttendanceController.getDailySummaryByDate);

// Get monthly/term summary
router.get('/summary/monthly', adminAttendanceController.getMonthlySummary);
router.get('/summary/term/:term_id', adminAttendanceController.getTermSummary);

// Get at-risk students (below threshold)
router.get('/at-risk', adminAttendanceController.getAtRiskStudents);

// Recalculate attendance summaries (admin only)
router.post('/recalculate', adminAttendanceController.recalculateAllSummaries);
router.post('/recalculate/:enrollment_id', adminAttendanceController.recalculateSummary);

module.exports = router;