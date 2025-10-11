/**
 * Overtime Request Creation Script
 * 
 * Creates sample overtime requests for doctors to test the overtime management system.
 * Generates realistic overtime scenarios with various reasons and approval statuses.
 */

const mongoose = require('mongoose');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Overtime = require('../models/overtimeModel');
const Shift = require('../models/shiftModel');
require('dotenv').config();

const OVERTIME_REASONS = [
  'Emergency patient influx',
  'Staff shortage coverage',
  'Critical surgery assistance',
  'Patient emergency response',
  'Department understaffing',
  'Urgent medical procedures',
  'Holiday coverage',
  'Training supervision',
  'Research project completion',
  'Administrative duties',
  'Continuing education',
  'Patient follow-up care',
  'Equipment maintenance supervision',
  'Special medical cases',
  'Conference preparation'
];

const OVERTIME_TYPES = [
  'Pre-planned',
  'Emergency',
  'On-call',
  'Extension',
  'Weekend',
  'Holiday',
  'Night shift',
  'Double shift'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateOvertimeRequests(doctor, doctorIndex, shiftsForDoctor) {
  const requests = [];
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 45); // Next 45 days
  
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30); // Last 30 days
  
  // Generate 2-5 overtime requests per doctor
  const numRequests = Math.floor(Math.random() * 4) + 2;
  
  for (let i = 0; i < numRequests; i++) {
    const reason = getRandomElement(OVERTIME_REASONS);
    const type = getRandomElement(OVERTIME_TYPES);
    
    // Determine overtime duration based on type
    let hours;
    switch (type) {
      case 'Double shift':
        hours = 8 + Math.floor(Math.random() * 4); // 8-12 hours
        break;
      case 'Emergency':
        hours = 2 + Math.floor(Math.random() * 6); // 2-8 hours
        break;
      case 'Weekend':
      case 'Holiday':
        hours = 4 + Math.floor(Math.random() * 8); // 4-12 hours
        break;
      case 'Night shift':
        hours = 6 + Math.floor(Math.random() * 6); // 6-12 hours
        break;
      default:
        hours = 1 + Math.floor(Math.random() * 6); // 1-6 hours
    }
    
  // Determine request date (mix of past, present, future)
    let requestDate;
    if (i === 0 && Math.random() > 0.4) {
      // 60% chance for future request
      requestDate = getRandomDate(today, futureDate);
    } else if (Math.random() > 0.6) {
      // Some past requests
      requestDate = getRandomDate(pastDate, today);
    } else {
      // Some near future
      const nearFuture = new Date();
      nearFuture.setDate(today.getDate() + 14);
      requestDate = getRandomDate(today, nearFuture);
    }
    
  // Determine status based on date and type
    let status;
    if (requestDate < today) {
      // Past requests are mostly completed or approved
      if (type === 'Emergency') {
        status = Math.random() > 0.1 ? 'approved' : 'rejected'; // Emergency usually approved
      } else {
        status = Math.random() > 0.3 ? 'approved' : 'rejected';
      }
    } else {
      // Future requests have mixed status
      const rand = Math.random();
      if (type === 'Emergency') {
        status = rand > 0.2 ? 'approved' : 'pending'; // Emergency gets quick approval
      } else if (rand > 0.5) {
        status = 'pending';
      } else if (rand > 0.25) {
        status = 'approved';
      } else {
        status = 'rejected';
      }
    }
    
  // Pick a shift for this doctor; required by schema
  const doctorShifts = shiftsForDoctor || [];
  const chosenShift = doctorShifts.length > 0 ? getRandomElement(doctorShifts) : null;

  // Calculate overtime pay (example rates)
    const baseRate = 50 + Math.floor(Math.random() * 50); // $50-100 per hour
    const overtimeMultiplier = type === 'Holiday' ? 2.5 : 
                              type === 'Weekend' ? 2.0 : 
                              type === 'Night shift' ? 1.8 : 1.5;
    const totalPay = Math.round(hours * baseRate * overtimeMultiplier);
    
    const doc = {
      doctorId: doctor.userId._id,
      shiftId: chosenShift ? chosenShift._id : undefined,
      date: requestDate,
      hours,
      reason,
      type,
      status,
      hourlyRate: baseRate,
      overtimeMultiplier,
      totalPay,
      requestedAt: new Date(requestDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Requested 0-7 days before
      ...(status === 'approved' ? {
        approvedBy: 'Department Head',
        decisionAt: new Date(),
        payrollProcessed: Math.random() > 0.5
      } : {}),
      ...(status === 'rejected' ? {
        rejectionReason: Math.random() > 0.5 ? 
          'Budget constraints for overtime' : 
          'Insufficient justification for overtime hours'
      } : {}),
      // Add some additional details for certain types
      ...(type === 'Emergency' ? {
        emergencyDetails: 'Critical patient situation requiring immediate attention',
        supervisorApproval: true
      } : {}),
      ...(type === 'Pre-planned' ? {
        preApprovalDate: new Date(requestDate.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000)
      } : {})
    };

    // Only include if we have a shift to satisfy schema requirement
    if (doc.shiftId) {
      requests.push(doc);
    }
  }
  
  return requests;
}

