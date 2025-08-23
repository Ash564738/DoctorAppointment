const AuditLog = require("../models/auditLogModel");
const User = require("../models/userModel");
const logger = require("../utils/logger");

// Get audit logs with filtering and pagination
const getAuditLogs = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      category,
      severity,
      success,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (success !== undefined) filter.success = success === 'true';

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search in details or error messages
    if (search) {
      filter.$or = [
        { 'details.description': { $regex: search, $options: 'i' } },
        { errorMessage: { $regex: search, $options: 'i' } },
        { 'metadata.endpoint': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const auditLogs = await AuditLog.find(filter)
      .populate('userId', 'firstname lastname email role')
      .populate('targetUserId', 'firstname lastname email role')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    // Get statistics
    const stats = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          successfulActions: { $sum: { $cond: ['$success', 1, 0] } },
          failedActions: { $sum: { $cond: ['$success', 0, 1] } },
          criticalEvents: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highSeverityEvents: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } }
        }
      }
    ]);

    // Get category breakdown
    const categoryStats = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: {
        logs: auditLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        statistics: stats[0] || {
          totalLogs: 0,
          successfulActions: 0,
          failedActions: 0,
          criticalEvents: 0,
          highSeverityEvents: 0
        },
        categoryBreakdown: categoryStats
      }
    });

  } catch (error) {
    logger.error("Error fetching audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message
    });
  }
};

// Get audit log by ID
const getAuditLogById = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { logId } = req.params;

    const auditLog = await AuditLog.findById(logId)
      .populate('userId', 'firstname lastname email role pic')
      .populate('targetUserId', 'firstname lastname email role pic');

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Audit log retrieved successfully",
      data: auditLog
    });

  } catch (error) {
    logger.error("Error fetching audit log:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
      error: error.message
    });
  }
};

// Get user activity logs
const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.userId;
    const isAdmin = req.user.isAdmin;

    // Users can only view their own logs unless they're admin
    if (userId !== requestingUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own activity logs"
      });
    }

    const {
      page = 1,
      limit = 20,
      action,
      category,
      startDate,
      endDate
    } = req.query;

    const filter = { userId };

    if (action) filter.action = action;
    if (category) filter.category = category;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const userLogs = await AuditLog.find(filter)
      .select('-ipAddress -userAgent -sessionId') // Hide sensitive info for non-admin
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "User activity logs retrieved successfully",
      data: {
        logs: userLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching user activity logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user activity logs",
      error: error.message
    });
  }
};

// Get security events
const getSecurityEvents = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const {
      page = 1,
      limit = 50,
      severity,
      days = 30
    } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const filter = {
      category: 'security',
      createdAt: { $gte: startDate }
    };

    if (severity) filter.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const securityEvents = await AuditLog.find(filter)
      .populate('userId', 'firstname lastname email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(filter);

    // Get severity breakdown
    const severityStats = await AuditLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Security events retrieved successfully",
      data: {
        events: securityEvents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        severityBreakdown: severityStats,
        period: `${days} days`
      }
    });

  } catch (error) {
    logger.error("Error fetching security events:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch security events",
      error: error.message
    });
  }
};

// Export audit logs
const exportAuditLogs = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const {
      format = 'json',
      startDate,
      endDate,
      category,
      severity
    } = req.query;

    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (category) filter.category = category;
    if (severity) filter.severity = severity;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'firstname lastname email role')
      .populate('targetUserId', 'firstname lastname email role')
      .sort({ createdAt: -1 })
      .limit(10000); // Limit to prevent memory issues

    // Log the export action
    await AuditLog.createLog({
      userId: req.userId,
      action: 'data_exported',
      entityType: 'System',
      details: {
        description: 'Audit logs exported',
        recordCount: logs.length,
        filters: filter,
        format
      },
      category: 'system_administration',
      severity: 'medium'
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'Date', 'User', 'Action', 'Entity Type', 'Category', 'Severity', 
        'Success', 'IP Address', 'Details'
      ];
      
      const csvRows = logs.map(log => [
        log.createdAt.toISOString(),
        log.userId ? `${log.userId.firstname} ${log.userId.lastname}` : 'Unknown',
        log.action,
        log.entityType,
        log.category,
        log.severity,
        log.success ? 'Yes' : 'No',
        log.ipAddress || 'N/A',
        JSON.stringify(log.details)
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      return res.send(csvContent);
    }

    // Default to JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
    return res.json({
      exportDate: new Date(),
      totalRecords: logs.length,
      filters: filter,
      logs
    });

  } catch (error) {
    logger.error("Error exporting audit logs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export audit logs",
      error: error.message
    });
  }
};

// Create audit log middleware
const auditMiddleware = (action, entityType, options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;

      // Create audit log
      if (req.userId) {
        const logData = {
          userId: req.userId,
          action,
          entityType,
          entityId: options.getEntityId ? options.getEntityId(req) : req.params.id,
          details: {
            description: options.description || `${action} performed on ${entityType}`,
            requestBody: options.logRequestBody ? req.body : undefined,
            responseStatus: res.statusCode,
            ...options.additionalDetails
          },
          success,
          errorMessage: success ? undefined : (typeof data === 'string' ? data : JSON.stringify(data)),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          category: options.category || 'other',
          severity: options.severity || 'medium',
          metadata: {
            endpoint: req.originalUrl,
            method: req.method,
            responseTime
          }
        };

        AuditLog.createLog(logData);
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getUserActivityLogs,
  getSecurityEvents,
  exportAuditLogs,
  auditMiddleware
};
