const Overtime = require('../models/overtimeModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

// Create overtime request
const createOvertime = async (req, res) => {
  try {
    const { shiftId, date, hours, reason } = req.body;
    if (!shiftId || !date || !hours) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const userId = req.user.userId || req.user._id;
    const overtime = new Overtime({
      doctorId: userId,
      shiftId,
      date,
      hours,
      reason
    });
    await overtime.save();

    // --- Notification: Notify the doctor about overtime request creation ---
    await Notification.create({
      userId: userId,
      content: `Your overtime request for shift on ${date} (${hours} hours) has been submitted.`
    });

    res.status(201).json({ success: true, message: 'Overtime request created', data: overtime });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get overtime requests for a doctor
const getDoctorOvertime = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const overtime = await Overtime.find({ doctorId: userId })
      .populate('shiftId doctorId')
      .lean();
    res.json({ success: true, data: overtime });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all overtime requests (admin)
const getAllOvertime = async (req, res) => {
  try {
    // Use user role for admin check
    if (!req.user || req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const overtime = await Overtime.find().populate('shiftId doctorId').lean();
    res.json({ success: true, data: overtime });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve/reject overtime request
const updateOvertimeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body;
    const overtime = await Overtime.findById(id);
    if (!overtime) return res.status(404).json({ success: false, message: 'Overtime request not found' });
    if (status && ['approved', 'rejected'].includes(status)) {
      overtime.status = status;
      overtime.adminComment = adminComment || '';
      overtime.decisionAt = new Date();
      await overtime.save();

      // --- Notification: Notify the doctor about overtime approval/rejection ---
      await Notification.create({
        userId: overtime.doctorId,
        content: `Your overtime request for shift on ${overtime.date} has been ${status}${adminComment ? `: ${adminComment}` : ''}.`
      });

      res.json({ success: true, message: `Overtime request ${status}`, data: overtime });
    } else {
      res.status(400).json({ success: false, message: 'Invalid status' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOvertime,
  getDoctorOvertime,
  getAllOvertime,
  updateOvertimeStatus
};
