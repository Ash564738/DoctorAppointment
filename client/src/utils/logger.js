// Client-side logger utility for React application
class ClientLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'warn';
    this.sessionId = this.generateSessionId();
    this.levels = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  getEnvironmentInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      url: window.location.href,
    };
  }

  getCurrentUser() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { id: payload.userId, role: payload.role };
      }
    } catch (error) {}
    return null;
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const user = this.getCurrentUser();
    const env = this.getEnvironmentInfo();

    return {
      logId: this.generateLogId(),
      timestamp,
      level: level.toUpperCase(),
      message,
      sessionId: this.sessionId,
      userId: user?.id || 'anonymous',
      userRole: user?.role || 'unknown',
      ...env,
      ...context,
    };
  }

  log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;
    const logData = this.formatMessage(level, message, context);

    // Enhanced error printing
    if (level === 'error' && context.error) {
      // Print error details clearly
      console.error('ERROR:', message);
      if (typeof context.error === 'object') {
        // Print error properties
        if (context.error.message) {
          console.error('Message:', context.error.message);
        }
        if (context.error.stack) {
          console.error('Stack:', context.error.stack);
        }
        // Print all properties for debugging
        console.error('Error object:', context.error);
      } else {
        // Print error as string
        console.error('Error:', context.error);
      }
      // Print the rest of the logData for context
      console.error('Context:', logData);
      if (!this.isDevelopment && context.error) this.sendErrorToServer(logData);
      return;
    }

    // For other levels, print as before
    switch (level) {
      case 'warn':
        console.warn('WARN:', message, logData);
        break;
      case 'info':
        console.info('INFO:', message, logData);
        break;
      case 'debug':
        console.log('DEBUG:', message, logData);
        break;
      case 'trace':
        console.trace('TRACE:', message, logData);
        break;
      default:
        console.log('LOG:', message, logData);
    }
  }

  error(message, error = null, context = {}) {
    this.log('error', message, { ...context, error: error ? this.sanitizeError(error) : null, source: context.source || 'client' });
  }

  warn(message, context = {}) {
    this.log('warn', message, { ...context, source: context.source || 'client' });
  }

  info(message, context = {}) {
    this.log('info', message, { ...context, source: context.source || 'client' });
  }

  debug(message, context = {}) {
    this.log('debug', message, { ...context, source: context.source || 'client' });
  }

  trace(message, context = {}) {
    this.log('trace', message, { ...context, source: context.source || 'client' });
  }

  // API logging with more detail
  api({ method, url, status, responseTime, requestData, responseData, tags = [], ...context }) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `API ${method} ${url} - ${status}`, {
      method,
      url,
      status,
      responseTime: `${responseTime}ms`,
      requestData: this.sanitizeData(requestData),
      responseData: this.sanitizeData(responseData),
      tags,
      source: 'api',
      ...context,
    });
  }

  // Add component/feature context
  component(message, component, context = {}) {
    this.debug(message, { ...context, component, source: 'component' });
  }

  // Add tags for grouping
  tag(message, tags = [], context = {}) {
    this.info(message, { ...context, tags, source: 'tagged' });
  }

  // Error boundary logging
  errorBoundary(error, errorInfo, componentStack) {
    this.error('React Error Boundary caught error', error, {
      errorInfo,
      componentStack,
      type: 'error-boundary',
      source: 'react',
    });
  }

  sanitizeError(error) {
    if (!error) return null;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      fileName: error.fileName,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber,
    };
  }

  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    const sanitized = JSON.parse(JSON.stringify(data));
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    } catch (error) {
      console.error('Failed to send error to server:', error);
    }
  }

  group(label, callback) {
    console.group(`${label}`);
    try {
      callback();
    } finally {
      console.groupEnd();
    }
  }

  table(data, label = '') {
    if (this.shouldLog('debug')) {
      if (label) console.log(`[DATA] ${label}:`);
      console.table(data);
    }
  }

  // Add this method for compatibility
  user() {
    return this.getCurrentUser();
  }
}

const logger = new ClientLogger();

export default logger;
