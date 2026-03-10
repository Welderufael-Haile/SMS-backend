// backend/controllers/teacherAttendanceController.js
const pool = require('../config/db');

// Helper to check if enrollment is active
const checkEnrollmentActive = async (enrollmentId) => {
  const [[enrollment]] = await pool.query(
    `SELECT status FROM enrollments WHERE id = ?`,
    [enrollmentId]
  );
  return enrollment?.status === 'active';
};

// Get students for attendance marking (teacher's assigned sections)
exports.getStudentsForAttendance = async (req, res) => {
  const userId = req.user?.id;
  const { section_id, term_id, date } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Build query to get students from teacher's assigned sections
    let query = `
      SELECT DISTINCT
        e.id AS enrollment_id,
        s.id AS student_id,
        s.full_name,
        s.Sex AS gender,
        CONCAT(sec.grade_level, sec.name) AS section,
        ay.year_name,
        t.term_name,
        t.id AS term_id,
        sec.id AS section_id,
        -- Check if attendance already marked for this date
        (
          SELECT status FROM attendance a 
          WHERE a.enrollment_id = e.id AND a.date = ?
        ) AS attendance_status,
        (
          SELECT id FROM attendance a 
          WHERE a.enrollment_id = e.id AND a.date = ?
        ) AS attendance_id
      FROM enrollments e
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.academic_year_id = ay.id AND
        tss.is_active = 1
      WHERE tss.teacher_id = ? 
        AND e.status = 'active'
    `;

    const params = [date || new Date().toISOString().split('T')[0], 
                    date || new Date().toISOString().split('T')[0], 
                    teacher.id];

    if (section_id) {
      query += ` AND sec.id = ?`;
      params.push(section_id);
    }

    if (term_id) {
      query += ` AND e.terms_id = ?`;
      params.push(term_id);
    }

    query += ` ORDER BY s.full_name ASC`;

    const [students] = await pool.query(query, params);

    res.json({
      date: date || new Date().toISOString().split('T')[0],
      students: students.map(s => ({
        ...s,
        attendance_status: s.attendance_status || 'unmarked',
        attendance_id: s.attendance_id || null
      }))
    });

  } catch (err) {
    console.error("Error fetching students for attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark attendance for multiple students
exports.markAttendance = async (req, res) => {
  const userId = req.user.id;
  const { date, attendance } = req.body; // attendance array of {enrollment_id, status, remarks}

  if (!date || !attendance || !Array.isArray(attendance)) {
    return res.status(400).json({ error: "Invalid request format" });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get teacher ID
    const [[teacher]] = await connection.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ error: "Teacher not found" });
    }

    const results = {
      total: attendance.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const item of attendance) {
      try {
        const { enrollment_id, status, remarks } = item;

        // Validate status
        if (!['present', 'absent', 'late', 'excused'].includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }

        // Check if enrollment is active
        const isActive = await checkEnrollmentActive(enrollment_id);
        if (!isActive) {
          throw new Error("Cannot mark attendance for inactive enrollment");
        }

        // Verify teacher has access to this enrollment
        const [[access]] = await connection.query(`
          SELECT e.id 
          FROM enrollments e
          JOIN teacher_section_subjects tss ON
            tss.section_id = e.sections_id AND
            tss.academic_year_id = e.academic_year_id
          WHERE e.id = ? AND tss.teacher_id = ? AND tss.is_active = 1
          LIMIT 1
        `, [enrollment_id, teacher.id]);

        if (!access) {
          throw new Error("Unauthorized: You don't have access to this student");
        }

        // Check if attendance already exists for this date
        const [existing] = await connection.query(
          `SELECT id FROM attendance WHERE enrollment_id = ? AND date = ?`,
          [enrollment_id, date]
        );

        if (existing.length > 0) {
          // Update existing attendance
          await connection.query(
            `UPDATE attendance 
             SET status = ?, remarks = ?, marked_by = ?
             WHERE id = ?`,
            [status, remarks || null, teacher.id, existing[0].id]
          );
        } else {
          // Insert new attendance
          await connection.query(
            `INSERT INTO attendance (enrollment_id, date, status, remarks, marked_by)
             VALUES (?, ?, ?, ?, ?)`,
            [enrollment_id, date, status, remarks || null, teacher.id]
          );
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          enrollment_id: item.enrollment_id,
          error: err.message
        });
      }
    }

    await connection.commit();
    connection.release();

    const statusCode = results.failed === 0 ? 200 : 207;
    res.status(statusCode).json({
      message: results.failed === 0 ? "Attendance marked successfully" : "Partial success",
      results
    });

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error marking attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get teacher's assigned sections for dropdown
exports.getTeacherSections = async (req, res) => {
  const userId = req.user?.id;
  const { academic_year_id } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    let query = `
      SELECT DISTINCT
        sec.id,
        sec.name,
        sec.grade_level,
        CONCAT(sec.grade_level, sec.name) AS display_name,
        ay.id AS academic_year_id,
        ay.year_name
      FROM teacher_section_subjects tss
      JOIN sections sec ON tss.section_id = sec.id
      JOIN academic_year ay ON tss.academic_year_id = ay.id
      WHERE tss.teacher_id = ? AND tss.is_active = 1
    `;

    const params = [teacher.id];

    if (academic_year_id) {
      query += ` AND tss.academic_year_id = ?`;
      params.push(academic_year_id);
    }

    query += ` ORDER BY sec.grade_level, sec.name`;

    const [sections] = await pool.query(query, params);
    res.json(sections);

  } catch (err) {
    console.error("Error fetching teacher sections:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get teacher's assigned terms (from their sections)
exports.getTeacherTerms = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [terms] = await pool.query(`
      SELECT DISTINCT
        t.id,
        t.term_name,
        ay.year_name,
        ay.id AS academic_year_id,
        CONCAT(t.term_name, ' (', ay.year_name, ')') AS display_name
      FROM teacher_section_subjects tss
      JOIN academic_year ay ON tss.academic_year_id = ay.id
      JOIN terms t ON ay.id = t.academic_year_id
      WHERE tss.teacher_id = ? AND tss.is_active = 1
      ORDER BY ay.year_name DESC, t.id
    `, [teacher.id]);

    res.json(terms);

  } catch (err) {
    console.error("Error fetching teacher terms:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get attendance history for a specific student
exports.getStudentAttendanceHistory = async (req, res) => {
  const userId = req.user?.id;
  const { student_id, term_id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify teacher has access to this student
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [[access]] = await pool.query(`
      SELECT e.id
      FROM enrollments e
      JOIN teacher_section_subjects tss ON
        tss.section_id = e.sections_id AND
        tss.academic_year_id = e.academic_year_id
      WHERE e.student_id = ? AND tss.teacher_id = ? AND tss.is_active = 1
      LIMIT 1
    `, [student_id, teacher.id]);

    if (!access) {
      return res.status(403).json({ error: "Unauthorized: You don't have access to this student" });
    }

    // Get attendance history
    let query = `
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name,
        t.term_name,
        ay.year_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
    `;

    const params = [student_id];

    if (term_id) {
      query += ` AND e.terms_id = ?`;
      params.push(term_id);
    }

    query += ` ORDER BY a.date DESC`;

    const [history] = await pool.query(query, params);

    // Calculate statistics
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ?
    `, [student_id]);

    const total = stats[0].total_days || 0;
    const percentage = total > 0 ? ((stats[0].present / total) * 100).toFixed(2) : 0;

    res.json({
      history,
      statistics: {
        ...stats[0],
        percentage
      }
    });

  } catch (err) {
    console.error("Error fetching attendance history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get today's attendance summary for teacher's sections
exports.getTodaySummary = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const today = new Date().toISOString().split('T')[0];

    const [summary] = await pool.query(`
      SELECT 
        CONCAT(sec.grade_level, sec.name) AS section,
        COUNT(DISTINCT e.id) AS total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) AS excused,
        SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) AS not_marked
      FROM enrollments e
      JOIN sections sec ON e.sections_id = sec.id
      JOIN teacher_section_subjects tss ON
        tss.section_id = sec.id AND
        tss.academic_year_id = e.academic_year_id
      LEFT JOIN attendance a ON 
        a.enrollment_id = e.id AND 
        a.date = ?
      WHERE tss.teacher_id = ? AND e.status = 'active'
      GROUP BY sec.id
    `, [today, teacher.id]);

    res.json({
      date: today,
      sections: summary
    });

  } catch (err) {
    console.error("Error fetching today's summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get attendance history for a specific student
exports.getStudentAttendanceHistory = async (req, res) => {
  const userId = req.user?.id;
  const { student_id, term_id } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Verify teacher has access to this student
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [[access]] = await pool.query(`
      SELECT e.id
      FROM enrollments e
      JOIN teacher_section_subjects tss ON
        tss.section_id = e.sections_id AND
        tss.academic_year_id = e.academic_year_id
      WHERE e.student_id = ? AND tss.teacher_id = ? AND tss.is_active = 1
      LIMIT 1
    `, [student_id, teacher.id]);

    if (!access) {
      return res.status(403).json({ error: "Unauthorized: You don't have access to this student" });
    }

    // Get attendance history
    let query = `
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name,
        t.term_name,
        ay.year_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      WHERE e.student_id = ?
    `;

    const params = [student_id];

    if (term_id) {
      query += ` AND e.terms_id = ?`;
      params.push(term_id);
    }

    query += ` ORDER BY a.date DESC`;

    const [history] = await pool.query(query, params);

    // Calculate statistics - FIXED: Specify which table's status column
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.student_id = ?
    `, [student_id]);

    const total = stats[0].total_days || 0;
    const percentage = total > 0 ? ((stats[0].present / total) * 100).toFixed(2) : 0;

    res.json({
      history,
      statistics: {
        ...stats[0],
        percentage
      }
    });

  } catch (err) {
    console.error("Error fetching attendance history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// =============================================
// NEW REPORT FUNCTIONS
// =============================================

// Get daily attendance report for a specific month
exports.getDailyReport = async (req, res) => {
  const userId = req.user?.id;
  const { section_id, term_id, month, year } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Verify teacher has access to this section
    const [[access]] = await pool.query(`
      SELECT id FROM teacher_section_subjects 
      WHERE teacher_id = ? AND section_id = ? AND academic_year_id = (
        SELECT academic_year_id FROM terms WHERE id = ?
      ) AND is_active = 1
      LIMIT 1
    `, [teacher.id, section_id, term_id]);

    if (!access) {
      return res.status(403).json({ error: "Unauthorized access to this section" });
    }

    // Get daily attendance data for the month
    const [dailyData] = await pool.query(`
      SELECT 
        a.date,
        DAYNAME(a.date) as day,
        COUNT(DISTINCT a.enrollment_id) as total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present_percentage
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.sections_id = ? 
        AND e.terms_id = ?
        AND MONTH(a.date) = ?
        AND YEAR(a.date) = ?
      GROUP BY a.date
      ORDER BY a.date
    `, [section_id, term_id, month, year]);

    // Get total students in section
    const [[totalStudents]] = await pool.query(`
      SELECT COUNT(DISTINCT e.student_id) as total
      FROM enrollments e
      WHERE e.sections_id = ? AND e.terms_id = ? AND e.status = 'active'
    `, [section_id, term_id]);

    // Calculate monthly average
    const monthlyAverage = dailyData.length > 0 
      ? (dailyData.reduce((sum, day) => sum + day.present_percentage, 0) / dailyData.length).toFixed(2)
      : 0;

    res.json({
      summary: {
        totalStudents: totalStudents.total,
        totalDays: dailyData.length,
        average: monthlyAverage,
        totalPresent: dailyData.reduce((sum, day) => sum + day.present_count, 0),
        totalAbsent: dailyData.reduce((sum, day) => sum + day.absent_count, 0),
        totalLate: dailyData.reduce((sum, day) => sum + day.late_count, 0)
      },
      chartData: dailyData.map(day => ({
        date: day.date,
        day: day.day,
        present: day.present_percentage,
        presentCount: day.present_count,
        absentCount: day.absent_count,
        lateCount: day.late_count,
        excusedCount: day.excused_count,
        total: day.total_students
      }))
    });

  } catch (err) {
    console.error("Error fetching daily report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get monthly attendance report for a year
// exports.getMonthlyReport = async (req, res) => {
//   const userId = req.user?.id;
//   const { section_id, term_id, year } = req.query;

//   if (!userId) return res.status(401).json({ error: "Unauthorized" });

//   try {
//     const [[teacher]] = await pool.query(
//       'SELECT id FROM teachers WHERE user_id = ?',
//       [userId]
//     );
//     if (!teacher) return res.status(404).json({ error: "Teacher not found" });

//     const [[access]] = await pool.query(`
//       SELECT id FROM teacher_section_subjects 
//       WHERE teacher_id = ? AND section_id = ? AND academic_year_id = (
//         SELECT academic_year_id FROM terms WHERE id = ?
//       ) AND is_active = 1
//       LIMIT 1
//     `, [teacher.id, section_id, term_id]);

//     if (!access) {
//       return res.status(403).json({ error: "Unauthorized access to this section" });
//     }

//     // Get monthly aggregated data
//     const [monthlyData] = await pool.query(`
//       SELECT 
//         MONTH(a.date) as month_num,
//         DATE_FORMAT(a.date, '%M') as month,
//         COUNT(DISTINCT a.enrollment_id) as total_students,
//         COUNT(DISTINCT a.date) as total_days,
//         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
//         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
//         SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
//         SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
//         ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present_percentage
//       FROM attendance a
//       JOIN enrollments e ON a.enrollment_id = e.id
//       WHERE e.sections_id = ? 
//         AND e.terms_id = ?
//         AND YEAR(a.date) = ?
//       GROUP BY MONTH(a.date)
//       ORDER BY month_num
//     `, [section_id, term_id, year]);

//     const months = [
//       "January", "February", "March", "April", "May", "June",
//       "July", "August", "September", "October", "November", "December"
//     ];

//     // Ensure all months are represented
//     const completeData = months.map((month, index) => {
//       const found = monthlyData.find(m => m.month_num === index + 1);
//       return found || {
//         month_num: index + 1,
//         month: month,
//         total_students: 0,
//         total_days: 0,
//         present_count: 0,
//         absent_count: 0,
//         late_count: 0,
//         excused_count: 0,
//         present_percentage: 0
//       };
//     });

//     const totalDays = completeData.reduce((sum, m) => sum + m.total_days, 0);
//     const yearAverage = completeData.length > 0 
//       ? (completeData.reduce((sum, m) => sum + m.present_percentage, 0) / completeData.filter(m => m.total_days > 0).length).toFixed(2)
//       : 0;

//     res.json({
//       summary: {
//         totalDays,
//         average: yearAverage,
//         activeMonths: completeData.filter(m => m.total_days > 0).length
//       },
//       chartData: completeData.map(m => ({
//         month: m.month.substring(0, 3),
//         fullMonth: m.month,
//         present: m.present_percentage,
//         presentCount: m.present_count,
//         absentCount: m.absent_count,
//         lateCount: m.late_count,
//         excusedCount: m.excused_count,
//         totalDays: m.total_days,
//         totalStudents: m.total_students
//       }))
//     });

//   } catch (err) {
//     console.error("Error fetching monthly report:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// Get monthly attendance report for a year - FIXED
exports.getMonthlyReport = async (req, res) => {
  const userId = req.user?.id;
  const { section_id, term_id, year } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const [[access]] = await pool.query(`
      SELECT id FROM teacher_section_subjects 
      WHERE teacher_id = ? AND section_id = ? AND academic_year_id = (
        SELECT academic_year_id FROM terms WHERE id = ?
      ) AND is_active = 1
      LIMIT 1
    `, [teacher.id, section_id, term_id]);

    if (!access) {
      return res.status(403).json({ error: "Unauthorized access to this section" });
    }

    // FIXED: Use subquery or include all non-aggregated columns in GROUP BY
    const [monthlyData] = await pool.query(`
      SELECT 
        MONTH(a.date) as month_num,
        MAX(DATE_FORMAT(a.date, '%M')) as month,
        COUNT(DISTINCT a.enrollment_id) as total_students,
        COUNT(DISTINCT a.date) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present_percentage
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.sections_id = ? 
        AND e.terms_id = ?
        AND YEAR(a.date) = ?
      GROUP BY MONTH(a.date)
      ORDER BY month_num
    `, [section_id, term_id, year]);

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Ensure all months are represented
    const completeData = months.map((month, index) => {
      const found = monthlyData.find(m => m.month_num === index + 1);
      return found || {
        month_num: index + 1,
        month: month,
        total_students: 0,
        total_days: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0,
        present_percentage: 0
      };
    });

    const totalDays = completeData.reduce((sum, m) => sum + m.total_days, 0);
    const yearAverage = completeData.length > 0 
      ? (completeData.reduce((sum, m) => sum + m.present_percentage, 0) / completeData.filter(m => m.total_days > 0).length).toFixed(2)
      : 0;

    res.json({
      summary: {
        totalDays,
        average: yearAverage,
        activeMonths: completeData.filter(m => m.total_days > 0).length
      },
      chartData: completeData.map(m => ({
        month: m.month.substring(0, 3),
        fullMonth: m.month,
        present: m.present_percentage,
        presentCount: m.present_count,
        absentCount: m.absent_count,
        lateCount: m.late_count,
        excusedCount: m.excused_count,
        totalDays: m.total_days,
        totalStudents: m.total_students
      }))
    });

  } catch (err) {
    console.error("Error fetching monthly report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Get yearly attendance report (term comparison)
exports.getYearlyReport = async (req, res) => {
  const userId = req.user?.id;
  const { section_id } = req.query;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Get all terms this teacher has access to for this section
    const [terms] = await pool.query(`
      SELECT DISTINCT t.id, t.term_name, ay.year_name
      FROM teacher_section_subjects tss
      JOIN academic_year ay ON tss.academic_year_id = ay.id
      JOIN terms t ON ay.id = t.academic_year_id
      WHERE tss.teacher_id = ? AND tss.section_id = ? AND tss.is_active = 1
      ORDER BY ay.year_name DESC, t.id
    `, [teacher.id, section_id]);

    if (terms.length === 0) {
      return res.json({
        summary: { totalTerms: 0, average: 0 },
        chartData: []
      });
    }

    const termData = [];
    for (const term of terms) {
      const [data] = await pool.query(`
        SELECT 
          COUNT(DISTINCT a.date) as total_days,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
          ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present_percentage
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        WHERE e.sections_id = ? AND e.terms_id = ?
      `, [section_id, term.id]);

      if (data[0].total_days > 0) {
        termData.push({
          term_id: term.id,
          term: term.term_name,
          year: term.year_name,
          totalDays: data[0].total_days,
          presentCount: data[0].present_count || 0,
          absentCount: data[0].absent_count || 0,
          lateCount: data[0].late_count || 0,
          excusedCount: data[0].excused_count || 0,
          present: data[0].present_percentage || 0
        });
      }
    }

    const totalTerms = termData.length;
    const overallAverage = totalTerms > 0 
      ? (termData.reduce((sum, t) => sum + t.present, 0) / totalTerms).toFixed(2)
      : 0;

    res.json({
      summary: {
        totalTerms,
        average: overallAverage
      },
      chartData: termData
    });

  } catch (err) {
    console.error("Error fetching yearly report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export reports (Excel/PDF)
exports.exportReport = async (req, res) => {
  const { type, format } = req.params;
  const { section_id, term_id, month, year } = req.query;
  const userId = req.user?.id;

  try {
    // Get teacher ID
    const [[teacher]] = await pool.query(
      'SELECT id FROM teachers WHERE user_id = ?',
      [userId]
    );
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Get section info
    const [[section]] = await pool.query(`
      SELECT CONCAT(grade_level, name) as section_name
      FROM sections WHERE id = ?
    `, [section_id]);

    // Get data based on report type
    let data = [];
    let filename = '';

    if (type === 'daily') {
      const [rows] = await pool.query(`
        SELECT 
          a.date,
          DAYNAME(a.date) as day,
          s.full_name,
          s.Sex,
          a.status,
          a.remarks
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        JOIN Student s ON e.student_id = s.id
        WHERE e.sections_id = ? AND e.terms_id = ?
          AND MONTH(a.date) = ? AND YEAR(a.date) = ?
        ORDER BY a.date, s.full_name
      `, [section_id, term_id, month, year]);
      data = rows;
      filename = `daily_attendance_${section.section_name}_${month}_${year}`;
    } 
    else if (type === 'monthly') {
      const [rows] = await pool.query(`
        SELECT 
          DATE_FORMAT(a.date, '%M') as month,
          s.full_name,
          s.Sex,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
          COUNT(*) as total,
          ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as percentage
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        JOIN Student s ON e.student_id = s.id
        WHERE e.sections_id = ? AND e.terms_id = ? AND YEAR(a.date) = ?
        GROUP BY MONTH(a.date), s.id
        ORDER BY MONTH(a.date), s.full_name
      `, [section_id, term_id, year]);
      data = rows;
      filename = `monthly_attendance_${section.section_name}_${year}`;
    }
    else if (type === 'yearly') {
      const [rows] = await pool.query(`
        SELECT 
          t.term_name,
          ay.year_name,
          s.full_name,
          s.Sex,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
          COUNT(*) as total,
          ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as percentage
        FROM attendance a
        JOIN enrollments e ON a.enrollment_id = e.id
        JOIN Student s ON e.student_id = s.id
        JOIN terms t ON e.terms_id = t.id
        JOIN academic_year ay ON e.academic_year_id = ay.id
        WHERE e.sections_id = ?
        GROUP BY e.terms_id, s.id
        ORDER BY ay.year_name DESC, t.id, s.full_name
      `, [section_id]);
      data = rows;
      filename = `yearly_attendance_${section.section_name}`;
    }

    if (format === 'excel') {
      // Generate Excel
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      res.send(buffer);
    } 
    else if (format === 'pdf') {
      // Generate PDF
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);

      doc.pipe(res);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text(`${type.charAt(0).toUpperCase() + type.slice(1)} Attendance Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Section: ${section.section_name}`, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Table
      const tableTop = doc.y;
      const itemsPerPage = 25;
      let currentItem = 0;

      const drawTable = () => {
        // Headers
        doc.fontSize(8).font('Helvetica-Bold');
        
        const headers = type === 'daily' 
          ? ['Date', 'Student', 'Status', 'Remarks']
          : ['Student', 'Present', 'Absent', 'Late', 'Excused', 'Total', '%'];

        let xPos = 50;
        headers.forEach(header => {
          doc.text(header, xPos, doc.y);
          xPos += 100;
        });
        doc.moveDown();

        // Rows
        doc.fontSize(8).font('Helvetica');
        for (let i = currentItem; i < Math.min(currentItem + itemsPerPage, data.length); i++) {
          const row = data[i];
          xPos = 50;
          
          if (type === 'daily') {
            doc.text(new Date(row.date).toLocaleDateString(), xPos, doc.y); xPos += 100;
            doc.text(row.full_name.substring(0, 20), xPos, doc.y); xPos += 100;
            doc.text(row.status, xPos, doc.y); xPos += 100;
            doc.text(row.remarks || '-', xPos, doc.y);
          } else {
            doc.text(row.full_name.substring(0, 20), xPos, doc.y); xPos += 100;
            doc.text(row.present?.toString() || '0', xPos, doc.y); xPos += 50;
            doc.text(row.absent?.toString() || '0', xPos, doc.y); xPos += 50;
            doc.text(row.late?.toString() || '0', xPos, doc.y); xPos += 50;
            doc.text(row.excused?.toString() || '0', xPos, doc.y); xPos += 50;
            doc.text(row.total?.toString() || '0', xPos, doc.y); xPos += 50;
            doc.text(`${row.percentage || 0}%`, xPos, doc.y);
          }
          doc.moveDown();
        }

        currentItem += itemsPerPage;
        if (currentItem < data.length) {
          doc.addPage();
          drawTable();
        }
      };

      drawTable();
      doc.end();
    }

  } catch (err) {
    console.error("Error exporting report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};