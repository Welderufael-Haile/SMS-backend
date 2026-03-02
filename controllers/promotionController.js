const db = require('../config/db');

// Validate required parameters
const validatePromotionParams = (academic_year_id, next_academic_year_id, next_term_id) => {
  const errors = [];
  if (!academic_year_id) errors.push("Current academic year is required");
  if (!next_academic_year_id) errors.push("Next academic year is required");
  if (!next_term_id) errors.push("Next term is required");
  
  // Prevent same year promotion
  if (academic_year_id && next_academic_year_id && academic_year_id === next_academic_year_id) {
    errors.push("Current and next academic years cannot be the same");
  }
  
  return errors;
};

// Check if promotion already executed
const checkAlreadyPromoted = async (connection, academic_year_id) => {
  const [promoted] = await connection.query(
    `SELECT COUNT(*) as count FROM enrollments 
     WHERE academic_year_id = ? AND status IN ('promoted', 'repeated', 'completed')`,
    [academic_year_id]
  );
  return promoted[0].count > 0;
};

// 1. PREVIEW PROMOTION - With Grade 12 handling
// =============================================
exports.previewPromotion = async (req, res) => {
  const { academic_year_id, section_id } = req.query;
  
  // Input validation
  if (!academic_year_id) {
    return res.status(400).json({ 
      success: false,
      message: "Academic Year ID is required",
      errors: ["Missing academic_year_id parameter"]
    });
  }

  try {
    // First, check if any students were already promoted
    const [alreadyProcessed] = await db.query(
      `SELECT COUNT(*) as count FROM enrollments 
       WHERE academic_year_id = ? AND status IN ('promoted', 'repeated', 'completed', 'graduated')`,
      [academic_year_id]
    );

    if (alreadyProcessed[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: "Some students have already been promoted/repeated",
        warning: "Refresh data or process remaining students only"
      });
    }

    // Build query with optional section filter
    let query = `
      SELECT 
        s.id AS student_id,
        s.full_name,
        s.Sex,
        sec.grade_level,
        sec.name AS section_name,
        sec.id AS section_id,
        COUNT(DISTINCT e.terms_id) AS terms_completed,
        COALESCE(AVG(term_avg.term_average), 0) AS yearly_average,
        GROUP_CONCAT(
          CONCAT(t.term_name, ':', COALESCE(ROUND(term_avg.term_average, 2), 'N/A'))
          ORDER BY t.start_date SEPARATOR ' | '
        ) AS term_breakdown
      FROM Student s
      JOIN enrollments e ON e.student_id = s.id
      JOIN sections sec ON sec.id = e.sections_id
      JOIN terms t ON t.id = e.terms_id
      LEFT JOIN (
        SELECT 
          e.id AS enrollment_id,
          e.student_id,
          AVG(m.total_score) AS term_average
        FROM enrollments e
        LEFT JOIN marks m ON m.enrollments_id = e.id
        WHERE e.academic_year_id = ? AND e.status = 'active'
        GROUP BY e.id, e.student_id
      ) AS term_avg ON term_avg.student_id = s.id AND term_avg.enrollment_id = e.id
      WHERE e.academic_year_id = ? AND e.status = 'active'
    `;

    const params = [academic_year_id, academic_year_id];

    if (section_id) {
      query += ` AND sec.id = ?`;
      params.push(section_id);
    }

    query += ` GROUP BY s.id, s.full_name, s.Sex, sec.grade_level, sec.name, sec.id`;

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active students found for promotion",
        data: []
      });
    }

    // Inside the preview map function
    const preview = rows.map(r => {
      const avgScore = parseFloat(r.yearly_average || 0);
      const isGrade12 = r.grade_level === 12;
      
      let decision = 'PENDING';
      let decisionReason = '';
      let canPromote = false;
      
      // ETHIOPIAN CURRICULUM RULES
      if (isGrade12) {
        decision = 'COMPLETED';
        decisionReason = `Grade 12 completed - awaits national exam (Avg: ${avgScore.toFixed(2)}%)`;
        canPromote = false;
      }
      else if (r.terms_completed === 0) {
        decision = 'INCOMPLETE';
        decisionReason = 'No terms completed';
        canPromote = false;
      } 
      else if (r.terms_completed === 1) {
        decision = avgScore >= 50 ? 'PROMOTE (tentative)' : 'REPEAT (tentative)';
        decisionReason = `Based on 1 term only - ${avgScore >= 50 ? 'promote' : 'repeat'} provisional`;
        canPromote = avgScore >= 50;
      }
      else {
        decision = avgScore >= 50 ? 'PROMOTE' : 'REPEAT';
        decisionReason = `Based on ${r.terms_completed} terms - ${avgScore >= 50 ? 'promote' : 'repeat'}`;
        canPromote = avgScore >= 50;
      }

      return {
        student_id: r.student_id,
        full_name: r.full_name,
        grade_level: r.grade_level,
        section_name: r.section_name,
        terms_completed: r.terms_completed,
        term_breakdown: r.term_breakdown || 'No term data',
        average: avgScore.toFixed(2),
        decision: decision,
        reason: decisionReason,
        can_promote: canPromote,
        is_grade12: isGrade12
      };
    });
    
    // Calculate summary statistics
    const stats = {
      total: preview.length,
      promote: preview.filter(p => p.decision.includes('PROMOTE')).length,
      repeat: preview.filter(p => p.decision.includes('REPEAT')).length,
      complete: preview.filter(p => p.decision === 'COMPLETED').length,
      incomplete: preview.filter(p => p.decision === 'INCOMPLETE').length,
      grade12: preview.filter(p => p.is_grade12).length
    };

    res.json({
      success: true,
      message: "Preview generated successfully",
      stats,
      data: preview
    });

  } catch (err) {
    console.error("Preview Promotion Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error during preview",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 2. Confirm and Execute Promotion - Ethiopian Curriculum Logic
exports.confirmPromotion = async (req, res) => {
  const { academic_year_id, next_academic_year_id, next_term_id, section_id } = req.body;
  
  // Validate inputs
  const validationErrors = validatePromotionParams(academic_year_id, next_academic_year_id, next_term_id);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validationErrors
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Check if promotion already executed
    const alreadyPromoted = await checkAlreadyPromoted(connection, academic_year_id);
    if (alreadyPromoted) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Promotion already executed for this academic year",
        suggestion: "Use restore function to revert or process remaining students"
      });
    }

    // Get all active students with their data
    let query = `
      SELECT 
        s.id AS student_id,
        s.full_name,
        sec.grade_level,
        sec.name AS section_name,
        sec.id AS section_id,
        COUNT(DISTINCT e.terms_id) AS terms_completed,
        COALESCE(AVG(term_avg.term_average), 0) AS yearly_average,
        GROUP_CONCAT(e.id) AS enrollment_ids
      FROM Student s
      JOIN enrollments e ON e.student_id = s.id
      JOIN sections sec ON sec.id = e.sections_id
      LEFT JOIN (
        SELECT 
          e.id AS enrollment_id,
          e.student_id,
          AVG(m.total_score) AS term_average
        FROM enrollments e
        LEFT JOIN marks m ON m.enrollments_id = e.id
        WHERE e.academic_year_id = ? AND e.status = 'active'
        GROUP BY e.id, e.student_id
      ) AS term_avg ON term_avg.student_id = s.id AND term_avg.enrollment_id = e.id
      WHERE e.academic_year_id = ? AND e.status = 'active'
    `;

    const params = [academic_year_id, academic_year_id];

    if (section_id) {
      query += ` AND sec.id = ?`;
      params.push(section_id);
    }

    query += ` GROUP BY s.id, s.full_name, sec.grade_level, sec.name, sec.id`;

    const [students] = await connection.query(query, params);

    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "No active students found",
        data: []
      });
    }

    // Statistics tracking
    const stats = {
      total: students.length,
      promoted: 0,
      repeated: 0,
      completed: 0,
      graduated: 0,
      incomplete: 0,
      errors: [],
      warnings: []
    };

    const results = [];

    // Process EACH student individually with proper Grade 12 handling
    for (const student of students) {
      try {
        const avgScore = parseFloat(student.yearly_average || 0);
        const termsCompleted = parseInt(student.terms_completed);
        const isGrade12 = student.grade_level === 12;
        
        let finalStatus;
        let decisionNote;
        let createNextEnrollment = false;
        let nextGrade = student.grade_level;
        
        // ETHIOPIAN CURRICULUM DECISION LOGIC
        if (isGrade12) {
          // Grade 12: ALWAYS set to 'completed' regardless of score
          finalStatus = 'completed';
          decisionNote = `Grade 12 completed - awaiting national exam (Avg: ${avgScore.toFixed(2)}%)`;
          createNextEnrollment = false;
          
          // Add to graduation_records for ALL Grade 12 students
          await connection.query(
            `INSERT INTO graduation_records 
             (student_id, graduation_date, final_average, academic_year_id, terms_completed)
             VALUES (?, NOW(), ?, ?, ?)`,
            [student.student_id, avgScore, academic_year_id, termsCompleted]
          );
          
          stats.completed++;
          stats.graduated++;
        }
        else if (termsCompleted === 0) {
          finalStatus = 'incomplete';
          decisionNote = 'No terms completed';
          createNextEnrollment = false;
          stats.incomplete++;
        }
        else if (termsCompleted === 1) {
          finalStatus = avgScore >= 50 ? 'promoted' : 'repeated';
          decisionNote = `Based on 1 term only - provisional`;
          createNextEnrollment = true;
          if (avgScore >= 50) {
            stats.promoted++;
            nextGrade = student.grade_level + 1;
          } else {
            stats.repeated++;
          }
        }
        else {
          finalStatus = avgScore >= 50 ? 'promoted' : 'repeated';
          decisionNote = `Based on ${termsCompleted} terms`;
          createNextEnrollment = true;
          if (avgScore >= 50) {
            stats.promoted++;
            nextGrade = student.grade_level + 1;
          } else {
            stats.repeated++;
          }
        }

        // Update ALL enrollments for this student
        if (student.enrollment_ids) {
          const enrollmentIds = student.enrollment_ids.split(',');
          for (const enrollmentId of enrollmentIds) {
            await connection.query(
              `UPDATE enrollments 
               SET final_average = ?, 
                   status = ?, 
                   completed_at = NOW(),
                   promotion_note = ?
               WHERE id = ?`,
              [avgScore, finalStatus, decisionNote, enrollmentId]
            );
          }
        }

        // Create next year enrollment ONLY for non-Grade 12 students who qualify
        if (createNextEnrollment && !isGrade12) {
          // Find section in target grade
          const [nextSection] = await connection.query(
            `SELECT id, name FROM sections WHERE grade_level = ? AND name = ? LIMIT 1`,
            [nextGrade, student.section_name]
          );

          let sectionId;
          let sectionNote = '';

          if (nextSection.length > 0) {
            sectionId = nextSection[0].id;
          } else {
            // Try to find any section in target grade
            const [defaultSection] = await connection.query(
              `SELECT id, name FROM sections WHERE grade_level = ? ORDER BY name ASC LIMIT 1`,
              [nextGrade]
            );
            
            if (defaultSection.length > 0) {
              sectionId = defaultSection[0].id;
              sectionNote = ` (Originally ${student.section_name}, assigned to ${defaultSection[0].name})`;
              
              stats.warnings.push({
                student_id: student.student_id,
                student_name: student.full_name,
                message: `Section "${student.section_name}" not found in grade ${nextGrade}. Student assigned to "${defaultSection[0].name}".`
              });
            } else {
              stats.errors.push({
                student_id: student.student_id,
                name: student.full_name,
                error: `No sections available in grade ${nextGrade}`
              });
              continue;
            }
          }

          // Check for duplicate enrollment
          const [exists] = await connection.query(
            `SELECT id FROM enrollments 
             WHERE student_id = ? AND academic_year_id = ? AND terms_id = ?`,
            [student.student_id, next_academic_year_id, next_term_id]
          );

          if (exists.length === 0 && sectionId) {
            await connection.query(`
              INSERT INTO enrollments 
              (student_id, academic_year_id, terms_id, sections_id, status, promotion_note)
              VALUES (?, ?, ?, ?, 'active', ?)
            `, [
              student.student_id, 
              next_academic_year_id, 
              next_term_id, 
              sectionId, 
              `From ${student.grade_level}: ${finalStatus} - ${decisionNote}${sectionNote}`
            ]);
          }
        }
        
        results.push({
          student_id: student.student_id,
          name: student.full_name,
          from_grade: student.grade_level,
          to_grade: isGrade12 ? student.grade_level : nextGrade,
          terms_completed: termsCompleted,
          average: avgScore.toFixed(2),
          decision: finalStatus,
          note: decisionNote,
          is_grade12: isGrade12
        });

      } catch (studentError) {
        stats.errors.push({
          student_id: student.student_id,
          name: student.full_name,
          error: "Failed to process student"
        });
      }
    }

    await connection.commit();

    // Prepare response
    const response = {
      success: true,
      message: stats.errors.length > 0 
        ? "Promotion completed with some errors" 
        : "Promotion completed successfully",
      stats,
      details: results
    };

    // Add warnings if any
    if (stats.warnings.length > 0) {
      response.warnings = stats.warnings;
    }

    // Add errors if any
    if (stats.errors.length > 0) {
      response.errors = stats.errors;
    }

    const responseStatus = stats.errors.length > 0 ? 207 : 200;
    res.status(responseStatus).json(response);

  } catch (err) {
    await connection.rollback();
    console.error("Promotion Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Database error during promotion",
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  } finally {
    connection.release();
  }
};

