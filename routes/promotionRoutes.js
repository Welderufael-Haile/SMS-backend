const express = require('express');
const router = express.Router();
const {
  previewPromotion,
  confirmPromotion
} = require('../controllers/promotionController');

router.get('/preview', previewPromotion);
router.post('/confirm', confirmPromotion);

module.exports = router;
