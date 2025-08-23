const express = require("express");
const auth = require("../middleware/auth");
const { body, param } = require('express-validator');
const {
  getWalkInQueue,
  addToWalkInQueue,
  updateQueueStatus,
  removeFromQueue,
  getQueueStatistics
} = require("../controllers/walkInQueueController");

const router = express.Router();

// Validation middleware
const addToQueueValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('mobile').matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Invalid phone number format'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('reason').trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters'),
  body('doctorId').optional().isMongoId().withMessage('Invalid doctor ID'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('isEmergency').optional().isBoolean().withMessage('isEmergency must be a boolean'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
];

const updateStatusValidation = [
  param('id').isMongoId().withMessage('Invalid queue entry ID'),
  body('status').isIn(['waiting', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long'),
  body('doctorId').optional().isMongoId().withMessage('Invalid doctor ID')
];

const removeFromQueueValidation = [
  param('id').isMongoId().withMessage('Invalid queue entry ID'),
  body('reason').optional().trim().isLength({ max: 300 }).withMessage('Reason too long')
];

// Routes
router.get("/", getWalkInQueue);
router.post("/", addToQueueValidation, addToWalkInQueue);
router.put("/:id/status", auth, updateStatusValidation, updateQueueStatus);
router.delete("/:id", auth, removeFromQueueValidation, removeFromQueue);
router.get("/statistics", auth, getQueueStatistics);

module.exports = router;
