// const express = require("express");
// const { addSection } = require("../controllers/sectionsController");

// const router = express.Router();
// router.post("/add", addSection);

// module.exports = router;

const express = require("express");
const { addSection, fetchSections, updateSection, deleteSection } = require("../controllers/sectionsController");

const router = express.Router();

router.post("/add", addSection);      // Add Section
router.get("/fetch", fetchSections);  // Fetch Sections
router.put("/update/:id", updateSection); // Update Section
router.delete("/delete/:id", deleteSection); // Delete Section

module.exports = router;
