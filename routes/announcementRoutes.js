
// routes/announcementRoutes.js
const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.get('/', announcementController.getAnnouncements);
router.get('/:id', announcementController.getAnnouncementById);

// Admin only routes
router.post('/', verifyToken, requireRole(['admin']), announcementController.createAnnouncement);
router.put('/:id', verifyToken, requireRole(['admin']), announcementController.updateAnnouncement);
router.delete('/:id', verifyToken, requireRole(['admin']), announcementController.deleteAnnouncement);
router.patch('/:id/toggle-pin', verifyToken, requireRole(['admin']), announcementController.togglePin);
router.get('/stats/overview', verifyToken, requireRole(['admin']), announcementController.getAnnouncementStats);

module.exports = router;