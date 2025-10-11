const Appointment = require('../models/appointmentModel');
const Payment = require('../models/paymentModel');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const Notification = require('../models/notificationModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Refund policies configuration
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

/**
 * Calculate refund amount based on appointment type and cancellation timing
 */
function calculateRefundAmount(appointment, payment, cancellationDate = new Date()) {
  const appointmentDateTime = new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.time}:00`);
  const hoursBeforeAppointment = (appointmentDateTime - cancellationDate) / (1000 * 60 * 60);
  
  const policy = REFUND_POLICIES[appointment.appointmentType] || REFUND_POLICIES['Regular'];
  
  if (hoursBeforeAppointment >= policy.fullRefundHours) {
    return {
      amount: payment.amount,
      percentage: 100,
      eligible: true,
      reason: `Full refund - cancelled ${hoursBeforeAppointment.toFixed(1)} hours before appointment`
    };
  } else if (hoursBeforeAppointment >= policy.partialRefundHours) {
    const refundAmount = Math.round(payment.amount * (policy.partialRefundPercent / 100));
    return {
      amount: refundAmount,
      percentage: policy.partialRefundPercent,
      eligible: true,
      reason: `Partial refund (${policy.partialRefundPercent}%) - cancelled ${hoursBeforeAppointment.toFixed(1)} hours before appointment`
    };
  } else {
    return {
      amount: 0,
      percentage: 0,
      eligible: false,
      reason: `No refund - cancelled only ${hoursBeforeAppointment.toFixed(1)} hours before appointment (policy requires ${policy.partialRefundHours}+ hours)`
    };
  }
}

/**
 * Check refund eligibility for an appointment
 * GET /api/refunds/eligibility/:appointmentId
 */
const checkRefundEligibility = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    // Find appointment with related data
    const appointment = await Appointment.findById(appointmentId)
      .populate('userId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname department');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Check if appointment is cancelled
    if (appointment.status !== 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Only cancelled appointments are eligible for refunds'
      });
    }
    
    // Find associated payment (including partial refunds)
    const payment = await Payment.findOne({
      appointmentId: appointmentId,
      status: { $in: ['Succeeded', 'Partially_Refunded'] }
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No successful payment found for this appointment'
      });
    }
    
    // Check if already refunded
    if (payment.status === 'Refunded' || payment.refundAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'This appointment has already been refunded',
        refundDetails: {
          refundAmount: payment.refundAmount,
          refundDate: payment.refundDate,
          refundReason: payment.refundReason
        }
      });
    }
    
    // Calculate refund eligibility
    const refundCalculation = calculateRefundAmount(appointment, payment);
    
    res.json({
      success: true,
      data: {
        appointment: {
          id: appointment._id,
          date: appointment.date,
          time: appointment.time,
          type: appointment.appointmentType,
          patient: `${appointment.userId.firstname} ${appointment.userId.lastname}`,
          doctor: `Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}`,
          department: appointment.doctorId.department
        },
        payment: {
          id: payment._id,
          amount: payment.amount,
          paymentDate: payment.createdAt
        },
        refund: refundCalculation,
        policy: REFUND_POLICIES[appointment.appointmentType] || REFUND_POLICIES['Regular']
      }
    });
    
  } catch (error) {
    console.error('Error checking refund eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking refund eligibility'
    });
  }
};

/**
 * Process a refund for an appointment with role-based permissions
 * POST /api/refunds/process
 */
const processRefund = async (req, res) => {
  try {
    const { appointmentId, reason, adminNotes } = req.body;
    const userRole = req.user.role;
    const userId = req.user._id;
    
    // Validate required fields
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }
    
    // Find appointment with related data
    const appointment = await Appointment.findById(appointmentId)
      .populate('userId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname department');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Role-based permission checks
    if (userRole === 'Doctor') {
      // Doctors can only process refunds for their own appointments
      if (appointment.doctorId._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Doctors can only process refunds for their own appointments'
        });
      }
    }
    
    // Check if appointment is cancelled
    if (appointment.status !== 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Only cancelled appointments can be refunded'
      });
    }
    
    const payment = await Payment.findOne({
      appointmentId: appointmentId,
      status: { $in: ['Succeeded', 'Partially_Refunded'] }
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No successful payment found for this appointment'
      });
    }
    
    if (payment.status === 'Refunded' || (payment.refundAmount || 0) >= (payment.amount || 0)) {
      return res.status(400).json({
        success: false,
        message: 'This appointment has already been fully refunded'
      });
    }
    
    // Calculate refund amount
    const refundCalculation = calculateRefundAmount(appointment, payment);
    
    if (!refundCalculation.eligible || refundCalculation.amount === 0) {
      return res.status(400).json({
        success: false,
        message: 'This appointment is not eligible for a refund',
        reason: refundCalculation.reason
      });
    }

    // Role-based refund amount limits
    const DOCTOR_REFUND_LIMIT = 500; // Doctors can only process refunds up to $500
    
    if (userRole === 'Doctor' && refundCalculation.amount > DOCTOR_REFUND_LIMIT) {
      // Create a pending refund request for admin approval
      return res.status(202).json({
        success: true,
        message: `Refund amount $${refundCalculation.amount} exceeds doctor limit ($${DOCTOR_REFUND_LIMIT}). Refund request created for admin approval.`,
        data: {
          appointmentId: appointment._id,
          refundAmount: refundCalculation.amount,
          status: 'pending_admin_approval',
          requestedBy: userRole,
          requiresApproval: true
        }
      });
    }
    
    // Process the refund
    const refundReason = reason || getDefaultRefundReason(userRole, appointment);

    // Determine refundable amount and cap
    const remaining = Math.max(0, (payment.amount || 0) - (payment.refundAmount || 0));
    const refundAmount = Math.min(refundCalculation.amount, remaining);

    if (refundAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No refundable amount remaining' });
    }

    // Helper to attempt Stripe refund using available identifiers
    const tryStripeRefund = async () => {
      // Prefer refund by payment_intent when present
      if (payment.stripePaymentIntentId) {
        try {
          return await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            amount: Math.round(refundAmount * 100),
            reason: 'requested_by_customer',
            metadata: {
              appointmentId: String(appointment._id),
              processedBy: String(userId),
              processedByRole: userRole
            }
          });
        } catch (err) {
          // If Stripe says the payment intent is missing, try via charge id next
          if (err?.raw?.code === 'resource_missing' || err?.statusCode === 404) {
            // fall through to charge path
          } else {
            throw err;
          }
        }
      }
      // Fallback: refund by charge id if available
      if (payment.stripeChargeId) {
        try {
          return await stripe.refunds.create({
            charge: payment.stripeChargeId,
            amount: Math.round(refundAmount * 100),
            reason: 'requested_by_customer',
            metadata: {
              appointmentId: String(appointment._id),
              processedBy: String(userId),
              processedByRole: userRole
            }
          });
        } catch (err) {
          if (err?.raw?.code === 'resource_missing' || err?.statusCode === 404) {
            // no valid Stripe reference
            return { __manualRequired: true, __error: err };
          }
          throw err;
        }
      }
      // No Stripe identifiers available at all
      return { __manualRequired: true };
    };

    const stripeRefund = await tryStripeRefund();
    if (stripeRefund && stripeRefund.__manualRequired) {
      // Allow admin to proceed with a manual refund record (off-Stripe) when explicitly requested
      if (req.body.allowManual === true && userRole === 'Admin') {
        payment.refundAmount = (payment.refundAmount || 0) + refundAmount;
        payment.refundReason = refundReason + ' (manual)';
        payment.refundDate = new Date();
        payment.refundProcessedBy = userId;
        payment.status = payment.refundAmount >= payment.amount ? 'Refunded' : 'Partially_Refunded';
        if (adminNotes) payment.notes = adminNotes;
        await payment.save();

        await Appointment.findByIdAndUpdate(appointmentId, {
          paymentStatus: payment.status === 'Refunded' ? 'Refunded' : 'Paid'
        });

        try {
          await Notification.create({
            userId: appointment.userId._id,
            content: `A manual refund of $${refundAmount.toFixed(2)} was processed for your appointment on ${new Date(appointment.date).toLocaleDateString()}.`
          });
        } catch (e) {}

        return res.json({
          success: true,
          message: 'Manual refund recorded successfully (no Stripe reference)',
          data: {
            appointment: {
              id: appointment._id,
              patient: `${appointment.userId.firstname} ${appointment.userId.lastname}`,
              doctor: `Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}`,
              date: appointment.date,
              time: appointment.time,
              type: appointment.appointmentType
            },
            refund: {
              amount: refundAmount,
              percentage: refundCalculation.percentage,
              originalAmount: payment.amount,
              reason: payment.refundReason,
              processedDate: payment.refundDate,
              processedBy: userRole,
              adminNotes: adminNotes,
              manual: true
            }
          }
        });
      }
      return res.status(422).json({
        success: false,
        code: 'MISSING_STRIPE_REFERENCE',
        message: 'Cannot process refund via Stripe for this appointment: no valid Stripe reference found (legacy booking). You can proceed with a manual refund if you have refunded outside Stripe.',
      });
    }

    // Persist payment updates
    payment.refundAmount = (payment.refundAmount || 0) + refundAmount;
    payment.refundReason = refundReason;
    payment.refundDate = new Date();
    payment.refundProcessedBy = userId;
    payment.status = payment.refundAmount >= payment.amount ? 'Refunded' : 'Partially_Refunded';
    if (adminNotes) payment.notes = adminNotes;
    await payment.save();

    // Update appointment payment status
    await Appointment.findByIdAndUpdate(appointmentId, {
      paymentStatus: payment.status === 'Refunded' ? 'Refunded' : 'Paid'
    });

    // Notify patient
    try {
      await Notification.create({
        userId: appointment.userId._id,
        content: `Refund of $${refundAmount.toFixed(2)} processed for appointment on ${new Date(appointment.date).toLocaleDateString()}.`
      });
    } catch (e) {
      // best-effort
    }
    
    // Create response with role-specific information
    const responseData = {
      appointment: {
        id: appointment._id,
        patient: `${appointment.userId.firstname} ${appointment.userId.lastname}`,
        doctor: `Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}`,
        date: appointment.date,
        time: appointment.time,
        type: appointment.appointmentType
      },
      refund: {
        amount: refundAmount,
        percentage: refundCalculation.percentage,
        originalAmount: payment.amount,
        reason: refundReason,
        processedDate: payment.refundDate,
        processedBy: userRole,
        adminNotes: adminNotes,
        stripeRefundId: stripeRefund.id
      }
    };

  // Add role-specific message
    if (userRole === 'Doctor') {
      responseData.message = 'Refund processed successfully by doctor';
    } else if (userRole === 'Admin') {
      responseData.message = 'Refund processed successfully by admin';
    }
    
    res.json({
      success: true,
      message: responseData.message || 'Refund processed successfully',
      data: responseData
    });
    
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing refund'
    });
  }
};

/**
 * Get default refund reason based on user role and context
 */
function getDefaultRefundReason(userRole, appointment) {
  if (userRole === 'Doctor') {
    return 'Doctor initiated cancellation/refund';
  } else if (userRole === 'Admin') {
    return 'Administrative refund';
  }
  return 'Appointment cancellation refund';
}

/**
 * Get refund analytics and statistics
 * GET /api/refunds/analytics
 */
const getRefundAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;
    
    // Set default date range (last 30 days)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    let dateFilter = {
      createdAt: {
        $gte: startDate ? new Date(startDate) : defaultStartDate,
        $lte: endDate ? new Date(endDate) : defaultEndDate
      }
    };

    // Role-based data filtering
    if (userRole === 'Doctor') {
      // Doctors can only see analytics for their own appointments
      dateFilter.doctorId = userId;
    }
    
    // Build filter for department if specified
    let departmentFilter = {};
    if (department) {
      departmentFilter = { 'doctor.department': department };
    }
    
    // Overall financial summary
    const financialSummary = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalRefunds: { $sum: '$refundAmount' },
          paymentCount: { $sum: 1 },
          refundCount: { $sum: { $cond: [{ $gt: ['$refundAmount', 0] }, 1, 0] } }
        }
      }
    ]);
    
    const financial = financialSummary[0] || { totalRevenue: 0, totalRefunds: 0, paymentCount: 0, refundCount: 0 };
    const netRevenue = financial.totalRevenue - financial.totalRefunds;
    const refundRate = financial.paymentCount > 0 ? (financial.refundCount / financial.paymentCount * 100) : 0;
    
    // Refunds by appointment type
    const refundsByType = await Payment.aggregate([
      { $match: { ...dateFilter, refundAmount: { $gt: 0 } } },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointment'
        }
      },
      { $unwind: '$appointment' },
      {
        $group: {
          _id: '$appointment.appointmentType',
          refundCount: { $sum: 1 },
          totalRefunded: { $sum: '$refundAmount' },
          averageRefund: { $avg: '$refundAmount' }
        }
      },
      { $sort: { totalRefunded: -1 } }
    ]);
    
    // Refunds by department
    const refundsByDepartment = await Payment.aggregate([
      { $match: { refundAmount: { $gt: 0 } } },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: '_id',
          as: 'appointment'
        }
      },
      { $unwind: '$appointment' },
      {
        $lookup: {
          from: 'doctors',
          localField: 'appointment.doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      { $unwind: '$doctor' },
      ...(department ? [{ $match: departmentFilter }] : []),
      {
        $group: {
          _id: '$doctor.department',
          refundCount: { $sum: 1 },
          totalRefunded: { $sum: '$refundAmount' },
          averageRefund: { $avg: '$refundAmount' }
        }
      },
      { $sort: { totalRefunded: -1 } }
    ]);
    
    // Daily refund trends (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const dailyRefunds = await Payment.aggregate([
      { $match: { refundDate: { $gte: last7Days }, refundAmount: { $gt: 0 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$refundDate' } },
          refundCount: { $sum: 1 },
          totalAmount: { $sum: '$refundAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Top refund reasons
    const refundReasons = await Payment.aggregate([
      { $match: { refundReason: { $exists: true, $ne: null }, refundAmount: { $gt: 0 } } },
      {
        $group: {
          _id: '$refundReason',
          count: { $sum: 1 },
          totalAmount: { $sum: '$refundAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Recent refunds
    const recentRefunds = await Payment.find({
      refundAmount: { $gt: 0 },
      refundDate: { $exists: true }
    })
    .populate({
      path: 'appointmentId',
      populate: [
        { path: 'userId', select: 'firstname lastname email' },
        { path: 'doctorId', select: 'firstname lastname department' }
      ]
    })
    .sort({ refundDate: -1 })
    .limit(10);
    
    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: financial.totalRevenue,
          totalRefunds: financial.totalRefunds,
          netRevenue: netRevenue,
          refundRate: parseFloat(refundRate.toFixed(2)),
          totalPayments: financial.paymentCount,
          totalRefundCount: financial.refundCount
        },
        breakdowns: {
          byType: refundsByType,
          byDepartment: refundsByDepartment,
          byReason: refundReasons
        },
        trends: {
          daily: dailyRefunds
        },
        recent: recentRefunds.map(payment => ({
          id: payment._id,
          amount: payment.refundAmount,
          originalAmount: payment.amount,
          reason: payment.refundReason,
          date: payment.refundDate,
          patient: payment.appointmentId ? `${payment.appointmentId.userId.firstname} ${payment.appointmentId.userId.lastname}` : 'Unknown',
          doctor: payment.appointmentId ? `Dr. ${payment.appointmentId.doctorId.firstname} ${payment.appointmentId.doctorId.lastname}` : 'Unknown',
          department: payment.appointmentId ? payment.appointmentId.doctorId.department : 'Unknown',
          appointmentType: payment.appointmentId ? payment.appointmentId.appointmentType : 'Unknown'
        }))
      }
    });
    
  } catch (error) {
    console.error('Error getting refund analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving refund analytics'
    });
  }
};

/**
 * Get all refunds with pagination
 * GET /api/refunds
 */
const getAllRefunds = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const department = req.query.department;
    const userRole = req.user.role;
    const userId = req.user._id;
    
    const skip = (page - 1) * limit;
    
    // Build filter
    let filter = { refundAmount: { $gt: 0 } };
    
    if (status) {
      filter.status = status;
    }

    // Role-based filtering
    if (userRole === 'Doctor') {
      filter.doctorId = userId;
    }
    
    // Get refunds with pagination
    const refunds = await Payment.find(filter)
      .populate({
        path: 'appointmentId',
        populate: [
          { path: 'userId', select: 'firstname lastname email' },
          { path: 'doctorId', select: 'firstname lastname department' }
        ]
      })
      .sort({ refundDate: -1 })
      .skip(skip)
      .limit(limit);
    
    // Filter by department if specified (and user has permission)
    const filteredRefunds = department ? 
      refunds.filter(payment => 
        payment.appointmentId && 
        payment.appointmentId.doctorId && 
        payment.appointmentId.doctorId.department === department
      ) : refunds;
    
    const totalRefunds = await Payment.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        refunds: filteredRefunds.map(payment => ({
          id: payment._id,
          amount: payment.refundAmount,
          originalAmount: payment.amount,
          percentage: Math.round((payment.refundAmount / payment.amount) * 100),
          reason: payment.refundReason,
          processedDate: payment.refundDate,
          paymentDate: payment.createdAt,
          patient: payment.appointmentId ? {
            name: `${payment.appointmentId.userId.firstname} ${payment.appointmentId.userId.lastname}`,
            email: payment.appointmentId.userId.email
          } : null,
          appointment: payment.appointmentId ? {
            id: payment.appointmentId._id,
            date: payment.appointmentId.date,
            time: payment.appointmentId.time,
            type: payment.appointmentId.appointmentType,
            doctor: `Dr. ${payment.appointmentId.doctorId.firstname} ${payment.appointmentId.doctorId.lastname}`,
            department: payment.appointmentId.doctorId.department
          } : null
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRefunds / limit),
          totalRefunds: totalRefunds,
          hasNextPage: page < Math.ceil(totalRefunds / limit),
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting refunds:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving refunds'
    });
  }
};

// GET /api/refunds/doctor-impact
const getDoctorRefundImpact = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const payments = await Payment.find({ doctorId, refundAmount: { $gt: 0 } })
      .select('refundAmount refundReason refundDate patientId')
      .populate('patientId', 'firstname lastname')
      .sort({ refundDate: -1 })
      .limit(20);

    const totalRefunded = payments.reduce((sum, p) => sum + (p.refundAmount || 0), 0);
    const refundsProcessed = payments.length;
    const recentRefunds = payments.slice(0, 5).map(p => ({
      amount: p.refundAmount || 0,
      reason: p.refundReason || 'Refund processed',
      processedDate: p.refundDate || new Date(),
      patientName: p.patientId ? `${p.patientId.firstname} ${p.patientId.lastname}` : 'Patient'
    }));

    return res.json({ success: true, data: { totalRefunded, refundsProcessed, recentRefunds } });
  } catch (error) {
    console.error('Error getting doctor refund impact:', error);
    return res.status(500).json({ success: false, message: 'Failed to get refund impact' });
  }
};

module.exports = {
  checkRefundEligibility,
  processRefund,
  getRefundAnalytics,
  getAllRefunds,
  getDoctorRefundImpact
};