// const db = require('../config/db')

// async function createEnrollmentTable() {
// try{

// // create terms table
//   const sql = `
//    CREATE TABLE IF NOT EXISTS enrollments (
//    id INT AUTO_INCREMENT PRIMARY KEY,
//    student_id INT NOT NULL,
//    academic_year_id INT NOT NULL,
//    terms_id INT NOT NULL,
//    sections_id INT NOT NULL,
//    FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE,
//    FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE,
//    FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,
//    FOREIGN KEY (sections_id) REFERENCES sections(id) ON DELETE CASCADE
//   )`;
//     await db.query(sql);
//     console.log("✅  enrollment table ready");
//     return true;
//   } catch (error) {
//     console.error("❌ Error creating enrollments table:", error);
//     throw error;
//   }
 
// }

// // make sure to export the function
// module.exports ={ createEnrollmentTable};


const db = require('../config/db');

async function createEnrollmentTable() {
  try {

    const sql = `
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,

        student_id INT NOT NULL,
        academic_year_id INT NOT NULL,
        terms_id INT NOT NULL,
        sections_id INT NOT NULL,

        status ENUM('active','promoted','repeated','completed')
          DEFAULT 'active',

        final_average DECIMAL(5,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        promotion_note VARCHAR(255) DEFAULT NULL,
        -- PREVENT DUPLICATE ENROLLMENT
        UNIQUE KEY unique_enrollment (
          student_id,
          academic_year_id,
          terms_id
        ),

        FOREIGN KEY (student_id)
          REFERENCES Student(id)
          ON DELETE CASCADE,

        FOREIGN KEY (academic_year_id)
          REFERENCES academic_year(id)
          ON DELETE CASCADE,

        FOREIGN KEY (terms_id)
          REFERENCES terms(id)
          ON DELETE CASCADE,

        FOREIGN KEY (sections_id)
          REFERENCES sections(id)
          ON DELETE CASCADE
      )
    `;

    await db.query(sql);
    console.log("✅ enrollments table ready (with status & promotion support)");
    return true;

  } catch (error) {
    console.error("❌ Error creating enrollments table:", error);
    throw error;
  }
}

// export
module.exports = { createEnrollmentTable };