async function createOvertimeRequests() {
  try {
    // Check command line arguments
    const clearExisting = process.argv.includes('--clear');
    
    console.log('🏥 Overtime Request Creation Script');
    console.log('==================================');
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    if (clearExisting) {
      const deletedCount = await Overtime.deleteMany({});
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing overtime requests`);
    }
    
  // Get all approved doctors and their shifts
  const doctors = await Doctor.find({ isDoctor: true }).populate('userId', 'firstname lastname');
  const allShifts = await Shift.find({ status: { $in: ['approved', undefined] } });
    console.log(`Found ${doctors.length} approved doctors`);
    
    if (doctors.length === 0) {
      console.log('❌ No approved doctors found');
      return;
    }
    
    const allRequests = [];
    
    // Group shifts by doctorId for quick lookup
    const shiftsByDoctor = allShifts.reduce((acc, s) => {
      const key = s.doctorId?.toString();
      if (!key) return acc;
      (acc[key] = acc[key] || []).push(s);
      return acc;
    }, {});

    doctors.forEach((doctor, index) => {
      const doctorIdStr = doctor.userId._id.toString();
      const requests = generateOvertimeRequests(doctor, index, shiftsByDoctor[doctorIdStr] || []);
      allRequests.push(...requests);
      console.log(`👨‍⚕️ Generated ${requests.length} overtime requests for Dr. ${doctor.userId.firstname} ${doctor.userId.lastname}`);
    });
    
    // Save all requests
    if (allRequests.length > 0) {
      const clean = allRequests.map(r => ({
        doctorId: r.doctorId,
        shiftId: r.shiftId,
        date: r.date,
        hours: r.hours,
        reason: r.reason,
        status: r.status,
        requestedAt: r.requestedAt,
        decisionAt: r.decisionAt,
        adminComment: r.adminComment
      }));
      await Overtime.insertMany(clean);
      console.log(`✅ Created ${allRequests.length} overtime requests`);
      
      // Show summary
      const statusSummary = {};
      const typeSummary = {};
      let totalHours = 0;
      let totalPay = 0;
      
      allRequests.forEach(req => {
        statusSummary[req.status] = (statusSummary[req.status] || 0) + 1;
        typeSummary[req.type] = (typeSummary[req.type] || 0) + 1;
        if (req.status === 'approved') {
          totalHours += req.hours;
          totalPay += req.totalPay;
        }
      });
      
      console.log('\\n📊 Overtime Request Summary:');
      console.log('By Status:');
      Object.entries(statusSummary).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      console.log('\\nBy Type:');
      Object.entries(typeSummary).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
      console.log(`\\n💰 Financial Summary:`);
      console.log(`  Total Approved Hours: ${totalHours}`);
      console.log(`  Total Approved Pay: $${totalPay.toLocaleString()}`);
      console.log(`  Average Rate: $${totalHours > 0 ? Math.round(totalPay / totalHours) : 0}/hour`);
      
      // Show high-value requests
      const highValueRequests = allRequests
        .filter(req => req.totalPay > 500)
        .sort((a, b) => b.totalPay - a.totalPay)
        .slice(0, 3);
        
      if (highValueRequests.length > 0) {
        console.log('\\n💎 High-Value Requests:');
        highValueRequests.forEach(req => {
          const doctor = doctors.find(d => d.userId._id.toString() === req.doctorId.toString());
          console.log(`  • Dr. ${doctor.userId.firstname} ${doctor.userId.lastname}: $${req.totalPay} (${req.hours}h ${req.type})`);
        });
      }
    }
    
    console.log('\\n🎉 Overtime requests created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating overtime requests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createOvertimeRequests();