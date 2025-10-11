const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Payment = require("../models/paymentModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const Notification = require("../models/notificationModel");
const TimeSlot = require("../models/timeSlotModel");
const LeaveRequest = require("../models/leaveRequestModel");
const Shift = require("../models/shiftModel");
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const createPaymentIntent = async (req, res) => {
  try {
    const { appointmentData, amount, currency = 'USD' } = req.body;
    const userId = req.userId;
    if (!appointmentData || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: appointmentData, amount, or user authentication'
      });
    }
    if (!appointmentData.doctorId || !appointmentData.date || !appointmentData.time || !appointmentData.symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment data: missing required fields'
      });
    }
    const doctor = await Doctor.findOne({ userId: appointmentData.doctorId }) || await Doctor.findById(appointmentData.doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    const patient = await User.findById(userId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }
    const consultationFee = amount;
    const platformFeePercent = 10;
    const platformFee = Math.round(consultationFee * platformFeePercent / 100);
    const doctorEarnings = consultationFee - platformFee;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: consultationFee * 100,
      currency: currency.toLowerCase(),
      metadata: {
        appointmentData: JSON.stringify(appointmentData),
        patientId: userId,
        doctorId: appointmentData.doctorId,
        consultationFee: consultationFee.toString(),
        platformFee: platformFee.toString()
      }
    });
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: consultationFee,
      platformFee,
      doctorEarnings
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent"
    });
  }
};
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.userId;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges']
    });
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: "Payment not successful"
      });
    }
    let firstCharge = paymentIntent.charges?.data?.[0];
    let receiptUrl = firstCharge?.receipt_url || null;
    let stripeChargeId = firstCharge?.id || null;
    if (!firstCharge && paymentIntent.latest_charge) {
      try {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
        stripeChargeId = charge.id;
        receiptUrl = charge.receipt_url || null;
      } catch (err) {
        console.error('Could not fetch latest_charge:', err);
      }
    }
    let appointmentData;
    try {
      appointmentData = JSON.parse(paymentIntent.metadata.appointmentData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment data in payment"
      });
    }
    const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : undefined;

    // Validate availability again at confirmation time to avoid double booking
    const parseTimeToMinutes = (t) => {
      const [hh, mm] = (t || '').split(':').map(Number);
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
      return hh * 60 + mm;
    };
    const isWithin = (start, end, val) => {
      if (end >= start) return val >= start && val < end;
      return val >= start || val < end; // overnight
    };
    const sameDayBounds = (d) => {
      const dt = new Date(d);
      const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
      return { start, end };
    };
    const dayName = (d) => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d).getDay()];
    const validateDoctorAvailability = async (doctorUserId, d, t) => {
      const { start, end } = sameDayBounds(d);
      const onLeave = await LeaveRequest.findOne({
        doctorId: doctorUserId,
        status: 'approved',
        startDate: { $lte: end },
        endDate: { $gte: start }
      }).lean();
      if (onLeave) {
        return { ok: false, reason: 'Doctor is on approved leave for the selected date' };
      }
      const shifts = await Shift.find({
        doctorId: doctorUserId,
        isActive: true,
        status: { $in: ['approved', undefined] },
        daysOfWeek: { $in: [dayName(d)] }
      }).lean();
      if (!shifts || shifts.length === 0) {
        return { ok: false, reason: 'No active shift scheduled for the selected day' };
      }
      const minutes = parseTimeToMinutes(t);
      const matchingShift = shifts.find(s => {
        const ss = parseTimeToMinutes(s.startTime);
        const se = parseTimeToMinutes(s.endTime);
        if (ss == null || se == null || minutes == null) return false;
        return isWithin(ss, se, minutes);
      });
      if (!matchingShift) {
        return { ok: false, reason: 'Selected time is outside the doctor\'s working hours' };
      }
      const slot = await (async () => {
        try {
          const { start: ds, end: de } = sameDayBounds(d);
          return await TimeSlot.findOne({
            doctorId: doctorUserId,
            date: { $gte: ds, $lt: de },
            startTime: t,
          });
        } catch { return null; }
      })();
      if (slot) {
        if (!slot.isAvailable || slot.isBlocked || slot.bookedPatients >= slot.maxPatients) {
          return { ok: false, reason: 'Selected time slot is full or unavailable' };
        }
      } else {
        const existing = await Appointment.findOne({
          doctorId: doctorUserId,
          date: { $gte: start, $lt: end },
          time: t,
          status: { $nin: ['Cancelled'] }
        }).lean();
        if (existing) {
          return { ok: false, reason: 'Selected time is already booked' };
        }
      }
      return { ok: true, shift: matchingShift, slot };
    };

    const validation = await validateDoctorAvailability(appointmentData.doctorId, appointmentData.date, appointmentData.time);
    if (!validation.ok) {
      // Immediately refund since slot is no longer available
      try {
        await stripe.refunds.create({ payment_intent: paymentIntentId, amount: parseInt(paymentIntent.metadata.consultationFee) * 100 });
      } catch (e) {
        logger.error('Auto-refund failed after unavailable slot', { err: e?.message });
      }
      return res.status(409).json({ success: false, message: validation.reason || 'Selected time is no longer available. Payment has been refunded.' });
    }

    const newAppointment = new Appointment({
      userId: userId,
      doctorId: appointmentData.doctorId,
      date: appointmentData.date,
      time: appointmentData.time,
      symptoms: appointmentData.symptoms,
      doctorname: appointmentData.doctorname,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      appointmentType: capitalize(appointmentData.appointmentType) || 'Regular',
      priority: capitalize(appointmentData.priority) || 'Normal',
      recurringPattern: appointmentData.recurringPattern ? {
        ...appointmentData.recurringPattern,
        frequency: capitalize(appointmentData.recurringPattern.frequency)
      } : undefined
    });
    let savedAppointment;
    try {
      savedAppointment = await newAppointment.save();
    } catch (err) {
      logger.error('Error saving appointment after payment', { err: err?.message });
      // Best effort refund
      try { await stripe.refunds.create({ payment_intent: paymentIntentId, amount: parseInt(paymentIntent.metadata.consultationFee) * 100 }); } catch (e) {}
      return res.status(500).json({
        success: false,
        message: "Failed to create appointment after payment"
      });
    }
    const payment = new Payment({
      appointmentId: savedAppointment._id,
      patientId: userId,
      doctorId: appointmentData.doctorId,
      amount: parseInt(paymentIntent.metadata.consultationFee),
      currency: paymentIntent.currency.toUpperCase(),
      paymentMethod: appointmentData.paymentMethod || 'Card',
      stripePaymentIntentId: paymentIntentId,
      status: 'Succeeded',
      stripeChargeId,
      paymentDate: new Date(),
      receiptUrl,
      platformFee: parseInt(paymentIntent.metadata.platformFee),
      doctorEarnings: parseInt(paymentIntent.metadata.consultationFee) - parseInt(paymentIntent.metadata.platformFee)
    });
    await payment.save();
    savedAppointment.paymentId = payment._id;
    savedAppointment.paymentStatus = 'Paid';
    await savedAppointment.save();

    // Book the associated TimeSlot if exists
    try {
      const { start: ds, end: de } = sameDayBounds(appointmentData.date);
      const slotDoc = await TimeSlot.findOne({
        doctorId: appointmentData.doctorId,
        date: { $gte: ds, $lt: de },
        startTime: appointmentData.time,
      });
      if (slotDoc && slotDoc.canAcceptBooking()) {
        await slotDoc.bookSlot(savedAppointment._id);
      }
    } catch (e) {
      logger.warn('Failed to book slot during payment confirmation', { err: e?.message });
    }
    const appointment = await Appointment.findById(savedAppointment._id)
      .populate('doctorId')
      .populate('userId');
    const patientNotification = new Notification({
      userId: payment.patientId,
      content: `Payment successful! Your appointment with Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname} is confirmed for ${appointment.date} at ${appointment.time}`
    });
    const doctorNotification = new Notification({
      userId: payment.doctorId,
      content: `Payment received for appointment with ${appointment.userId.firstname} ${appointment.userId.lastname} on ${appointment.date} at ${appointment.time}. You will earn $${payment.doctorEarnings}`
    });
    await Promise.all([
      patientNotification.save(),
      doctorNotification.save()
    ]);
    res.json({
      success: true,
      message: "Payment confirmed successfully",
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        receiptUrl: payment.receiptUrl
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm payment"
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({
      $or: [{ patientId: userId }, { doctorId: userId }]
    })
    .populate('appointmentId')
    .populate('patientId', 'firstname lastname email')
    .populate('doctorId', 'firstname lastname email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Payment.countDocuments({
      $or: [{ patientId: userId }, { doctorId: userId }]
    });

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history"
    });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.userId;

    const payment = await Payment.findOne({
      _id: paymentId,
      $or: [{ patientId: userId }, { doctorId: userId }]
    })
    .populate('appointmentId')
    .populate('patientId', 'firstname lastname email')
    .populate('doctorId', 'firstname lastname email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details"
    });
  }
};

