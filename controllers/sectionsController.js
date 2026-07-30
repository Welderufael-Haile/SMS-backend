const SectionsService = require('../services/sectionsService');

exports.fetchSections = async (req, res, next) => {
  try {
    const sections = await SectionsService.fetchSections();
    res.json(sections);
  } catch (error) {
    next(error);
  }
};

exports.fetchActiveSections = async (req, res, next) => {
  try {
    const sections = await SectionsService.fetchActiveSections();
    res.json(sections);
  } catch (error) {
    next(error);
  }
};

exports.addSection = async (req, res, next) => {
  try {
    await SectionsService.addSection(req.body);
    res.json({ message: "Section added successfully" });
  } catch (error) {
    next(error);
  }
};

exports.updateSection = async (req, res, next) => {
  try {
    await SectionsService.updateSection(req.params.id, req.body);
    res.json({ message: "Section updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    await SectionsService.toggleStatus(req.params.id, status);
    res.json({ message: `Section marked as ${status}` });
  } catch (error) {
    next(error);
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    await SectionsService.deleteSection(req.params.id);
    res.json({ message: "Section deleted successfully" });
  } catch (error) {
    next(error);
  }
};