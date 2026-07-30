const TermService = require('../services/termService');

exports.createTerm = async (req, res, next) => {
  try {
    const term = await TermService.createTerm(req.body);
    res.status(201).json(term);
  } catch (error) {
    next(error);
  }
};

exports.getTermsByAcademicYear = async (req, res, next) => {
  try {
    const terms = await TermService.getTermsByAcademicYear(req.params.academicYearId);
    res.json(terms);
  } catch (error) {
    next(error);
  }
};

exports.getAllTerms = async (req, res, next) => {
  try {
    const terms = await TermService.getAllTerms();
    res.json(terms);
  } catch (error) {
    next(error);
  }
};

exports.getTermById = async (req, res, next) => {
  try {
    const term = await TermService.getTermById(req.params.id);
    res.json(term);
  } catch (error) {
    next(error);
  }
};

exports.updateTerm = async (req, res, next) => {
  try {
    const result = await TermService.updateTerm(req.params.id, req.body);
    res.json({ message: 'Term updated successfully', data: result });
  } catch (error) {
    next(error);
  }
};

exports.deleteTerm = async (req, res, next) => {
  try {
    await TermService.deleteTerm(req.params.id);
    res.json({ message: 'Term deleted successfully' });
  } catch (error) {
    next(error);
  }
};