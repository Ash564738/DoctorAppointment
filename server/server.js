process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
require("dotenv").config();
require("./db/conn");
const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const { logger, info, error: logError } = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const app = express();
const port = process.env.PORT || 5016;
require("./db/conn")
  .then(() => console.log("MongoDB connection established"))
  .catch(err => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://m.stripe.network",
        "https://js.stripe.com",
        "https://stripe.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://m.stripe.network",
        "https://js.stripe.com",
        "https://stripe.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://m.stripe.network",
        "https://js.stripe.com",
        "https://stripe.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://js.stripe.com",
        "https://m.stripe.network",
        "https://stripe.com"
      ],
      connectSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://m.stripe.network",
        "https://stripe.com"
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://m.stripe.network",
        "https://stripe.com"
      ],
    },
  },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => process.env.NODE_ENV === 'development'
});
app.use('/api/', apiLimiter);
app.use(mongoSanitize());
app.use(xss());
app.use(compression());

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  preflightContinue: false
};
info('CORS configuration initialized', { corsOptions });
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/doctor", require("./routes/doctorRoutes"));
app.use("/api/patient", require("./routes/patientRoutes"));
app.use("/api/appointment", require("./routes/appointRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/prescription", require("./routes/prescriptionRoutes"));
app.use("/api/family-members", require("./routes/familyMemberRoutes"));
app.use("/api/video-consultation", require("./routes/videoConsultationRoutes"));
app.use("/api/waitlist", require("./routes/waitlistRoutes"));
app.use("/api/medical-record", require("./routes/medicalRecordRoutes"));
app.use("/api/health-metrics", require("./routes/healthMetricsRoutes"));
app.use("/api/recurring-appointments", require("./routes/recurringAppointmentRoutes"));
app.use("/api/walk-in-queue", require("./routes/walkInQueueRoutes"));
app.use("/api/ratings", require("./routes/ratingRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/admin/analytics", require("./routes/adminAnalyticsRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/notification", require("./routes/notificationRouter"));
app.use("/api/insurance", require('./routes/insuranceRoutes'));
app.use("/api/logs", require("./routes/logRoutes"));
app.use("/api/shift", require("./routes/shiftRoutes"));
app.use("/api/shift-swap", require("./routes/shiftSwapRoutes"));
app.use("/api/overtime", require("./routes/overtimeRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));
app.use("/api/branches", require("./routes/branchRoutes"));

app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});
app.use(errorLogger);

const server = app.listen(port, () => {
  info(`Server started successfully on port ${port}`, {
    port,
    environment: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI ? 'Connected' : 'Not configured',
    timestamp: new Date().toISOString()
  });
  console.log(`Server is running on port ${port}`);
});
const { Server } = require("socket.io");
const { authenticateSocket, handleConnection } = require("./socket/socketHandler");
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
io.use(authenticateSocket);
io.on('connection', handleConnection(io));
info('Socket.io server initialized successfully', {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});