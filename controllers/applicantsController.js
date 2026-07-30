const ApplicantsService = require('../services/applicantsService');

exports.createApplicant = async (req, res, next) => {
  try {
    await ApplicantsService.createApplicant(req.body, req.file);
    res.status(201).json({ message: 'Application submitted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getApplicants = async (req, res, next) => {
  try {
    const applicants = await ApplicantsService.getApplicants();
    res.json(applicants);
  } catch (error) {
    next(error);
  }
};

exports.deleteApplicant = async (req, res, next) => {
  try {
    await ApplicantsService.deleteApplicant(req.params.id);
    res.json({ message: 'Applicant deleted successfully.' });
  } catch (error) {
    next(error);
  }
};