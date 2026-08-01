
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require('cookie-parser');
const compression = require("compression");
const rateLimit = require("express-rate-limit"); // 🔹 Import rate limiter
const helmet = require('helmet'); // 🔹 Import Helmet for security
const { Server } = require('socket.io');
const http = require('http');
const { sanitizeInput } = require("./middleware/sanitizeMiddleware");  // 
const setupSwagger = require('./config/swagger');
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
const roleRoutes = require('./routes/roleRoutes');
const graduationRoutes = require("./routes/graduationRoutes");
const attendanceRoutes = require("./routes/teacherAttendanceRoutes"); // routes for teacher attendance marking and summary
const studentAttendance = require("./routes/studentAttendanceRoutes"); // routes for student attendance history and summary
const adminAttendanceRoutes = require("./routes/adminAttendanceRoutes"); // routes for admin attendance dashboard and report export
const messageRoutes = require("./routes/messageRoutes"); // routes for chat messages
const app = express();

// 1. Create HTTP server FIRST
const server = http.createServer(app);

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://192.168.1.34:3000",
  "https://sms-backend-production-c9bf.up.railway.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman, or same-origin Swagger)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
//app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
// 3. Initialize Socket.io using the HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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

  // --- Chat Application Socket Logic ---
  socket.on('join_chat', (userId) => {
    socket.join(`user_${userId}`);
    socket.broadcast.emit('user_online', { userId });
  });

  socket.on('typing', (data) => {
    socket.to(`user_${data.receiverId}`).emit('user_typing', {
      senderId: data.senderId,
      isTyping: data.isTyping
    });
  });

  socket.on('mark_as_read', async (data) => {
    try {
      const prisma = require('./config/prisma');
      await prisma.messages.updateMany({
        where: {
          senderId: parseInt(data.senderId, 10),
          receiverId: parseInt(data.receiverId, 10), // receiverId is usually the current user socket
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
      socket.to(`user_${data.senderId}`).emit('messages_read', {
        receiverId: parseInt(data.receiverId, 10),
        readAt: new Date()
      });
    } catch (error) {
      console.error('Error marking messages as read via socket:', error);
    }
  });
  // -------------------------------------

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

// Enable gzip compression
app.use(compression());

// Prevent brute-force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests from this IP. Please try again later.",
});

app.use("/api", apiLimiter);


// app.use(cors({
//   origin: ["http://localhost:3000"," http://192.168.1.34:3000",'https://sms-backend-production-c9bf.up.railway.app'], // Adjust this to your frontend URL}));
//   credentials: true, // Allow cookies to be sent
// }));

const prisma = require('./config/prisma');

async function startServer() {
  try {
    // Verify database connection via Prisma
    await prisma.$connect();
    console.log(" Database connected via Prisma ORM");

    // Initialize core roles
    if (prisma.roles) {
      const coreRoles = ['admin', 'teacher', 'student', 'parents'];
      for (const roleName of coreRoles) {
        await prisma.roles.upsert({
          where: { name: roleName },
          update: {},
          create: { name: roleName, status: 'active' }
        });
      }
      console.log(" Core roles verified in DB");
    } else {
      console.warn("⚠️ prisma.roles is not available yet. Please run 'npx prisma db push' to generate the client.");
    }

    // Setup Swagger UI documentation
    setupSwagger(app);

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
    // routes for roles
    app.use("/api/roles", roleRoutes);
    // routes for teacher attendance marking and summary
    app.use("/api/teacher-attendance", attendanceRoutes);
    // routes for student attendance history and summary
    app.use("/api/student/attendance", studentAttendance);
    // routes for admin attendance dashboard and report export
    app.use('/api/admin/attendance', adminAttendanceRoutes);
    // routes for chat messages
    app.use('/api/messages', messageRoutes);

    //  Serve uploaded files
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));
    // If a request reaches here, it means no route matched
    app.use((req, res) => {
      res.status(404).json({ error: "The requested resource was not found on this server." });
    });

    // This catches every 'next(err)' or 'throw error' in your app
    app.use((err, req, res, next) => {
      const statusCode = err.statusCode || err.status || 500;
      console.error(`[SYSTEM ERROR] ${new Date().toLocaleString()}:`, err.message || err);

      const isProduction = process.env.NODE_ENV === 'production';

      res.status(statusCode).json({
        success: false,
        error: (isProduction && statusCode === 500)
          ? "An internal server error occurred."
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
