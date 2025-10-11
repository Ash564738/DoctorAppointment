/**
 * Shift Swap Request Creation Script
 * 
 * Creates sample shift swap requests between doctors to test the swap management system.
 * Generates realistic swap scenarios with proper partner responses and admin decisions.
 */

const mongoose = require('mongoose');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Shift = require('../models/shiftModel');
const ShiftSwap = require('../models/shiftSwapModel');
require('dotenv').config();

const SWAP_REASONS = [
  'Personal appointment scheduled',
  'Family emergency',
  'Medical appointment',
  'Pre-planned vacation',
  'Childcare responsibilities',
  'Education/training commitment',
  'Wedding attendance',
  'Travel plans',
  'Health reasons',
  'Work-life balance',
  'Personal obligations',
  'Emergency coverage needed'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSwapRequests(doctors, shifts) {
  const requests = [];
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 60); // Next 2 months
  
  // Create 10-20 swap requests
  const numRequests = 15 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < numRequests; i++) {
    // Pick random requester
    const requester = getRandomElement(doctors);
    
    // Find shifts for this requester
    const requesterShifts = shifts.filter(shift => {
      const shiftDoctorId = (shift.doctorId && shift.doctorId._id) ? shift.doctorId._id.toString() : shift.doctorId?.toString();
      return shiftDoctorId === requester.userId._id.toString();
    });
    
    if (requesterShifts.length === 0) continue;
    
    // Pick random original shift
    const originalShift = getRandomElement(requesterShifts);
    
    // Find potential swap partners (different doctors)
    const potentialPartners = doctors.filter(doc => 
      doc.userId._id.toString() !== requester.userId._id.toString()
    );
    
    if (potentialPartners.length === 0) continue;
    
    const swapPartner = getRandomElement(potentialPartners);
    
    // Find shifts for swap partner
    const partnerShifts = shifts.filter(shift => {
      const shiftDoctorId = (shift.doctorId && shift.doctorId._id) ? shift.doctorId._id.toString() : shift.doctorId?.toString();
      return shiftDoctorId === swapPartner.userId._id.toString();
    });
    
    if (partnerShifts.length === 0) continue;
    
    const requestedShift = getRandomElement(partnerShifts);
    
    // Generate swap date/period
    const swapDate = getRandomDate(today, futureDate);
    
    // Sometimes create date range swaps instead of single date
    let swapStartDate, swapEndDate;
    if (Math.random() > 0.7) {
      // 30% chance for date range swap
      swapStartDate = swapDate;
      swapEndDate = new Date(swapDate);
      swapEndDate.setDate(swapDate.getDate() + Math.floor(Math.random() * 7) + 1); // 1-7 days
    }
    
    // Determine partner decision
  let partnerDecision;
    const partnerRand = Math.random();
  if (partnerRand > 0.6) partnerDecision = 'accepted';
  else if (partnerRand > 0.3) partnerDecision = 'declined';
    else partnerDecision = 'pending';
    
    // Determine admin status
    let status;
    if (partnerDecision === 'accepted') {
      const statusRand = Math.random();
      if (statusRand > 0.7) status = 'approved';
      else if (statusRand > 0.4) status = 'pending';
      else status = 'rejected';
    } else {
      status = 'pending';
    }
    
    const reason = getRandomElement(SWAP_REASONS);
    
    const doc = {
      requesterId: requester.userId._id,
      swapWithId: swapPartner.userId._id,
      originalShiftId: originalShift._id,
      requestedShiftId: requestedShift._id,
      reason,
      ...(swapStartDate && swapEndDate ? {
        swapStartDate,
        swapEndDate
      } : {
        swapDate
      }),
      partnerDecision,
      partnerDecisionAt: partnerDecision !== 'pending' ? new Date() : undefined,
      status,
      requestedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Requested 0-14 days ago
    };

    if (status === 'approved' || status === 'rejected') {
      doc.decisionAt = new Date();
      if (status === 'rejected') {
        doc.adminComment = Math.random() > 0.5 ? 
          'Insufficient coverage during swap period' : 
          'Scheduling conflict detected';
      }
    }

    requests.push(doc);
  }
  
  return requests;
}

async function createShiftSwapRequests() {
  try {
    // Check command line arguments  
    const clearExisting = process.argv.includes('--clear');
    
    console.log('🏥 Shift Swap Request Creation Script');
    console.log('====================================');
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    if (clearExisting) {
      const deletedCount = await ShiftSwap.deleteMany({});
      console.log(`🗑️ Cleared ${deletedCount.deletedCount} existing swap requests`);
    }
    
    // Get all approved doctors and shifts
    const doctors = await Doctor.find({ isDoctor: true }).populate('userId', 'firstname lastname');
    const shifts = await Shift.find({}).populate('doctorId', 'firstname lastname');
    
    console.log(`Found ${doctors.length} doctors and ${shifts.length} shifts`);
    
    if (doctors.length < 2) {
      console.log('❌ Need at least 2 doctors for swap requests');
      return;
    }
    
    if (shifts.length === 0) {
      console.log('❌ No shifts found. Please create shifts first.');
      return;
    }
    
    // Generate swap requests
    const swapRequests = generateSwapRequests(doctors, shifts);
    
    if (swapRequests.length === 0) {
      console.log('❌ No swap requests generated');
      return;
    }
    
    // Save requests
    await ShiftSwap.insertMany(swapRequests);
    console.log(`✅ Created ${swapRequests.length} shift swap requests`);
    
    // Show summary
    const statusSummary = {};
    const partnerSummary = {};
    
    swapRequests.forEach(req => {
      statusSummary[req.status] = (statusSummary[req.status] || 0) + 1;
      partnerSummary[req.partnerDecision] = (partnerSummary[req.partnerDecision] || 0) + 1;
    });
    
    console.log('\\n📊 Swap Request Summary:');
    console.log('By Admin Status:');
    Object.entries(statusSummary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\\nBy Partner Decision:');
    Object.entries(partnerSummary).forEach(([decision, count]) => {
      console.log(`  ${decision}: ${count}`);
    });
    
    // Show some example requests
    console.log('\\n📋 Sample Requests:');
    const sampleRequests = swapRequests.slice(0, 3);
    
    for (const req of sampleRequests) {
      const requester = doctors.find(d => d.userId._id.toString() === req.requesterId.toString());
      const partner = doctors.find(d => d.userId._id.toString() === req.swapWithId.toString());
      
      console.log(`  • Dr. ${requester.userId.firstname} ${requester.userId.lastname} wants to swap with Dr. ${partner.userId.firstname} ${partner.userId.lastname}`);
      console.log(`    Partner: ${req.partnerDecision} | Admin: ${req.status}`);
    }
    
    console.log('\\n🎉 Shift swap requests created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating swap requests:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createShiftSwapRequests();