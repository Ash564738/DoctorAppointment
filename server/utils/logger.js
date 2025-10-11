const winston = require('winston');
const path = require('path');
const fs = require('fs');
const logLevels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const logColors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'blue' };
winston.addColors(logColors);
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `[${timestamp}] ${level}: ${message}`;
    if (meta.userId) msg += ` | User: ${meta.userId}`;
    if (meta.requestId) msg += ` | Req: ${meta.requestId}`;
    if (meta.statusCode) msg += ` | Status: ${meta.statusCode}`;
    if (meta.endpoint) msg += ` | Endpoint: ${meta.endpoint}`;
    if (meta.error && meta.error.message) msg += ` | Error: ${meta.error.message}`;
    return msg;
  })
);
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  defaultMeta: { service: 'doctor-appointment-api' },
  transports: [
    new winston.transports.Console({ format: consoleFormat, level: process.env.LOG_LEVEL || 'info' }),
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', format: fileFormat, maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log'), format: fileFormat, maxsize: 5242880, maxFiles: 5 }),
  ],
});
const helpers = {
  error: (message, error = null, context = {}) =>
    logger.error({ message, ...context, error: error ? { message: error.message, stack: error.stack } : undefined }),

  warn: (message, context = {}) => logger.warn({ message, ...context }),

  info: (message, context = {}) => logger.info({ message, ...context }),

  debug: (message, context = {}) => logger.debug({ message, ...context }),

  http: (method, endpoint, statusCode, responseTime, context = {}) =>
    logger.http({ message: `HTTP ${method} ${endpoint}`, method, endpoint, statusCode, responseTime: `${responseTime}ms`, ...context }),

  api: (method, endpoint, statusCode, responseTime, context = {}) =>
    logger.info({ message: `API ${method} ${endpoint}`, method, endpoint, statusCode, responseTime: `${responseTime}ms`, ...context }),

  auth: (action, userId, success, context = {}) =>
    logger.info({ message: `Auth ${action}: ${success ? 'SUCCESS' : 'FAILED'}`, action, userId, success, ...context }),

  db: (operation, collection, query = {}, result = null, context = {}) =>
    logger.info({ message: `DB ${operation} on ${collection}`, operation, collection, query, result, ...context }),

  payment: (action, amount, userId, success, context = {}) =>
    logger.info({ message: `Payment ${action}: ${success ? 'SUCCESS' : 'FAILED'}`, action, amount, userId, success, ...context }),
};

module.exports = { logger, ...helpers };