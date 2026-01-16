// const express = require("express");
// const router = express.Router();
// const controller = require("../controllers/teacherSectionSubjectController");

// router.post("/", controller.addAssignment);
// router.get("/", controller.getAssignments);
// router.put("/:id", controller.updateAssignment);
// router.delete("/:id", controller.deleteAssignment);

// module.exports = router;

// routes/teacherSectionSubjectRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/teacherSectionSubjectController");

router.post("/", controller.addAssignment);
router.get("/", controller.getAssignments);
router.get("/:id", controller.getAssignment);
router.put("/:id", controller.updateAssignment);
router.delete("/:id", controller.toggleAssignmentStatus);

module.exports = router;