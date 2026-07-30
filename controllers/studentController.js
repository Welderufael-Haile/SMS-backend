const StudentService = require('../services/studentService');

exports.getStudentDashboard = async (req, res, next) => {
  try {
    const data = await StudentService.getStudentDashboard(req.user?.id, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getStudentMarks = async (req, res, next) => {
  try {
    const data = await StudentService.getStudentMarks(req.user?.id, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getStudentFilters = async (req, res, next) => {
  try {
    const data = await StudentService.getStudentFilters(req.user?.id, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getStudentReportCard = async (req, res, next) => {
  try {
    const { year_id, term_id } = req.params;
    const data = await StudentService.getStudentReportCard(req.user?.id, year_id, term_id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};