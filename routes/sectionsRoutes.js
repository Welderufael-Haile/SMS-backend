const express = require('express');
const router = express.Router();
const sectionsController = require('../controllers/sectionsController');

router.get('/', sectionsController.fetchSections);
router.get('/fetch', sectionsController.fetchSections);
router.get('/active', sectionsController.fetchActiveSections);
router.post('/', sectionsController.addSection);
router.post('/add', sectionsController.addSection);
router.put('/:id', sectionsController.updateSection);
router.put('/update/:id', sectionsController.updateSection);
router.patch('/:id/status', sectionsController.toggleStatus);
router.delete('/:id', sectionsController.deleteSection);
router.delete('/delete/:id', sectionsController.deleteSection);

module.exports = router;
