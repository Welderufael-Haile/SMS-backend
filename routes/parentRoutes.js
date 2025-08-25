// routes/parents.js
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

router.get('/parents', parentController.getAllParents);
router.get('/parents/:id', parentController.getParentById);
router.post('/parents', parentController.addParent);
router.put('/parents/:id', parentController.updateParent);
router.delete('/parents/:id', parentController.deleteParent);

module.exports = router;