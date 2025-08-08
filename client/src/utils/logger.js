// Client-side logger utility for React application
class ClientLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // Set default log level to 'warn' to reduce noise, only show warnings and errors
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'warn';
    this.sessionId = this.generateSessionId();

    // Log levels hierarchy
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    // Initialize performance tracking
    this.performanceMarks = new Map();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const user = this.getCurrentUser();
    
    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: user?.id || 'anonymous',
      userRole: user?.role || 'unknown',
      ...context
    };
  }

  getCurrentUser() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { id: payload.userId, role: payload.role };
      }
    } catch (error) {
      // Ignore token parsing errors
    }
    return null;
  }

  // Core logging methods
  error(message, error = null, context = {}) {
    if (!this.shouldLog('error')) return;
    
    const logData = this.formatMessage('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        fileName: error.fileName,
        lineNumber: error.lineNumber,
        columnNumber: error.columnNumber
      } : null
    });

    console.error('🔴 ERROR:', message, logData);
    
    // Send critical errors to server in production
    if (!this.isDevelopment && error) {
      this.sendErrorToServer(logData);
    }
  }

  warn(message, context = {}) {
    if (!this.shouldLog('warn')) return;
    
    const logData = this.formatMessage('warn', message, context);
    console.warn('🟡 WARN:', message, logData);
  }

  info(message, context = {}) {
    if (!this.shouldLog('info')) return;
    
    const logData = this.formatMessage('info', message, context);
    console.info('🔵 INFO:', message, logData);
  }

  debug(message, context = {}) {
    if (!this.shouldLog('debug')) return;
    
    const logData = this.formatMessage('debug', message, context);
    console.log('🟢 DEBUG:', message, logData);
  }

  trace(message, context = {}) {
    if (!this.shouldLog('trace')) return;
    
    const logData = this.formatMessage('trace', message, context);
    console.trace('⚪ TRACE:', message, logData);
  }

  // Specialized logging methods (simplified)
  api(method, url, status, responseTime, data = {}, context = {}) {
    // Only log errors and warnings
    if (status >= 400) {
      const level = status >= 500 ? 'error' : 'warn';
      this[level](`API ${method} ${url} - ${status}`, {
        method,
        url,
        status,
        responseTime: `${responseTime}ms`,
        ...context
      });
    }
  }

  // No-op methods for backward compatibility (removed functionality)
  component() { /* no-op */ }
  startPerformanceTimer() { /* no-op */ }
  endPerformanceTimer() { /* no-op */ }
  socket() { /* no-op */ }
  chat() { /* no-op */ }
  user() { /* no-op */ }
  navigation() { /* no-op */ }
  performance() { /* no-op */ }
  form() { /* no-op */ }



  // Form interaction logging
  form(formName, action, fieldData = {}, context = {}) {
    this.debug(`Form ${formName}: ${action}`, {
      form: formName,
      action,
      fields: Object.keys(fieldData),
      ...context
    });
  }

  // Error boundary logging
  errorBoundary(error, errorInfo, componentStack) {
    this.error('React Error Boundary caught error', error, {
      errorInfo,
      componentStack,
      type: 'error-boundary'
    });
  }

  // Utility methods
  sanitizeProps(props) {
    if (!props || typeof props !== 'object') return props;
    
    const sanitized = { ...props };
    // Remove sensitive data
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.creditCard;
    
    return sanitized;
  }

  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove sensitive fields recursively
    const removeSensitiveFields = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          removeSensitiveFields(obj[key]);
        } else if (['password', 'token', 'creditCard', 'ssn'].includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        }
      }
      return obj;
    };
    
    return removeSensitiveFields(sanitized);
  }

  async sendErrorToServer(errorData) {
    try {
      await fetch('/api/logs/client-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });
    } catch (error) {
      console.error('Failed to send error to server:', error);
    }
  }

  // Group related logs
  group(label, callback) {
    console.group(`📁 ${label}`);
    try {
      callback();
    } finally {
      console.groupEnd();
    }
  }

  // Table logging for structured data
  table(data, label = '') {
    if (this.shouldLog('debug')) {
      if (label) console.log(`📊 ${label}:`);
      console.table(data);
    }
  }
}

// Create singleton instance
const logger = new ClientLogger();

export default logger;
