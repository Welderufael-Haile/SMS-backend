const express = require("express");
const multer = require("multer");
const router = express.Router();
const marklistController = require("../controllers/marklistController");

const upload = multer();

router.post("/upload", upload.single("file"), marklistController.uploadMarklist);
router.get("/fetch", marklistController.getAllMarklists);
router.delete("/delete/:id", marklistController.deleteMarklist);
router.put("/update/:id", marklistController.updateMarklist);

module.exports = router;
