const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academicYearController');

router.get('/', academicYearController.getAllAcademicYears);
router.post('/', academicYearController.createAcademicYear);
router.get('/:id', academicYearController.getAcademicYearById);
router.put('/:id', academicYearController.updateAcademicYear);
router.delete('/:id', academicYearController.deleteAcademicYear);

module.exports = router;
