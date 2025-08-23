const ShiftSwap = require('../models/shiftSwapModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

// Create a shift swap request (Doctor only)
const createShiftSwap = async (req, res) => {
  try {
    const { originalShiftId, requestedShiftId, swapWithId, reason } = req.body;
    if (!originalShiftId || !requestedShiftId || !swapWithId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Only doctors can create shift swap requests
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'Doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can request shift swaps' });
    }

    const swapRequest = new ShiftSwap({
      requesterId: req.user._id,
      originalShiftId,
      requestedShiftId,
      swapWithId,
      reason
    });
    await swapRequest.save();

    // Notify the user being requested for swap
    await Notification.create({
      userId: swapWithId,
      content: `${user.firstname} ${user.lastname} has requested a shift swap with you.`
    });

    res.status(201).json({ success: true, message: 'Swap request created', data: swapRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserShiftSwaps = async (req, res) => {
  try {
    console.log('[DEBUG] req.user:', req.user);
    const userId = req.user.userId || req.user._id;
    if (!req.user || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: user not authenticated' });
    }
    let user = await User.findById(userId);
    if (!user) {
      // Try fallback: maybe userId is a Doctor _id, not User _id
      const Doctor = require('../models/doctorModel');
      const doctorProfile = await Doctor.findById(userId);
      if (doctorProfile && doctorProfile.userId) {
        user = await User.findById(doctorProfile.userId);
        console.log('[DEBUG] Fallback to doctorProfile.userId:', doctorProfile.userId, 'User:', user);
      }
    } else {
      console.log('[DEBUG] User found by userId:', user);
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: user not found' });
    }
    let userIdForQuery = user._id;
    let query = {};
    if (user.role === 'Admin') {
      query = {};
    } else {
      query = {
        $or: [
          { requesterId: userIdForQuery },
          { swapWithId: userIdForQuery }
        ]
      };
    }
    const swaps = await ShiftSwap.find(query)
      .populate([
        { path: 'originalShiftId', select: 'title startTime endTime department' },
        { path: 'requestedShiftId', select: 'title startTime endTime department' },
        { path: 'swapWithId', select: 'firstname lastname email' },
        { path: 'requesterId', select: 'firstname lastname email' }
      ])
      .lean();
    res.json({ success: true, data: swaps || [] });
  } catch (error) {
    console.error('getUserShiftSwaps error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllShiftSwaps = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const swaps = await ShiftSwap.find()
      .populate('originalShiftId requestedShiftId swapWithId requesterId')
      .lean();
    res.json({ success: true, data: swaps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShiftSwapStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const { id } = req.params;
    const { status, adminComment } = req.body;
    const swap = await ShiftSwap.findById(id);
    if (!swap) return res.status(404).json({ success: false, message: 'Swap request not found' });
    if (status && ['approved', 'rejected', 'cancelled'].includes(status)) {
      swap.status = status;
      swap.adminComment = adminComment || '';
      swap.decisionAt = new Date();
      await swap.save();
      const notifications = [
        {
          userId: swap.requesterId,
          content: `Your shift swap request has been ${status}${adminComment ? `: ${adminComment}` : ''}.`
        },
        {
          userId: swap.swapWithId,
          content: `A shift swap request involving you has been ${status}${adminComment ? `: ${adminComment}` : ''}.`
        }
      ];
      await Notification.insertMany(notifications);

      res.json({ success: true, message: `Swap request ${status}`, data: swap });
    } else {
      res.status(400).json({ success: false, message: 'Invalid status' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createShiftSwap,
  getUserShiftSwaps,
  getAllShiftSwaps,
  updateShiftSwapStatus
};