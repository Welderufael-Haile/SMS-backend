
const express = require('express');
const router = express.Router();

const {getAllEnrollments, getDropdowns,createEnrollment,updateEnrollment,deleteEnrollment,exportToExcel,updateEnrollmentStatus,enrollNextTerm,
getArchivedEnrollments, restoreEnrollment, permanentDelete, getArchiveCount
} = require('../controllers/enrollmentController');

// Define the routes
router.get('/', getAllEnrollments);
router.get('/dropdowns', getDropdowns); 
router.post('/', createEnrollment);
router.put('/:id', updateEnrollment);
router.delete('/:id', deleteEnrollment);
router.get('/export', exportToExcel); // <-- Make sure this exists
router.put('/:id/status', updateEnrollmentStatus);  // route for updating status
router.post('/term/auto-enroll', enrollNextTerm);
// Additional routes for archived enrollments
router.get('/archived', getArchivedEnrollments);
router.put('/:id/restore', restoreEnrollment);
router.delete('/:id/permanent', permanentDelete);
router.get('/archived/count', getArchiveCount);
module.exports = router;
