const express = require('express');
const router = express.Router();
const termController = require('../controllers/termController');

router.get('/academic-year/:academicYearId', termController.getTermsByAcademicYear);
router.get('/', termController.getAllTerms);
router.post('/', termController.createTerm);
router.get('/:id', termController.getTermById);
router.put('/:id', termController.updateTerm);
router.delete('/:id', termController.deleteTerm);

module.exports = router;
