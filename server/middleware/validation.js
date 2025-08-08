const { body, validationResult } = require('express-validator');
const { logger } = require('./monitoring');

// Validation middleware to handle errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  next();
};

// Alias for backwards compatibility
const handleValidationErrors = validateRequest;

// User registration validation
const validateUserRegistration = [
  body('firstname')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('First name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastname')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Last name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 5 })
    .withMessage('Password must be at least 5 characters long'),

  body('role')
    .isIn(['Admin', 'Doctor', 'Patient'])
    .withMessage('Role must be Admin, Doctor, or Patient'),

  body('pic')
    .optional()
    .isURL()
    .withMessage('Profile picture must be a valid URL'),

  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Appointment booking validation
const validateAppointmentBooking = [
  body('doctorId')
    .isMongoId()
    .withMessage('Invalid doctor ID'),

  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (appointmentDate < today) {
        throw new Error('Appointment date cannot be in the past');
      }
      return true;
    }),

  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),

  handleValidationErrors
];

// Doctor application validation
const validateDoctorApplication = [
  body('specialization')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Specialization must be between 2 and 100 characters'),

  body('experience')
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be a number between 0 and 50'),

  body('fees')
    .isFloat({ min: 0 })
    .withMessage('Fees must be a positive number'),

  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateAppointmentBooking,
  validateDoctorApplication,
  validateRequest,
  handleValidationErrors
};