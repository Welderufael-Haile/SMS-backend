// const db = require('../config/db');

// // 1. Preview Promotion Results - UPDATED for new marks structure
// exports.previewPromotion = async (req, res) => {
//   const { academic_year_id } = req.query;
//   if (!academic_year_id) return res.status(400).json({ message: "Academic Year ID required" });

//   try {
//     // ✅ FIXED: Use total_score instead of score
//     const [rows] = await db.query(`
//       SELECT 
//         e.id AS enrollment_id,
//         e.student_id,
//         s.full_name,
//         sec.grade_level,
//         AVG(m.total_score) AS average  -- Changed from 'score' to 'total_score'
//       FROM enrollments e
//       JOIN Student s ON s.id = e.student_id
//       JOIN sections sec ON sec.id = e.sections_id
//       JOIN marks m ON m.enrollments_id = e.id
//       WHERE e.academic_year_id = ? AND e.status = 'active'
//       GROUP BY e.id
//     `, [academic_year_id]);

//     const preview = rows.map(r => ({
//       ...r,
//       average: parseFloat(r.average || 0).toFixed(2),
//       decision: (r.average || 0) >= 50 ? 'PROMOTE' : 'REPEAT'
//     }));

//     res.json(preview);
//   } catch (err) {
//     console.error("Preview Error:", err);
//     res.status(500).json({ message: "Server error during preview" });
//   }
// };

// // 2. Confirm and Execute Promotion - UPDATED
// exports.confirmPromotion = async (req, res) => {
//   const { academic_year_id, next_academic_year_id, next_term_id } = req.body;
  
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     // ✅ FIXED: Use total_score and only get active students with marks
//     const [rows] = await connection.query(`
//       SELECT 
//         e.id AS enrollment_id,
//         e.student_id,
//         e.sections_id,
//         sec.grade_level,
//         sec.name AS section_name,
//         AVG(m.total_score) AS average  -- Changed from 'score' to 'total_score'
//       FROM enrollments e
//       JOIN sections sec ON sec.id = e.sections_id
//       JOIN marks m ON m.enrollments_id = e.id
//       WHERE e.academic_year_id = ?
//       AND e.status = 'active'
//       GROUP BY e.id
//       HAVING COUNT(m.id) > 0  -- Only students with marks
//     `, [academic_year_id]);

//     if (rows.length === 0) {
//         await connection.rollback();
//         return res.status(400).json({ message: "No active students with marks found for this year." });
//     }

//     let promoted = 0;
//     let repeated = 0;

//     for (const r of rows) {
//       const avgScore = parseFloat(r.average || 0);
//       const isPromoted = avgScore >= 50;
//       const nextGrade = isPromoted ? r.grade_level + 1 : r.grade_level;
//       const finalStatus = isPromoted ? 'promoted' : 'repeated';
      
//       if (isPromoted) promoted++; else repeated++;

//       // Update current enrollment
//       await connection.query(
//         `UPDATE enrollments SET final_average=?, status=?, completed_at=NOW() WHERE id=?`,
//         [avgScore, finalStatus, r.enrollment_id]
//       );

//       // Handle graduation (Grade 12 completion)
//       if (r.grade_level === 12 && isPromoted) {
//         // Student graduates - don't create new enrollment
//         await connection.query(
//           `INSERT INTO graduation_records (student_id, graduation_date, final_average, academic_year_id)
//            VALUES (?, NOW(), ?, ?)`,
//           [r.student_id, avgScore, academic_year_id]
//         );
//         continue; // Skip enrollment creation
//       }

//       // Find section in the next grade/year
//       const [nextSection] = await connection.query(
//         `SELECT id FROM sections WHERE grade_level=? AND name=? LIMIT 1`,
//         [nextGrade, r.section_name]
//       );

//       if (nextSection.length > 0) {
//         // Prevent double enrollment
//         const [exists] = await connection.query(
//             `SELECT id FROM enrollments WHERE student_id=? AND academic_year_id=? AND terms_id=?`,
//             [r.student_id, next_academic_year_id, next_term_id]
//         );

//         if (exists.length === 0) {
//             await connection.query(`
//               INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id, status)
//               VALUES (?, ?, ?, ?, 'active')
//             `, [r.student_id, next_academic_year_id, next_term_id, nextSection[0].id]);
//         }
//       }
//     }

