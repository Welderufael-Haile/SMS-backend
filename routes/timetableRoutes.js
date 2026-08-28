const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Get personal timetable (Student, Teacher, Parent)
router.get('/my-timetable', verifyToken, requireRole(['student', 'teacher', 'parent']), timetableController.getMyTimetable);

// Get section timetable
router.get('/section/:section_id', verifyToken, timetableController.getSectionTimetable);

// School days settings
router.get('/days', verifyToken, timetableController.getSchoolDays);
router.patch('/days/:id', verifyToken, requireRole(['admin']), timetableController.toggleSchoolDay);

// School periods settings
router.get('/periods', verifyToken, timetableController.getSchoolPeriods);
router.post('/periods', verifyToken, requireRole(['admin']), timetableController.saveSchoolPeriod);
router.delete('/periods/:id', verifyToken, requireRole(['admin']), timetableController.deleteSchoolPeriod);

// Get teacher timetable
router.get('/teacher/:teacher_id', verifyToken, timetableController.getTeacherTimetable);

// Save manual slot
router.post('/slot', verifyToken, requireRole(['admin']), timetableController.saveTimetableSlot);

// Delete slot
router.delete('/slot/:id', verifyToken, requireRole(['admin']), timetableController.deleteTimetableSlot);

// Auto-generate timetable
router.post('/auto-generate', verifyToken, requireRole(['admin']), timetableController.autoGenerateTimetable);

module.exports = router;
