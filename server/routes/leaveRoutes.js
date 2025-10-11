const express = require("express");
const upload = require('../middleware/multerConfig');
const {
  submitLeaveRequest,
  getLeaveRequests,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics,
  getMyCoverageRequests,
  respondCoveringRequest
} = require("../controllers/leaveController");
const auth = require("../middleware/auth");
const { body } = require('express-validator');
const leaveRouter = express.Router();
const leaveRequestValidation = [
  body('leaveType').isIn(['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement']).withMessage('Invalid leave type'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
  body('isEmergency').optional().isBoolean().withMessage('isEmergency must be a boolean')
];
leaveRouter.post("/request", auth, upload.array('attachments', 5), leaveRequestValidation, submitLeaveRequest);
leaveRouter.get("/", auth, getLeaveRequests);
leaveRouter.get("/my-coverage-requests", auth, getMyCoverageRequests);
leaveRouter.post("/:requestId/cover/respond", auth, respondCoveringRequest);
leaveRouter.patch("/:requestId/process", auth, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('rejectionReason').optional().trim().isLength({ max: 300 }).withMessage('Rejection reason too long')
], processLeaveRequest);
leaveRouter.patch("/:requestId/cancel", auth, [
  body('reason').optional().trim().isLength({ max: 200 }).withMessage('Cancellation reason too long')
], cancelLeaveRequest);
leaveRouter.get("/statistics", auth, getLeaveStatistics);

module.exports = leaveRouter;
