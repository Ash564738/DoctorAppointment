const { v4: uuidv4 } = require('uuid');
const { logger, http, error: logError, api } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();
  let userId = 'anonymous';
  let userRole = 'unknown';
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      if (decoded) {
        userId = decoded.userId || decoded.id || 'unknown';
        userRole = decoded.role || 'unknown';
      }
    }
  } catch (err) {
  }


  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody = null;

  res.json = function(data) {
    responseBody = data;
    return originalJson.call(this, data);
  };
  res.send = function(data) {
    if (!responseBody) {
      responseBody = data;
    }
    return originalSend.call(this, data);
  };
  res.on('finish', () => {
    const responseTime = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    api(req.method, req.originalUrl, statusCode, responseTime, {
      requestId: req.requestId,
      userId,
      userRole,
      responseBody: sanitizeResponseBody(responseBody),
      responseHeaders: sanitizeHeaders(res.getHeaders()),
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    });
    if (responseTime > 1000) {
      logger.warn(`Slow request detected`, {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime}ms`,
        userId,
        statusCode
      });
    }
  });
  res.on('error', (err) => {
    logError(`Request error for ${req.method} ${req.originalUrl}`, err, {
      requestId: req.requestId,
      userId,
      userRole,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

const errorLogger = (err, req, res, next) => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  let userId = 'anonymous';
  let userRole = 'unknown';
  
  try {
    if (req.user) {
      userId = req.user.id || req.user._id || 'unknown';
      userRole = req.user.role || 'unknown';
    }
  } catch (error) {
  }

  logError(`Unhandled error in ${req.method} ${req.originalUrl}`, err, {
    requestId: req.requestId || 'unknown',
    method: req.method,
    url: req.originalUrl,
    userId,
    userRole,
    responseTime: `${responseTime}ms`,
    headers: sanitizeHeaders(req.headers),
    query: req.query,
    body: sanitizeBody(req.body),
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

const dbLogger = {
  logQuery: (operation, collection, query, result, context = {}) => {
    const { db } = require('../utils/logger');
    db(operation, collection, query, result, context);
  },

  logError: (operation, collection, query, error, context = {}) => {
    logError(`Database ${operation} failed on ${collection}`, error, {
      operation,
      collection,
      query: JSON.stringify(query),
      ...context
    });
  }
};

const socketLogger = {
  logConnection: (socket) => {
    const { debug } = require('../utils/logger');
    debug('Socket connection', {
      socketId: socket.id,
      userId: socket.userId || 'anonymous',
      userRole: socket.userRole || 'unknown',
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent']
    });
  },

  logDisconnection: (socket, reason) => {
    const { debug } = require('../utils/logger');
    debug('Socket disconnection', {
      socketId: socket.id,
      userId: socket.userId || 'anonymous',
      reason,
      connectedTime: socket.connectedAt ? Date.now() - socket.connectedAt : 'unknown'
    });
  },

  logEvent: (socket, event, data) => {
    const { debug } = require('../utils/logger');
    debug(`Socket event: ${event}`, {
      socketId: socket.id,
      userId: socket.userId || 'anonymous',
      data: sanitizeSocketData(data)
    });
  },

  logError: (socket, event, error, data) => {
    logError(`Socket error in event: ${event}`, error, {
      socketId: socket.id,
      userId: socket.userId || 'anonymous',
      event,
      data: sanitizeSocketData(data)
    });
  }
};

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-auth-token'];
  
  return sanitized;
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = JSON.parse(JSON.stringify(body));
  if (sanitized.password) sanitized.password = '[REDACTED]';
  if (sanitized.token) sanitized.token = '[REDACTED]';
  if (sanitized.creditCard) sanitized.creditCard = '[REDACTED]';
  if (sanitized.ssn) sanitized.ssn = '[REDACTED]';
  
  return sanitized;
}

function sanitizeResponseBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  try {
    const sanitized = JSON.parse(JSON.stringify(body));
    if (sanitized.token) sanitized.token = '[REDACTED]';
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.user && sanitized.user.password) {
      sanitized.user.password = '[REDACTED]';
    }
    
    return sanitized;
  } catch (error) {
    return '[UNPARSEABLE_RESPONSE]';
  }
}

function sanitizeSocketData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Remove sensitive socket data
  if (sanitized.token) sanitized.token = '[REDACTED]';
  if (sanitized.password) sanitized.password = '[REDACTED]';
  
  return sanitized;
}

module.exports = {
  requestLogger,
  errorLogger,
  dbLogger,
  socketLogger
};
