const ParentService = require('../services/parentService');

exports.getAllParents = async (req, res, next) => {
  try {
    const parents = await ParentService.getAllParents();
    res.status(200).json(parents);
  } catch (error) {
    next(error);
  }
};

exports.getParentById = async (req, res, next) => {
  try {
    const parent = await ParentService.getParentById(req.params.id);
    res.status(200).json(parent);
  } catch (error) {
    next(error);
  }
};

exports.addParent = async (req, res, next) => {
  try {
    const result = await ParentService.addParent(req.body);
    res.status(201).json({ 
      message: 'Parent added successfully', 
      id: result.parent.id,
      credentials: result.credentials
    });
  } catch (error) {
    next(error);
  }
};

exports.updateParent = async (req, res, next) => {
  try {
    await ParentService.updateParent(req.params.id, req.body);
    res.json({ message: 'Parent updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteParent = async (req, res, next) => {
  try {
    await ParentService.deleteParent(req.params.id);
    res.json({ message: 'Parent deleted successfully' });
  } catch (error) {
    next(error);
  }
};