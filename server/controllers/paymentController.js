// Simple demo mode - bypass Stripe entirely
const isDemoMode = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('demo');

let stripe;
if (isDemoMode) {
  // Create a mock stripe object that returns demo data
  stripe = {
    paymentIntents: {
      create: async ({ amount, currency = 'usd' }) => {
        const paymentIntentId = `mock_pi_${Date.now()}`;
        const clientSecret = `${paymentIntentId}_secret_mock`;
        return {
          id: paymentIntentId,
          client_secret: clientSecret,
          status: 'requires_payment_method',
          amount,
          currency
        };
      },
      retrieve: async (id) => {
        return {
          id,
          status: 'succeeded',
          amount: 5000, // $50 default
          currency: 'usd'
        };
      }
    }
  };
} else {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}
const Payment = require("../models/paymentModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const Notification = require("../models/notificationModel");

// Create payment intent for appointment booking
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

    // Validate appointmentData has required fields
    if (!appointmentData.doctorId || !appointmentData.date || !appointmentData.time || !appointmentData.symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment data: missing required fields'
      });
    }

    // Get doctor details for fees
    const doctor = await Doctor.findOne({ userId: appointmentData.doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    // Get patient details
    const patient = await User.findById(userId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Calculate amounts
    const consultationFee = amount; // Use the amount from frontend
    const platformFeePercent = 10; // 10% platform fee
    const platformFee = Math.round(consultationFee * platformFeePercent / 100);
    const doctorEarnings = consultationFee - platformFee;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: consultationFee * 100, // Stripe uses cents
      currency: currency.toLowerCase(),
      metadata: {
        appointmentData: JSON.stringify(appointmentData),
        patientId: userId,
        doctorId: appointmentData.doctorId,
        consultationFee: consultationFee.toString(),
        platformFee: platformFee.toString()
      }
    });

    // Store payment intent ID temporarily (we'll create the payment record after confirmation)
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

// Confirm payment after successful charge
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, demoMode } = req.body;
    const userId = req.userId;

    let appointmentData;
    let paymentIntent;

    // Handle demo mode
    if (demoMode || isDemoMode) {
      // For demo mode, we need to get the appointment data from the frontend
      // Since this is demo mode, we'll return success and let frontend handle appointment creation
      return res.json({
        success: true,
        message: 'Demo payment confirmed successfully',
        status: 'succeeded',
        demoMode: true
      });
    }

    // Retrieve payment intent from Stripe with charges expanded
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['charges.data']
    });

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: "Payment not successful"
      });
    }

    // Extract appointment data from payment intent metadata
    try {
      appointmentData = JSON.parse(paymentIntent.metadata.appointmentData);
    } catch (error) {
      console.error('Error parsing appointment data from payment intent:', error);
      return res.status(400).json({
        success: false,
        message: "Invalid appointment data in payment"
      });
    }

    // Create the appointment AFTER successful payment
    const newAppointment = new Appointment({
      userId: userId,
      doctorId: appointmentData.doctorId,
      date: appointmentData.date,
      time: appointmentData.time,
      symptoms: appointmentData.symptoms,
      doctorname: appointmentData.doctorname,
      status: 'Confirmed', // Confirmed since payment is successful
      paymentStatus: 'Paid'
    });

    const savedAppointment = await newAppointment.save();

    // Create payment record
    const firstCharge = paymentIntent.charges?.data?.[0];
    const payment = new Payment({
      appointmentId: savedAppointment._id,
      patientId: userId,
      doctorId: appointmentData.doctorId,
      amount: parseInt(paymentIntent.metadata.consultationFee),
      currency: paymentIntent.currency.toUpperCase(),
      paymentMethod: 'card',
      stripePaymentIntentId: paymentIntentId,
      status: 'succeeded',
      stripeChargeId: firstCharge?.id || null,
      paymentDate: new Date(),
      receiptUrl: firstCharge?.receipt_url || null,
      platformFee: parseInt(paymentIntent.metadata.platformFee),
      doctorEarnings: parseInt(paymentIntent.metadata.consultationFee) - parseInt(paymentIntent.metadata.platformFee)
    });

    await payment.save();

    // Get populated appointment for notifications
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

// Get payment history for user
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

// Get payment details by ID
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

// Request refund
const requestRefund = async (req, res) => {
  try {
    const { paymentId, refundAmount, reason } = req.body;
    const userId = req.userId;

    const payment = await Payment.findOne({
      _id: paymentId,
      patientId: userId,
      status: 'succeeded'
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

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: actualRefundAmount * 100 // Convert to cents
    });

    // Update payment record
    payment.refundAmount += actualRefundAmount;
    payment.refundReason = reason;
    payment.refundDate = new Date();
    payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';

    await payment.save();

    // Update appointment status
    await Appointment.findByIdAndUpdate(payment.appointmentId, {
      status: 'Cancelled'
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

// Handle Stripe webhooks
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
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
      // Log unhandled events for debugging
      logger.warn('Unhandled Stripe webhook event', { type: event.type });
  }

  res.json({ received: true });
};

// Helper function to handle payment success
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'succeeded',
        stripeChargeId: paymentIntent.charges.data[0]?.id,
        paymentDate: new Date()
      }
    );
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Helper function to handle payment failure
const handlePaymentFailure = async (paymentIntent) => {
  try {
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message
      }
    );
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// Get doctor earnings
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
          status: 'succeeded',
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

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getPaymentDetails,
  requestRefund,
  handleStripeWebhook,
  getDoctorEarnings
};
