const AcademicYearService = require('../services/academicYearService');

exports.createAcademicYear = async (req, res, next) => {
  try {
    const newYear = await AcademicYearService.createAcademicYear(req.body);
    res.status(201).json({ id: newYear.id });
  } catch (error) {
    next(error);
  }
};

exports.getAllAcademicYears = async (req, res, next) => {
  try {
    const years = await AcademicYearService.getAllAcademicYears();
    res.json(years);
  } catch (error) {
    next(error);
  }
};

exports.getAcademicYearById = async (req, res, next) => {
  try {
    const year = await AcademicYearService.getAcademicYearById(req.params.id);
    res.json(year);
  } catch (error) {
    next(error);
  }
};

exports.updateAcademicYear = async (req, res, next) => {
  try {
    await AcademicYearService.updateAcademicYear(req.params.id, req.body);
    res.json({ message: 'Academic year updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAcademicYear = async (req, res, next) => {
  try {
    await AcademicYearService.deleteAcademicYear(req.params.id);
    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    next(error);
  }
};