//     await connection.commit();
//     res.json({ 
//       message: 'Promotion completed successfully',
//       stats: {
//         total: rows.length,
//         promoted,
//         repeated,
//         graduated: rows.filter(r => r.grade_level === 12 && (r.average || 0) >= 50).length
//       }
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error("Promotion Error:", err);
//     res.status(500).json({ message: "Database Error: " + err.message });
//   } finally {
//     connection.release();
//   }
// };

const db = require('../config/db');

// 1. Preview Promotion Results - Handles variable terms
exports.previewPromotion = async (req, res) => {
  const { academic_year_id } = req.query;
  if (!academic_year_id) return res.status(400).json({ message: "Academic Year ID required" });

  try {
    // Get all students with their term data
    const [rows] = await db.query(`
      SELECT 
        s.id AS student_id,
        s.full_name,
        sec.grade_level,
        -- Count how many terms this student has
        COUNT(DISTINCT e.terms_id) AS terms_completed,
        -- Calculate average across all their terms
        AVG(term_avg.term_average) AS yearly_average,
        -- Show individual term averages (optional, for preview)
        GROUP_CONCAT(
          CONCAT(t.term_name, ':', ROUND(term_avg.term_average, 2))
          ORDER BY t.start_date SEPARATOR ' | '
        ) AS term_breakdown
      FROM Student s
      JOIN enrollments e ON e.student_id = s.id
      JOIN sections sec ON sec.id = e.sections_id
      JOIN terms t ON t.id = e.terms_id
      JOIN (
        SELECT 
          e.id AS enrollment_id,
          e.student_id,
          AVG(m.total_score) AS term_average
        FROM enrollments e
        JOIN marks m ON m.enrollments_id = e.id
        WHERE e.academic_year_id = ? AND e.status = 'active'
        GROUP BY e.id, e.student_id
      ) AS term_avg ON term_avg.student_id = s.id AND term_avg.enrollment_id = e.id
      WHERE e.academic_year_id = ? AND e.status = 'active'
      GROUP BY s.id, s.full_name, sec.grade_level
    `, [academic_year_id, academic_year_id]);

    const preview = rows.map(r => {
      const avgScore = parseFloat(r.yearly_average || 0);
      
      // DECISION LOGIC based on terms completed
      let decision = 'PENDING';
      let decisionReason = '';
      
      if (r.terms_completed === 0) {
        decision = 'INCOMPLETE';
        decisionReason = 'No terms completed';
      } 
      else if (r.terms_completed === 1) {
        // With only 1 term, use that term's average
        decision = avgScore >= 50 ? 'PROMOTE (tentative)' : 'REPEAT (tentative)';
        decisionReason = `Based on 1 term only`;
      }
      else if (r.terms_completed === 2) {
        // With 2 terms, average them
        decision = avgScore >= 50 ? 'PROMOTE' : 'REPEAT';
        decisionReason = `Based on 2 terms`;
      }
      else {
        // With 3+ terms, use full average
        decision = avgScore >= 50 ? 'PROMOTE' : 'REPEAT';
        decisionReason = `Based on ${r.terms_completed} terms`;
      }

      return {
        student_id: r.student_id,
        full_name: r.full_name,
        grade_level: r.grade_level,
        terms_completed: r.terms_completed,
        term_breakdown: r.term_breakdown,
        average: avgScore.toFixed(2),
        decision: decision,
        reason: decisionReason
      };
    });

    res.json(preview);
  } catch (err) {
    console.error("Preview Error:", err);
    res.status(500).json({ message: "Server error during preview" });
  }
};

