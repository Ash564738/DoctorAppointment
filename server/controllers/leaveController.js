const LeaveRequest = require("../models/leaveRequestModel");
const User = require("../models/userModel");
const Shift = require("../models/shiftModel");
const TimeSlot = require("../models/timeSlotModel");
const Notification = require("../models/notificationModel");
const { validationResult } = require('express-validator');

// Submit leave request
const submitLeaveRequest = async (req, res) => {
  console.log('[DEBUG] req.user in submitLeaveRequest:', req.user);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      leaveType,
      startDate,
      endDate,
      reason,
      isEmergency = false
    } = req.body;

    // Check if user is staff (Doctor or Admin)
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId);
    if (!user || (user.role !== 'Doctor' && user.role !== 'Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only staff members can submit leave requests'
      });
    }

    // Check for overlapping leave requests
    const overlappingLeave = await LeaveRequest.findOne({
      doctorId: userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave request for overlapping dates'
      });
    }

    const leaveRequest = new LeaveRequest({
      doctorId: userId,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      isEmergency
    });

    await leaveRequest.save();

    const admins = await User.find({ role: 'Admin' });
    const notifications = admins.map(admin => ({
      userId: admin._id,
      content: `${user.firstname} ${user.lastname} has submitted a ${leaveType} leave request from ${startDate} to ${endDate}`
    }));
    await Notification.insertMany(notifications);

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('doctorId', 'firstname lastname email role');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leaveRequest: populatedRequest
    });
  } catch (error) {
    console.error('Submit leave request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to submit leave request'
    });
  }
};

// Get leave requests (staff gets their own, admin gets all)
const getLeaveRequests = async (req, res) => {
  try {
    // Debug: log user and role
    console.log('[LEAVE DEBUG] req.user:', req.user);
    console.log('[LEAVE DEBUG] req.userRole:', req.userRole);
    const { status, doctorId, startDate, endDate, page = 1, limit = 10 } = req.query;
    let query = {};
    if (req.userRole === 'Admin' || (req.user && req.user.role === 'Admin')) {
      if (doctorId) {
        query.doctorId = doctorId;
      }
    } else {
      const userId = req.user.userId || req.user._id;
      query.doctorId = userId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    // Debug: log the query
    console.log('[LEAVE DEBUG] Mongo query:', query);
    const leaveRequests = await LeaveRequest.find(query)
      .populate('doctorId', 'firstname lastname email role')
      .populate('approvedBy', 'firstname lastname')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await LeaveRequest.countDocuments(query);
    // Debug: log the result
    console.log('[LEAVE DEBUG] leaveRequests:', leaveRequests);
    res.json({
      success: true,
      leaveRequests,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch leave requests'
    });
  }
};

// Approve/Reject leave request (Admin only)
const processLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body;

    if (req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process leave requests'
      });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }

    const leaveRequest = await LeaveRequest.findById(requestId)
      .populate('doctorId', 'firstname lastname email');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave request has already been processed'
      });
    }

    leaveRequest.status = status;
    leaveRequest.approvedBy = req.userId;
    leaveRequest.approvalDate = new Date();

    if (status === 'rejected' && rejectionReason) {
      leaveRequest.rejectionReason = rejectionReason;
    }

    // If approved, block time slots for the leave period
    if (status === 'approved') {
      await blockSlotsForLeave(leaveRequest);
    }

    await leaveRequest.save();

    // Notify the staff member
    const notification = new Notification({
      userId: leaveRequest.doctorId._id,
      content: `Your ${leaveRequest.leaveType} leave request has been ${status}${status === 'rejected' && rejectionReason ? '. Reason: ' + rejectionReason : ''}`
    });
    await notification.save();

    const admin = await User.findById(req.userId);

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      leaveRequest
    });
  } catch (error) {
    console.error('Process leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to process leave request'
    });
  }
};

// Block time slots for approved leave
const blockSlotsForLeave = async (leaveRequest) => {
  try {
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    
    // Get all dates in the leave period
    const dates = [];
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }

    // Block all time slots for these dates
    for (const date of dates) {
      await TimeSlot.updateMany(
        {
          doctorId: leaveRequest.doctorId,
          date: date
        },
        {
          isBlocked: true,
          isAvailable: false,
          blockReason: `${leaveRequest.leaveType} leave`
        }
      );
    }
  } catch (error) {
    console.error('Block slots for leave error:', error);
    throw error;
  }
};

// Cancel leave request
const cancelLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const leaveRequest = await LeaveRequest.findById(requestId);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Only the requester or admin can cancel
    const userId = req.user.userId || req.user._id;
    if (leaveRequest.doctorId.toString() !== userId && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this leave request'
      });
    }

    if (leaveRequest.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Leave request is already cancelled'
      });
    }

    // If leave was approved and is being cancelled, unblock the slots
    if (leaveRequest.status === 'approved') {
      await unblockSlotsForLeave(leaveRequest);
    }

    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    // Notify relevant parties
    const user = await User.findById(userId);
    if (leaveRequest.doctorId.toString() !== userId) {
      // Admin cancelled, notify doctor
      const notification = new Notification({
        userId: leaveRequest.doctorId,
        content: `Your leave request has been cancelled by ${user.firstname} ${user.lastname}${reason ? '. Reason: ' + reason : ''}`
      });
      await notification.save();
    } else {
      // Doctor cancelled, notify admins
      const admins = await User.find({ role: 'Admin' });
      const notifications = admins.map(admin => ({
        userId: admin._id,
        content: `${user.firstname} ${user.lastname} has cancelled their leave request${reason ? '. Reason: ' + reason : ''}`
      }));
      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      message: 'Leave request cancelled successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to cancel leave request'
    });
  }
};

// Unblock time slots when leave is cancelled
const unblockSlotsForLeave = async (leaveRequest) => {
  try {
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    
    const dates = [];
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }

    // Unblock time slots that were blocked for this leave
    for (const date of dates) {
      const slots = await TimeSlot.find({
        doctorId: leaveRequest.doctorId,
        date: date,
        blockReason: `${leaveRequest.leaveType} leave`
      });
      for (const slot of slots) {
        slot.isBlocked = false;
        slot.blockReason = '';
        slot.isAvailable = slot.bookedPatients < slot.maxPatients;
        await slot.save();
      }
    }
  } catch (error) {
    console.error('Unblock slots for leave error:', error);
    throw error;
  }
};

// Get leave statistics
const getLeaveStatistics = async (req, res) => {
  try {

    const { year = new Date().getFullYear(), doctorId } = req.query;
    let matchQuery = {
      status: 'approved',
      startDate: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      }
    };
    if (req.userRole !== 'Admin') {
      const userId = req.user.userId || req.user._id;
      matchQuery.doctorId = mongoose.Types.ObjectId(userId);
    } else if (doctorId) {
      matchQuery.doctorId = mongoose.Types.ObjectId(doctorId);
    }

    const statistics = await LeaveRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          totalDays: {
            $sum: {
              $divide: [
                { $subtract: ['$endDate', '$startDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      { $sort: { totalDays: -1 } }
    ]);

    const totalLeaves = await LeaveRequest.countDocuments(matchQuery);
    const pendingLeaves = await LeaveRequest.countDocuments({
      ...matchQuery,
      status: 'pending'
    });

    res.json({
      success: true,
      statistics: {
        byType: statistics,
        totalLeaves,
        pendingLeaves,
        year: parseInt(year)
      }
    });
  } catch (error) {
    console.error('Get leave statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch leave statistics'
    });
  }
};

module.exports = {
  submitLeaveRequest,
  getLeaveRequests,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics
};
