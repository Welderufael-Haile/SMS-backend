const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats
router.get('/stats', statsController.getStats);

module.exports = router;
