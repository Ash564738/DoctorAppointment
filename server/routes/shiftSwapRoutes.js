const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const {
  createShiftSwap,
  getUserShiftSwaps,
  getAllShiftSwaps,
  updateShiftSwapStatus
} = require('../controllers/shiftSwapController');

router.post('/create', auth, createShiftSwap);
router.get('/my-swaps', auth, getUserShiftSwaps);
router.get('/all', auth, adminOnly, getAllShiftSwaps);
router.patch('/:id/status', auth, updateShiftSwapStatus);

module.exports = router;
