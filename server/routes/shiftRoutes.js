const express = require("express");
const {
  createShift,
  getDoctorShifts,
  generateSlotsForDate,
  getAvailableSlots,
  updateShift,
  deleteShift,
  getAllShifts,
  toggleSlotAvailability
} = require("../controllers/shiftController");
const auth = require("../middleware/auth");
const { body } = require('express-validator');

const shiftRouter = express.Router();

// Validation middleware for shift creation
const shiftValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('daysOfWeek').isArray({ min: 1 }).withMessage('At least one day must be selected'),
  body('maxPatientsPerHour').optional().isInt({ min: 1, max: 20 }).withMessage('Max patients per hour must be between 1 and 20'),
  body('slotDuration').optional().isIn([15, 30, 45, 60]).withMessage('Slot duration must be 15, 30, 45, or 60 minutes')
];

// Create a new shift (Doctor only)
shiftRouter.post("/create", auth, shiftValidation, createShift);

// Get shifts for a doctor
shiftRouter.get("/doctor/:doctorId?", auth, getDoctorShifts);

// Generate time slots for a specific date
shiftRouter.post("/generate-slots", auth, generateSlotsForDate);

// Get available slots for booking
shiftRouter.get("/available-slots/:doctorId/:date", getAvailableSlots);

// Update shift (Doctor only - own shifts)
shiftRouter.put("/:shiftId", auth, shiftValidation, updateShift);

// Delete shift (Doctor only - own shifts)
shiftRouter.delete("/:shiftId", auth, deleteShift);

// Get all shifts (Admin only)
shiftRouter.get("/all", auth, getAllShifts);

// Block/Unblock time slot
shiftRouter.patch("/slot/:slotId/toggle", auth, [
  body('isBlocked').isBoolean().withMessage('isBlocked must be a boolean'),
  body('blockReason').optional().trim().isLength({ max: 200 }).withMessage('Block reason too long')
], toggleSlotAvailability);

module.exports = shiftRouter;
