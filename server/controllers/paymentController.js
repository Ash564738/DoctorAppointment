const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Payment = require("../models/paymentModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const Notification = require("../models/notificationModel");
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
    console.log('Stripe PaymentIntent:', JSON.stringify(paymentIntent, null, 2));

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
      console.error('Error saving appointment:', err);
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
      status: 'Succeeded'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or not eligible for refund"
      });
    }

    if (!payment.canRefund()) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be refunded"
      });
    }

    const actualRefundAmount = payment.calculateRefund(refundAmount);

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: actualRefundAmount * 100
    });

    payment.refundAmount += actualRefundAmount;
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