const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(logColors);

// Create custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, userId, requestId, ...meta }) => {
    let logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (service) logMessage += ` | Service: ${service}`;
    if (userId) logMessage += ` | User: ${userId}`;
    if (requestId) logMessage += ` | Request: ${requestId}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` | Meta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Create custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels: logLevels,
  defaultMeta: { service: 'doctor-appointment-api' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper functions for different log levels
const loggerHelpers = {
  // Error logging with stack trace
  error: (message, error = null, context = {}) => {
    const logData = {
      message,
      ...context,
    };
    
    if (error) {
      logData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }
    
    logger.error(logData);
  },

  // Warning logging
  warn: (message, context = {}) => {
    logger.warn({ message, ...context });
  },

  // Info logging
  info: (message, context = {}) => {
    logger.info({ message, ...context });
  },

  // HTTP request logging
  http: (message, context = {}) => {
    logger.http({ message, ...context });
  },

  // Debug logging
  debug: (message, context = {}) => {
    logger.debug({ message, ...context });
  },

  // Database operation logging
  database: (operation, collection, query = {}, result = null, context = {}) => {
    logger.info({
      message: `Database ${operation}`,
      operation,
      collection,
      query: JSON.stringify(query),
      result: result ? `${result.length || result.modifiedCount || 'success'}` : 'null',
      ...context
    });
  },

  // API endpoint logging
  api: (method, endpoint, statusCode, responseTime, context = {}) => {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    logger[level]({
      message: `API ${method} ${endpoint}`,
      method,
      endpoint,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...context
    });
  },

  // Socket event logging
  socket: (event, data = {}, context = {}) => {
    logger.info({
      message: `Socket event: ${event}`,
      event,
      data: JSON.stringify(data),
      ...context
    });
  },

  // Authentication logging
  auth: (action, userId, success, context = {}) => {
    const level = success ? 'info' : 'warn';
    logger[level]({
      message: `Auth ${action}: ${success ? 'SUCCESS' : 'FAILED'}`,
      action,
      userId,
      success,
      ...context
    });
  },

  // Chat operation logging
  chat: (action, chatRoomId, userId, context = {}) => {
    logger.info({
      message: `Chat ${action}`,
      action,
      chatRoomId,
      userId,
      ...context
    });
  },

  // Payment operation logging
  payment: (action, amount, userId, success, context = {}) => {
    const level = success ? 'info' : 'error';
    logger[level]({
      message: `Payment ${action}: ${success ? 'SUCCESS' : 'FAILED'}`,
      action,
      amount,
      userId,
      success,
      ...context
    });
  }
};

module.exports = {
  logger,
  ...loggerHelpers
};
