
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const db = require("./config/db");
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // 🔹 Import Helmet for security
const { Server } = require('socket.io');
const http = require('http');

 const teacherRoutes = require('./routes/teacherRoutes'); //for add new teacher route
 const announcementsRoutes = require("./routes/announcementRoutes"); // import announcement route
 const jobPostRoutes = require("./routes/jobPostRoutes");  // for post jobs route
 const contactRoutes = require("./routes/contactRoutes"); // for contact message route
 const subjectsRoutes = require("./routes/subjectsRoutes"); // for subjects route
 const parentRoutes = require('./routes/parentRoutes'); // for parents route
 const sectionsRoutes = require("./routes/sectionsRoutes");  // for sections route
 const addStudentRoutes = require("./routes/addStudentRoutes"); // for add student route and profile
 const studentRoutes = require("./routes/studentRoutes"); // for student dashboard, marks, report card, and filters
 const studentListRoute = require("./routes/studentListRoute");
 const termRoutes = require('./routes/termRoutes'); // Import the router
 const classesRoutes = require('./routes/classesRoutes');
 const academicYearRoutes = require('./routes/academicYearRoutes'); // route for academic-year 
 const enrollmentRoutes = require('./routes/enrollmentRoutes'); // enrollments route
 const marksRoutes = require('./routes/marksRoutes');  // admin  mark managments route 
 const resultRoutes = require('./routes/resultRoutes');
 const applicantsRoutes = require('./routes/applicantsRoutes'); // job applicants route
 const authRoutes = require('./routes/authRoutes');  // route for authentication 
 const teacherMarksRoutes = require('./routes/teacherMarksRoutes'); // routes for teacher/addmark api
 const teacherSectionSubjectRoutes = require("./routes/teacherSectionSubjectRoutes"); // route for teacher-section-subject assignment
 const statsRoutes = require('./routes/statsRoutes'); // admin dahboard stats route
 const promotionRoutes = require('./routes/promotionRoutes');
 const reportCardRoutes = require("./routes/reportCardRoutes");
 const graduationRoutes = require("./routes/graduationRoutes");
 const attendanceRoutes = require("./routes/teacherAttendanceRoutes"); // routes for teacher attendance marking and summary
 const studentAttendance = require("./routes/studentAttendanceRoutes"); // routes for student attendance history and summary
 const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes"); // routes for admin attendance dashboard and report export
 const app = express();

 // 1. Create HTTP server FIRST
const server = http.createServer(app);
// 3. Initialize Socket.io using the HTTP server
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.1.34:3000", "https://sms-backend-production-c9bf.up.railway.app"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  // Add these options for better compatibility
  allowEIO3: true,
  transports: ['websocket', 'polling']
});
// 4. Make socket instance available to all routes
app.set('socketio', io);


// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  // Handle joining role-based rooms
  socket.on('join', (role) => {
    console.log(`📢 Socket ${socket.id} joining room: ${role}`);
    socket.join(role);
    
    // Confirm join
    socket.emit('joined', { role, success: true });
  });

  // Handle leaving rooms
  socket.on('leave', (role) => {
    console.log(`📢 Socket ${socket.id} leaving room: ${role}`);
    socket.leave(role);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

 // Helmet helps secure your apps by setting various HTTP headers.
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
const { createAttendanceTable } = require("./models/attendanceModel");
const { createAttendanceSummaryTable } = require("./models/attendanceSummaryModel");
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
    await createAttendanceTable();
    await createAttendanceSummaryTable();
  
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
    
  // Routes for students
 
 // add new teachers and profile
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
 // routes for students dashboard and view marks pages
 app.use("/api/students", studentRoutes)
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
 //routes for admin marks 
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
// routes for admin stats dashboard charts
app.use('/api', statsRoutes);
// routes for promotion
app.use('/api/promote', promotionRoutes);
// routes for report cards
app.use("/api/report-cards", reportCardRoutes);
app.use("/api/graduation", graduationRoutes);
// routes for teacher attendance marking and summary
app.use("/api/teacher-attendance", attendanceRoutes);
// routes for student attendance history and summary
app.use("/api/student/attendance", studentAttendance);
// routes for admin attendance dashboard and report export
app.use('/api/admin/attendance', adminAttendanceRoutes);

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
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server secured and running on port ${PORT}`);
      console.log(`🔌 WebSockets enabled and listening for events`);
    });
  } catch (error) {
    console.error("Critical: Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
