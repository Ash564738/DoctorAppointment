const { info, error: logError } = require('../utils/logger');

// Log client-side errors
const logClientError = async (req, res) => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';
  
  try {
    const {
      error,
      errorInfo,
      timestamp,
      url,
      userAgent,
      userId,
      componentName,
      errorId
    } = req.body;

    // Log the client error with full context
    logError('Client-side error reported', new Error(error.message), {
      requestId,
      clientErrorId: errorId,
      componentName,
      userId: userId || 'anonymous',
      clientUrl: url,
      clientUserAgent: userAgent,
      clientTimestamp: timestamp,
      errorStack: error.stack,
      errorName: error.name,
      componentStack: errorInfo?.componentStack,
      serverTimestamp: new Date().toISOString(),
      processingTime: `${Date.now() - startTime}ms`
    });

    // In production, you might want to:
    // 1. Store errors in a database for analysis
    // 2. Send alerts for critical errors
    // 3. Aggregate error metrics
    // 4. Forward to external monitoring services

    res.json({
      success: true,
      message: 'Client error logged successfully',
      errorId: errorId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError('Failed to log client error', error, {
      requestId,
      body: req.body,
      processingTime: `${Date.now() - startTime}ms`
    });

    res.status(500).json({
      success: false,
      message: 'Failed to log client error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get error statistics (for admin dashboard)
const getErrorStats = async (req, res) => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';
  
  try {
    // This would typically query a database of stored errors
    // For now, return mock data
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByComponent: {},
      recentErrors: [],
      errorTrends: []
    };

    info('Error statistics requested', {
      requestId,
      userId: req.locals,
      processingTime: `${Date.now() - startTime}ms`
    });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logError('Failed to get error statistics', error, {
      requestId,
      userId: req.locals,
      processingTime: `${Date.now() - startTime}ms`
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get error statistics',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  logClientError,
  getErrorStats
};
