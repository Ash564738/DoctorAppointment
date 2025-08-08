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
const { cacheMiddleware } = require('./middleware/cache');
require("dotenv").config();
require("./db/conn");
const userRouter = require("./routes/userRoutes");
const doctorRouter = require("./routes/doctorRoutes");
const appointRouter = require("./routes/appointRoutes");
const notificationRouter = require("./routes/notificationRouter");
const paymentRouter = require("./routes/paymentRoutes");
const chatRouter = require("./routes/chatRoutes");
const logRouter = require("./routes/logRoutes");
const healthRouter = require("./routes/healthRoutes");

const app = express();
const port = process.env.PORT || 5015;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// Rate limiting - More permissive for development
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests for dev, 100 for production
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV === 'development';
  }
});

app.use('/api/', apiLimiter);

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  preflightContinue: false
};

info('CORS configuration initialized', { corsOptions });
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// API routes
app.use("/api/user", userRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/appointment", appointRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/chat", chatRouter);
app.use("/api/logs", logRouter);
app.use("/api", healthRouter);

// Serve static files
app.use(express.static(path.join(__dirname, "../client/build")));

// Catch-all handler for React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

// Error handling middleware (must be last)
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

// Socket.io setup
const { Server } = require("socket.io");
const { authenticateSocket, handleConnection } = require("./socket/socketHandler");

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket authentication middleware
io.use(authenticateSocket);

// Handle socket connections
io.on('connection', handleConnection(io));

info('Socket.io server initialized successfully', {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});


