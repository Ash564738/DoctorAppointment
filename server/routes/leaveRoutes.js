const express = require("express");
const {
  submitLeaveRequest,
  getLeaveRequests,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics
} = require("../controllers/leaveController");
const auth = require("../middleware/auth");
const { body } = require('express-validator');

const leaveRouter = express.Router();

// Validation middleware for leave request
const leaveRequestValidation = [
  body('leaveType').isIn(['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement']).withMessage('Invalid leave type'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
  body('isEmergency').optional().isBoolean().withMessage('isEmergency must be a boolean')
];

// Submit leave request (Staff only)
leaveRouter.post("/request", auth, leaveRequestValidation, submitLeaveRequest);

// Get leave requests
leaveRouter.get("/", auth, getLeaveRequests);

// Approve/Reject leave request (Admin only)
leaveRouter.patch("/:requestId/process", auth, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('rejectionReason').optional().trim().isLength({ max: 300 }).withMessage('Rejection reason too long')
], processLeaveRequest);

// Cancel leave request
leaveRouter.patch("/:requestId/cancel", auth, [
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Cancellation reason too long')
], cancelLeaveRequest);

// Get leave statistics
leaveRouter.get("/statistics", auth, getLeaveStatistics);

module.exports = leaveRouter;
