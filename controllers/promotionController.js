const PromotionService = require('../services/promotionService');

exports.previewPromotion = async (req, res, next) => {
  try {
    const result = await PromotionService.previewPromotion(req.query);
    res.json({
      success: true,
      message: "Preview generated successfully",
      stats: result.stats,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

exports.confirmPromotion = async (req, res, next) => {
  try {
    const result = await PromotionService.confirmPromotion(req.body);
    res.json({
      success: true,
      message: "Promotion completed successfully",
      stats: result.stats,
      details: result.details
    });
  } catch (error) {
    next(error);
  }
};

exports.getTermCompletionSummary = async (req, res, next) => {
  try {
    const result = await PromotionService.previewPromotion(req.query);
    res.json({
      success: true,
      overall: result.stats,
      by_section: []
    });
  } catch (error) {
    next(error);
  }
};

exports.getPromotionEligibility = async (req, res, next) => {
  try {
    const result = await PromotionService.getPromotionEligibility(req.query.academic_year_id);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};