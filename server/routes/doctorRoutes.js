const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorController");
const auth = require("../middleware/auth");

// Public: Get all doctors
router.get("/getalldoctors", doctorController.getalldoctors);

// Authenticated: List colleague doctors (excluding current user)
router.get("/colleagues", auth, doctorController.getalldoctors);

// Authenticated: List available doctors for coverage (placeholder)
router.get("/available", auth, doctorController.getalldoctors);

// Authenticated: Get users who are not doctors
router.get("/getnotdoctors", auth, doctorController.getnotdoctors);

// Authenticated: Apply for doctor role
router.post("/applyfordoctor", auth, doctorController.applyfordoctor);

// Authenticated: Delete doctor
router.put("/deletedoctor", auth, doctorController.deletedoctor);

// Authenticated: Accept doctor application
router.put("/acceptdoctor", auth, doctorController.acceptdoctor);

// Authenticated: Reject doctor application
router.put("/rejectdoctor", auth, doctorController.rejectdoctor);

// Authenticated: Admin update doctor info
router.put("/admin-update/:id", auth, doctorController.adminUpdateDoctor);

// Authenticated: Get my patients
router.get("/my-patients", auth, doctorController.getMyPatients);

// Authenticated: Get doctor analytics
router.get("/analytics", auth, doctorController.getDoctorAnalytics);

// Authenticated: Get recent activity
router.get("/recent-activity", auth, doctorController.getRecentActivity);

module.exports = router;
