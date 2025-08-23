const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const AuditLog = require('../models/auditLogModel');
const User = require('../models/userModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/doctorappointment');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Generate sample audit logs
const generateSampleAuditLogs = async () => {
  try {
    console.log('🔍 Fetching users from database...');
    const users = await User.find().limit(10);
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`✅ Found ${users.length} users`);

    // Sample audit log data
    const sampleActions = [
      {
        action: 'user_login',
        entityType: 'User',
        details: { description: 'Successful login via web portal' },
        success: true
      },
      {
        action: 'appointment_created',
        entityType: 'Appointment',
        details: { description: 'New appointment scheduled with doctor' },
        success: true
      },
      {
        action: 'medical_record_accessed',
        entityType: 'MedicalRecord',
        details: { description: 'Patient medical record accessed for review' },
        success: true
      },
      {
        action: 'prescription_created',
        entityType: 'Prescription',
        details: { description: 'New prescription issued to patient' },
        success: true
      },
      {
        action: 'payment_processed',
        entityType: 'Payment',
        details: { description: 'Payment processed successfully for appointment' },
        success: true
      },
      {
        action: 'unauthorized_access_attempt',
        entityType: 'System',
        details: { description: 'Failed login attempt with invalid credentials' },
        success: false
      },
      {
        action: 'user_updated',
        entityType: 'User',
        details: { description: 'User profile information updated' },
        success: true
      },
      {
        action: 'system_settings_changed',
        entityType: 'System',
        details: { description: 'System configuration settings modified' },
        success: true
      },
      {
        action: 'backup_created',
        entityType: 'System',
        details: { description: 'Automated daily system backup completed' },
        success: true
      },
      {
        action: 'data_exported',
        entityType: 'System',
        details: { description: 'Patient data exported for analysis' },
        success: true
      }
    ];

    console.log('🎯 Generating sample audit logs...');

    // Create 25 sample audit logs
    const auditLogs = [];
    for (let i = 0; i < 25; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomAction = sampleActions[Math.floor(Math.random() * sampleActions.length)];
      
      // Create date in the last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      const logData = {
        userId: randomUser._id,
        action: randomAction.action,
        entityType: randomAction.entityType,
        entityId: new mongoose.Types.ObjectId(),
        details: randomAction.details,
        success: randomAction.success,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        sessionId: `session_${i}_${Date.now()}`,
        metadata: {
          endpoint: '/api/test',
          method: 'GET'
        },
        category: AuditLog.categorizeAction(randomAction.action),
        severity: AuditLog.getSeverityLevel(randomAction.action),
        createdAt: date
      };

      auditLogs.push(logData);
    }

    // Insert all audit logs
    await AuditLog.insertMany(auditLogs);
    console.log(`✅ Successfully created ${auditLogs.length} sample audit logs`);

    // Show some statistics
    const totalLogs = await AuditLog.countDocuments();
    const recentLogs = await AuditLog.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    console.log(`📊 Total audit logs in database: ${totalLogs}`);
    console.log(`📊 Logs from last 7 days: ${recentLogs}`);

  } catch (error) {
    console.error('❌ Error generating audit logs:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await generateSampleAuditLogs();
  mongoose.connection.close();
  console.log('🔚 Database connection closed');
};

// Run the script
main().catch(console.error);
