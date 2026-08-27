// backend/routes/studentRoutes.js for student dashboard, marks, report card, and filters
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All student routes require authentication and student or parent role
router.use(verifyToken, requireRole(['student', 'parent']));

// Dashboard
router.get('/dashboard', studentController.getStudentDashboard);

// Marks and Reports
router.get('/marks', studentController.getStudentMarks);
router.get('/filters', studentController.getStudentFilters);
router.get('/report-card/:year_id/:term_id', studentController.getStudentReportCard);

module.exports = router;