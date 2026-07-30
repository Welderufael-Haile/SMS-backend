const TeacherService = require('../services/teacherService');

exports.createTeacher = async (req, res, next) => {
  try {
    const newTeacher = await TeacherService.createTeacher(req.body, req.files);
    res.status(201).json({
      message: "Teacher created successfully",
      teacherId: newTeacher.id
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllTeachers = async (req, res, next) => {
  try {
    const teachers = await TeacherService.getAllTeachers();
    res.json(teachers);
  } catch (error) {
    next(error);
  }
};

exports.getTeacherById = async (req, res, next) => {
  try {
    const teacher = await TeacherService.getTeacherById(req.params.id);
    res.json(teacher);
  } catch (error) {
    next(error);
  }
};

exports.getTeachersUsers = async (req, res, next) => {
  try {
    const users = await TeacherService.getTeachersUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

exports.updateTeacher = async (req, res, next) => {
  try {
    const updated = await TeacherService.updateTeacher(req.params.id, req.body, req.files);
    res.json({
      message: "Teacher updated successfully",
      teacherId: updated.id
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTeacher = async (req, res, next) => {
  try {
    await TeacherService.deleteTeacher(req.params.id);
    res.json({
      message: "Teacher deleted successfully",
      deletedId: req.params.id
    });
  } catch (error) {
    next(error);
  }
};