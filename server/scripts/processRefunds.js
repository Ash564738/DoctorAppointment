const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');
const Payment = require('../models/paymentModel');
const USE_STRIPE = process.argv.includes('--use-stripe');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = (USE_STRIPE && STRIPE_SECRET_KEY) ? require('stripe')(STRIPE_SECRET_KEY) : null;

const REFUND_REASONS = [
  'Patient requested cancellation',
  'Doctor unavailable due to emergency',
  'Medical facility closure',
  'Patient medical emergency',
  'Insurance coverage issue',
  'Scheduling conflict resolved',
  'Patient no longer requires consultation',
  'Weather-related cancellation',
  'System error in booking',
  'Duplicate booking detected'
];

const REFUND_POLICIES = {
  'Emergency': {
    fullRefundHours: 2, 
    partialRefundHours: 0,
    partialRefundPercent: 0
  },
  'Consultation': {
    fullRefundHours: 24, 
    partialRefundHours: 4,
    partialRefundPercent: 50
  },
  'Follow-up': {
    fullRefundHours: 12,
    partialRefundHours: 2,
    partialRefundPercent: 75
  },
  'Regular': {
    fullRefundHours: 24,
    partialRefundHours: 6,
    partialRefundPercent: 60
  }
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function calculateRefundAmount(appointment, payment, cancellationDate) {
  const appointmentDateTime = new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.time}:00`);
  const hoursBeforeAppointment = (appointmentDateTime - cancellationDate) / (1000 * 60 * 60);
  
  const policy = REFUND_POLICIES[appointment.appointmentType] || REFUND_POLICIES['Regular'];
  
  if (hoursBeforeAppointment >= policy.fullRefundHours) {
    return {
      amount: payment.amount,
      percentage: 100,
      reason: `Full refund - cancelled ${hoursBeforeAppointment.toFixed(1)} hours before appointment`
    };
  } else if (hoursBeforeAppointment >= policy.partialRefundHours) {
    const refundAmount = Math.round(payment.amount * (policy.partialRefundPercent / 100));
    return {
      amount: refundAmount,
      percentage: policy.partialRefundPercent,
      reason: `Partial refund (${policy.partialRefundPercent}%) - cancelled ${hoursBeforeAppointment.toFixed(1)} hours before appointment`
    };
  } else {
    return {
      amount: 0,
      percentage: 0,
      reason: `No refund - cancelled only ${hoursBeforeAppointment.toFixed(1)} hours before appointment (policy requires ${policy.partialRefundHours}+ hours)`
    };
  }
}

async function processRefunds() {
  try {
    // Check command line arguments
    const processAll = process.argv.includes('--process-all');
    const dryRun = process.argv.includes('--dry-run');
    
    console.log('🏥 Refund Management Script');
    console.log('==========================');
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No actual refunds will be processed');
    }
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/doctorappointment";
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    // Find cancelled appointments with payments that need refund processing
    const cancelledAppointments = await Appointment.find({
      status: 'Cancelled',
      paymentStatus: 'Paid' // Only process appointments that haven't been refunded yet
    }).populate('userId', 'firstname lastname email');
    
    console.log(`Found ${cancelledAppointments.length} cancelled appointments requiring refund processing`);
    
    if (cancelledAppointments.length === 0) {
      console.log('🎉 No refunds to process!');
      return;
    }
    
    const refundResults = [];
    let totalProcessed = 0;
    let totalRefunded = 0;
    let totalAmount = 0;
    
    for (const appointment of cancelledAppointments) {
      try {
        // Find associated payment
        const payment = await Payment.findOne({ 
          appointmentId: appointment._id,
          status: 'Succeeded' 
        });
        
        if (!payment) {
          console.log(`⚠️ No successful payment found for appointment ${appointment._id}`);
          continue;
        }
        
        // Calculate refund based on cancellation policy
        const cancellationDate = appointment.cancellationDate || new Date();
        const refundCalculation = calculateRefundAmount(appointment, payment, cancellationDate);
        
        const refundData = {
          appointmentId: appointment._id,
          paymentId: payment._id,
          patientName: `${appointment.userId.firstname} ${appointment.userId.lastname}`,
          patientEmail: appointment.userId.email,
          originalAmount: payment.amount,
          refundAmount: refundCalculation.amount,
          refundPercentage: refundCalculation.percentage,
          refundReason: refundCalculation.reason,
          appointmentType: appointment.appointmentType,
          cancellationDate,
          appointmentDate: appointment.date,
          appointmentTime: appointment.time
        };
        
        refundResults.push(refundData);
        totalProcessed++;
        
        if (refundCalculation.amount > 0) {
          totalRefunded++;
          totalAmount += refundCalculation.amount;
          
          console.log(`💰 Processing refund for ${refundData.patientName}: $${refundCalculation.amount} (${refundCalculation.percentage}%)`);
          
          if (!dryRun) {
            if (stripe) {
              try {
                if (payment.stripePaymentIntentId) {
                  await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId, amount: Math.round(refundCalculation.amount * 100) });
                } else if (payment.stripeChargeId) {
                  await stripe.refunds.create({ charge: payment.stripeChargeId, amount: Math.round(refundCalculation.amount * 100) });
                } else {
                  console.warn(`⚠️ No Stripe reference on payment ${payment._id}; recording DB refund only.`);
                }
              } catch (e) {
                console.warn(`⚠️ Stripe refund failed for payment ${payment._id}: ${e?.message}`);
              }
            }
            await Payment.findByIdAndUpdate(payment._id, {
              status: 'Refunded',
              refundAmount: refundCalculation.amount,
              refundReason: getRandomElement(REFUND_REASONS),
              refundDate: new Date()
            });
            await Appointment.findByIdAndUpdate(appointment._id, {
              paymentStatus: 'Refunded'
            });
          }
        } else {
          console.log(`🚫 No refund for ${refundData.patientName}: ${refundCalculation.reason}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing refund for appointment ${appointment._id}:`, error.message);
      }
    }
    console.log('\\n📊 Refund Processing Summary');
    console.log('============================');
    console.log(`Total Appointments Processed: ${totalProcessed}`);
    console.log(`Refunds Issued: ${totalRefunded}`);
    console.log(`Refunds Denied: ${totalProcessed - totalRefunded}`);
    console.log(`Total Refund Amount: $${totalAmount.toLocaleString()}`);
    console.log(`Average Refund: $${totalRefunded > 0 ? Math.round(totalAmount / totalRefunded) : 0}`);
    const typeBreakdown = {};
    refundResults.forEach(result => {
      if (!typeBreakdown[result.appointmentType]) {
        typeBreakdown[result.appointmentType] = { count: 0, amount: 0, refunded: 0 };
      }
      typeBreakdown[result.appointmentType].count++;
      typeBreakdown[result.appointmentType].amount += result.originalAmount;
      if (result.refundAmount > 0) {
        typeBreakdown[result.appointmentType].refunded += result.refundAmount;
      }
    });
    
    console.log('\\n📈 Refund Breakdown by Appointment Type:');
    Object.entries(typeBreakdown).forEach(([type, data]) => {
      const refundRate = ((data.refunded / data.amount) * 100).toFixed(1);
      console.log(`  ${type}: ${data.count} appointments, $${data.refunded.toLocaleString()} refunded (${refundRate}%)`);
    });
    if (process.argv.includes('--detailed')) {
      console.log('\\n📋 Detailed Refund Report:');
      console.log('==========================');
      refundResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.patientName} (${result.patientEmail})`);
        console.log(`   Appointment: ${result.appointmentDate.toDateString()} at ${result.appointmentTime}`);
        console.log(`   Type: ${result.appointmentType} | Original: $${result.originalAmount}`);
        console.log(`   Refund: $${result.refundAmount} (${result.refundPercentage}%)`);
        console.log(`   Reason: ${result.refundReason}\\n`);
      });
    }
    
    if (dryRun) {
      console.log('\\n🔍 This was a dry run - no actual refunds were processed');
      console.log('   Run without --dry-run to process refunds');
    } else {
      console.log('\\n🎉 Refund processing completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error processing refunds:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('🏥 Refund Management Script');
  console.log('==========================\\n');
  console.log('Usage: node processRefunds.js [options]\\n');
  console.log('Options:');
  console.log('  --dry-run         Show what would be refunded without processing');
  console.log('  --detailed        Show detailed refund report');
  console.log('  --process-all     Process all eligible refunds');
  console.log('  --help, -h        Show this help message\\n');
  console.log('Refund Policies:');
  console.log('  Emergency: Full refund if cancelled 2+ hours before');
  console.log('  Consultation: Full refund if cancelled 24+ hours before, 50% if 4+ hours');
  console.log('  Follow-up: Full refund if cancelled 12+ hours before, 75% if 2+ hours');
  console.log('  Regular: Full refund if cancelled 24+ hours before, 60% if 6+ hours');
  process.exit(0);
}

processRefunds();