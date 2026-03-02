// // database/models/graduationRecords.js
// const db = require('../config/db');
// // Simple version based on your INSERT query
// async function createGraduationRecordsTable() {
//   try {
//     const sql = `
//       CREATE TABLE IF NOT EXISTS graduation_records (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         student_id INT NOT NULL,
//         graduation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//         final_average DECIMAL(5,2) NOT NULL,
//         academic_year_id INT NOT NULL,
//         terms_completed INT DEFAULT 3,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
//         FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
//         FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
        
//         INDEX idx_student (student_id),
//         UNIQUE KEY unique_student_graduation (student_id, academic_year_id)
        
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
//     `;

//     await db.query(sql);
//     console.log("✅ graduation_records table ready");
//     return true;
//   } catch (error) {
//     console.error("❌ Error creating graduation_records table:", error);
//     throw error;
//   }
// }

// module.exports = { createGraduationRecordsTable };

// database/models/graduationRecords.js
const db = require('../config/db');

async function createGraduationRecordsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS graduation_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        graduation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        final_average DECIMAL(5,2) NOT NULL,
        academic_year_id INT NOT NULL,
        terms_completed INT DEFAULT 3,
        certificate_number VARCHAR(50) UNIQUE,  -- ← ADD THIS LINE
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
        
        INDEX idx_student (student_id),
        UNIQUE KEY unique_student_graduation (student_id, academic_year_id)
        
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await db.query(sql);
    console.log("✅ graduation_records table ready");
    return true;
  } catch (error) {
    console.error("❌ Error creating graduation_records table:", error);
    throw error;
  }
}

module.exports = { createGraduationRecordsTable };