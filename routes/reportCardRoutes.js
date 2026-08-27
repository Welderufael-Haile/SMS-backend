const express = require("express");
const router = express.Router();
const reportCardController = require("../controllers/reportCardController");
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(requireRole(['admin', 'registrar', 'headdepartment']));


router.get("/fetch-report-data", reportCardController.getReportCardData);

module.exports = router;