const express = require('express');
const auth = require('../middleware/auth');
const { body, param } = require('express-validator');
const reminderController = require('../controllers/reminderController');

const router = express.Router();

// Validation middleware
const createReminderValidation = [
  body('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
  body('remindAt').isISO8601().withMessage('Invalid reminder date'),
  body('method').optional().isIn(['email', 'sms', 'push', 'notification']).withMessage('Invalid method'),
  body('message').trim().isLength({ min: 10, max: 500 }).withMessage('Message must be between 10 and 500 characters')
];

const reminderIdValidation = [
  param('reminderId').isMongoId().withMessage('Invalid reminder ID')
];

// Routes
router.post('/create', auth, createReminderValidation, reminderController.createReminder);
router.get('/user', auth, reminderController.getReminders);
router.post('/send-due', auth, reminderController.sendDueReminders); // For admin/system use
router.put('/:reminderId/sent', auth, reminderIdValidation, reminderController.markSent);
router.delete('/:reminderId', auth, reminderIdValidation, reminderController.deleteReminder);

module.exports = router;
