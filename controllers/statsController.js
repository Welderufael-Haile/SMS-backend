const StatsService = require('../services/statsService');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await StatsService.getStats(req.query);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};