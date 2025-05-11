const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

router.get('/parents', parentController.getAllParents);
router.post('/parents', parentController.addParent);
router.put('/parents/:ParentID', parentController.updateParent);
router.delete('/parents/:ParentID', parentController.deleteParent);

module.exports = router;
