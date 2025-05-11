const db = require("../config/db");

const addSubject = async (req, res) => {
    try {
        const { name, grade_level } = req.body;
        await db.query("INSERT INTO subjects (name, grade_level) VALUES (?, ?)", [name, grade_level]);
        res.status(201).json({ message: "Subject added successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error adding subject" });
    }
};

const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, grade_level } = req.body;
        await db.query("UPDATE subjects SET name = ?, grade_level = ? WHERE id = ?", [name, grade_level, id]);
        res.status(200).json({ message: "Subject updated successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error updating subject" });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM subjects WHERE id = ?", [id]);
        res.status(200).json({ message: "Subject deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting subject" });
    }
};

const fetchSubjects = async (req, res) => {
    try {
        const [subjects] = await db.query("SELECT * FROM subjects");
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ error: "Error fetching subjects" });
    }
};

module.exports = { addSubject, updateSubject, deleteSubject, fetchSubjects };