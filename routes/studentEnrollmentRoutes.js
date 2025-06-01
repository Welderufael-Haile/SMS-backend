const express = require('express');
const router = express.Router();
const studentEnrollmentController = require('../controllers/studentEnrollmentController');

router.post('/', studentEnrollmentController.createEnrollment);
router.get('/', studentEnrollmentController.getAllEnrollments);
router.get('/:id', studentEnrollmentController.getEnrollment);
router.put('/:id', studentEnrollmentController.updateEnrollment);
router.delete('/:id', studentEnrollmentController.deleteEnrollment);

module.exports = router;