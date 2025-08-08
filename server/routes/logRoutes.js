const express = require('express');
const { logClientError, getErrorStats } = require('../controllers/logController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public endpoint for logging client errors (no auth required for error reporting)
router.post('/client-error', logClientError);

// Protected endpoint for getting error statistics (admin only)
router.get('/error-stats', auth, getErrorStats);

module.exports = router;
