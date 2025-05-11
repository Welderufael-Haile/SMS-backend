
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const bodyParser = require("body-parser");
const teacherRoutes = require('./routes/teacherRoutes') // import teachers route
const newstudentRoutes = require("./routes/newstudentRoutes"); // ✅ Import students routes
const announcementsRoutes = require("./routes/announcementRoutes"); // import announcement route
const jobPostRoutes = require("./routes/jobPostRoutes");
const contactRoutes = require("./routes/contactRoutes"); 
const subjectsRoutes = require("./routes/subjectsRoutes");
const parentRoutes = require('./routes/parentRoutes');
const sectionsRoutes = require("./routes/sectionsRoutes");
const addStudentRoutes = require("./routes/addStudentRoutes");
const studentListRoute = require("./routes/studentListRoute");
const marklistRoutes = require('./routes/marklistRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes for students
app.use("/api/students", newstudentRoutes); // ✅ Use routes
//routes for teachers
app.use("/api/teachers", teacherRoutes); // ✅ Use routes
//routes for announcements
app.use("/api/announcements", announcementsRoutes); // ✅ This should be a function, not an object
//routes for jobposts
// Register job post routes
app.use("/api/", jobPostRoutes);

// Routes for contacts message
app.use("/api", contactRoutes);
//routes for parents
app.use('/api', parentRoutes);
// routes for subjects
app.use("/api/subjects", subjectsRoutes);
//routes for sections
app.use("/api/sections", sectionsRoutes);
// routes for addstudents form
app.use("/api/student", addStudentRoutes);
// routes for studentList
app.use("/api", studentListRoute);

//marklist
app.use('/api/marklist', marklistRoutes);

//app.use("/api", marklistRoutes);
// ✅ Serve uploaded files
 app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

