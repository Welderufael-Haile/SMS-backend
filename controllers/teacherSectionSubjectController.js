const TeacherSectionSubjectService = require('../services/teacherSectionSubjectService');

exports.addAssignment = async (req, res, next) => {
  try {
    await TeacherSectionSubjectService.addAssignment(req.body);
    res.status(201).json({ message: "Assignment created successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getAssignments = async (req, res, next) => {
  try {
    const assignments = await TeacherSectionSubjectService.getAssignments();
    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

exports.getAssignment = async (req, res, next) => {
  try {
    const assignment = await TeacherSectionSubjectService.getAssignment(req.params.id);
    res.json(assignment);
  } catch (error) {
    next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    await TeacherSectionSubjectService.updateAssignment(req.params.id, req.body);
    res.json({ message: "Assignment updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.toggleAssignmentStatus = async (req, res, next) => {
  try {
    const updated = await TeacherSectionSubjectService.toggleAssignmentStatus(req.params.id);
    res.json({ message: `Assignment ${updated.is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    next(error);
  }
};