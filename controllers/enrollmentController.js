
const db = require("../config/db");
const ExcelJS = require('exceljs');

exports.getAllEnrollments = async (req, res) => {
  try {
    const { year, term, section, student, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;
    
    // Count query for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      WHERE e.status = 'active'
    `;
    
    // Main data query
    let dataQuery = `
      SELECT e.*, s.full_name, s.Sex, ay.year_name, t.term_name, t.start_date, 
             sec.name AS section_name, sec.grade_level
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE e.status = 'active'
    `;
    
    const params = [];
    const countParams = [];
    
    // Add filters to both queries
    if (year) { 
      dataQuery += ` AND e.academic_year_id = ?`; 
      countQuery += ` AND e.academic_year_id = ?`;
      params.push(year); 
      countParams.push(year);
    }
    if (term) { 
      dataQuery += ` AND e.terms_id = ?`; 
      countQuery += ` AND e.terms_id = ?`;
      params.push(term); 
      countParams.push(term);
    }
    if (section) { 
      dataQuery += ` AND e.sections_id = ?`; 
      countQuery += ` AND e.sections_id = ?`;
      params.push(section); 
      countParams.push(section);
    }
    if (student) { 
      dataQuery += ` AND s.full_name LIKE ?`; 
      countQuery += ` AND s.full_name LIKE ?`;
      params.push(`%${student}%`); 
      countParams.push(`%${student}%`);
    }

    // Get total count
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    // Add pagination to data query
    dataQuery += ` ORDER BY ay.year_name DESC, t.term_name DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const [rows] = await db.query(dataQuery, params);
    
    res.json({
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// 2. Dropdowns
exports.getDropdowns = async (req, res) => {
  try {
    const [students] = await db.execute("SELECT id, full_name FROM Student ORDER BY full_name");
    const [academic_years] = await db.execute("SELECT id, year_name FROM academic_year ORDER BY year_name DESC");
    
    // IMPORTANT: Include academic_year_id in terms
    const [terms] = await db.execute(`
      SELECT t.id, t.term_name, t.start_date, t.academic_year_id 
      FROM terms t 
      ORDER BY t.start_date
    `);
    
    const [sections] = await db.execute("SELECT id, name, grade_level FROM sections ORDER BY grade_level, name");

    res.json({ students, academic_years, terms, sections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 3. manual(single student enrollment) (Prevent double enrollment in same term)
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

// 6. Status Toggle function
exports.updateEnrollmentStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  // Validate status
  const validStatuses = ['active', 'completed', 'promoted', 'repeated'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: "Invalid status value",
      validStatuses 
    });
  }
  
  try {
    let query = 'UPDATE enrollments SET status = ?';
    const params = [status];
    
    // Auto-set completed_at based on status
    if (status === 'completed' || status === 'promoted' || status === 'repeated') {
      query += ', completed_at = NOW()';
    } else if (status === 'active') {
      query += ', completed_at = NULL';
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const [result] = await db.query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Enrollment not found" });
    }
    
    res.json({ 
      message: `Status updated to ${status} successfully`,
      status: status,
      completed_at: status !== 'active' ? new Date() : null
    });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ 
      message: "Failed to update status",
      error: err.message 
    });
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
  const { academic_year_id, current_term_id, next_term_id, next_academic_year_id } = req.body;
  let connection;
  
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // First, mark current term students as completed
    await connection.query(
      `UPDATE enrollments 
       SET status = 'completed', completed_at = NOW() 
       WHERE academic_year_id = ? AND terms_id = ? AND status = 'active'`,
      [academic_year_id, current_term_id]
    );

    // Get students to enroll in next term
    const [activeStudents] = await connection.query(
      `SELECT student_id, sections_id FROM enrollments 
       WHERE academic_year_id = ? AND terms_id = ? AND status = 'completed'`,
      [academic_year_id, current_term_id]
    );

    let count = 0;
    for (const student of activeStudents) {
      // Check if already enrolled in next term/year
      const [exists] = await connection.query(
        'SELECT id FROM enrollments WHERE student_id = ? AND academic_year_id = ? AND terms_id = ?',
        [student.student_id, next_academic_year_id, next_term_id]
      );

      if (exists.length === 0) {
        await connection.query(
          'INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id, status) VALUES (?, ?, ?, ?, "active")',
          [student.student_id, next_academic_year_id, next_term_id, student.sections_id]
        );
        count++;
      }
    }

    await connection.commit();
    res.json({ 
      message: 'Success', 
      enrolled: count,
      from_year: academic_year_id,
      to_year: next_academic_year_id,
      from_term: current_term_id,
      to_term: next_term_id
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Auto-enroll error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};

// get archived enrollments with filters and pagination
exports.getArchivedEnrollments = async (req, res) => {
  try {
    const { year, term, section, student, status, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      WHERE e.status IN ('completed', 'promoted', 'repeated')
    `;
    
    let dataQuery = `
      SELECT e.*, s.full_name, s.Sex, ay.year_name, t.term_name, sec.name AS section_name, sec.grade_level
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE e.status IN ('completed', 'promoted', 'repeated')
    `;
    
    const params = [];
    const countParams = [];
    
    if (year) { 
      dataQuery += ` AND e.academic_year_id = ?`; 
      countQuery += ` AND e.academic_year_id = ?`;
      params.push(year); countParams.push(year);
    }
    if (term) { 
      dataQuery += ` AND e.terms_id = ?`; 
      countQuery += ` AND e.terms_id = ?`;
      params.push(term); countParams.push(term);
    }
    if (section) { 
      dataQuery += ` AND e.sections_id = ?`; 
      countQuery += ` AND e.sections_id = ?`;
      params.push(section); countParams.push(section);
    }
    if (student) { 
      dataQuery += ` AND s.full_name LIKE ?`; 
      countQuery += ` AND s.full_name LIKE ?`;
      params.push(`%${student}%`); countParams.push(`%${student}%`);
    }
    if (status) { 
      dataQuery += ` AND e.status = ?`; 
      countQuery += ` AND e.status = ?`;
      params.push(status); countParams.push(status);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    dataQuery += ` ORDER BY e.completed_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);
    
    const [rows] = await db.query(dataQuery, params);
    
    res.json({
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Restore from archive to active (also clears completed_at)
exports.restoreEnrollment = async (req, res) => {
  try {
    await db.query(
      'UPDATE enrollments SET status="active", completed_at=NULL WHERE id=?',
      [req.params.id]
    );
    res.json({ message: "Student restored to active" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Permanent delete (only if not active) in archive page
exports.permanentDelete = async (req, res) => {
  try {
    await db.query('DELETE FROM enrollments WHERE id=? AND status != "active"', [req.params.id]);
    res.json({ message: "Record permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get archive count for archive dashboard
exports.getArchiveCount = async (req, res) => {
  try {
    const [result] = await db.query(
      `SELECT COUNT(*) as count FROM enrollments 
       WHERE status IN ('completed', 'promoted', 'repeated')`
    );
    res.json({ count: result[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};