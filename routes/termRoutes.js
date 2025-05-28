const express = require('express');
const router = express.Router();
const termController = require('../controllers/termController');

// Define term routes
router.post('/', termController.createTerm);
router.get('/by-year/:academicYearId', termController.getTermsByAcademicYear);
router.get('/', termController.getAllTerms);
router.get('/:id', termController.getTermById);
router.put('/:id', termController.updateTerm);
router.delete('/:id', termController.deleteTerm);

module.exports = router; // ✅ This is the key!
