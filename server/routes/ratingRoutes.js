const express = require("express");
const auth = require("../middleware/auth");
const { body, param } = require('express-validator');
const {
  rateAppointment,
  updateAppointmentRating,
  getDoctorRatings,
  getPatientRatings
} = require("../controllers/appointmentRatingController");

const router = express.Router();

// Validation middleware
const ratingValidation = [
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
  body('score').isInt({ min: 1, max: 5 }).withMessage('Rating score must be between 1 and 5'),
  body('feedback').optional().trim().isLength({ max: 1000 }).withMessage('Feedback too long'),
  body('categories.professionalism').optional().isInt({ min: 1, max: 5 }).withMessage('Professionalism rating must be between 1 and 5'),
  body('categories.communication').optional().isInt({ min: 1, max: 5 }).withMessage('Communication rating must be between 1 and 5'),
  body('categories.timeliness').optional().isInt({ min: 1, max: 5 }).withMessage('Timeliness rating must be between 1 and 5'),
  body('categories.treatment').optional().isInt({ min: 1, max: 5 }).withMessage('Treatment rating must be between 1 and 5')
];

const doctorRatingsValidation = [
  param('doctorId').isMongoId().withMessage('Invalid doctor ID')
];

// Routes
router.post("/appointments/:appointmentId/rate", auth, ratingValidation, rateAppointment);
router.put("/appointments/:appointmentId/rating", auth, ratingValidation, updateAppointmentRating);
router.get("/doctors/:doctorId/ratings", auth, doctorRatingsValidation, getDoctorRatings);
router.get("/my-ratings", auth, getPatientRatings);

module.exports = router;
