// const db = require('../config/db');

// exports.previewPromotion = async (req, res) => {
//   const { academic_year_id } = req.query;

//   try {
//     const [rows] = await db.query(`
//       SELECT 
//         e.id AS enrollment_id,
//         e.student_id,
//         s.full_name,
//         sec.grade_level,
//         AVG(m.score) AS average
//       FROM enrollments e
//       JOIN Student s ON s.id = e.student_id
//       JOIN sections sec ON sec.id = e.sections_id
//       JOIN marks m ON m.enrollments_id = e.id
//       WHERE e.academic_year_id = ?
//       GROUP BY e.id
//     `, [academic_year_id]);

//     const preview = rows.map(r => ({
//       ...r,
//       decision: r.average >= 50 ? 'PROMOTE' : 'REPEAT'
//     }));

//     res.json(preview);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// };

// // confirm promotion
// exports.confirmPromotion = async (req, res) => {
//   // 1️⃣ Check if selected term is LAST term of the academic year
// const [lastTerm] = await db.query(
//   `SELECT id FROM terms 
//    WHERE academic_year_id = ?
//    ORDER BY end_date DESC 
//    LIMIT 1`,
//   [academic_year_id]
// );

// if (!lastTerm.length || lastTerm[0].id != next_term_id) {
//   return res.status(400).json({
//     message: 'Promotion is allowed only after the final term of the academic year'
//   });
// }

//   const { academic_year_id, next_academic_year_id, next_term_id } = req.body;

//   try {
//     await db.beginTransaction();

//     const [rows] = await db.query(`
//       SELECT 
//         e.id AS enrollment_id,
//         e.student_id,
//         e.sections_id,
//         sec.grade_level,
//         AVG(m.score) AS average
//       FROM enrollments e
//       JOIN sections sec ON sec.id = e.sections_id
//       JOIN marks m ON m.enrollments_id = e.id
//       WHERE e.academic_year_id = ?
//       AND e.status = 'active'
//       GROUP BY e.id
//     `, [academic_year_id]);

//     for (const r of rows) {
//       const promote = r.average >= 50;

//       await db.query(
//         `UPDATE enrollments SET final_average=?, status=? WHERE id=?`,
//         [r.average, promote ? 'promoted' : 'repeated', r.enrollment_id]
//       );

//       const [currentSection] = await db.query(
//         `SELECT name FROM sections WHERE id=?`,
//         [r.sections_id]
//       );

//       const [nextSection] = await db.query(
//         `SELECT id FROM sections WHERE grade_level=? AND name=? LIMIT 1`,
//         [promote ? r.grade_level + 1 : r.grade_level, currentSection[0].name]
//       );

//       if (!nextSection.length) continue;

//       await db.query(`
//         INSERT INTO enrollments (
//           student_id,
//           academic_year_id,
//           terms_id,
//           sections_id,
//           status
//         ) VALUES (?, ?, ?, ?, 'active')
//       `, [
//         r.student_id,
//         next_academic_year_id,
//         next_term_id,
//         nextSection[0].id
//       ]);
//     }

//     await db.commit();
//     res.json({ message: 'Promotion completed successfully' });

//   } catch (err) {
//     await db.rollback();
//     res.status(500).json(err);
//   }
// };


const db = require('../config/db');

// 1. Preview Promotion Results ---
exports.previewPromotion = async (req, res) => {
  const { academic_year_id } = req.query;
  if (!academic_year_id) return res.status(400).json({ message: "Academic Year ID required" });

  try {
    const [rows] = await db.query(`
      SELECT 
        e.id AS enrollment_id,
        e.student_id,
        s.full_name,
        sec.grade_level,
        AVG(m.score) AS average
      FROM enrollments e
      JOIN Student s ON s.id = e.student_id
      JOIN sections sec ON sec.id = e.sections_id
      JOIN marks m ON m.enrollments_id = e.id
      WHERE e.academic_year_id = ?
      GROUP BY e.id
    `, [academic_year_id]);

    const preview = rows.map(r => ({
      ...r,
      decision: r.average >= 50 ? 'PROMOTE' : 'REPEAT'
    }));

    res.json(preview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during preview" });
  }
};

// 2. Confirm and Execute Promotion ---


exports.confirmPromotion = async (req, res) => {
  const { academic_year_id, next_academic_year_id, next_term_id } = req.body;
  
  // 1. Get a dedicated connection from the pool for the transaction
  const connection = await db.getConnection();

  try {
    // 2. Start Transaction on the CONNECTION
    await connection.beginTransaction();

    // Safety: Verify current year vs next year (Prevents 2018 -> 2017 logic errors)
    const [years] = await connection.query(
      'SELECT id, year_name FROM academic_year WHERE id IN (?, ?)',
      [academic_year_id, next_academic_year_id]
    );
    
    // Optional: Add logic here to compare year_names if you want to strictly prevent backward promotion

    // 3. Get all active enrollments and their averages
    const [rows] = await connection.query(`
      SELECT 
        e.id AS enrollment_id,
        e.student_id,
        e.sections_id,
        sec.grade_level,
        sec.name AS section_name,
        AVG(m.score) AS average
      FROM enrollments e
      JOIN sections sec ON sec.id = e.sections_id
      JOIN marks m ON m.enrollments_id = e.id
      WHERE e.academic_year_id = ?
      AND e.status = 'active'
      GROUP BY e.id
    `, [academic_year_id]);

    if (rows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: "No active students with marks found for this year." });
    }

    for (const r of rows) {
      const isPromoted = r.average >= 50;
      const nextGrade = isPromoted ? r.grade_level + 1 : r.grade_level;
      const finalStatus = isPromoted ? 'promoted' : 'repeated';

      // Update current enrollment
      await connection.query(
        `UPDATE enrollments SET final_average=?, status=? WHERE id=?`,
        [r.average, finalStatus, r.enrollment_id]
      );

      // Find section in the next grade/year
      const [nextSection] = await connection.query(
        `SELECT id FROM sections WHERE grade_level=? AND name=? LIMIT 1`,
        [nextGrade, r.section_name]
      );

      if (nextSection.length > 0) {
        // Prevent double enrollment check
        const [exists] = await connection.query(
            `SELECT id FROM enrollments WHERE student_id=? AND academic_year_id=? AND terms_id=?`,
            [r.student_id, next_academic_year_id, next_term_id]
        );

        if (exists.length === 0) {
            await connection.query(`
              INSERT INTO enrollments (student_id, academic_year_id, terms_id, sections_id, status)
              VALUES (?, ?, ?, ?, 'active')
            `, [r.student_id, next_academic_year_id, next_term_id, nextSection[0].id]);
        }
      }
    }

    // 4. Commit all changes if everything passed
    await connection.commit();
    res.json({ message: 'Promotion completed successfully' });

  } catch (err) {
    // 5. If ANY error occurs, undo EVERYTHING
    await connection.rollback();
    console.error("Promotion Error:", err);
    res.status(500).json({ message: "Database Error: " + err.message });
  } finally {
    // 6. ALWAYS release the connection back to the pool
    connection.release();
  }
};