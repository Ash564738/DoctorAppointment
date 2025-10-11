const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const appointmentController = require("../controllers/appointmentController");


router.get("/getallappointments", auth, appointmentController.getallappointments);
// Deprecated: Booking must go through Stripe (/payment/create-payment-intent then /payment/confirm-payment)
router.post("/bookappointment", auth, appointmentController.bookappointment);
router.put("/completed", auth, appointmentController.completed);
router.put("/update/:appointmentId", auth, appointmentController.updateAppointment);
router.get("/upcoming", auth, appointmentController.getUpcomingAppointments);
router.get("/doctor", auth, appointmentController.getDoctorAppointments);
router.get("/patient", auth, appointmentController.getPatientAppointments);
router.get("/patient-stats", auth, appointmentController.getPatientStats);

module.exports = router;