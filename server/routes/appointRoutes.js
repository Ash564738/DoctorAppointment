const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const appointmentController = require("../controllers/appointmentController");


// Walk-in queue routes
router.get("/walkin-queue", appointmentController.getWalkInQueue);
router.post("/walkin-queue", appointmentController.addToWalkInQueue);

// Appointment routes
router.get("/getallappointments", auth, appointmentController.getallappointments);
router.post("/bookappointment", auth, appointmentController.bookappointment);
router.put("/completed", auth, appointmentController.completed);
router.put("/update/:appointmentId", auth, appointmentController.updateAppointment);
router.get("/upcoming", auth, appointmentController.getUpcomingAppointments);

// Doctor and patient appointment routes
router.get("/doctor", auth, appointmentController.getDoctorAppointments);

router.get("/patient", auth, appointmentController.getPatientAppointments);
router.get("/patient-stats", auth, appointmentController.getPatientStats);

module.exports = router;