
const db = require("../config/db");

// Get all job posts
exports.getJobPosts = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM job_posts ORDER BY post_time DESC");
    res.status(200).json(results);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new job post
exports.createJobPost = async (req, res) => {
  const { title, position, description } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO job_posts (title, position, description) VALUES (?, ?, ?)",
      [title, position, description]
    );
    res.status(201).json({ message: "Job post created successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update a job post
exports.updateJobPost = async (req, res) => {
  const { id } = req.params;
  const { title, position, description } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE job_posts SET title=?, position=?, description=? WHERE id=?",
      [title, position, description, id]
    );
    res.status(200).json({ message: "Job post updated successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a job post
exports.deleteJobPost = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM job_posts WHERE id=?", [id]);
    res.status(200).json({ message: "Job post deleted successfully" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message });
  }
};