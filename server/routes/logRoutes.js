const express = require('express');
const { logClientError, getErrorStats } = require('../controllers/logController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/client-error', logClientError);
router.get('/error-stats', auth, getErrorStats);

module.exports = router;
