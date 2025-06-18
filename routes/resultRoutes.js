const express = require("express");
const router = express.Router();
const { getStudentResults } = require("../controllers/resultController");

router.get("/", getStudentResults);

module.exports = router;

