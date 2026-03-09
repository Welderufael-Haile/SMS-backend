// controllers/adminAttendanceController.js
const pool = require('../config/db');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

// Get main dashboard data
exports.getAttendanceDashboard = async (req, res) => {
  const { year_id, term_id, section_id, start_date, end_date } = req.query;

  try {
    // Build base filters
    let filters = '';
    const params = [];

    if (year_id && year_id !== 'all') {
      filters += ' AND e.academic_year_id = ?';
      params.push(year_id);
    }

    if (term_id && term_id !== 'all') {
      filters += ' AND e.terms_id = ?';
      params.push(term_id);
    }

    if (section_id && section_id !== 'all') {
      filters += ' AND e.sections_id = ?';
      params.push(section_id);
    }

    // Overview statistics
    const [overview] = await pool.query(`
      SELECT 
        COUNT(DISTINCT e.student_id) as totalStudents,
        ROUND(AVG(asum.percentage), 2) as avgAttendance,
        SUM(asum.total_present) as totalPresent,
        SUM(asum.total_absent) as totalAbsent,
        SUM(asum.total_late) as totalLate,
        SUM(asum.total_excused) as totalExcused,
        SUM(CASE WHEN s.Sex = 'M' THEN 1 ELSE 0 END) as maleStudents,
        SUM(CASE WHEN s.Sex = 'F' THEN 1 ELSE 0 END) as femaleStudents
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      WHERE 1=1 ${filters}
    `, params);

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const [todayStats] = await pool.query(`
      SELECT 
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as todayPresent,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as todayAbsent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as todayLate,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as todayExcused
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE a.date = ? ${filters}
    `, [today, ...params]);

    // Daily trend
    const [dailyTrend] = await pool.query(`
      SELECT 
        a.date,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present,
        ROUND(AVG(CASE WHEN a.status = 'absent' THEN 100 ELSE 0 END), 2) as absent,
        ROUND(AVG(CASE WHEN a.status = 'late' THEN 100 ELSE 0 END), 2) as late
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE a.date BETWEEN ? AND ? ${filters}
      GROUP BY a.date
      ORDER BY a.date
      LIMIT 30
    `, [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0], ...params]);

    // Section statistics
    const [sectionStats] = await pool.query(`
      SELECT 
        CONCAT(sec.grade_level, sec.name) as name,
        ROUND(AVG(asum.percentage), 2) as percentage,
        SUM(asum.total_present) as present,
        SUM(asum.total_absent) as absent,
        SUM(asum.total_late) as late
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE 1=1 ${filters}
      GROUP BY sec.id
      ORDER BY percentage DESC
    `, params);

    // Grade statistics
    const [gradeStats] = await pool.query(`
      SELECT 
        sec.grade_level as grade,
        ROUND(AVG(asum.percentage), 2) as percentage,
        COUNT(DISTINCT e.student_id) as studentCount
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE 1=1 ${filters}
      GROUP BY sec.grade_level
      ORDER BY sec.grade_level
    `, params);

    // Gender statistics
    const [genderStats] = await pool.query(`
      SELECT 
        CASE WHEN s.Sex = 'M' THEN 'Male' ELSE 'Female' END as name,
        COUNT(DISTINCT e.student_id) as value,
        CASE WHEN s.Sex = 'M' THEN '#3b82f6' ELSE '#ec4899' END as color
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      WHERE 1=1 ${filters}
      GROUP BY s.Sex
    `, params);

    // Top performers (≥90%)
    const [topPerformers] = await pool.query(`
      SELECT 
        s.full_name as name,
        CONCAT(sec.grade_level, sec.name) as section,
        ROUND(asum.percentage, 2) as percentage
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE asum.percentage >= 90 ${filters}
      ORDER BY asum.percentage DESC
      LIMIT 10
    `, params);

    // Low performers (<75%)
    const [lowPerformers] = await pool.query(`
      SELECT 
        s.full_name as name,
        CONCAT(sec.grade_level, sec.name) as section,
        ROUND(asum.percentage, 2) as percentage
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE asum.percentage < 75 ${filters}
      ORDER BY asum.percentage ASC
      LIMIT 10
    `, params);

    // Generate weekly trend (last 7 days)
    const [weeklyTrend] = await pool.query(`
      SELECT 
        DAYNAME(a.date) as day,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present,
        ROUND(AVG(CASE WHEN a.status = 'absent' THEN 100 ELSE 0 END), 2) as absent,
        ROUND(AVG(CASE WHEN a.status = 'late' THEN 100 ELSE 0 END), 2) as late
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ${filters}
      GROUP BY DAYNAME(a.date), DAYOFWEEK(a.date)
      ORDER BY DAYOFWEEK(a.date)
    `, params);

    // Monthly trend
    const [monthlyTrend] = await pool.query(`
      SELECT 
        DATE_FORMAT(a.date, '%Y-%m') as month,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present,
        ROUND(AVG(CASE WHEN a.status = 'absent' THEN 100 ELSE 0 END), 2) as absent,
        ROUND(AVG(CASE WHEN a.status = 'late' THEN 100 ELSE 0 END), 2) as late
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) ${filters}
      GROUP BY DATE_FORMAT(a.date, '%Y-%m')
      ORDER BY month
    `, params);

    // Term comparison
    const [termComparison] = await pool.query(`
      SELECT 
        t.term_name as term,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present,
        ROUND(AVG(CASE WHEN a.status = 'absent' THEN 100 ELSE 0 END), 2) as absent,
        ROUND(AVG(CASE WHEN a.status = 'late' THEN 100 ELSE 0 END), 2) as late
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN terms t ON e.terms_id = t.id
      WHERE 1=1 ${filters}
      GROUP BY t.id, t.term_name
      ORDER BY t.id
    `, params);

    res.json({
      overview: { ...overview[0], ...todayStats[0] },
      dailyTrend,
      weeklyTrend,
      monthlyTrend,
      sectionStats,
      gradeStats,
      genderStats,
      topPerformers,
      lowPerformers,
      termComparison
    });

  } catch (err) {
    console.error("Error fetching admin attendance dashboard:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export attendance report
exports.exportAttendanceReport = async (req, res) => {
  const { format } = req.params;
  const { year_id, term_id, section_id, start_date, end_date } = req.query;

  try {
    let filters = '';
    const params = [];

    if (year_id && year_id !== 'all') {
      filters += ' AND e.academic_year_id = ?';
      params.push(year_id);
    }

    if (term_id && term_id !== 'all') {
      filters += ' AND e.terms_id = ?';
      params.push(term_id);
    }

    if (section_id && section_id !== 'all') {
      filters += ' AND e.sections_id = ?';
      params.push(section_id);
    }

    const [data] = await pool.query(`
      SELECT 
        s.full_name,
        s.Sex,
        CONCAT(sec.grade_level, sec.name) as section,
        ay.year_name,
        t.term_name,
        asum.total_days,
        asum.total_present,
        asum.total_absent,
        asum.total_late,
        asum.total_excused,
        asum.percentage
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      WHERE 1=1 ${filters}
      ORDER BY sec.grade_level, sec.name, s.full_name
    `, params);

    if (format === 'excel') {
      // Generate Excel
      const excelData = data.map(row => ({
        'Student Name': row.full_name,
        'Gender': row.Sex === 'M' ? 'Male' : 'Female',
        'Section': row.section,
        'Year': row.year_name,
        'Term': row.term_name,
        'Total Days': row.total_days,
        'Present': row.total_present,
        'Absent': row.total_absent,
        'Late': row.total_late,
        'Excused': row.total_excused,
        'Attendance %': row.percentage
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } else if (format === 'pdf') {
      // Generate PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      const totalStudents = data.length;
      const avgAttendance = (data.reduce((sum, row) => sum + row.percentage, 0) / totalStudents).toFixed(2);
      
      doc.fontSize(12).font('Helvetica-Bold').text('Summary Statistics');
      doc.fontSize(10).font('Helvetica')
        .text(`Total Students: ${totalStudents}`)
        .text(`Average Attendance: ${avgAttendance}%`);
      doc.moveDown(2);

      // Table
      const tableTop = doc.y;
      const itemsPerPage = 20;
      let currentItem = 0;

      const drawTable = () => {
        // Headers
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Name', 50, doc.y);
        doc.text('Section', 200, doc.y);
        doc.text('Present', 300, doc.y);
        doc.text('Absent', 350, doc.y);
        doc.text('Late', 400, doc.y);
        doc.text('Total', 450, doc.y);
        doc.text('%', 500, doc.y);
        doc.moveDown();

        // Rows
        doc.fontSize(8).font('Helvetica');
        for (let i = currentItem; i < Math.min(currentItem + itemsPerPage, data.length); i++) {
          const row = data[i];
          doc.text(row.full_name.substring(0, 20), 50, doc.y);
          doc.text(row.section, 200, doc.y);
          doc.text(row.total_present.toString(), 300, doc.y);
          doc.text(row.total_absent.toString(), 350, doc.y);
          doc.text(row.total_late.toString(), 400, doc.y);
          doc.text(row.total_days.toString(), 450, doc.y);
          doc.text(`${row.percentage}%`, 500, doc.y);
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
    console.error("Error exporting attendance report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get grade trends
exports.getGradeTrends = async (req, res) => {
  const { year_id } = req.query;

  try {
    const [trends] = await pool.query(`
      SELECT 
        sec.grade_level,
        ROUND(AVG(asum.percentage), 2) as avg_percentage,
        SUM(asum.total_present) as total_present,
        SUM(asum.total_absent) as total_absent,
        COUNT(DISTINCT e.student_id) as student_count
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE e.academic_year_id = ? OR ? IS NULL
      GROUP BY sec.grade_level
      ORDER BY sec.grade_level
    `, [year_id || null, year_id || null]);

    res.json(trends);
  } catch (err) {
    console.error("Error fetching grade trends:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get section trends
exports.getSectionTrends = async (req, res) => {
  const { section_id } = req.params;
  const { term_id } = req.query;

  try {
    const [trends] = await pool.query(`
      SELECT 
        a.date,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as present_rate,
        COUNT(DISTINCT e.student_id) as present_count
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      WHERE e.sections_id = ? AND (e.terms_id = ? OR ? IS NULL)
      GROUP BY a.date
      ORDER BY a.date DESC
      LIMIT 30
    `, [section_id, term_id || null, term_id || null]);

    res.json(trends);
  } catch (err) {
    console.error("Error fetching section trends:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all student attendance details
exports.getStudentAttendanceDetails = async (req, res) => {
  const { page = 1, limit = 20, search, section_id, grade_level } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT 
        s.id,
        s.full_name,
        s.Sex,
        CONCAT(sec.grade_level, sec.name) as section,
        ay.year_name,
        t.term_name,
        asum.total_days,
        asum.total_present,
        asum.total_absent,
        asum.total_late,
        asum.total_excused,
        asum.percentage
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND s.full_name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (section_id) {
      query += ` AND sec.id = ?`;
      params.push(section_id);
    }

    if (grade_level) {
      query += ` AND sec.grade_level = ?`;
      params.push(grade_level);
    }

    const [total] = await pool.query(`SELECT COUNT(*) as count FROM (${query}) as t`, params);
    const [students] = await pool.query(`${query} ORDER BY s.full_name LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    res.json({
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total[0].count / limit),
        totalItems: total[0].count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    console.error("Error fetching student attendance details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get single student attendance history
exports.getStudentAttendanceHistory = async (req, res) => {
  const { student_id } = req.params;

  try {
    const [history] = await pool.query(`
      SELECT 
        a.*,
        DATE_FORMAT(a.date, '%Y-%m-%d') as formatted_date,
        DAYNAME(a.date) as day_name,
        CONCAT(sec.grade_level, sec.name) as section,
        ay.year_name,
        t.term_name
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      WHERE e.student_id = ?
      ORDER BY a.date DESC
    `, [student_id]);

    res.json(history);
  } catch (err) {
    console.error("Error fetching student attendance history:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get daily summary
exports.getDailySummary = async (req, res) => {
  const { date } = req.params;

  try {
    const [summary] = await pool.query(`
      SELECT 
        DATE_FORMAT(a.date, '%Y-%m-%d') as date,
        COUNT(DISTINCT a.enrollment_id) as total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      WHERE a.date = ? OR ? IS NULL
      GROUP BY a.date
    `, [date || new Date().toISOString().split('T')[0], date || null]);

    res.json(summary[0] || {
      date: date || new Date().toISOString().split('T')[0],
      total_students: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    });
  } catch (err) {
    console.error("Error fetching daily summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get daily summary by date
exports.getDailySummaryByDate = async (req, res) => {
  const { date } = req.params;

  try {
    const [summary] = await pool.query(`
      SELECT 
        DATE_FORMAT(a.date, '%Y-%m-%d') as date,
        COUNT(DISTINCT a.enrollment_id) as total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
        GROUP_CONCAT(DISTINCT CONCAT(sec.grade_level, sec.name)) as sections
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE a.date = ?
      GROUP BY a.date
    `, [date]);

    const [sectionBreakdown] = await pool.query(`
      SELECT 
        CONCAT(sec.grade_level, sec.name) as section,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance a
      JOIN enrollments e ON a.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE a.date = ?
      GROUP BY sec.id
    `, [date]);

    res.json({
      summary: summary[0] || { date, total_students: 0, present: 0, absent: 0, late: 0, excused: 0 },
      sectionBreakdown
    });
  } catch (err) {
    console.error("Error fetching daily summary by date:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get monthly summary
exports.getMonthlySummary = async (req, res) => {
  const { year, month } = req.query;

  try {
    const [summary] = await pool.query(`
      SELECT 
        DATE_FORMAT(a.date, '%Y-%m') as month,
        COUNT(DISTINCT a.enrollment_id) as total_students,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
        ROUND(AVG(CASE WHEN a.status = 'present' THEN 100 ELSE 0 END), 2) as attendance_rate
      FROM attendance a
      WHERE YEAR(a.date) = ? AND MONTH(a.date) = ?
      GROUP BY DATE_FORMAT(a.date, '%Y-%m')
    `, [year || new Date().getFullYear(), month || new Date().getMonth() + 1]);

    res.json(summary[0] || {
      month: `${year || new Date().getFullYear()}-${month || new Date().getMonth() + 1}`,
      total_students: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendance_rate: 0
    });
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get term summary
exports.getTermSummary = async (req, res) => {
  const { term_id } = req.params;

  try {
    const [summary] = await pool.query(`
      SELECT 
        t.term_name,
        ay.year_name,
        COUNT(DISTINCT e.student_id) as total_students,
        SUM(asum.total_present) as total_present,
        SUM(asum.total_absent) as total_absent,
        SUM(asum.total_late) as total_late,
        SUM(asum.total_excused) as total_excused,
        ROUND(AVG(asum.percentage), 2) as avg_percentage
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN terms t ON e.terms_id = t.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      WHERE e.terms_id = ?
      GROUP BY t.id, ay.id
    `, [term_id]);

    const [sectionBreakdown] = await pool.query(`
      SELECT 
        CONCAT(sec.grade_level, sec.name) as section,
        COUNT(DISTINCT e.student_id) as students,
        ROUND(AVG(asum.percentage), 2) as avg_percentage
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE e.terms_id = ?
      GROUP BY sec.id
      ORDER BY sec.grade_level, sec.name
    `, [term_id]);

    res.json({
      summary: summary[0] || {},
      sectionBreakdown
    });
  } catch (err) {
    console.error("Error fetching term summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get at-risk students (below threshold)
exports.getAtRiskStudents = async (req, res) => {
  const { threshold = 75, limit = 20 } = req.query;

  try {
    const [students] = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.Sex,
        CONCAT(sec.grade_level, sec.name) as section,
        asum.total_days,
        asum.total_present,
        asum.total_absent,
        asum.percentage,
        asum.percentage < ? as at_risk
      FROM attendance_summary asum
      JOIN enrollments e ON asum.enrollment_id = e.id
      JOIN Student s ON e.student_id = s.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE asum.percentage < ?
      ORDER BY asum.percentage ASC
      LIMIT ?
    `, [threshold, threshold, parseInt(limit)]);

    res.json(students);
  } catch (err) {
    console.error("Error fetching at-risk students:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Recalculate all attendance summaries
exports.recalculateAllSummaries = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get all enrollments
    const [enrollments] = await connection.query(`
      SELECT id FROM enrollments WHERE status = 'active'
    `);

    let updated = 0;
    for (const enrollment of enrollments) {
      // Calculate attendance for this enrollment
      const [records] = await connection.query(`
        SELECT status FROM attendance WHERE enrollment_id = ?
      `, [enrollment.id]);

      const total_days = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const excused = records.filter(r => r.status === 'excused').length;
      const percentage = total_days > 0 ? (present / total_days * 100) : 0;

      await connection.query(`
        INSERT INTO attendance_summary 
        (enrollment_id, total_present, total_absent, total_late, total_excused, total_days, percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        total_present = VALUES(total_present),
        total_absent = VALUES(total_absent),
        total_late = VALUES(total_late),
        total_excused = VALUES(total_excused),
        total_days = VALUES(total_days),
        percentage = VALUES(percentage)
      `, [enrollment.id, present, absent, late, excused, total_days, percentage]);

      updated++;
    }

    await connection.commit();
    connection.release();

    res.json({
      message: "All attendance summaries recalculated successfully",
      updated
    });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error recalculating summaries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Recalculate single attendance summary
exports.recalculateSummary = async (req, res) => {
  const { enrollment_id } = req.params;

  try {
    // Calculate attendance for this enrollment
    const [records] = await pool.query(`
      SELECT status FROM attendance WHERE enrollment_id = ?
    `, [enrollment_id]);

    const total_days = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const percentage = total_days > 0 ? (present / total_days * 100) : 0;

    await pool.query(`
      INSERT INTO attendance_summary 
      (enrollment_id, total_present, total_absent, total_late, total_excused, total_days, percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      total_present = VALUES(total_present),
      total_absent = VALUES(total_absent),
      total_late = VALUES(total_late),
      total_excused = VALUES(total_excused),
      total_days = VALUES(total_days),
      percentage = VALUES(percentage)
    `, [enrollment_id, present, absent, late, excused, total_days, percentage]);

    res.json({
      message: "Attendance summary recalculated successfully",
      enrollment_id,
      stats: { present, absent, late, excused, total_days, percentage: percentage.toFixed(2) }
    });
  } catch (err) {
    console.error("Error recalculating summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};