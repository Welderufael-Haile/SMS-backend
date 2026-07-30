const SubjectsService = require('../services/subjectsService');

const addSubject = async (req, res, next) => {
  try {
    await SubjectsService.addSubject(req.body);
    res.status(201).json({ message: "Subject added successfully!" });
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    await SubjectsService.updateSubject(req.params.id, req.body);
    res.status(200).json({ message: "Subject updated successfully!" });
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    await SubjectsService.deleteSubject(req.params.id);
    res.status(200).json({ message: "Subject deleted successfully!" });
  } catch (error) {
    next(error);
  }
};

const fetchSubjects = async (req, res, next) => {
  try {
    const subjects = await SubjectsService.fetchSubjects();
    res.status(200).json(subjects);
  } catch (error) {
    next(error);
  }
};

module.exports = { addSubject, updateSubject, deleteSubject, fetchSubjects };