
const db = require("../config/db");

// Fetch all sections
exports.fetchSections = async (req, res) => {
    try {
        // Included status in the fetch
        const [sections] = await db.execute("SELECT * FROM sections ORDER BY grade_level ASC, name ASC");
        res.json(sections);
    } catch (error) {
        res.status(500).json({ message: "Error fetching sections" });
    }
};

// Add section
exports.addSection = async (req, res) => {
  const { name, grade_level, status } = req.body; // Added status

  try {
      const [existingSection] = await db.execute(
          "SELECT * FROM sections WHERE name = ? AND grade_level = ?",
          [name, grade_level]
      );

      if (existingSection.length > 0) {
          return res.status(400).json({ message: "Section already exists for this grade!" });
      }

      // Default to 'active' if status not provided
      await db.execute(
          "INSERT INTO sections (name, grade_level, status) VALUES (?, ?, ?)", 
          [name, grade_level, status || 'active']
      );
      res.json({ message: "Section added successfully" });
  } catch (error) {
      res.status(500).json({ message: "Error adding section" });
  }
};

// Update section
exports.updateSection = async (req, res) => {
    const { id } = req.params;
    const { name, grade_level, status } = req.body;
    try {
        await db.execute(
            "UPDATE sections SET name = ?, grade_level = ?, status = ? WHERE id = ?", 
            [name, grade_level, status, id]
        );
        res.json({ message: "Section updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error updating section" });
    }
};

// Quick Toggle Status
exports.toggleStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // expect 'active' or 'inactive'
    try {
        await db.execute("UPDATE sections SET status = ? WHERE id = ?", [status, id]);
        res.json({ message: `Section marked as ${status}` });
    } catch (error) {
        res.status(500).json({ message: "Error toggling status" });
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