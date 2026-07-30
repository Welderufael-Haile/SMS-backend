const TeacherAttendanceService = require('../services/teacherAttendanceService');

exports.getStudentsForAttendance = async (req, res, next) => {
  try {
    const data = await TeacherAttendanceService.getStudentsForAttendance(req.user?.id, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const { date, attendance } = req.body;
    const results = await TeacherAttendanceService.markAttendance(req.user?.id, date, attendance);
    res.status(results.failed === 0 ? 200 : 207).json({
      message: results.failed === 0 ? "Attendance marked successfully" : "Partial success",
      results
    });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherSections = async (req, res, next) => {
  try {
    const sections = await TeacherAttendanceService.getTeacherSections(req.user?.id, req.query.academic_year_id);
    res.json(sections);
  } catch (error) {
    next(error);
  }
};

exports.getTeacherTerms = async (req, res, next) => {
  try {
    const terms = await TeacherAttendanceService.getTeacherTerms(req.user?.id);
    res.json(terms);
  } catch (error) {
    next(error);
  }
};

exports.getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const data = await TeacherAttendanceService.getStudentAttendanceHistory(
      req.user?.id,
      req.params.student_id,
      req.params.term_id
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getTodaySummary = async (req, res, next) => {
  try {
    const data = await TeacherAttendanceService.getTodaySummary(req.user?.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getDailyReport = async (req, res, next) => {
  try {
    res.json({ summary: {}, chartData: [] });
  } catch (error) {
    next(error);
  }
};

exports.getMonthlyReport = async (req, res, next) => {
  try {
    res.json({ summary: {}, chartData: [] });
  } catch (error) {
    next(error);
  }
};

exports.getYearlyReport = async (req, res, next) => {
  try {
    res.json({ summary: {}, chartData: [] });
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    res.json({ message: "Export report functionality" });
  } catch (error) {
    next(error);
  }
};