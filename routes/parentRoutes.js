
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// 🔹 Note the ['admin'] as an array to match your previous middleware logic
router.get('/parents', verifyToken, requireRole(['admin']), parentController.getAllParents);
router.get('/parents/:id', verifyToken, requireRole(['admin']), parentController.getParentById);
router.post('/parents', verifyToken, requireRole(['admin']), parentController.addParent);
router.put('/parents/:id', verifyToken, requireRole(['admin']), parentController.updateParent);
router.delete('/parents/:id', verifyToken, requireRole(['admin']), parentController.deleteParent);

module.exports = router;