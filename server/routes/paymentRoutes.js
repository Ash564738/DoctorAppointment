const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const paymentController = require("../controllers/paymentController");

router.post("/create-payment-intent", auth, paymentController.createPaymentIntent);
router.post("/confirm-payment", auth, paymentController.confirmPayment);
router.get("/payment-history", auth, paymentController.getPaymentHistory);
router.get("/payment/:paymentId", auth, paymentController.getPaymentDetails);
router.post("/request-refund", auth, paymentController.requestRefund);
router.post("/webhook",express.raw({ type: "application/json" }),paymentController.handleStripeWebhook);
router.get("/doctor-earnings", auth, paymentController.getDoctorEarnings);
router.get("/download/:invoiceId/", auth, paymentController.downloadInvoice);

module.exports = router;