const ClassesService = require('../services/classesService');

exports.getAllClasses = async (req, res, next) => {
  try {
    const classes = await ClassesService.getAllClasses();
    res.status(200).json(classes);
  } catch (error) {
    next(error);
  }
};

exports.getClassById = async (req, res, next) => {
  try {
    const classData = await ClassesService.getClassById(req.params.id);
    res.status(200).json(classData);
  } catch (error) {
    next(error);
  }
};

exports.getClassStudents = async (req, res, next) => {
  try {
    const data = await ClassesService.getClassStudents(req.params.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
