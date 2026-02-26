
  const db = require('../config/db');
  const XLSX = require('xlsx');
  // marks controller with robust validation and new Excel import functionality
  const MAX_WEIGHTS = {
    st1: 10, ws: 10, mid_exam: 20, project: 10, 
    st2: 10, home_class_work: 5, class_activity: 5, final_exam: 30
  };

  // 2. Move this to the top!
  const validateScores = (data) => {
    const errors = [];
    for (const [key, max] of Object.entries(MAX_WEIGHTS)) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        const val = parseFloat(data[key]);
        if (isNaN(val)) {
          errors.push(`${key} must be a valid number.`);
        } else if (val < 0 || val > max) {
          errors.push(`${key} exceeds the maximum allowed weight of ${max}%.`);
        }
      }
    }
    return errors;
  };

  exports.getMarks = async (req, res) => {
    try {
      const { search, year_id, term_id, section_id } = req.query;

      let sql = `
        SELECT 
          m.*, 
          s.name AS subjects_name,
          s.grade_level AS subjects_grade_level,
          st.full_name AS student_name,
          st.Sex,
          ay.year_name AS academic_year,
          t.term_name AS term,
          sec.name AS section_name,
          sec.id AS section_id,
          e.status AS enrollment_status  -- 🔹 ADD THIS LINE HERE
        FROM marks m
        INNER JOIN enrollments e ON m.enrollments_id = e.id
        INNER JOIN Student st ON e.Student_id = st.id
        INNER JOIN subjects s ON m.subjects_id = s.id
        INNER JOIN academic_year ay ON e.academic_year_id = ay.id
        INNER JOIN terms t ON e.terms_id = t.id
        INNER JOIN sections sec ON e.sections_id = sec.id
        WHERE 1=1
      `;
      
      const params = [];

      // 🔹 STRICT SECTION FILTER
      // We use e.sections_id because 'e' is the specific enrollment record for this mark
      if (section_id && section_id !== 'undefined' && section_id !== '') {
        sql += ` AND e.sections_id = ?`;
        params.push(section_id);
      }

      if (year_id && year_id !== 'undefined' && year_id !== '') {
        sql += ` AND e.academic_year_id = ?`;
        params.push(year_id);
      }

      if (term_id && term_id !== 'undefined' && term_id !== '') {
        sql += ` AND e.terms_id = ?`;
        params.push(term_id);
      }

      if (search) {
        sql += ` AND (st.full_name LIKE ? OR s.name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ` ORDER BY ay.year_name DESC, t.term_name DESC, st.full_name ASC`;

      const [results] = await db.execute(sql, params);
      res.json(results);
    } catch (err) {
      console.error('Error fetching marks:', err);
      res.status(500).json({ message: 'Server error' });
    }

  };

  // 1. Create Mark (Robust Version)
  exports.createMark = async (req, res) => {
    try {
      const { enrollment_id, subject_id, ...scores } = req.body;

      // 🛡️ CRASH PROTECTION: Ensure Required IDs exist
      if (!enrollment_id || !subject_id) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: ["Please select both a student and a subject."] 
        });
      }

      // Validate Score Weights
      const validationErrors = validateScores(scores);
      if (validationErrors.length > 0) {
        return res.status(400).json({ message: "Validation failed", errors: validationErrors });
      }

      // Check for existing mark to prevent duplicates
      const [existing] = await db.execute(
        `SELECT id FROM marks WHERE enrollments_id = ? AND subjects_id = ?`,
        [enrollment_id, subject_id]
      );
      
      if (existing.length > 0) {
        return res.status(409).json({ message: 'A record already exists for this student and subject.' });
      }

      const sql = `
        INSERT INTO marks 
        (enrollments_id, subjects_id, st1, ws, mid_exam, project, st2, home_class_work, class_activity, final_exam) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      // Using ?? null to handle optional scores correctly
      await db.execute(sql, [
        enrollment_id, 
        subject_id, 
        scores.st1 || null, scores.ws || null, scores.mid_exam || null, scores.project || null, 
        scores.st2 || null, scores.home_class_work || null, scores.class_activity || null, scores.final_exam || null
      ]);

      res.status(201).json({ message: "Mark created successfully" });
    } catch (err) {
      console.error('Create Mark Error:', err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };

  // 2. Update Mark (Robust Version)
  // exports.updateMark = async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const scores = req.body;

  //     // Validate Weights if any scores were sent
  //     const validationErrors = validateScores(scores);
  //     if (validationErrors.length > 0) {
  //       return res.status(400).json({ message: "Validation failed", errors: validationErrors });
  //     }

  //     const updates = [];
  //     const params = [];
  //     const allowedFields = Object.keys(MAX_WEIGHTS);

  //     // Build dynamic query
  //     for (const key in scores) {
  //       if (allowedFields.includes(key)) {
  //         updates.push(`${key} = ?`);
  //         // If teacher clears a field, save it as NULL in the DB
  //         params.push(scores[key] === "" || scores[key] === null ? null : scores[key]);
  //       }
  //     }

  //     if (updates.length === 0) {
  //       return res.status(400).json({ message: "No valid assessment fields provided to update." });
  //     }

  //     params.push(id);
  //     const sql = `UPDATE marks SET ${updates.join(', ')} WHERE id = ?`;

  //     await db.execute(sql, params);
  //     res.json({ message: 'Mark updated successfully' });
  //   } catch (err) {
  //     console.error('Update Mark Error:', err);
  //     res.status(500).json({ message: 'Internal Server Error' });
  //   }
  // };
exports.updateMark = async (req, res) => {
  try {
    const { id } = req.params;
    const scores = req.body;

    // 1. 🛡️ SECURITY CHECK: Is the student still active?
    const [enrollmentStatus] = await db.execute(`
      SELECT e.status 
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      WHERE m.id = ?`, 
      [id]
    );

    if (enrollmentStatus.length === 0 || enrollmentStatus[0].status !== 'active') {
      return res.status(403).json({ 
        message: "Action Denied", 
        errors: ["This student is currently inactive. Marks for inactive students cannot be edited."] 
      });
    }

    // 2. Validate Weights
    const validationErrors = validateScores(scores);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors: validationErrors });
    }

    // 3. Proceed with Update logic...
    const updates = [];
    const params = [];
    const allowedFields = Object.keys(MAX_WEIGHTS);

    for (const key in scores) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        params.push(scores[key] === "" || scores[key] === null ? null : scores[key]);
      }
    }

    if (updates.length === 0) return res.status(400).json({ message: "No changes provided." });

    params.push(id);
    await db.execute(`UPDATE marks SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Mark updated successfully' });
  } catch (err) {
    console.error('Update Mark Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
  // deleteMark and getDropdowns remain essentially the same but included for completeness
  exports.deleteMark = async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute(`DELETE FROM marks WHERE id = ?`, [id]);
      res.json({ message: 'Mark deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  };

  // exports.getDropdowns = async (req, res) => {
  //   try {
  //     const [enrollments] = await db.execute(`
  //       SELECT 
  //         e.id, 
  //         e.sections_id,      -- 🔹 Needed for Section Filter
  //         e.terms_id,         -- 🔹 Needed for Term Filter
  //         e.academic_year_id, -- 🔹 Needed for Year Filter
  //         st.full_name AS student_name, 
  //         sec.name AS section_name, 
  //         sec.grade_level,
  //         ay.year_name, 
  //         t.term_name
  //       FROM enrollments e
  //       JOIN Student st ON e.student_id = st.id
  //       JOIN sections sec ON e.sections_id = sec.id
  //       JOIN academic_year ay ON e.academic_year_id = ay.id
  //       JOIN terms t ON e.terms_id = t.id
  //       WHERE e.status = 'active'
  //     `);

  //     res.json({ enrollments }); // Keep it simple
  //   } catch (error) {
  //     res.status(500).json({ message: "Server error" });
  //   }
  // };
exports.getDropdowns = async (req, res) => {
  try {
    // 1. Fetch Enrollments
    const [enrollments] = await db.execute(`
      SELECT 
        e.id, 
        e.sections_id,      
        e.terms_id,         
        e.academic_year_id, 
        st.full_name AS student_name, 
        sec.name AS section_name, 
        sec.grade_level,
        ay.year_name, 
        t.term_name
      FROM enrollments e
      JOIN Student st ON e.student_id = st.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      WHERE e.status = 'active'
    `);

    // 2. Fetch Subjects (This was missing from your response!)
    const [subjects] = await db.execute(`
      SELECT id, name, grade_level FROM subjects ORDER BY grade_level, name
    `);

    // 3. Send BOTH to the frontend
    res.json({ enrollments, subjects }); 
  } catch (error) {
    console.error("Dropdown fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

  // New function to handle Excel import of marks
  exports.importMarksFromExcel = async (req, res) => {
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

      const results = { success: 0, failed: 0, errors: [] };

      // Define max weights based on your Metanoia Academy sheet
      const maxWeights = {
      st1: 10, ws: 10, mid_exam: 20,  // Match DB column names
      project: 10, st2: 10, home_class_work: 5,
      class_activity: 5, final_exam: 30
     };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 because Excel starts at 1 and has a header row
        const rowErrors = [];

        try {
          const { 
            enrollment_id, subject_id, 
            st1, ws, mid_exam, project, st2, home_class_work, class_activity, final_exam 
          } = row;

          // 1. Validate IDs
          if (!enrollment_id || isNaN(enrollment_id)) rowErrors.push("Invalid Enrollment ID");
          if (!subject_id || isNaN(subject_id)) rowErrors.push("Invalid Subject ID");

          // 2. Validate Numeric Range & Format (Optional rows allowed)
          const validateScore = (val, key) => {
            if (val === undefined || val === null || val === "") return null; // Keep optional
            const num = parseFloat(val);
            if (isNaN(num)) return `Invalid number in ${key}`;
            if (num < 0 || num > maxWeights[key]) return `${key} exceeds max weight (${maxWeights[key]}%)`;
            return num;
          };

          const validatedData = {
            st1: validateScore(st1, 'st1'),
            ws: validateScore(ws, 'ws'),
            mid_exam: validateScore(mid_exam, 'mid_exam'),
            project: validateScore(project, 'project'),
            st2: validateScore(st2, 'st2'),
            home_class_work: validateScore(home_class_work, 'home_class_work'),
            class_activity: validateScore(class_activity, 'class_activity'),
            final_exam: validateScore(final_exam, 'final_exam')
          };

          // Check if any specific field validation failed
          Object.keys(validatedData).forEach(key => {
            if (typeof validatedData[key] === 'string') rowErrors.push(validatedData[key]);
          });

          if (rowErrors.length > 0) {
            results.failed++;
            results.errors.push(`Row ${rowNum}: ${rowErrors.join(", ")}`);
            continue;
          }

          // 3. Database Operation
          const sql = `
            INSERT INTO marks 
            (enrollments_id, subjects_id, st1, ws, mid_exam, project, st2, home_class_work, class_activity, final_exam) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            st1=VALUES(st1), ws=VALUES(ws), mid_exam=VALUES(mid_exam), project=VALUES(project), 
            st2=VALUES(st2), home_class_work=VALUES(home_class_work), class_activity=VALUES(class_activity), 
            final_exam=VALUES(final_exam)`;

          await db.execute(sql, [
            enrollment_id, subject_id,
            validatedData.st1, validatedData.ws, validatedData.mid_exam, validatedData.project,
            validatedData.st2, validatedData.home_class_work, validatedData.class_activity, validatedData.final_exam
          ]);

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Row ${rowNum} Database Error: ${err.message}`);
        }
      }

      const status = results.failed === 0 ? 200 : 207; // 207 Multi-Status if partial failure
      res.status(status).json({ 
        message: results.failed === 0 ? "Import successful!" : "Import completed with errors.",
        stats: {
          total: data.length,
          success: results.success,
          failed: results.failed
        },
        errors: results.errors 
      });

    } catch (err) {
      console.error('Excel Import Error:', err);
      res.status(500).json({ message: 'Critical error processing file' });
    }
  };
