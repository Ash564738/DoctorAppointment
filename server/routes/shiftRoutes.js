const express = require("express");
const {
  createShift,
  getDoctorShifts,
  generateSlotsForDate,
  getAvailableSlots,
  updateShift,
  deleteShift,
  getAllShifts,
  toggleSlotAvailability,
  getSchedulesByWeek,
  adminCreateShift,
  adminDeleteShift
} = require("../controllers/shiftController");
const auth = require("../middleware/auth");
const { body } = require('express-validator');
const { adminOnly } = require('../middleware/roles');
const shiftRouter = express.Router();
const shiftValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('daysOfWeek').isArray({ min: 1 }).withMessage('At least one day must be selected'),
  body('maxPatientsPerHour').optional().isInt({ min: 1, max: 20 }).withMessage('Max patients per hour must be between 1 and 20'),
  body('slotDuration').optional().isIn([15, 30, 45, 60]).withMessage('Slot duration must be 15, 30, 45, or 60 minutes')
];

shiftRouter.post("/create", auth, shiftValidation, createShift);
shiftRouter.get("/doctor/:doctorId?", auth, getDoctorShifts);
shiftRouter.get("/mydoctorshifts", auth, getDoctorShifts);
shiftRouter.post("/generate-slots", auth, generateSlotsForDate);
shiftRouter.get("/available-slots/:doctorId/:date", getAvailableSlots);
shiftRouter.put("/:shiftId", auth, shiftValidation, updateShift);
shiftRouter.delete("/:shiftId", auth, deleteShift);
shiftRouter.get("/all", auth, getAllShifts);
shiftRouter.get("/", getSchedulesByWeek);
shiftRouter.patch("/slot/:slotId/toggle", auth,[body('isBlocked').isBoolean().withMessage('isBlocked must be a boolean'),body('blockReason').optional().trim().isLength({ max: 200 }).withMessage('Block reason too long')],toggleSlotAvailability);
shiftRouter.post("/admin-create/:doctorId", auth, adminOnly, shiftValidation, adminCreateShift);
shiftRouter.delete("/admin-delete/:shiftId", auth, adminOnly, adminDeleteShift);

module.exports = shiftRouter;