// 2. Confirm and Execute Promotion - Handles variable terms
exports.confirmPromotion = async (req, res) => {
  const { academic_year_id, next_academic_year_id, next_term_id } = req.body;
  
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Get all students with their yearly average and term count
    const [students] = await connection.query(`
      SELECT 
        s.id AS student_id,
        s.full_name,
        sec.grade_level,
        sec.name AS section_name,
        sec.id AS section_id,
        -- Count terms completed
        COUNT(DISTINCT e.terms_id) AS terms_completed,
        -- Calculate yearly average
        AVG(term_avg.term_average) AS yearly_average,
        -- Get all enrollment IDs
        GROUP_CONCAT(e.id) AS enrollment_ids
      FROM Student s
      JOIN enrollments e ON e.student_id = s.id
      JOIN sections sec ON sec.id = e.sections_id
      JOIN (
        SELECT 
          e.id AS enrollment_id,
          e.student_id,
          AVG(m.total_score) AS term_average
        FROM enrollments e
        JOIN marks m ON m.enrollments_id = e.id
        WHERE e.academic_year_id = ? AND e.status = 'active'
        GROUP BY e.id, e.student_id
      ) AS term_avg ON term_avg.student_id = s.id AND term_avg.enrollment_id = e.id
      WHERE e.academic_year_id = ? AND e.status = 'active'
      GROUP BY s.id, s.full_name, sec.grade_level, sec.name, sec.id
    `, [academic_year_id, academic_year_id]);

    if (students.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: "No students found." });
    }

    let promoted = 0;
    let repeated = 0;
    let graduated = 0;
    let incomplete = 0;
    const results = [];

    for (const student of students) {
      const avgScore = parseFloat(student.yearly_average || 0);
      const termsCompleted = parseInt(student.terms_completed);
      
      // DECISION MAKING based on terms completed
      let finalStatus;
      let decisionNote;
      
      if (termsCompleted === 0) {
        finalStatus = 'incomplete';
        incomplete++;
        decisionNote = 'No terms completed';
      }
      else if (termsCompleted === 1) {
        // With 1 term, use it but mark as tentative
        finalStatus = avgScore >= 50 ? 'promoted' : 'repeated';
        decisionNote = `Based on 1 term only`;
        if (avgScore >= 50) promoted++; else repeated++;
      }
      else {
        // With 2+ terms, use full average
        finalStatus = avgScore >= 50 ? 'promoted' : 'repeated';
        decisionNote = `Based on ${termsCompleted} terms`;
        if (avgScore >= 50) promoted++; else repeated++;
      }

      // Calculate next grade
      const nextGrade = finalStatus === 'promoted' ? student.grade_level + 1 : student.grade_level;
      
      // Handle graduation
      if (student.grade_level === 12 && finalStatus === 'promoted') {
        await connection.query(
          `INSERT INTO graduation_records (student_id, graduation_date, final_average, academic_year_id, terms_completed)
           VALUES (?, NOW(), ?, ?, ?)`,
          [student.student_id, avgScore, academic_year_id, termsCompleted]
        );
        graduated++;
        continue;
      }

      // Update ALL enrollments for this student
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

      // Create next year enrollment if promoted
      if (finalStatus === 'promoted') {
        // Find section in next grade
        const [nextSection] = await connection.query(
          `SELECT id FROM sections WHERE grade_level = ? AND name = ? LIMIT 1`,
          [nextGrade, student.section_name]
        );

        if (nextSection.length > 0) {
          // Check for duplicate
          const [exists] = await connection.query(
            `SELECT id FROM enrollments 
             WHERE student_id = ? AND academic_year_id = ? AND terms_id = ?`,
            [student.student_id, next_academic_year_id, next_term_id]
          );

          if (exists.length === 0) {
            await connection.query(`
              INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id, status, promotion_note)
              VALUES (?, ?, ?, ?, 'active', ?)
            `, [student.student_id, next_academic_year_id, next_term_id, nextSection[0].id, `Promoted from ${student.grade_level}`]);
          }
        }
      }
      
      results.push({
        student_id: student.student_id,
        name: student.full_name,
        terms_completed: termsCompleted,
        average: avgScore.toFixed(2),
        decision: finalStatus,
        note: decisionNote
      });
    }

    await connection.commit();
    
    res.json({ 
      message: 'Promotion completed successfully',
      stats: {
        total: students.length,
        promoted,
        repeated,
        graduated,
        incomplete
      },
      details: results
    });

  } catch (err) {
    await connection.rollback();
    console.error("Promotion Error:", err);
    res.status(500).json({ message: "Database Error: " + err.message });
  } finally {
    connection.release();
  }
};

// 3. Additional helper: Get term completion summary
exports.getTermCompletionSummary = async (req, res) => {
  const { academic_year_id } = req.query;
  
  try {
    const [summary] = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id) AS total_students,
        SUM(CASE WHEN term_count.terms = 3 THEN 1 ELSE 0 END) AS completed_3_terms,
        SUM(CASE WHEN term_count.terms = 2 THEN 1 ELSE 0 END) AS completed_2_terms,
        SUM(CASE WHEN term_count.terms = 1 THEN 1 ELSE 0 END) AS completed_1_term,
        SUM(CASE WHEN term_count.terms = 0 THEN 1 ELSE 0 END) AS no_terms
      FROM Student s
      LEFT JOIN (
        SELECT 
          e.student_id,
          COUNT(DISTINCT e.terms_id) AS terms
        FROM enrollments e
        WHERE e.academic_year_id = ? AND e.status = 'active'
        GROUP BY e.student_id
      ) AS term_count ON term_count.student_id = s.id
    `, [academic_year_id]);
    
    res.json(summary[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};