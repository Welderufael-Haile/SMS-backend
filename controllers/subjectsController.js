// const db = require("../config/db");

// const addSubject = async (req, res) => {
//     try {
//         const { name, grade_level } = req.body;
//         await db.query("INSERT INTO subjects (name, grade_level) VALUES (?, ?)", [name, grade_level]);
//         res.status(201).json({ message: "Subject added successfully!" });
//     } catch (error) {
//         res.status(500).json({ error: "Error adding subject" });
//     }
// };

// const updateSubject = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { name, grade_level } = req.body;
//         await db.query("UPDATE subjects SET name = ?, grade_level = ? WHERE id = ?", [name, grade_level, id]);
//         res.status(200).json({ message: "Subject updated successfully!" });
//     } catch (error) {
//         res.status(500).json({ error: "Error updating subject" });
//     }
// };

// const deleteSubject = async (req, res) => {
//     try {
//         const { id } = req.params;
//         await db.query("DELETE FROM subjects WHERE id = ?", [id]);
//         res.status(200).json({ message: "Subject deleted successfully!" });
//     } catch (error) {
//         res.status(500).json({ error: "Error deleting subject" });
//     }
// };

// const fetchSubjects = async (req, res) => {
//     try {
//         const [subjects] = await db.query("SELECT * FROM subjects");
//         res.status(200).json(subjects);
//     } catch (error) {
//         res.status(500).json({ error: "Error fetching subjects" });
//     }
// };

// module.exports = { addSubject, updateSubject, deleteSubject, fetchSubjects };



const db = require("../config/db");

const addSubject = async (req, res) => {
    try {
        const { name, grade_level } = req.body;
        
        // Check if subject with same name and grade_level already exists
        const [existing] = await db.query("SELECT id FROM subjects WHERE name = ? AND grade_level = ?", [name, grade_level]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Subject with this name and grade level already exists" });
        }
        
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
        
        // Check if another subject with same name and grade_level exists (excluding current id)
        const [existing] = await db.query("SELECT id FROM subjects WHERE name = ? AND grade_level = ? AND id != ?", [name, grade_level, id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Another subject with this name and grade level already exists" });
        }
        
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