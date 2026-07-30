const ReportCardService = require('../services/reportCardService');

exports.getReportCardData = async (req, res, next) => {
  try {
    const data = await ReportCardService.getReportCardData(req.query);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};