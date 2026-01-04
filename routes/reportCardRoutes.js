const express = require("express");
const router = express.Router();
const reportCardController = require("../controllers/reportCardController");

router.get("/fetch-report-data", reportCardController.getReportCardData);

module.exports = router;