const xlsx = require("xlsx");
const db = require("../config/db");

exports.uploadMarklist = async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    for (const row of data) {
      const subjects = [
        parseFloat(row.Tigrigna) || 0,
        parseFloat(row.Amharic) || 0,
        parseFloat(row.English) || 0,
        parseFloat(row.Maths) || 0,
        parseFloat(row.Biology) || 0,
        parseFloat(row.Chemistry) || 0,
        parseFloat(row.Physics) || 0,
        parseFloat(row.Geography) || 0,
        parseFloat(row.History) || 0,
        parseFloat(row.Economics) || 0,
        parseFloat(row.Citizenship) || 0,
        parseFloat(row.ICT) || 0,
        parseFloat(row.HPE) || 0
      ];

      const total = subjects.reduce((a, b) => a + b, 0);
      const average = parseFloat((total / subjects.length).toFixed(2));

      const below70 = subjects.filter(score => score < 70).length;
      let flag = "green";
      if (below70 === 1) flag = "blue";
      else if (below70 === 2) flag = "yellow";
      else if (below70 >= 3) flag = "red";

      await db.query(
        `INSERT INTO marklist 
         (Name, Sex,Term,Year,Tigrigna, Amharic, English, Maths, Biology, Chemistry, Physics, Geography, History, Economics, Citizenship, ICT, HPE, Total, Average, Flag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.Name,
          row.Sex,
          row.Term,
          row.Year,
          ...subjects,
          total,
          average,
          flag
        ]
      );
    }

    await updateRanks();

    res.status(200).json({ message: "Marklist uploaded successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload marklist." });
  }
};

async function updateRanks() {
  // Reset rank and assign based on average
  await db.query("SET @rank = 0");
  await db.query(`
    UPDATE marklist
    JOIN (
      SELECT id, @rank := @rank + 1 AS new_rank
      FROM marklist
      ORDER BY Average DESC
    ) ranked
    ON marklist.id = ranked.id
    SET marklist.Rank = ranked.new_rank;
  `);
}

exports.getAllMarklists = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM marklist ORDER BY Rank ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching marklist data." });
  }
};

exports.deleteMarklist = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM marklist WHERE id = ?", [id]);
    await updateRanks();
    res.json({ message: "Marklist entry deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting entry." });
  }
};

exports.updateMarklist = async (req, res) => {
  const { id } = req.params;
  const {
    Name, Sex, Term, Year, Tigrigna, Amharic, English, Maths, Biology,
    Chemistry, Physics, Geography, History, Economics,
    Citizenship, ICT, HPE
  } = req.body;

  try {
    const subjects = [
      parseFloat(Tigrigna) || 0,
      parseFloat(Amharic) || 0,
      parseFloat(English) || 0,
      parseFloat(Maths) || 0,
      parseFloat(Biology) || 0,
      parseFloat(Chemistry) || 0,
      parseFloat(Physics) || 0,
      parseFloat(Geography) || 0,
      parseFloat(History) || 0,
      parseFloat(Economics) || 0,
      parseFloat(Citizenship) || 0,
      parseFloat(ICT) || 0,
      parseFloat(HPE) || 0
    ];

    const total = subjects.reduce((a, b) => a + b, 0);
    const average = parseFloat((total / subjects.length).toFixed(2));

    const below70 = subjects.filter(score => score < 70).length;
    let flag = "green";
    if (below70 === 1) flag = "blue";
    else if (below70 === 2) flag = "yellow";
    else if (below70 >= 3) flag = "red";

    await db.query(
      `UPDATE marklist 
       SET Name=?, Sex=?, Term=?, Year=?, Tigrigna=?, Amharic=?, English=?, Maths=?, Biology=?, Chemistry=?, Physics=?, Geography=?, History=?, Economics=?, Citizenship=?, ICT=?, HPE=?, Total=?, Average=?, Flag=? 
       WHERE id=?`,
      [
        Name, Sex,Term,Year, ...subjects, total, average, flag, id
      ]
    );

    await updateRanks();

    res.json({ message: "Marklist entry updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating entry." });
  }
};
