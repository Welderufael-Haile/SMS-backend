
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const db = require("./config/db");
const cookieParser = require('cookie-parser');



 const teacherRoutes = require('./routes/teacherRoutes'); //for new teacher route
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
 const termRoutes = require('./routes/termRoutes'); // ✅ Import the router
 const classesRoutes = require('./routes/classesRoutes');
 const academicYearRoutes = require('./routes/academicYearRoutes');
 const enrollmentRoutes = require('./routes/enrollmentRoutes');
 const marksRoutes = require('./routes/marksRoutes');
 const resultRoutes = require('./routes/resultRoutes');
 const applicantsRoutes = require('./routes/applicantsRoutes');
 const authRoutes = require('./routes/authRoutes');

 const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // Replace with your frontend origin
  credentials: true
}));

app.use(cookieParser());
// app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import table creation
const { createStudentTable } = require("./models/studentModel");
const { createSectionsTable} = require('./models/sectionModel');
const { createTermsTable} = require('./models/termsTable');
const { createacademicYearTable} = require('./models/academicYearTable');
const { createParentTable } = require('./models/parentTable');
const { createSubjectsTable } = require('./models/subjectsTable');
const { createAnnouncementTable } = require('./models/announcmentTable');
const { createEnrollmentTable} = require('./models/enrollmentTable');
const { createMarksTable} = require('./models/marksTable');
const {createJobsTable} = require('./models/jobsTable');
const {createContactsTable} = require('./models/contactsTable');
const {createMarklistTable} = require('./models/marklistTable');
const {createTeachesTable} = require('./models/teacherTable');
const {createRsultsTable} = require('./models/resultTable');
const {createApplicantsTable} = require('./models/jobApplicationsTable')
const{createUserTable} = require('./models/userModel')
// initialize the database and create tables
async function initializeDatabase() {
  try {
    // Test connection
    await db.query("SELECT 1");
    console.log("🔌 Database connected");

    // Create tables
    await createStudentTable(); // create student table
    await createSectionsTable();
    await createTermsTable();
    await createacademicYearTable();
    await createParentTable();
    await createSubjectsTable();
    await createAnnouncementTable();
    await createEnrollmentTable();
    await createMarksTable();
    await createJobsTable();
    await createMarklistTable();
    await createContactsTable();
    await createTeachesTable();
    await createRsultsTable();
    await createApplicantsTable();
    await createUserTable();
   // Add other table creation function calls here as needed
    console.log("🛠️  Database tables ready");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

async function startServer() {
  try {
    await initializeDatabase();
    
  // Setup routes
  // Routes for students
 app.use("/api/students", newstudentRoutes); // ✅ Use routes
 // new teachers
 app.use("/api/teacher", teacherRoutes);
 //routes for announcements
 app.use("/api/announcements", announcementsRoutes); // ✅ This should be a function, not an object
 //routes for jobposts
 app.use("/api/", jobPostRoutes);

 // Routes for contacts message
 app.use("/api/contacts", contactRoutes);
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
 // classes routes
 app.use('/api/classes', classesRoutes);
 //marklist
 app.use('/api/marklist', marklistRoutes);
 // routes for terms and years
 app.use('/api/academic-year', academicYearRoutes);
  // Routes for terms
 app.use('/api/terms', termRoutes);
 // routes for enrollment
 app.use("/api/enrollments", enrollmentRoutes);
 //routes for marks 
 app.use('/api/marks', marksRoutes)

 //routes for rasults
 app.use('/api/results', resultRoutes);
 // routes for applicants
 app.use('/api/applicants', applicantsRoutes);
 

// routes for authentication
app.use('/api/auth', authRoutes);
 // ✅ Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("💥 Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
startServer();