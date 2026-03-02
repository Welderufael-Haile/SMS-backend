
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const db = require("./config/db");
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // 🔹 Import Helmet for security

 const teacherRoutes = require('./routes/teacherRoutes'); //for add new teacher route
 const announcementsRoutes = require("./routes/announcementRoutes"); // import announcement route
 const jobPostRoutes = require("./routes/jobPostRoutes");  // for post jobs route
 const contactRoutes = require("./routes/contactRoutes"); // fro contact message route
 const subjectsRoutes = require("./routes/subjectsRoutes");
 const parentRoutes = require('./routes/parentRoutes');
 const sectionsRoutes = require("./routes/sectionsRoutes");
 const addStudentRoutes = require("./routes/addStudentRoutes");
 const studentListRoute = require("./routes/studentListRoute");
 const termRoutes = require('./routes/termRoutes'); // Import the router
 const classesRoutes = require('./routes/classesRoutes');
 const academicYearRoutes = require('./routes/academicYearRoutes');
 const enrollmentRoutes = require('./routes/enrollmentRoutes');
 const marksRoutes = require('./routes/marksRoutes');
 const resultRoutes = require('./routes/resultRoutes');
 const applicantsRoutes = require('./routes/applicantsRoutes');
 const authRoutes = require('./routes/authRoutes');
 const teacherMarksRoutes = require('./routes/teacherMarksRoutes');
 const teacherSectionSubjectRoutes = require("./routes/teacherSectionSubjectRoutes");
 const statsRoutes = require('./routes/statsRoutes');
 const promotionRoutes = require('./routes/promotionRoutes');
 const reportCardRoutes = require("./routes/reportCardRoutes");
 const graduationRoutes = require("./routes/graduationRoutes");
 const app = express();

 // 🛡️ Helmet helps secure your apps by setting various HTTP headers.
// It prevents XSS attacks, clickjacking, and hides 'X-Powered-By: Express'
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow loading images/files
}));

// Middleware
app.use(cors({
  origin: ["http://localhost:3000"," http://192.168.1.34:3000",'https://sms-backend-production-c9bf.up.railway.app'], // Adjust this to your frontend URL}));
  credentials: true, // Allow cookies to be sent
}));

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import table creation
const { createParentsTable } = require('./models/parentTable');
const { createSectionsTable} = require('./models/sectionModel');
const { createacademicYearTable} = require('./models/academicYearTable');
const { createTermsTable} = require('./models/termsTable');
const { createStudentTable } = require("./models/studentModel");
const { createSubjectsTable } = require('./models/subjectsTable');
const { createAnnouncementTable } = require('./models/announcmentTable');
const { createEnrollmentTable} = require('./models/enrollmentTable');
const { createMarksTable} = require('./models/marksTable');
const {createJobsTable} = require('./models/jobsTable');
const {createContactsTable} = require('./models/contactsTable');
const {createTeachesTable} = require('./models/teacherTable');
//const {createRsultsTable} = require('./models/resultTable');
const {createApplicantsTable} = require('./models/jobApplicationsTable');
const{createUserTable} = require('./models/userModel');
const { createTeacherSectionSubjectsTable } = require("./models/teacherSectionSubjectModel");
const { createGraduationRecordsTable } = require("./models/graduationModel");
// initialize the database and create tables
async function initializeDatabase() {
  try {
    // Test connection
    await db.query("SELECT 1");
    console.log(" Database connected");

    // Create tables
    
    await createUserTable();
    await createTeachesTable();
    await createParentsTable();
    await createStudentTable(); // create student table
    await createSectionsTable();
    await createacademicYearTable();
    await createTermsTable();
    await createSubjectsTable();
    await createAnnouncementTable();
    await createJobsTable();
    await createContactsTable();
    await createApplicantsTable();
    await createEnrollmentTable();
    await createMarksTable();
    await createTeacherSectionSubjectsTable();
    await createGraduationRecordsTable();
   // Add other table creation function calls here as needed
    console.log(" Database tables ready");
  } catch (error) {
    console.error(" Database initialization failed:", error);
    throw error;
  }
}

async function startServer() {
  try {
    await initializeDatabase();
    
  // Setup routes
  // Routes for students
 
 // new teachers
 app.use("/api/teacher", teacherRoutes);
 //routes for announcements
 app.use("/api/announcements", announcementsRoutes); // This should be a function, not an object
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
 // routes for job applicants
 app.use('/api/applicants', applicantsRoutes);
 
// routes for authentication
app.use('/api/auth', authRoutes);
// routes for teacherMarks
app.use('/api/teachers', teacherMarksRoutes);
// routes for teacher_section_subjects assignment
app.use("/api/teacher-section-subjects", teacherSectionSubjectRoutes);
// routes for stats
app.use('/api', statsRoutes);
// routes for promotion
app.use('/api/promote', promotionRoutes);
// routes for report cards
app.use("/api/report-cards", reportCardRoutes);
app.use("/api/graduation", graduationRoutes);

 //  Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  // If a request reaches here, it means no route matched
    app.use((req, res) => {
      res.status(404).json({ error: "The requested resource was not found on this server." });
    });

  // This catches every 'next(err)' or 'throw error' in your app
    app.use((err, req, res, next) => {
      console.error(`[SYSTEM ERROR] ${new Date().toLocaleString()}:`, err.stack);

      // In production, we don't leak the error stack trace to the user
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.status(err.status || 500).json({
        error: isProduction 
          ? "An internal security or server error occurred." 
          : err.message
      });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server secured and running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Critical: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();