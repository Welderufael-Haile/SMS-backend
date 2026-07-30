const MarksService = require('../services/marksService');
const XLSX = require('xlsx');

exports.getMarks = async (req, res, next) => {
  try {
    const marks = await MarksService.getMarks(req.query);
    res.json(marks);
  } catch (error) {
    next(error);
  }
};

exports.createMark = async (req, res, next) => {
  try {
    await MarksService.createMark(req.body);
    res.status(201).json({ message: "Mark created successfully" });
  } catch (error) {
    next(error);
  }
};

exports.updateMark = async (req, res, next) => {
  try {
    await MarksService.updateMark(req.params.id, req.body);
    res.json({ message: 'Mark updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteMark = async (req, res, next) => {
  try {
    await MarksService.deleteMark(req.params.id);
    res.json({ message: 'Mark deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getDropdowns = async (req, res, next) => {
  try {
    const dropdowns = await MarksService.getDropdowns();
    res.json(dropdowns);
  } catch (error) {
    next(error);
  }
};

exports.importMarksFromExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an Excel file." });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({ message: "The Excel file is empty." });
    }

    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      try {
        await MarksService.createMark(data[i]);
        success++;
      } catch (err) {
        failed++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    res.status(failed === 0 ? 200 : 207).json({
      message: failed === 0 ? "Import successful!" : "Import completed with errors.",
      stats: { total: data.length, success, failed },
      errors
    });
  } catch (error) {
    next(error);
  }
};

exports.getMarksStats = async (req, res, next) => {
  try {
    const stats = await MarksService.getMarksStats(req.query);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};