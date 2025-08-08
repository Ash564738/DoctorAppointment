const express = require("express");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require("../middleware/auth");
const paymentController = require("../controllers/paymentController");

const router = express.Router();

// Create payment intent for appointment booking
router.post('/create-payment-intent', auth, paymentController.createPaymentIntent);

// Confirm payment after successful charge
router.post('/confirm-payment', auth, paymentController.confirmPayment);

// Get payment history for user
router.get('/payment-history', auth, paymentController.getPaymentHistory);

// Get payment details by ID
router.get('/payment/:paymentId', auth, paymentController.getPaymentDetails);

// Request refund
router.post('/request-refund', auth, paymentController.requestRefund);

// Stripe webhook endpoint (no auth required)
router.post('/webhook', express.raw({type: 'application/json'}), paymentController.handleStripeWebhook);

// Get doctor earnings
router.get('/doctor-earnings', auth, paymentController.getDoctorEarnings);

module.exports = router;