const express = require("express");
const {
  createVideoConsultation,
  joinVideoConsultation,
  endVideoConsultation,
  addConsultationNotes,
  submitFeedback,
  getUserConsultations,
  getConsultationDetails,
  reportTechnicalIssue
} = require("../controllers/videoConsultationController");
const auth = require("../middleware/auth");
const { body } = require('express-validator');

const videoConsultationRouter = express.Router();

// Validation middleware for creating video consultation
const createConsultationValidation = [
  body('appointmentId').isMongoId().withMessage('Valid appointment ID required'),
  body('duration').optional().isInt({ min: 15, max: 120 }).withMessage('Duration must be between 15 and 120 minutes'),
  body('platform').optional().isIn(['zoom', 'meet', 'teams', 'webrtc', 'twilio']),
  body('recordingEnabled').optional().isBoolean()
];

// Validation for consultation notes
const consultationNotesValidation = [
  body('symptoms').optional().trim().isLength({ max: 2000 }),
  body('diagnosis').optional().trim().isLength({ max: 1000 }),
  body('treatment').optional().trim().isLength({ max: 2000 }),
  body('followUpRequired').optional().isBoolean(),
  body('followUpDate').optional().isISO8601()
];

// Validation for feedback
const feedbackValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 1000 }),
  body('technicalRating').optional().isInt({ min: 1, max: 5 }),
  body('overallSatisfaction').optional().isIn(['very-dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very-satisfied'])
];

// Create video consultation session
videoConsultationRouter.post("/create", auth, createConsultationValidation, createVideoConsultation);

// Join video consultation
videoConsultationRouter.get("/join/:meetingId", auth, joinVideoConsultation);

// End video consultation
videoConsultationRouter.post("/end/:consultationId", auth, endVideoConsultation);

// Add consultation notes (Doctor only)
videoConsultationRouter.post("/:consultationId/notes", auth, consultationNotesValidation, addConsultationNotes);

// Submit feedback
videoConsultationRouter.post("/:consultationId/feedback", auth, feedbackValidation, submitFeedback);

// Get user's video consultations
videoConsultationRouter.get("/user", auth, getUserConsultations);

// Get consultation details
videoConsultationRouter.get("/:consultationId", auth, getConsultationDetails);

// Report technical issue
videoConsultationRouter.post("/:consultationId/issue", auth, [
  body('issue').trim().isLength({ min: 10, max: 500 }).withMessage('Issue description must be between 10 and 500 characters'),
  body('severity').optional().isIn(['low', 'medium', 'high'])
], reportTechnicalIssue);

module.exports = videoConsultationRouter;
