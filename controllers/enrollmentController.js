
// // controllers/enrollmentController.js
// const db = require("../config/db");
// const ExcelJS = require('exceljs');


// // export for filtering enrollment
// exports.getAllEnrollments = async (req, res) => {
//   try {
//     const { year, term, section, student } = req.query;

//     let query = `
//       SELECT e.*, s.full_name, s.Sex, ay.year_name, t.term_name, t.start_date, sec.name AS section_name, sec.grade_level
//       FROM enrollments e
//       JOIN Student s ON e.student_id = s.id
//       JOIN academic_year ay ON e.academic_year_id = ay.id
//       JOIN terms t ON e.terms_id = t.id
//       JOIN sections sec ON e.sections_id = sec.id
//       WHERE 1
//     `;

//     if (year) query += ` AND e.academic_year_id = ${year}`;
//     if (term) query += ` AND e.terms_id = ${term}`;
//     if (section) query += ` AND e.sections_id = ${section}`;
//     if (student) query += ` AND s.full_name LIKE '%${student}%'`;

//     query += ` ORDER BY ay.year_name DESC, t.term_name DESC`; // sorting

//     const [rows] = await db.query(query);
//     res.json(rows);
//   } catch (err) {
//     res.status(500).json({ message: 'Error fetching enrollments', error: err });
//   }
// };


// exports.getDropdowns = async (req, res) => {
//   try {
//     const [academic_years] = await db.query('SELECT id, year_name FROM academic_year');
//     const [terms] = await db.query('SELECT id, term_name, start_date FROM terms');
//     const [sections] = await db.query('SELECT id, name, grade_level FROM sections');
//     const [students] = await db.query('SELECT id, full_name, Sex FROM Student');
//     res.json({ academic_years, terms, sections, students });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.createEnrollment = async (req, res) => {
//   const { student_id, academic_year_id, terms_id, sections_id } = req.body;
//   try {
//     const [result] = await db.query(
//       'INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id) VALUES (?, ?, ?, ?)',
//       [student_id, academic_year_id, terms_id, sections_id]
//     );
//     res.status(201).json({ id: result.insertId });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.updateEnrollment = async (req, res) => {
//   const { id } = req.params;
//   const { student_id, academic_year_id, terms_id, sections_id } = req.body;
//   try {
//     await db.query(
//       'UPDATE enrollments SET student_id=?, academic_year_id=?, terms_id=?, sections_id=? WHERE id=?',
//       [student_id, academic_year_id, terms_id, sections_id, id]
//     );
//     res.sendStatus(200);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.deleteEnrollment = async (req, res) => {
//   const { id } = req.params;
//   try {
//     await db.query('DELETE FROM enrollments WHERE id = ?', [id]);
//     res.sendStatus(200);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.exportToExcel = async (req, res) => {
//   const { year, term, section, name } = req.query;
//   let query = `
//     SELECT s.full_name, s.Sex, ay.year_name, t.term_name, sec.name AS section_name, sec.grade_level
//     FROM enrollments e
//     JOIN Student s ON e.student_id = s.id
//     JOIN academic_year ay ON e.academic_year_id = ay.id
//     JOIN terms t ON e.terms_id = t.id
//     JOIN sections sec ON e.sections_id = sec.id
//     WHERE 1=1`;

//   const params = [];
//   if (year) { query += ' AND ay.id = ?'; params.push(year); }
//   if (term) { query += ' AND t.id = ?'; params.push(term); }
//   if (section) { query += ' AND sec.id = ?'; params.push(section); }
//   if (name) { query += ' AND s.full_name LIKE ?'; params.push(`%${name}%`); }

//   try {
//     const [rows] = await db.query(query, params);
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Enrollments');

//     worksheet.columns = [
//       { header: 'Full Name', key: 'full_name' },
//       { header: 'Sex', key: 'Sex' },
//       { header: 'Academic Year', key: 'year_name' },
//       { header: 'Term', key: 'term_name' },
//       { header: 'Section', key: 'section_name' },
//       { header: 'Grade Level', key: 'grade_level' },
//     ];

//     worksheet.addRows(rows);

//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'attachment; filename="enrollments.xlsx"');
//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


// // add status update function
// exports.updateEnrollmentStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   await db.query(
//     'UPDATE enrollments SET status=? WHERE id=?',
//     [status, id]
//   );

//   res.sendStatus(200);
// };

// // auto-enroll students to next term
// exports.enrollNextTerm = async (req, res) => {
//   const { academic_year_id, current_term_id, next_term_id } = req.body;

//   let connection;
//   try {
//     // 1. Get a dedicated connection from the pool
//     connection = await db.getConnection();
    
//     // 2. Start transaction on that connection
//     await connection.beginTransaction();

//     // 3. Get active students (Use 'connection.query' instead of 'db.query')
//     const [activeEnrollments] = await connection.query(`
//       SELECT student_id, sections_id
//       FROM enrollments
//       WHERE academic_year_id = ?
//         AND terms_id = ?
//         AND status = 'active'
//     `, [academic_year_id, current_term_id]);

