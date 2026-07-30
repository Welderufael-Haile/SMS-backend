const express = require('express');
const router = express.Router();
const announcementsController = require('../controllers/announcementController');

router.get('/stats', announcementsController.getAnnouncementStats);
router.get('/', announcementsController.getAnnouncements);
router.post('/', announcementsController.createAnnouncement);
router.get('/:id', announcementsController.getAnnouncementById);
router.put('/:id', announcementsController.updateAnnouncement);
router.delete('/:id', announcementsController.deleteAnnouncement);
router.patch('/:id/pin', announcementsController.togglePin);

module.exports = router;