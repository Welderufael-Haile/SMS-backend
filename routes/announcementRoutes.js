const express = require("express");
const router = express.Router();
const {getAnnouncements,createAnnouncement,updateAnnouncement,deleteAnnouncement,
} = require("../controllers/announcementController");

router.get("/", getAnnouncements);
router.post("/", createAnnouncement);
router.put("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);

module.exports = router;