// 3. GET TERM COMPLETION SUMMARY
// =============================================
exports.getTermCompletionSummary = async (req, res) => {
  const { academic_year_id, section_id } = req.query;
  
  if (!academic_year_id) {
    return res.status(400).json({
      success: false,
      message: "Academic Year ID required"
    });
  }

  try {
    let query = `
      SELECT 
        sec.grade_level,
        sec.name AS section_name,
        COUNT(DISTINCT s.id) AS total_students,
        SUM(CASE WHEN term_count.terms = 3 THEN 1 ELSE 0 END) AS completed_3_terms,
        SUM(CASE WHEN term_count.terms = 2 THEN 1 ELSE 0 END) AS completed_2_terms,
        SUM(CASE WHEN term_count.terms = 1 THEN 1 ELSE 0 END) AS completed_1_term,
        SUM(CASE WHEN term_count.terms = 0 THEN 1 ELSE 0 END) AS no_terms,
        SUM(CASE WHEN sec.grade_level = 12 THEN 1 ELSE 0 END) AS grade12_count
      FROM sections sec
      CROSS JOIN Student s
      LEFT JOIN (
        SELECT 
          e.student_id,
          e.sections_id,
          COUNT(DISTINCT e.terms_id) AS terms
        FROM enrollments e
        WHERE e.academic_year_id = ? AND e.status = 'active'
        GROUP BY e.student_id, e.sections_id
      ) AS term_count ON term_count.student_id = s.id AND term_count.sections_id = sec.id
      WHERE EXISTS (
        SELECT 1 FROM enrollments e2 
        WHERE e2.student_id = s.id 
        AND e2.academic_year_id = ?
      )
    `;

    const params = [academic_year_id, academic_year_id];

    if (section_id) {
      query += ` AND sec.id = ?`;
      params.push(section_id);
    }

    query += ` GROUP BY sec.grade_level, sec.name ORDER BY sec.grade_level, sec.name`;

    const [summary] = await db.query(query, params);
    
    // Overall totals
    const overall = {
      total_students: summary.reduce((acc, row) => acc + row.total_students, 0),
      total_grade12: summary.reduce((acc, row) => acc + row.grade12_count, 0),
      completed_3_terms: summary.reduce((acc, row) => acc + row.completed_3_terms, 0),
      completed_2_terms: summary.reduce((acc, row) => acc + row.completed_2_terms, 0),
      completed_1_term: summary.reduce((acc, row) => acc + row.completed_1_term, 0),
      no_terms: summary.reduce((acc, row) => acc + row.no_terms, 0)
    };

    res.json({
      success: true,
      overall,
      by_section: summary
    });

  } catch (err) {
    console.error("Summary Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Error fetching summary",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 4. GET PROMOTION ELIGIBILITY CHECK
exports.getPromotionEligibility = async (req, res) => {
  const { academic_year_id } = req.query;

  try {
    const [result] = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        SUM(CASE WHEN sec.grade_level = 12 THEN 1 ELSE 0 END) as grade12_students,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM enrollments e2 
          WHERE e2.student_id = s.id 
          AND e2.academic_year_id = ? 
          AND e2.status = 'promoted'
        ) THEN 1 ELSE 0 END) as already_promoted,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM enrollments e2 
          WHERE e2.student_id = s.id 
          AND e2.academic_year_id = ? 
          AND e2.status = 'repeated'
        ) THEN 1 ELSE 0 END) as already_repeated,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM enrollments e2 
          WHERE e2.student_id = s.id 
          AND e2.academic_year_id = ? 
          AND e2.status = 'completed'
        ) THEN 1 ELSE 0 END) as already_completed
      FROM Student s
      JOIN enrollments e ON e.student_id = s.id
      JOIN sections sec ON sec.id = e.sections_id
      WHERE e.academic_year_id = ? AND e.status = 'active'
    `, [academic_year_id, academic_year_id, academic_year_id, academic_year_id]);

    const eligible = result[0].total_students - 
                     result[0].already_promoted - 
                     result[0].already_repeated - 
                     result[0].already_completed;

    res.json({
      success: true,
      total: result[0].total_students,
      grade12: result[0].grade12_students,
      already_processed: {
        promoted: result[0].already_promoted,
        repeated: result[0].already_repeated,
        completed: result[0].already_completed
      },
      eligible_for_promotion: eligible,
      can_proceed: eligible > 0
    });

  } catch (err) {
    console.error("Eligibility Error:", err);
    res.status(500).json({ error: err.message });
  }
};