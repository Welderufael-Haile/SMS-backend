
// backend/controllers/studentController.js for student portal, dashboard, marks, report card, and filters
const pool = require('../config/db');


// Safe query executor with error handling
const safeQuery = async (query, params = [], errorMessage = "Database error") => {
  try {
    const [results] = await pool.query(query, params);
    return results;
  } catch (err) {
    console.error(`❌ Database error: ${err.message}`);
    console.error(`   Query: ${query}`);
    console.error(`   Params:`, params);
    throw err; // Re-throw for caller to handle
  }
};

// Validate pagination parameters
const validatePagination = (page, limit, defaultLimit = 10, maxLimit = 50) => {
  let pageNum = parseInt(page) || 1;
  let limitNum = parseInt(limit) || defaultLimit;
  
  // Sanity checks
  if (pageNum < 1) pageNum = 1;
  if (limitNum < 1) limitNum = defaultLimit;
  if (limitNum > maxLimit) limitNum = maxLimit; // Max limit
  
  const offset = (pageNum - 1) * limitNum;
  
  return { pageNum, limitNum, offset };
};

// Safe number parsing
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};


// Get student profile and dashboard stats
exports.getStudentDashboard = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("📊 Fetching student dashboard for user ID:", userId);

    // Get student ID from user ID
    const studentRows = await safeQuery(
      `SELECT s.id, s.full_name, s.Sex, s.Date_of_birth, 
        s.profile_photo, u.email
       FROM Student s
       JOIN Users u ON s.user_id = u.id
       WHERE u.id = ?`,
      [userId],
      "Failed to fetch student data"
    );

    if (!studentRows || studentRows.length === 0) {
      console.log("No student found for user ID:", userId);
      return res.status(404).json({ error: "Student not found. Please contact admin." });
    }

    const student = studentRows[0];
    console.log("Found student:", student.id);

    // Get current active enrollment
    const activeEnrollment = await safeQuery(
      `SELECT e.*, 
        ay.year_name, 
        t.term_name,
        sec.name AS section_name,
        sec.grade_level
       FROM enrollments e
       JOIN academic_year ay ON e.academic_year_id = ay.id
       JOIN terms t ON e.terms_id = t.id
       JOIN sections sec ON e.sections_id = sec.id
       WHERE e.student_id = ? AND e.status = 'active'
       LIMIT 1`,
      [student.id],
      "Failed to fetch enrollment"
    );

    // Get academic history with pagination
    const { pageNum, limitNum, offset } = validatePagination(
      req.query.history_page || 1,
      req.query.history_limit || 5,
      5,
      20
    );

    // Get total count for pagination
    const countRows = await safeQuery(
      `SELECT COUNT(*) as total
       FROM enrollments e
       WHERE e.student_id = ? AND e.status IN ('completed', 'promoted', 'repeated')`,
      [student.id],
      "Failed to count history"
    );

    const totalItems = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limitNum);

    // Get paginated academic history
    const academicHistory = await safeQuery(
      `SELECT 
        ay.year_name,
        t.term_name,
        sec.name AS section_name,
        sec.grade_level,
        e.status,
        e.final_average,
        e.completed_at,
        e.promotion_note
       FROM enrollments e
       JOIN academic_year ay ON e.academic_year_id = ay.id
       JOIN terms t ON e.terms_id = t.id
       JOIN sections sec ON e.sections_id = sec.id
       WHERE e.student_id = ? AND e.status IN ('completed', 'promoted', 'repeated')
       ORDER BY ay.year_name DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [student.id, limitNum, offset],
      "Failed to fetch academic history"
    );

    // Get overall statistics
    const statsRows = await safeQuery(
      `SELECT 
        COUNT(DISTINCT e.academic_year_id) as total_years,
        COUNT(DISTINCT e.id) as total_enrollments,
        AVG(e.final_average) as overall_average,
        SUM(CASE WHEN e.status = 'promoted' THEN 1 ELSE 0 END) as promotions,
        SUM(CASE WHEN e.status = 'repeated' THEN 1 ELSE 0 END) as repetitions
       FROM enrollments e
       WHERE e.student_id = ? AND e.final_average IS NOT NULL`,
      [student.id],
      "Failed to calculate statistics"
    );

    const stats = statsRows[0] || {
      total_years: 0,
      total_enrollments: 0,
      overall_average: 0,
      promotions: 0,
      repetitions: 0
    };

    // Safely parse numeric values
    stats.overall_average = safeParseFloat(stats.overall_average).toFixed(2);
    stats.promotions = parseInt(stats.promotions) || 0;
    stats.repetitions = parseInt(stats.repetitions) || 0;

    // Format academic history with safe number parsing
    const formattedHistory = academicHistory.map(record => ({
      ...record,
      final_average: record.final_average ? safeParseFloat(record.final_average).toFixed(2) : null
    }));

    res.json({
      profile: student,
      currentEnrollment: activeEnrollment[0] || null,
      academicHistory: {
        data: formattedHistory,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum
        }
      },
      stats
    });

  } catch (err) {
    console.error("❌ Error fetching student dashboard:", err);
    res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? err.message : "An unexpected error occurred"
    });
  }
};

// Get student's marks with pagination
exports.getStudentMarks = async (req, res) => {
  const userId = req.user?.id;
  const { year_id, term_id, page = 1, limit = 10 } = req.query;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get student ID using user_id
    const studentRows = await safeQuery(
      `SELECT id FROM Student WHERE user_id = ?`,
      [userId],
      "Student not found"
    );

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentId = studentRows[0].id;

    // Validate pagination
    const { pageNum, limitNum, offset } = validatePagination(page, limit, 10, 50);

    // Build base query
    let baseQuery = `
      FROM marks m
      JOIN enrollments e ON m.enrollments_id = e.id
      JOIN subjects sub ON m.subjects_id = sub.id
      JOIN academic_year ay ON e.academic_year_id = ay.id
      JOIN terms t ON e.terms_id = t.id
      JOIN sections sec ON e.sections_id = sec.id
      WHERE e.student_id = ?
    `;
    
    const params = [studentId];
    const countParams = [studentId];

    if (year_id && year_id !== '' && year_id !== 'undefined') {
      baseQuery += ` AND e.academic_year_id = ?`;
      params.push(year_id);
      countParams.push(year_id);
    }

    if (term_id && term_id !== '' && term_id !== 'undefined') {
      baseQuery += ` AND e.terms_id = ?`;
      params.push(term_id);
      countParams.push(term_id);
    }

    // Get total count for pagination
    const countRows = await safeQuery(
      `SELECT COUNT(DISTINCT CONCAT(e.academic_year_id, '-', e.terms_id)) as total ${baseQuery}`,
      countParams,
      "Failed to count marks"
    );

    const totalTerms = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalTerms / limitNum);

    // Get paginated marks
    const marks = await safeQuery(
      `SELECT 
        m.*,
        sub.name AS subject_name,
        sub.grade_level,
        e.academic_year_id,
        e.terms_id,
        ay.year_name,
        t.term_name,
        sec.name AS section_name,
        sec.grade_level AS section_grade,
        CONCAT(sec.grade_level, sec.name) AS section
       ${baseQuery}
       ORDER BY ay.year_name DESC, t.id DESC, sub.name
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset],
      "Failed to fetch marks"
    );

    // Group by academic year and term
    const grouped = {};
    marks.forEach(mark => {
      const key = `${mark.year_name}-${mark.term_name}`;
      if (!grouped[key]) {
        grouped[key] = {
          academic_year: mark.year_name,
          term: mark.term_name,
          term_id: mark.terms_id,
          year_id: mark.academic_year_id,
          section: mark.section,
          subjects: []
        };
      }
      grouped[key].subjects.push({
        name: mark.subject_name,
        st1: mark.st1 !== null && mark.st1 !== undefined ? safeParseFloat(mark.st1, null) : null,
        ws: mark.ws !== null && mark.ws !== undefined ? safeParseFloat(mark.ws, null) : null,
        mid_exam: mark.mid_exam !== null && mark.mid_exam !== undefined ? safeParseFloat(mark.mid_exam, null) : null,
        project: mark.project !== null && mark.project !== undefined ? safeParseFloat(mark.project, null) : null,
        st2: mark.st2 !== null && mark.st2 !== undefined ? safeParseFloat(mark.st2, null) : null,
        home_class_work: mark.home_class_work !== null && mark.home_class_work !== undefined ? safeParseFloat(mark.home_class_work, null) : null,
        class_activity: mark.class_activity !== null && mark.class_activity !== undefined ? safeParseFloat(mark.class_activity, null) : null,
        final_exam: mark.final_exam !== null && mark.final_exam !== undefined ? safeParseFloat(mark.final_exam, null) : null,
        total_score: mark.total_score !== null && mark.total_score !== undefined ? safeParseFloat(mark.total_score, null) : null
      });
    });

    res.json({
      data: Object.values(grouped),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalTerms,
        itemsPerPage: limitNum
      }
    });

  } catch (err) {
    console.error("❌ Error fetching student marks:", err);
    res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? err.message : "An unexpected error occurred"
    });
  }
};

