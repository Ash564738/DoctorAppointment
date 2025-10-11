/**
 * Leave Request Creation Script
 * 
 * Creates sample leave requests for doctors to test the leave management system.
 * Generates various types of leave requests with realistic dates and durations.
 */

const mongoose = require('mongoose');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const LeaveRequest = require('../models/leaveRequestModel');
require('dotenv').config();

// Human-friendly display types used for generating data
const LEAVE_TYPES = [
  'Sick Leave',
  'Annual Leave', 
  'Emergency Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Study Leave',
  'Compassionate Leave',
  'Medical Leave',
  'Personal Leave',
  'Conference Leave'
];

// Map display types to schema enum values in leaveRequestModel
// Allowed enums: ['sick','vacation','personal','emergency','maternity','paternity','bereavement']
const LEAVE_TYPE_MAP = {
  'Sick Leave': 'sick',
  'Medical Leave': 'sick',
  'Annual Leave': 'vacation',
  'Emergency Leave': 'emergency',
  'Maternity Leave': 'maternity',
  'Paternity Leave': 'paternity',
  'Compassionate Leave': 'bereavement',
  'Personal Leave': 'personal',
  'Study Leave': 'personal',
  'Conference Leave': 'personal'
};

const LEAVE_REASONS = {
  'Sick Leave': [
    'Flu and fever',
    'Food poisoning recovery',
    'Minor surgery recovery',
    'Medical treatment',
    'Chronic condition management'
  ],
  'Annual Leave': [
    'Family vacation',
    'Personal time off',
    'Holiday with family',
    'Rest and relaxation',
    'Pre-planned vacation'
  ],
  'Emergency Leave': [
    'Family emergency',
    'Urgent personal matter',
    'Medical emergency in family',
    'Unexpected circumstances',
    'Critical personal issue'
  ],
  'Maternity Leave': [
    'Maternity leave as per policy',
    'Post-delivery recovery',
    'Newborn care',
    'Medical advice for rest'
  ],
  'Paternity Leave': [
    'Paternity leave for newborn',
    'Supporting spouse and newborn',
    'Family bonding time'
  ],
  'Study Leave': [
    'Medical conference attendance',
    'Continuing education program',
    'Certification course',
    'Research presentation',
    'Training workshop'
  ],
  'Medical Leave': [
    'Surgery and recovery',
    'Chronic illness treatment',
    'Medical procedure',
    'Health condition management',
    'Doctor recommended rest'
  ]
};

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateLeaveRequests(doctor, doctorIndex) {
  const requests = [];
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 90); // Next 3 months
  
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30); // Last month
  
  // Generate 1-3 leave requests per doctor
  const numRequests = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < numRequests; i++) {
    const leaveType = getRandomElement(LEAVE_TYPES);
    const reasons = LEAVE_REASONS[leaveType] || ['Personal reasons'];
    const reason = getRandomElement(reasons);
    
    // Determine leave duration based on type
    let duration;
    switch (leaveType) {
      case 'Maternity Leave':
        duration = 60 + Math.floor(Math.random() * 30); // 60-90 days
        break;
      case 'Paternity Leave':
        duration = 7 + Math.floor(Math.random() * 7); // 7-14 days
        break;
      case 'Annual Leave':
        duration = 3 + Math.floor(Math.random() * 10); // 3-12 days
        break;
      case 'Sick Leave':
        duration = 1 + Math.floor(Math.random() * 5); // 1-5 days
        break;
      case 'Medical Leave':
        duration = 7 + Math.floor(Math.random() * 14); // 7-21 days
        break;
      case 'Study Leave':
        duration = 2 + Math.floor(Math.random() * 5); // 2-6 days
        break;
      default:
        duration = 1 + Math.floor(Math.random() * 7); // 1-7 days
    }
    
    // Mix of past, current, and future requests
    let startDate;
    if (i === 0 && Math.random() > 0.3) {
      // 70% chance for future request
      startDate = getRandomDate(today, futureDate);
    } else if (Math.random() > 0.5) {
      // Some past requests
      startDate = getRandomDate(pastDate, today);
    } else {
      // Some current/near future
      const nearFuture = new Date();
      nearFuture.setDate(today.getDate() + 14);
      startDate = getRandomDate(today, nearFuture);
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration);
    
    // Determine status based on dates and randomness
    let status;
    if (startDate < today) {
      // Past requests are mostly approved or completed
      status = Math.random() > 0.2 ? 'approved' : 'rejected';
    } else {
      // Future requests have mixed status
      const rand = Math.random();
      if (rand > 0.6) status = 'pending';
      else if (rand > 0.3) status = 'approved';
      else status = 'rejected';
    }
    const schemaLeaveType = LEAVE_TYPE_MAP[leaveType] || 'personal';
    const doc = {
      doctorId: doctor.userId._id,
      leaveType: schemaLeaveType,
      startDate,
      endDate,
      reason,
      status
    };

    if (schemaLeaveType === 'emergency') {
      doc.isEmergency = true;
    }

    if (status === 'rejected') {
      doc.rejectionReason = 'Insufficient staffing during requested period';
    }
    if (status === 'approved') {
      // Only set approvalDate which exists in schema; omit approvedBy to avoid invalid ObjectId
      doc.approvalDate = new Date();
    }

    requests.push(doc);
  }
  
  return requests;
}

async function createLeaveRequests() {
  try {
    // Check command line arguments
    const clearExisting = process.argv.includes('--clear');
    
    console.log('🏥 Leave Request Creation Script');
    console.log('===============================');
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    if (clearExisting) {
      const deletedCount = await LeaveRequest.deleteMany({});
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing leave requests`);
    }
    
    // Get all approved doctors
    const doctors = await Doctor.find({ isDoctor: true }).populate('userId', 'firstname lastname');
    console.log(`Found ${doctors.length} approved doctors`);
    
    if (doctors.length === 0) {
      console.log('❌ No approved doctors found');
      return;
    }
    
    const allRequests = [];
    
    doctors.forEach((doctor, index) => {
      const requests = generateLeaveRequests(doctor, index);
      allRequests.push(...requests);
      console.log(`👨‍⚕️ Generated ${requests.length} leave requests for Dr. ${doctor.userId.firstname} ${doctor.userId.lastname}`);
    });
    
    // Save all requests
    if (allRequests.length > 0) {
      await LeaveRequest.insertMany(allRequests);
      console.log(`✅ Created ${allRequests.length} leave requests`);
      
      // Show summary
      const statusSummary = {};
      const typeSummary = {};
      
      allRequests.forEach(req => {
        statusSummary[req.status] = (statusSummary[req.status] || 0) + 1;
        typeSummary[req.leaveType] = (typeSummary[req.leaveType] || 0) + 1;
      });
      
      console.log('\n📊 Request Summary:');
      console.log('By Status:');
      Object.entries(statusSummary).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      console.log('\\nBy Type:');
      Object.entries(typeSummary).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
    console.log('\\n🎉 Leave requests created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating leave requests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createLeaveRequests();