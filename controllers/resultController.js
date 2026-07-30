const ResultService = require('../services/resultService');

exports.getStudentResults = async (req, res, next) => {
  try {
    const results = await ResultService.getStudentResults(req.query);
    res.json(results);
  } catch (error) {
    next(error);
  }
};
