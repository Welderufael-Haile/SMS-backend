const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Protect all enrollment routes
router.use(verifyToken);
router.use(requireRole(['admin', 'registrar']));

router.get('/dropdowns', enrollmentController.getDropdowns);
router.get('/export', enrollmentController.exportToExcel);
router.post('/next-term', enrollmentController.enrollNextTerm);
router.get('/archived', enrollmentController.getArchivedEnrollments);
router.get('/archive-count', enrollmentController.getArchiveCount);

router.get('/', enrollmentController.getAllEnrollments);
router.post('/', enrollmentController.createEnrollment);
router.put('/bulk-transfer', enrollmentController.bulkTransfer);

router.put('/:id', enrollmentController.updateEnrollment);
router.delete('/:id', enrollmentController.deleteEnrollment);

router.patch('/status/:id', enrollmentController.updateEnrollmentStatus);
router.patch('/restore/:id', enrollmentController.restoreEnrollment);
router.delete('/permanent/:id', enrollmentController.permanentDelete);

module.exports = router;
