require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

// Import Routes
// const teacherRoutes = require("./routes/teacherRoutes");
const announcementsRoutes = require("./routes/announcementRoutes");
const jobPostRoutes = require("./routes/jobPostRoutes");
const contactRoutes = require("./routes/contactRoutes");
const subjectsRoutes = require("./routes/subjectsRoutes");
const sectionsRoutes = require("./routes/sectionsRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use("/api/teachers", teacherRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/jobposts", jobPostRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/sections", sectionsRoutes);
app.use("/api/students", studentsRoutes);

// Serve uploaded files


// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
