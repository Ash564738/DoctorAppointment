const express = require('express');
const auth = require('../middleware/auth');
const { param, body } = require('express-validator');
const {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats
} = require('../controllers/branchController');
const router = express.Router();
const branchIdValidation = [
  param('branchId').isMongoId().withMessage('Invalid branch ID')
];
const createBranchValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Branch name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Branch name must be between 2 and 100 characters'),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .isLength({ min: 8, max: 20 })
    .withMessage('Contact number must be between 8 and 20 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Status must be active, inactive, or maintenance'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('manager')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Manager name must not exceed 100 characters'),
  
  body('operatingHours')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Operating hours must not exceed 100 characters')
];

const updateBranchValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Branch name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Branch name must be between 2 and 100 characters'),
  
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  
  body('contact')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact number cannot be empty')
    .isLength({ min: 8, max: 20 })
    .withMessage('Contact number must be between 8 and 20 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance'])
    .withMessage('Status must be active, inactive, or maintenance'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('manager')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Manager name must not exceed 100 characters'),
  
  body('operatingHours')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Operating hours must not exceed 100 characters')
];

// Routes
router.get('/', auth, getBranches);
router.get('/stats', auth, getBranchStats);
router.get('/:branchId', auth, branchIdValidation, getBranchById);
router.post('/', auth, createBranchValidation, createBranch);
router.put('/:branchId', auth, branchIdValidation, updateBranchValidation, updateBranch);
router.delete('/:branchId', auth, branchIdValidation, deleteBranch);

module.exports = router;
