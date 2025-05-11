// const db = require("../config/db");

// const addSection = async (req, res) => {
//   try {
//     const { name, grade_level } = req.body;
//     await db.query("INSERT INTO sections (name, grade_level) VALUES (?, ?)", [name, grade_level]);
//     res.status(201).json({ message: "Section added successfully!" });
//   } catch (error) {
//     res.status(500).json({ error: "Error adding section" });
//   }
// };

// module.exports = { addSection };

const db = require("../config/db");

// Fetch all sections
exports.fetchSections = async (req, res) => {
    try {
        const [sections] = await db.execute("SELECT * FROM sections");
        res.json(sections);
    } catch (error) {
        res.status(500).json({ message: "Error fetching sections" });
    }
};

// Add section
exports.addSection = async (req, res) => {
  const { name, grade_level } = req.body;

  try {
      // Check if section with the same name and grade already exists
      const [existingSection] = await db.execute(
          "SELECT * FROM sections WHERE name = ? AND grade_level = ?",
          [name, grade_level]
      );

      if (existingSection.length > 0) {
          return res.status(400).json({ message: "Section already exists for this grade!" });
      }

      // Insert new section if it doesn't exist
      await db.execute("INSERT INTO sections (name, grade_level) VALUES (?, ?)", [name, grade_level]);
      res.json({ message: "Section added successfully" });
  } catch (error) {
      res.status(500).json({ message: "Error adding section" });
  }
};

// Update section
exports.updateSection = async (req, res) => {
    const { id } = req.params;
    const { name, grade_level } = req.body;
    try {
        await db.execute("UPDATE sections SET name = ?, grade_level = ? WHERE id = ?", [name, grade_level, id]);
        res.json({ message: "Section updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error updating section" });
    }
};

// Delete section
exports.deleteSection = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM sections WHERE id = ?", [id]);
        res.json({ message: "Section deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting section" });
    }
};
