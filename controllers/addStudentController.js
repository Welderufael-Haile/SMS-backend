const AddStudentService = require('../services/addStudentService');

exports.addStudent = async (req, res, next) => {
  try {
    const { student, credentials } = await AddStudentService.addStudent(req.body, req.file);
    res.status(201).json({
      success: true,
      message: "Student registered successfully!",
      credentials
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await AddStudentService.getAllStudents();
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    await AddStudentService.updateStudent(req.params.id, req.body, req.file);
    res.status(200).json({ message: "Student updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    await AddStudentService.deleteStudent(req.params.id);
    res.status(200).json({ message: "Student and associated user deleted successfully" });
  } catch (error) {
    next(error);
  }
};