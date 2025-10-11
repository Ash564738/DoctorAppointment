const express = require('express');
const router = express.Router();
const {
  checkRefundEligibility,
  processRefund,
  getRefundAnalytics,
  getAllRefunds,
  getDoctorRefundImpact
} = require('../controllers/refundController');

const auth = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');
router.get('/eligibility/:appointmentId', auth, checkRefundEligibility);
router.post('/process', auth, authorizeRoles('Doctor', 'Admin'), processRefund);
router.get('/analytics', auth, authorizeRoles('Doctor', 'Admin'), getRefundAnalytics);
router.get('/', auth, authorizeRoles('Doctor', 'Admin'), getAllRefunds);
router.get('/doctor-impact', auth, authorizeRoles('Doctor'), getDoctorRefundImpact);

module.exports = router;