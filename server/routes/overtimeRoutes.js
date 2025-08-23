const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const {
  createOvertime,
  getDoctorOvertime,
  getAllOvertime,
  updateOvertimeStatus
} = require('../controllers/overtimeController');

router.post('/create', auth, createOvertime);
router.get('/my-overtime', auth, getDoctorOvertime);
router.get('/all', auth, adminOnly, getAllOvertime);
router.patch('/:id/status', auth, adminOnly, updateOvertimeStatus);
module.exports = router;
