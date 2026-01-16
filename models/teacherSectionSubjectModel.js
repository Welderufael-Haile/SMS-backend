// models/teacherSectionSubjectModel.js
const db = require("../config/db");

async function createTeacherSectionSubjectsTable() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS teacher_section_subjects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL,
        section_id INT NOT NULL,
        subject_id INT NOT NULL,
        academic_year_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        CONSTRAINT fk_tss_teacher
          FOREIGN KEY (teacher_id)
          REFERENCES teachers(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_tss_section
          FOREIGN KEY (section_id)
          REFERENCES sections(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_tss_subject
          FOREIGN KEY (subject_id)
          REFERENCES subjects(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_tss_year
          FOREIGN KEY (academic_year_id)
          REFERENCES academic_year(id)
          ON DELETE CASCADE

      )
    `;

    await db.query(sql);
    console.log("✅ teacher_section_subjects table ready with soft-delete & academic year support");
    return true;
  } catch (error) {
    console.error("❌ Error creating teacher_section_subjects table:", error);
    throw error;
  }
}

module.exports = { createTeacherSectionSubjectsTable };
