// Create Student table if it doesn't exist
exports.createStudentTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS Student (
      id INT PRIMARY KEY AUTO_INCREMENT,
      full_name VARCHAR(50),
      Sex VARCHAR(50),
      Date_of_birth DATE,
      ParentID INT,
      sections_id INT,
      terms_id INT,
      academic_year_id INT,
      FOREIGN KEY (ParentID) REFERENCES Parent(ParentID) ON DELETE CASCADE,
      FOREIGN KEY (sections_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE CASCADE
    )`;
  
  db.query(sql, (err) => {
    if (err) {
      console.error("Error creating Student table:", err);
    } else {
      console.log("Student table created or already exists");
    }
  });
};