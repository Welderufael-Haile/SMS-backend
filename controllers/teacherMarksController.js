const TeacherMarksService = require('../services/teacherMarksService');

exports.getMarksByTeacherUserId = async (req, res, next) => {
  try {
    const marks = await TeacherMarksService.getMarksByTeacherUserId(req.user?.id);
    res.json(marks);
  } catch (error) {
    next(error);
  }
};

exports.getStudentsWithMarks = async (req, res, next) => {
  try {
    const result = await TeacherMarksService.getStudentsWithMarks(req.user?.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDropdowns = async (req, res, next) => {
  try {
    const dropdowns = await TeacherMarksService.getDropdowns(req.user?.id);
    res.json(dropdowns);
  } catch (error) {
    next(error);
  }
};

exports.addTeacherMark = async (req, res, next) => {
  try {
    const mark = await TeacherMarksService.addTeacherMark(req.user?.id, req.body);
    res.status(201).json({
      message: "Mark added successfully",
      total_score: mark.total_score
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTeacherMark = async (req, res, next) => {
  try {
    const mark = await TeacherMarksService.updateTeacherMark(req.user?.id, req.params.id, req.body);
    res.json({
      message: "Mark updated successfully",
      total_score: mark.total_score
    });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherStats = async (req, res, next) => {
  try {
    const stats = await TeacherMarksService.getTeacherStats(req.user?.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};