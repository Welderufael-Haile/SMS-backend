const EnrollmentService = require('../services/enrollmentService');
const XLSX = require('xlsx');

exports.getAllEnrollments = async (req, res, next) => {
  try {
    const result = await EnrollmentService.getAllEnrollments(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getDropdowns = async (req, res, next) => {
  try {
    const dropdowns = await EnrollmentService.getDropdowns();
    res.json(dropdowns);
  } catch (error) {
    next(error);
  }
};

exports.createEnrollment = async (req, res, next) => {
  try {
    const newEnrollment = await EnrollmentService.createEnrollment(req.body);
    res.status(201).json({ id: newEnrollment.id });
  } catch (error) {
    next(error);
  }
};

exports.updateEnrollment = async (req, res, next) => {
  try {
    await EnrollmentService.updateEnrollment(req.params.id, req.body);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

exports.deleteEnrollment = async (req, res, next) => {
  try {
    await EnrollmentService.deleteEnrollment(req.params.id);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

exports.bulkTransfer = async (req, res, next) => {
  try {
    const { enrollmentIds, targetSectionId } = req.body;
    const result = await EnrollmentService.bulkTransfer(enrollmentIds, targetSectionId);
    res.json({ message: `Successfully transferred ${result.count} students.` });
  } catch (error) {
    next(error);
  }
};

exports.updateEnrollmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await EnrollmentService.updateEnrollmentStatus(req.params.id, status);
    res.json({
      message: `Status updated to ${status} successfully`,
      status,
      completed_at: updated.completed_at
    });
  } catch (error) {
    next(error);
  }
};

exports.exportToExcel = async (req, res, next) => {
  try {
    const { data } = await EnrollmentService.getAllEnrollments({ limit: 10000 });
    const excelData = data.map(row => ({
      'Full Name': row.full_name,
      'Sex': row.Sex,
      'Year': row.year_name,
      'Term': row.term_name,
      'Section': row.section_name,
      'Status': row.status
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="enrollments.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

exports.enrollNextTerm = async (req, res, next) => {
  try {
    const result = await EnrollmentService.enrollNextTerm(req.body);
    res.json({
      message: 'Success',
      enrolled: result.enrolled,
      from_year: req.body.academic_year_id,
      to_year: req.body.next_academic_year_id,
      from_term: req.body.current_term_id,
      to_term: req.body.next_term_id
    });
  } catch (error) {
    next(error);
  }
};

exports.getArchivedEnrollments = async (req, res, next) => {
  try {
    const result = await EnrollmentService.getArchivedEnrollments(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.restoreEnrollment = async (req, res, next) => {
  try {
    await EnrollmentService.restoreEnrollment(req.params.id);
    res.json({ message: "Student restored to active" });
  } catch (error) {
    next(error);
  }
};

exports.permanentDelete = async (req, res, next) => {
  try {
    await EnrollmentService.permanentDelete(req.params.id);
    res.json({ message: "Record permanently deleted" });
  } catch (error) {
    next(error);
  }
};

exports.getArchiveCount = async (req, res, next) => {
  try {
    const result = await EnrollmentService.getArchiveCount();
    res.json(result);
  } catch (error) {
    next(error);
  }
};