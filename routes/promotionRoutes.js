const express = require('express');
const router = express.Router();
const {
  previewPromotion,
  confirmPromotion, 
  getPromotionEligibility
} = require('../controllers/promotionController');

router.get('/preview', previewPromotion);
router.post('/confirm', confirmPromotion);
router.get('/eligible', getPromotionEligibility); // /api/graduation/getPromotionEligibility?academic_year_id=1

module.exports = router;
