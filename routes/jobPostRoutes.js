
const express = require("express");
const router = express.Router();
const jobPostsController = require("../controllers/jobPostsController");

// Define job post routes
router.get("/jobs", jobPostsController.getJobPosts);
router.post("/jobs", jobPostsController.createJobPost);
router.put("/jobs/:id", jobPostsController.updateJobPost);
router.delete("/jobs/:id", jobPostsController.deleteJobPost);

module.exports = router;