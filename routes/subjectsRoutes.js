const express = require("express");
const { addSubject, deleteSubject, updateSubject, fetchSubjects } = require("../controllers/subjectsController.js"); // ✅ Ensure correct import

const router = express.Router();

router.post("/add", addSubject); // ✅ Ensure addSubject is a function
router.put("/update/:id", updateSubject); // ✅ Add update route
router.delete("/delete/:id", deleteSubject); // ✅ Add delete route
router.get("/fetch", fetchSubjects); // ✅ Add fetch route

module.exports = router;
