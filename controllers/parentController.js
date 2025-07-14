const db = require('../config/db');

// Fetch all parents
exports.getAllParents = async (req, res) => {
    try {
        const [parents] = await db.query("SELECT * FROM parents"); // Use async/await
        res.status(200).json(parents);
    } catch (error) {
        console.error("Error fetching parents:", error);
        res.status(500).json({ message: "Server Error", error });
    }
};
// Add a new parent
exports.addParent = (req, res) => {
    const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = req.body;
    const sql = 'INSERT INTO parents (First_Name, Last_Name, Sex, Phone_Number, Email, Address ) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [First_Name, Last_Name, Sex, Phone_Number, Email, Address], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error adding parent', error: err });
        res.json({ message: 'Parent added successfully', parentId: result.insertId });
    });
};

// Update parent
exports.updateParent = (req, res) => {
    const { id } = req.params;
    const { First_Name, Last_Name, Sex, Phone_Number, Email, Address } = req.body;

    const sql = 'UPDATE parents SET First_Name=?, Last_Name=?, Sex=?, Phone_Number=?, Email=?, Address=? WHERE id=?';
    db.query(sql, [First_Name, Last_Name, Sex, Phone_Number, Email, Address, id], (err) => {
        if (err) return res.status(500).json({ message: 'Error updating parent', error: err });
        res.json({ message: 'Parent updated successfully' });
    });
};

// Delete parent
exports.deleteParent = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM parents WHERE id=?', [id], (err) => {
        if (err) return res.status(500).json({ message: 'Error deleting parent', error: err });
        res.json({ message: 'Parent deleted successfully' });
    });
};
