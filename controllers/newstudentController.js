const NewStudentService = require('../services/newstudentService');

exports.registerStudent = async (req, res, next) => {
  try {
    await NewStudentService.registerStudent(req.body, req.files);
    res.status(201).json({ message: "Student registered successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getStudents = async (req, res, next) => {
  try {
    const students = await NewStudentService.getStudents();
    res.json(students);
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    await NewStudentService.updateStudent(req.params.id, req.body, req.files);
    res.json({ message: "Student updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    await NewStudentService.deleteStudent(req.params.id);
    res.json({ message: "Student and their files deleted successfully" });
  } catch (error) {
    next(error);
  }
};