const requestRefund = async (req, res) => {
  try {
    const { paymentId, refundAmount, reason } = req.body;
    const userId = req.userId;

    const payment = await Payment.findOne({
      _id: paymentId,
      patientId: userId,
      status: { $in: ['Succeeded', 'Partially_Refunded'] }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or not eligible for refund"
      });
    }

    if (payment.refundAmount >= payment.amount) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be refunded"
      });
    }

    // Load appointment to apply refund policy (based on type and timing)
    const appointment = await Appointment.findById(payment.appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Associated appointment not found' });
    }

    // Refund policies (mirror refundController)
    const POLICIES = {
      'Emergency': { full: 2, partial: 0, percent: 0 },
      'Consultation': { full: 24, partial: 4, percent: 50 },
      'Follow-up': { full: 12, partial: 2, percent: 75 },
      'Regular': { full: 24, partial: 6, percent: 60 }
    };
    const policy = POLICIES[appointment.appointmentType] || POLICIES['Regular'];
    const appointmentDate = new Date(appointment.date);
    const [hh, mm] = (appointment.time || '00:00').split(':');
    appointmentDate.setHours(parseInt(hh || '0'), parseInt(mm || '0'), 0, 0);
    const now = new Date();
    const hoursBefore = (appointmentDate - now) / (1000 * 60 * 60);

    let policyAllowed = 0;
    if (hoursBefore >= policy.full) {
      policyAllowed = payment.amount - (payment.refundAmount || 0);
    } else if (hoursBefore >= policy.partial) {
      policyAllowed = Math.round(payment.amount * (policy.percent / 100)) - (payment.refundAmount || 0);
    } else if (appointment.status === 'Cancelled') {
      // If already cancelled, use the same policy calculation at cancellation time (best-effort now)
      policyAllowed = 0; // too late for refund under policy
    } else {
      policyAllowed = 0;
    }
    policyAllowed = Math.max(0, policyAllowed);

    // Determine refundable remaining amount and requested amount
    const remaining = Math.max(0, (payment.amount || 0) - (payment.refundAmount || 0));
    const desired = typeof refundAmount === 'number' && !isNaN(refundAmount) ? refundAmount : remaining;
    const cappedByPolicy = Math.min(desired, policyAllowed);
    const actualRefundAmount = Math.min(cappedByPolicy, remaining);
    if (actualRefundAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Not eligible for refund under current policy/timing' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: actualRefundAmount * 100
    });

  payment.refundAmount = (payment.refundAmount || 0) + actualRefundAmount;
    payment.refundReason = reason;
    payment.refundDate = new Date();
    payment.status = payment.refundAmount >= payment.amount ? 'Refunded' : 'Partially_Refunded';

    await payment.save();

    await Appointment.findByIdAndUpdate(payment.appointmentId, {
      status: 'Cancelled',
      paymentStatus: payment.refundAmount >= payment.amount ? 'Refunded' : 'Paid'
    });

    await Notification.create({
      userId: payment.patientId,
      content: `Your refund request for appointment on ${payment.paymentDate.toLocaleDateString()} has been processed. Amount refunded: $${actualRefundAmount}.`
    });

    res.json({
      success: true,
      message: "Refund processed successfully",
      refundAmount: actualRefundAmount,
      refundId: refund.id
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: "Failed to process refund"
    });
  }
};

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailure(failedPayment);
      break;
    default:
      logger.warn('Unhandled Stripe webhook event', { type: event.type });
  }

  res.json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'Succeeded',
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        paymentDate: new Date()
      }
    );
    if (payment && payment.appointmentId) {
      await Appointment.findByIdAndUpdate(payment.appointmentId, { paymentStatus: 'Paid' });
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

const handlePaymentFailure = async (paymentIntent) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'Failed',
        failureReason: paymentIntent.last_payment_error?.message
      }
    );
    if (payment && payment.appointmentId) {
      await Appointment.findByIdAndUpdate(payment.appointmentId, { paymentStatus: 'Failed' });
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

const getDoctorEarnings = async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        paymentDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const earnings = await Payment.aggregate([
      {
        $match: {
          doctorId: mongoose.Types.ObjectId(userId),
          status: 'Succeeded',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$doctorEarnings' },
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalPlatformFees: { $sum: '$platformFee' }
        }
      }
    ]);

    res.json({
      success: true,
      earnings: earnings[0] || {
        totalEarnings: 0,
        totalPayments: 0,
        totalAmount: 0,
        totalPlatformFees: 0
      }
    });

  } catch (error) {
    console.error('Error fetching doctor earnings:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings"
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const payment = await Payment.findById(invoiceId)
      .populate('patientId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname email')
      .populate('appointmentId');

    if (!payment) {
      res.status(404).send('Invoice not found');
      return;
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceId}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Medical Appointment Invoice', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice ID: ${payment._id}`);
    doc.text(`Date: ${payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : ''}`);
    doc.moveDown();

    doc.text(`Patient: ${payment.patientId?.firstname || ''} ${payment.patientId?.lastname || ''}`);
    doc.text(`Email: ${payment.patientId?.email || ''}`);
    doc.moveDown();

    doc.text(`Doctor: Dr. ${payment.doctorId?.firstname || ''} ${payment.doctorId?.lastname || ''}`);
    doc.text(`Email: ${payment.doctorId?.email || ''}`);
    doc.moveDown();

    if (payment.appointmentId) {
      doc.text(`Appointment Date: ${payment.appointmentId.date ? new Date(payment.appointmentId.date).toLocaleDateString() : ''}`);
      doc.text(`Appointment Time: ${payment.appointmentId.time || ''}`);
      doc.moveDown();
    }

    doc.text(`Amount: $${payment.amount}`);
    doc.text(`Status: ${payment.status}`);
    doc.text(`Payment Method: ${payment.paymentMethod}`);
    doc.moveDown();

    doc.text('Thank you for your payment!', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).send('Failed to generate invoice');
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getPaymentDetails,
  requestRefund,
  handleStripeWebhook,
  getDoctorEarnings,
  downloadInvoice,
};