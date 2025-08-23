const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User management
      'user_created', 'user_updated', 'user_deleted', 'user_login', 'user_logout',
      'password_changed', 'password_reset', 'role_changed',
      
      // Doctor management
      'doctor_approved', 'doctor_rejected', 'doctor_suspended',
      
      // Appointment management
      'appointment_created', 'appointment_updated', 'appointment_cancelled',
      'appointment_completed', 'appointment_no_show',
      
      // Medical records
      'medical_record_created', 'medical_record_updated', 'medical_record_deleted',
      'medical_record_accessed',
      
      // Prescription management
      'prescription_created', 'prescription_updated', 'prescription_deleted',
      
      // Payment & billing
      'payment_processed', 'payment_refunded', 'invoice_generated',
      
      // System administration
      'system_settings_changed', 'backup_created', 'backup_restored',
      'data_exported', 'data_imported',
      
      // Security events
      'unauthorized_access_attempt', 'suspicious_activity_detected',
      'data_breach_suspected', 'security_setting_changed',
      
      // Communication
      'message_sent', 'notification_sent', 'email_sent', 'sms_sent',
      
      // File operations
      'file_uploaded', 'file_downloaded', 'file_deleted',
      
      // Other
      'other'
    ],
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: [
      'User', 'Appointment', 'MedicalRecord', 'Prescription', 'Payment',
      'Notification', 'ChatRoom', 'VoiceNote', 'HealthMetrics',
      'FamilyMember', 'Insurance', 'Shift', 'Leave', 'Overtime',
      'System', 'File', 'Other'
    ],
    index: true
  },
  entityId: {
    type: mongoose.SchemaTypes.ObjectId,
    index: true
  },
  targetUserId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    index: true // For actions performed on other users
  },
  details: {
    type: Object,
    required: true
  },
  oldValues: {
    type: Object // For update operations
  },
  newValues: {
    type: Object // For update operations
  },
  ipAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  userAgent: {
    type: String,
    maxLength: 500
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  errorMessage: {
    type: String,
    maxLength: 1000
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    enum: [
      'authentication', 'authorization', 'data_access', 'data_modification',
      'system_administration', 'user_management', 'communication',
      'financial', 'medical', 'security', 'other'
    ],
    default: 'other',
    index: true
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'api', 'system', 'admin'],
    default: 'web'
  },
  sessionId: {
    type: String,
    index: true
  },
  metadata: {
    requestId: String,
    endpoint: String,
    method: String,
    responseTime: Number,
    fileSize: Number,
    additionalData: Object
  }
}, {
  timestamps: true,
  // Disable modification of audit logs
  strict: 'throw'
});

// Compound indexes for efficient queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ category: 1, severity: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, severity: 1 });
auditLogSchema.index({ createdAt: -1 }); // For time-based queries

// TTL index to automatically delete old logs (optional - adjust as needed)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

// Static method to create audit log
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid disrupting main operations
    return null;
  }
};

// Static method to log user action
auditLogSchema.statics.logUserAction = async function(userId, action, entityType, entityId, details, req = null) {
  const logData = {
    userId,
    action,
    entityType,
    entityId,
    details,
    category: this.categorizeAction(action),
    severity: this.getSeverityLevel(action)
  };

  if (req) {
    logData.ipAddress = req.ip || req.connection.remoteAddress;
    logData.userAgent = req.get('User-Agent');
    logData.sessionId = req.sessionID;
    logData.metadata = {
      endpoint: req.originalUrl,
      method: req.method
    };
  }

  return this.createLog(logData);
};

// Static method to categorize actions
auditLogSchema.statics.categorizeAction = function(action) {
  const categories = {
    authentication: ['user_login', 'user_logout', 'password_changed', 'password_reset'],
    authorization: ['role_changed', 'unauthorized_access_attempt'],
    user_management: ['user_created', 'user_updated', 'user_deleted', 'doctor_approved', 'doctor_rejected'],
    medical: ['medical_record_created', 'medical_record_updated', 'prescription_created'],
    financial: ['payment_processed', 'payment_refunded', 'invoice_generated'],
    security: ['suspicious_activity_detected', 'data_breach_suspected', 'security_setting_changed'],
    system_administration: ['system_settings_changed', 'backup_created', 'data_exported']
  };

  for (const [category, actions] of Object.entries(categories)) {
    if (actions.includes(action)) return category;
  }
  
  return 'other';
};

// Static method to determine severity level
auditLogSchema.statics.getSeverityLevel = function(action) {
  const criticalActions = ['data_breach_suspected', 'unauthorized_access_attempt', 'user_deleted'];
  const highActions = ['role_changed', 'doctor_approved', 'doctor_rejected', 'system_settings_changed'];
  const mediumActions = ['user_created', 'payment_processed', 'medical_record_accessed'];

  if (criticalActions.includes(action)) return 'critical';
  if (highActions.includes(action)) return 'high';
  if (mediumActions.includes(action)) return 'medium';
  
  return 'low';
};

// Prevent modification of audit logs
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs cannot be modified');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
