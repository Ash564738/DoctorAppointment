const express = require("express");
const auth = require("../middleware/auth");
const { body } = require('express-validator');
const {
  createRecurringAppointment,
  getRecurringAppointments,
  cancelRecurringSeries,
  updateRecurringSeries
} = require("../controllers/recurringAppointmentController");

const router = express.Router();

// Validation middleware for recurring appointments
const recurringAppointmentValidation = [
  body('doctorId').isMongoId().withMessage('Invalid doctor ID'),
  body('startDate').isISO8601().withMessage('Invalid start date format'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
  body('symptoms').trim().isLength({ min: 3 }).withMessage('Symptoms must be at least 3 characters long'),
  body('frequency').isIn(['weekly', 'biweekly', 'monthly']).withMessage('Invalid frequency'),
  body('occurrences').optional().isInt({ min: 1, max: 52 }).withMessage('Occurrences must be between 1 and 52'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  body('appointmentType').optional().isIn(['regular', 'emergency', 'follow-up', 'consultation', 'telemedicine']).withMessage('Invalid appointment type'),
  body('estimatedDuration').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes')
];

const cancelSeriesValidation = [
  body('seriesId').isMongoId().withMessage('Invalid series ID'),
  body('cancelFuture').optional().isBoolean().withMessage('cancelFuture must be a boolean'),
  body('reason').optional().trim().isLength({ max: 300 }).withMessage('Reason too long')
];

const updateSeriesValidation = [
  body('seriesId').isMongoId().withMessage('Invalid series ID'),
  body('updateFuture').optional().isBoolean().withMessage('updateFuture must be a boolean'),
  body('symptoms').optional().trim().isLength({ min: 3 }).withMessage('Symptoms must be at least 3 characters long'),
  body('appointmentType').optional().isIn(['regular', 'emergency', 'follow-up', 'consultation', 'telemedicine']).withMessage('Invalid appointment type')
];

// Routes
router.post("/create", auth, recurringAppointmentValidation, createRecurringAppointment);
router.get("/", auth, getRecurringAppointments);
router.put("/cancel", auth, cancelSeriesValidation, cancelRecurringSeries);
router.put("/update", auth, updateSeriesValidation, updateRecurringSeries);

module.exports = router;
