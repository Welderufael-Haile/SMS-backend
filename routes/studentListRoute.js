const express = require("express");
const router = express.Router();
const studentListController = require("../controllers/studentListController");

router.get("/students/list", studentListController.getAllStudentsWithSections);

module.exports = router;
