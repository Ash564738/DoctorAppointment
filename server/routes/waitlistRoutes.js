const express = require("express");
const {
  joinWaitlist,
  getUserWaitlist,
  getDoctorWaitlist,
  convertWaitlistToAppointment,
  removeFromWaitlist,
  getAllWaitlist
} = require("../controllers/waitlistController");
const auth = require("../middleware/auth");
const { body } = require('express-validator');

const waitlistRouter = express.Router();

// Validation middleware for joining waitlist
const waitlistValidation = [
  body('doctorId').isMongoId().withMessage('Valid doctor ID required'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
  body('symptoms').trim().isLength({ min: 3, max: 1000 }).withMessage('Symptoms must be between 3 and 1000 characters'),
  body('appointmentType').optional().isIn(['regular', 'emergency', 'follow-up', 'consultation', 'telemedicine']),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
];

// Join waitlist for a slot
waitlistRouter.post("/join", auth, waitlistValidation, joinWaitlist);

// Get user's waitlist entries
waitlistRouter.get("/user", auth, getUserWaitlist);

// Get doctor's waitlist
waitlistRouter.get("/doctor", auth, getDoctorWaitlist);

// Convert waitlist to appointment (when notified)
waitlistRouter.post("/convert/:waitlistId", auth, convertWaitlistToAppointment);

// Remove from waitlist
waitlistRouter.delete("/:waitlistId", auth, removeFromWaitlist);

// Admin: Get all waitlist entries
waitlistRouter.get("/admin/all", auth, getAllWaitlist);

module.exports = waitlistRouter;