//     let enrolledCount = 0;

//     for (const e of activeEnrollments) {

//       // 4. Check for duplicates using the same connection
//       const [exists] = await connection.query(`
//         SELECT id FROM enrollments
//         WHERE student_id = ?
//           AND academic_year_id = ?
//           AND terms_id = ?
//       `, [e.student_id, academic_year_id, next_term_id]);

//       if (exists.length > 0) continue; // 🚫 skip duplicate

//       // 5. Insert new enrollment using the same connection
//       await connection.query(`
//         INSERT INTO enrollments (
//           student_id,
//           academic_year_id,
//           terms_id,
//           sections_id,
//           status
//         )
//         VALUES (?, ?, ?, ?, 'active')
//       `, [
//         e.student_id,
//         academic_year_id,
//         next_term_id,
//         e.sections_id
//       ]);

//       enrolledCount++;
//     }

//     // 6. Commit the transaction
//     await connection.commit();

//     res.json({
//       message: 'Auto enrollment completed',
//       enrolled: enrolledCount
//     });

//   } catch (err) {
//     // 7. Rollback on error
//     if (connection) await connection.rollback();
//     console.error("Auto-enrollment error:", err);
//     res.status(500).json({ error: err.message });
//   } finally {
//     // 8. Release the connection back to the pool
//     if (connection) connection.release();
//   }
// };

const db = require("../config/db");
const ExcelJS = require('exceljs');

// 1. Fetch all with filters
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
      WHERE 1=1
    `;
    const params = [];
    if (year) { query += ` AND e.academic_year_id = ?`; params.push(year); }
    if (term) { query += ` AND e.terms_id = ?`; params.push(term); }
    if (section) { query += ` AND e.sections_id = ?`; params.push(section); }
    if (student) { query += ` AND s.full_name LIKE ?`; params.push(`%${student}%`); }

    query += ` ORDER BY ay.year_name DESC, t.term_name DESC`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Dropdowns
exports.getDropdowns = async (req, res) => {
  try {
    const [academic_years] = await db.query('SELECT id, year_name FROM academic_year');
    const [terms] = await db.query('SELECT id, term_name, start_date FROM terms');
    const [sections] = await db.query('SELECT id, name, grade_level FROM sections');
    const [students] = await db.query('SELECT id, full_name FROM Student');
    res.json({ academic_years, terms, sections, students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Create (Prevent double enrollment in same term)
exports.createEnrollment = async (req, res) => {
  const { student_id, academic_year_id, terms_id, sections_id } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND academic_year_id = ? AND terms_id = ?',
      [student_id, academic_year_id, terms_id]
    );
    if (existing.length > 0) return res.status(400).json({ message: "Student already enrolled in this term." });

    const [result] = await db.query(
      'INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id, status) VALUES (?, ?, ?, ?, "active")',
      [student_id, academic_year_id, terms_id, sections_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update
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

// 5. Delete
exports.deleteEnrollment = async (req, res) => {
  try {
    await db.query('DELETE FROM enrollments WHERE id = ?', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Status Toggle
exports.updateEnrollmentStatus = async (req, res) => {
  const { status } = req.body;
  try {
    await db.query('UPDATE enrollments SET status=? WHERE id=?', [status, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Excel Export
exports.exportToExcel = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.full_name, s.Sex, ay.year_name, t.term_name, sec.name AS section_name, sec.grade_level, e.status
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
    `);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enrollments');
    worksheet.columns = [
      { header: 'Full Name', key: 'full_name' },
      { header: 'Sex', key: 'Sex' },
      { header: 'Year', key: 'year_name' },
      { header: 'Term', key: 'term_name' },
      { header: 'Section', key: 'section_name' },
      { header: 'Status', key: 'status' }
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

// 8. Auto-Enroll (Prevents duplicating students already in next term)
exports.enrollNextTerm = async (req, res) => {
  const { academic_year_id, current_term_id, next_term_id } = req.body;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [activeStudents] = await connection.query(
      `SELECT student_id, sections_id FROM enrollments WHERE academic_year_id = ? AND terms_id = ? AND status = 'active'`,
      [academic_year_id, current_term_id]
    );

    let count = 0;
    for (const student of activeStudents) {
      // THE DUPLICATE PREVENTER:
      const [exists] = await connection.query(
        'SELECT id FROM enrollments WHERE student_id = ? AND academic_year_id = ? AND terms_id = ?',
        [student.student_id, academic_year_id, next_term_id]
      );

      if (exists.length === 0) {
        await connection.query(
          'INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id, status) VALUES (?, ?, ?, ?, "active")',
          [student.student_id, academic_year_id, next_term_id, student.sections_id]
        );
        count++;
      }
    }

    await connection.commit();
    res.json({ message: 'Success', enrolled: count });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};