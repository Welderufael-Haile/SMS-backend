const StudentAttendanceService = require('../services/studentAttendanceService');

exports.getStudentAttendance = async (req, res, next) => {
  try {
    const data = await StudentAttendanceService.getStudentAttendance(req.user);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceByTerm = async (req, res, next) => {
  try {
    const data = await StudentAttendanceService.getAttendanceByTerm(req.user, req.params.term_id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};