// Get available filters with pagination for years
exports.getStudentFilters = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const studentRows = await safeQuery(
      `SELECT id FROM Student WHERE user_id = ?`,
      [userId],
      "Student not found"
    );

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentId = studentRows[0].id;

    // Get years with pagination
    const { pageNum: yearPage, limitNum: yearLimit, offset: yearOffset } = validatePagination(
      req.query.year_page || 1,
      req.query.year_limit || 10,
      20,
      100
    );

    // Get total years count
    const yearCountRows = await safeQuery(
      `SELECT COUNT(DISTINCT ay.id) as total
       FROM enrollments e
       JOIN academic_year ay ON e.academic_year_id = ay.id
       WHERE e.student_id = ?`,
      [studentId],
      "Failed to count years"
    );

    const totalYears = yearCountRows[0]?.total || 0;

    // Get paginated years
    const years = await safeQuery(
      `SELECT DISTINCT 
        ay.id, 
        ay.year_name
       FROM enrollments e
       JOIN academic_year ay ON e.academic_year_id = ay.id
       WHERE e.student_id = ?
       ORDER BY ay.year_name DESC
       LIMIT ? OFFSET ?`,
      [studentId, yearLimit, yearOffset],
      "Failed to fetch years"
    );

    // Get terms (usually fewer, no pagination needed)
    const terms = await safeQuery(
      `SELECT DISTINCT 
        t.id, 
        t.term_name
       FROM enrollments e
       JOIN terms t ON e.terms_id = t.id
       WHERE e.student_id = ?
       ORDER BY t.id`,
      [studentId],
      "Failed to fetch terms"
    );

    res.json({ 
      years: {
        data: years,
        pagination: {
          currentPage: yearPage,
          totalPages: Math.ceil(totalYears / yearLimit),
          totalItems: totalYears,
          itemsPerPage: yearLimit
        }
      },
      terms 
    });

  } catch (err) {
    console.error("❌ Error fetching student filters:", err);
    res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? err.message : "An unexpected error occurred"
    });
  }
};

