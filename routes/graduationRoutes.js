// routes/graduationRoutes.js
const express = require('express');
const router = express.Router();
const graduationController = require('../controllers/graduationController');

// ✅ Fix: Make sure paths match what frontend is calling
router.get('/graduates', graduationController.getGraduates);              // /api/graduation/graduates
router.get('/graduates/:id', graduationController.getGraduateById);       // /api/graduation/graduates/123
router.post('/graduates/:id/certificate', graduationController.generateCertificate); // /api/graduation/graduates/123/certificate
router.get('/stats', graduationController.getGraduationStats);            // /api/graduation/stats
module.exports = router;