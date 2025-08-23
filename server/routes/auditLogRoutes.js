const express = require("express");
const auth = require("../middleware/auth");
const { param, query } = require('express-validator');
const {
  getAuditLogs,
  getAuditLogById,
  getUserActivityLogs,
  getSecurityEvents,
  exportAuditLogs
} = require("../controllers/auditLogController");

const router = express.Router();
const logIdValidation = [
  param('logId').isMongoId().withMessage('Invalid log ID')
];
const userIdValidation = [
  param('userId').isMongoId().withMessage('Invalid user ID')
];
const dateValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
];

// Routes (Admin only)
router.get("/", auth, dateValidation, getAuditLogs);
router.get("/security-events", auth, dateValidation, getSecurityEvents);
router.get("/export", auth, dateValidation, exportAuditLogs);
router.get("/user/:userId", auth, userIdValidation, dateValidation, getUserActivityLogs);
router.get("/:logId", auth, logIdValidation, getAuditLogById);

module.exports = router;