// Get student report card
exports.getStudentReportCard = async (req, res) => {
  const userId = req.user?.id;
  const { year_id, term_id } = req.params;

  // Validate inputs
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!year_id || !term_id) {
    return res.status(400).json({ error: "Year ID and Term ID are required" });
  }

  try {
    console.log("📄 Fetching report card for user:", userId, "year:", year_id, "term:", term_id);

    // Get student ID
    const studentRows = await safeQuery(
      'SELECT id, full_name, Sex, Date_of_birth FROM Student WHERE user_id = ?',
      [userId],
      "Student not found"
    );
    
    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentRows[0];
    console.log("Found student:", student.id);

    // Get enrollment
    const enrollmentRows = await safeQuery(
      `SELECT e.id, e.status, e.final_average,
        ay.year_name, 
        t.term_name,
        sec.name AS section_name,
        sec.grade_level
       FROM enrollments e
       JOIN academic_year ay ON e.academic_year_id = ay.id
       JOIN terms t ON e.terms_id = t.id
       JOIN sections sec ON e.sections_id = sec.id
       WHERE e.student_id = ? AND e.academic_year_id = ? AND e.terms_id = ?`,
      [student.id, year_id, term_id],
      "Enrollment not found"
    );
    
    if (!enrollmentRows || enrollmentRows.length === 0) {
      return res.status(404).json({ error: "Enrollment not found for this term" });
    }

    const enrollment = enrollmentRows[0];
    console.log("Found enrollment:", enrollment.id);

    // Get marks
    const marks = await safeQuery(
      `SELECT 
        sub.name AS subject_name,
        m.st1,
        m.ws,
        m.mid_exam,
        m.project,
        m.st2,
        m.home_class_work,
        m.class_activity,
        m.final_exam,
        m.total_score
       FROM marks m
       JOIN subjects sub ON m.subjects_id = sub.id
       WHERE m.enrollments_id = ?
       ORDER BY sub.name`,
      [enrollment.id],
      "Failed to fetch marks"
    );

    console.log("Found marks:", marks.length);

    // Calculate statistics safely
    let totalScore = 0;
    let validSubjects = 0;
    const subjectDetails = marks.map(mark => {
      const total = safeParseFloat(mark.total_score);
      if (total > 0) {
        totalScore += total;
        validSubjects++;
      }
      return {
        subject_name: mark.subject_name,
        st1: mark.st1 !== null ? safeParseFloat(mark.st1) : null,
        ws: mark.ws !== null ? safeParseFloat(mark.ws) : null,
        mid_exam: mark.mid_exam !== null ? safeParseFloat(mark.mid_exam) : null,
        project: mark.project !== null ? safeParseFloat(mark.project) : null,
        st2: mark.st2 !== null ? safeParseFloat(mark.st2) : null,
        home_class_work: mark.home_class_work !== null ? safeParseFloat(mark.home_class_work) : null,
        class_activity: mark.class_activity !== null ? safeParseFloat(mark.class_activity) : null,
        final_exam: mark.final_exam !== null ? safeParseFloat(mark.final_exam) : null,
        total_score: total > 0 ? total : null
      };
    });

    const termAverage = validSubjects > 0 ? (totalScore / validSubjects).toFixed(2) : "0.00";
    const passingSubjects = marks.filter(m => safeParseFloat(m.total_score) >= 50).length;

    // Send response
    res.json({
      student: {
        name: student.full_name,
        sex: student.Sex,
        dob: student.Date_of_birth
      },
      enrollment: {
        year: enrollment.year_name,
        term: enrollment.term_name,
        section: `${enrollment.grade_level} ${enrollment.section_name}`,
        status: enrollment.status,
        final_average: enrollment.final_average ? safeParseFloat(enrollment.final_average).toFixed(2) : null
      },
      marks: subjectDetails,
      statistics: {
        subjectsCount: marks.length,
        termAverage,
        passingSubjects,
        failingSubjects: marks.length - passingSubjects
      }
    });

  } catch (err) {
    console.error("❌ Error fetching report card:", err);
    res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? err.message : "An unexpected error occurred"
    });
  }
};