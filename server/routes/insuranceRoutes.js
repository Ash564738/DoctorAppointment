const express = require('express');
const auth = require('../middleware/auth');
const insuranceController = require('../controllers/insuranceController');

const router = express.Router();

// Add or update insurance info for logged-in user
router.post('/upsert', auth, insuranceController.upsertInsurance);

// Get insurance info for logged-in user
router.get('/my', auth, insuranceController.getInsurance);

// Admin: get all insurances
router.get('/all', auth, insuranceController.getAllInsurances);

// Delete insurance info for logged-in user
router.delete('/delete', auth, insuranceController.deleteInsurance);

module.exports = router;
