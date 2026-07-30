const GraduationService = require('../services/graduationService');

exports.getGraduates = async (req, res, next) => {
  try {
    const result = await GraduationService.getGraduates(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getGraduateById = async (req, res, next) => {
  try {
    const graduate = await GraduationService.getGraduateById(req.params.id);
    res.json(graduate);
  } catch (error) {
    next(error);
  }
};

exports.generateCertificate = async (req, res, next) => {
  try {
    const result = await GraduationService.generateCertificate(req.params.id);
    res.json({
      success: true,
      certificate_number: result.certificate_number,
      message: result.alreadyExisted ? "Certificate already exists" : "Certificate generated successfully"
    });
  } catch (error) {
    next(error);
  }
};

exports.getGraduationStats = async (req, res, next) => {
  try {
    const stats = await GraduationService.getGraduationStats(req.query.year);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
