// controllers/graduationController.js
const db = require('../config/db');

// 1. Get all graduates with filters - ADDED GENDER COUNT
exports.getGraduates = async (req, res) => {
  try {
    const { year, student, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        g.*,
        s.full_name,
        s.Sex,
        s.Date_of_birth,
        ay.year_name AS graduation_year,
        YEAR(g.graduation_date) AS graduation_year_num,
        DATE_FORMAT(g.graduation_date, '%M %d, %Y') AS formatted_date
      FROM graduation_records g
      JOIN Student s ON g.student_id = s.id
      JOIN academic_year ay ON g.academic_year_id = ay.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM graduation_records g
      JOIN Student s ON g.student_id = s.id
      WHERE 1=1
    `;

    // Gender count query - NEW!
    let genderQuery = `
      SELECT 
        s.Sex,
        COUNT(*) as count
      FROM graduation_records g
      JOIN Student s ON g.student_id = s.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];
    const genderParams = [];

    if (year) {
      query += ` AND g.academic_year_id = ?`;
      countQuery += ` AND g.academic_year_id = ?`;
      genderQuery += ` AND g.academic_year_id = ?`;
      params.push(year);
      countParams.push(year);
      genderParams.push(year);
    }

    if (student) {
      query += ` AND s.full_name LIKE ?`;
      countQuery += ` AND s.full_name LIKE ?`;
      params.push(`%${student}%`);
      countParams.push(`%${student}%`);
      // Gender query doesn't need student filter for stats
    }

    // Get gender breakdown - NEW!
    genderQuery += ` GROUP BY s.Sex`;
    const [genderRows] = await db.query(genderQuery, genderParams);
    
    const genderStats = {
      male: 0,
      female: 0,
      other: 0
    };
    
    genderRows.forEach(row => {
      if (row.Sex === 'M') genderStats.male = row.count;
      else if (row.Sex === 'F') genderStats.female = row.count;
      else genderStats.other = row.count;
    });

    // Get total count
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    // Add pagination
    query += ` ORDER BY g.graduation_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(query, params);

    res.json({
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      genderStats // ← Send gender stats with response
    });
  } catch (err) {
    console.error("Error fetching graduates:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. Get single graduate by ID
exports.getGraduateById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        g.*,
        s.full_name,
        s.Sex,
        s.Date_of_birth,
        ay.year_name AS graduation_year
      FROM graduation_records g
      JOIN Student s ON g.student_id = s.id
      JOIN academic_year ay ON g.academic_year_id = ay.id
      WHERE g.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Graduate not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching graduate:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Generate certificate number

// 3. Generate certificate number - FIXED duplicate issue
exports.generateCertificate = async (req, res) => {
  const { id } = req.params;

  try {
    // First check if certificate already exists
    const [existing] = await db.query(
      `SELECT certificate_number, student_id, academic_year_id FROM graduation_records WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Graduate not found" 
      });
    }

    if (existing[0].certificate_number) {
      return res.json({ 
        success: true,
        certificate_number: existing[0].certificate_number,
        message: "Certificate already exists" 
      });
    }

    // Get the academic year of this graduate
    const academicYearId = existing[0].academic_year_id;
    
    // Get the year name for certificate prefix
    const [yearData] = await db.query(
      `SELECT year_name FROM academic_year WHERE id = ?`,
      [academicYearId]
    );
    
    const yearName = yearData[0]?.year_name || new Date().getFullYear().toString();

    // FIX: Get the count of certificates issued for THIS SPECIFIC student's graduation year
    // Count certificates that have already been issued (not just total records)
    const [result] = await db.query(
      `SELECT COUNT(*) as count FROM graduation_records 
       WHERE academic_year_id = ? AND certificate_number IS NOT NULL`,
      [academicYearId]
    );
    
    // Generate unique certificate number
    // Format: GRAD-{YEAR}-{SEQUENTIAL} (e.g., GRAD-2017-0001)
    const sequence = String(result[0].count + 1).padStart(4, '0');
    const certNumber = `GRAD-${yearName}-${sequence}`;

    // Update with the unique certificate number
    await db.query(
      `UPDATE graduation_records SET certificate_number = ? WHERE id = ?`,
      [certNumber, id]
    );

    res.json({ 
      success: true,
      certificate_number: certNumber,
      message: "Certificate generated successfully" 
    });
  } catch (err) {
    console.error("Error generating certificate:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error generating certificate",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 4. Get graduation statistics - UPDATED with gender stats
exports.getGraduationStats = async (req, res) => {
  const { year } = req.query; // Optional year filter
  
  try {
    let statsQuery = `
      SELECT 
        COUNT(*) as total_graduates,
        AVG(final_average) as average_score,
        MAX(final_average) as highest_score,
        MIN(final_average) as lowest_score,
        SUM(CASE WHEN terms_completed = 3 THEN 1 ELSE 0 END) as full_term_graduates,
        SUM(CASE WHEN terms_completed < 3 THEN 1 ELSE 0 END) as transfer_graduates,
        COUNT(DISTINCT academic_year_id) as years_with_graduates
      FROM graduation_records g
      WHERE 1=1
    `;

    let genderQuery = `
      SELECT 
        s.Sex,
        COUNT(*) as count
      FROM graduation_records g
      JOIN Student s ON g.student_id = s.id
      WHERE 1=1
    `;

    const params = [];
    const genderParams = [];

    if (year) {
      statsQuery += ` AND g.academic_year_id = ?`;
      genderQuery += ` AND g.academic_year_id = ?`;
      params.push(year);
      genderParams.push(year);
    }

    const [stats] = await db.query(statsQuery, params);
    
    // Get gender breakdown
    genderQuery += ` GROUP BY s.Sex`;
    const [genderRows] = await db.query(genderQuery, genderParams);
    
    const genderStats = {
      male: 0,
      female: 0,
      other: 0
    };
    
    genderRows.forEach(row => {
      if (row.Sex === 'M') genderStats.male = row.count;
      else if (row.Sex === 'F') genderStats.female = row.count;
      else genderStats.other = row.count;
    });

    const [yearlyStats] = await db.query(`
      SELECT 
        ay.year_name,
        COUNT(*) as graduate_count,
        AVG(g.final_average) as avg_score,
        SUM(CASE WHEN s.Sex = 'M' THEN 1 ELSE 0 END) as male_count,
        SUM(CASE WHEN s.Sex = 'F' THEN 1 ELSE 0 END) as female_count
      FROM graduation_records g
      JOIN academic_year ay ON g.academic_year_id = ay.id
      JOIN Student s ON g.student_id = s.id
      GROUP BY ay.year_name, ay.id
      ORDER BY ay.year_name DESC
      LIMIT 5
    `);

    res.json({
      overall: {
        ...stats[0],
        ...genderStats  // Merge gender stats
      },
      yearly: yearlyStats
    });
  } catch (err) {
    console.error("Error fetching graduation stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

