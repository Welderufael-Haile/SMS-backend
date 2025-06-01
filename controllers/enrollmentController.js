
// controllers/enrollmentController.js
const db = require("../config/db");
const ExcelJS = require('exceljs');


// export for filtering enrollment
exports.getAllEnrollments = async (req, res) => {
  try {
    const { year, term, section, student } = req.query;

    let query = `
      SELECT e.*, s.full_name, s.Sex, ay.year_name, t.term_name, t.start_date, sec.name AS section_name, sec.grade_level
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE 1
    `;

    if (year) query += ` AND e.academic_year_id = ${year}`;
    if (term) query += ` AND e.terms_id = ${term}`;
    if (section) query += ` AND e.sections_id = ${section}`;
    if (student) query += ` AND s.full_name LIKE '%${student}%'`;

    query += ` ORDER BY ay.year_name DESC, t.term_name DESC`; // sorting

    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching enrollments', error: err });
  }
};


exports.getDropdowns = async (req, res) => {
  try {
    const [academic_years] = await db.query('SELECT id, year_name FROM academic_year');
    const [terms] = await db.query('SELECT id, term_name, start_date FROM terms');
    const [sections] = await db.query('SELECT id, name, grade_level FROM sections');
    const [students] = await db.query('SELECT id, full_name, Sex FROM Student');
    res.json({ academic_years, terms, sections, students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEnrollment = async (req, res) => {
  const { student_id, academic_year_id, terms_id, sections_id } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id) VALUES (?, ?, ?, ?)',
      [student_id, academic_year_id, terms_id, sections_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEnrollment = async (req, res) => {
  const { id } = req.params;
  const { student_id, academic_year_id, terms_id, sections_id } = req.body;
  try {
    await db.query(
      'UPDATE enrollments SET student_id=?, academic_year_id=?, terms_id=?, sections_id=? WHERE id=?',
      [student_id, academic_year_id, terms_id, sections_id, id]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEnrollment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM enrollments WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportToExcel = async (req, res) => {
  const { year, term, section, name } = req.query;
  let query = `
    SELECT s.full_name, s.Sex, ay.year_name, t.term_name, sec.name AS section_name, sec.grade_level
    FROM enrollments e
    JOIN Student s ON e.student_id = s.id
    JOIN academic_year ay ON e.academic_year_id = ay.id
    JOIN terms t ON e.terms_id = t.id
    JOIN sections sec ON e.sections_id = sec.id
    WHERE 1=1`;

  const params = [];
  if (year) { query += ' AND ay.id = ?'; params.push(year); }
  if (term) { query += ' AND t.id = ?'; params.push(term); }
  if (section) { query += ' AND sec.id = ?'; params.push(section); }
  if (name) { query += ' AND s.full_name LIKE ?'; params.push(`%${name}%`); }

  try {
    const [rows] = await db.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enrollments');

    worksheet.columns = [
      { header: 'Full Name', key: 'full_name' },
      { header: 'Sex', key: 'Sex' },
      { header: 'Academic Year', key: 'year_name' },
      { header: 'Term', key: 'term_name' },
      { header: 'Section', key: 'section_name' },
      { header: 'Grade Level', key: 'grade_level' },
    ];

    worksheet.addRows(rows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="enrollments.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
