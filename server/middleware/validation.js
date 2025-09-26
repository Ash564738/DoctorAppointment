const { body, validationResult } = require('express-validator');
const { logger } = require('./monitoring');

const validateRequest = (req, res, next) => {
  console.log('Validating request body:', JSON.stringify(req.body));
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

const handleValidationErrors = validateRequest;

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

const validateUserLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),

  (req, res, next) => {
    console.log('Login request body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }
    next();
  }
];

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

const validatePrescription = [
  body('patientId')
    .isMongoId()
    .withMessage('Invalid patient ID'),

  body('medications')
    .isArray({ min: 1 })
    .withMessage('At least one medication is required'),

  body('medications.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Medication name must be between 2 and 100 characters'),

  body('medications.*.dosage')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Dosage is required and must be under 50 characters'),

  body('medications.*.frequency')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Frequency is required and must be under 50 characters'),

  body('diagnosis')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Diagnosis is required and must be under 500 characters'),

  body('symptoms')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Symptoms are required and must be between 3 and 1000 characters'),

  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Instructions must be under 1000 characters'),

  handleValidationErrors
];

const validateHealthMetrics = [
  body('vitalSigns.bloodPressure.systolic')
    .optional()
    .isFloat({ min: 50, max: 300 })
    .withMessage('Systolic pressure must be between 50 and 300'),

  body('vitalSigns.bloodPressure.diastolic')
    .optional()
    .isFloat({ min: 30, max: 200 })
    .withMessage('Diastolic pressure must be between 30 and 200'),

  body('vitalSigns.heartRate')
    .optional()
    .isFloat({ min: 30, max: 250 })
    .withMessage('Heart rate must be between 30 and 250'),

  body('vitalSigns.temperature.value')
    .optional()
    .isFloat({ min: 35, max: 45 })
    .withMessage('Temperature must be between 35°C and 45°C'),

  body('measurements.weight')
    .optional()
    .isFloat({ min: 0.5, max: 500 })
    .withMessage('Weight must be between 0.5 and 500 kg'),

  body('measurements.height')
    .optional()
    .isFloat({ min: 30, max: 300 })
    .withMessage('Height must be between 30 and 300 cm'),

  handleValidationErrors
];

const validateFamilyMember = [
  body('firstname')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastname')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('relationship')
    .isIn(['spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'uncle', 'aunt', 'cousin', 'other'])
    .withMessage('Invalid relationship type'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      if (value && new Date(value) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),

  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateAppointmentBooking,
  validateDoctorApplication,
  validatePrescription,
  validateHealthMetrics,
  validateFamilyMember,
  validateRequest,
  handleValidationErrors
};