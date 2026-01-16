// // models/studentModel.js
// const db = require("../config/db");

// async function createStudentTable() {
//   try {
   
//     // Then create Student table
//     const sql = `
//       CREATE TABLE IF NOT EXISTS Student (
//         id INT PRIMARY KEY AUTO_INCREMENT,
//         full_name VARCHAR(50),
//         Sex VARCHAR(50),
//         Date_of_birth DATE,
//         parents_id INT,
//         sections_id INT,
//         terms_id INT,
//         academic_year_id INT,
//         FOREIGN KEY (parents_id) REFERENCES parents(id) ON DELETE CASCADE,
//         FOREIGN KEY (sections_id) REFERENCES sections(id) ON DELETE CASCADE,
//         FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,
//         FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE
//       )`;
    
//     await db.query(sql);
//     console.log("✅ Student table ready");
//     return true;
//   } catch (error) {
//     console.error("❌ Error creating Student table:", error);
//     throw error;
//   }
// }

// // Make sure to export the function
// module.exports = { createStudentTable };


// models/studentModel.js
const db = require("../config/db");

async function createStudentTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS Student (
        id INT PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(50),
        profile_photo VARCHAR(255) NULL, -- Added this line
        Sex VARCHAR(50),
        Date_of_birth DATE,
        parents_id INT,
        sections_id INT,
        terms_id INT,
        academic_year_id INT,
        FOREIGN KEY (parents_id) REFERENCES parents(id) ON DELETE CASCADE,
        FOREIGN KEY (sections_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
    
    await db.query(sql);
    console.log("✅ Student table ready with profile_photo support");
    return true;
  } catch (error) {
    console.error("❌ Error creating Student table:", error);
    throw error;
  }
}

module.exports = { createStudentTable };