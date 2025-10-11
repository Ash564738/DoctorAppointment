const LeaveRequest = require("../models/leaveRequestModel");
const User = require("../models/userModel");
const Shift = require("../models/shiftModel");
const TimeSlot = require("../models/timeSlotModel");
const Notification = require("../models/notificationModel");
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// Submit leave request
const submitLeaveRequest = async (req, res) => {
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
      isEmergency = false,
      coveringStaffIds
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

    // In non-emergency scenarios, require proposing at least one covering staff (closer to real-world policy)
    if (!isEmergency) {
      let ids = [];
      try {
        ids = Array.isArray(coveringStaffIds) ? coveringStaffIds : (coveringStaffIds ? JSON.parse(coveringStaffIds) : []);
      } catch (e) {
        ids = [];
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please propose at least one covering colleague for non-emergency leave'
        });
      }
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

    if (Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files.map(f => ({
        filename: f.filename,
        url: `/uploads/${f.filename}`,
        uploadDate: new Date()
      }));
      leaveRequest.attachments = files;
      await leaveRequest.save();
    }

    if (coveringStaffIds) {
      let ids = [];
      try {
        ids = Array.isArray(coveringStaffIds) ? coveringStaffIds : JSON.parse(coveringStaffIds);
      } catch (e) {
        ids = [];
      }
      if (Array.isArray(ids) && ids.length > 0) {
        leaveRequest.coveringStaff = ids.map(id => ({ staffId: id, shiftDate: null, status: 'requested' }));
        await leaveRequest.save();
        const notify = ids.map(id => ({
          userId: id,
          content: `${user.firstname} ${user.lastname} requested coverage from ${startDate} to ${endDate}`
        }));
        if (notify.length) await Notification.insertMany(notify);
      }
    }

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
    
    const leaveRequests = await LeaveRequest.find(query)
      .populate('doctorId', 'firstname lastname email role')
      .populate('approvedBy', 'firstname lastname')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await LeaveRequest.countDocuments(query);
    
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
      // Assign coverage shifts to accepted colleagues and fill gaps where possible
      await assignCoverageForLeave(leaveRequest);
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
    const dates = getDatesBetween(startDate, endDate);

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
      // Also remove any coverage slots that were created for this leave
      await removeCoverageSlotsForLeave(leaveRequest);
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
    
    const dates = getDatesBetween(startDate, endDate);

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

// Helper: list all dates between two dates inclusive, normalized to midnight
function getDatesBetween(start, end) {
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end); e.setHours(0,0,0,0);
  const dates = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const n = new Date(d);
    n.setHours(0,0,0,0);
    dates.push(n);
  }
  return dates;
}

// Helper: for a specific date, clone RD's shift structure into slots for a given coverer
const createCoverSlotsForDate = async (leaveRequest, date, covererId) => {
  const rdId = leaveRequest.doctorId._id || leaveRequest.doctorId;
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const rdShifts = await Shift.find({ doctorId: rdId, daysOfWeek: weekday, isActive: true });
  if (!rdShifts || rdShifts.length === 0) return 0;

  let created = 0;
  for (const shift of rdShifts) {
    const startMinutes = parseInt(shift.startTime.split(':')[0]) * 60 + parseInt(shift.startTime.split(':')[1]);
    const endMinutes = parseInt(shift.endTime.split(':')[0]) * 60 + parseInt(shift.endTime.split(':')[1]);
    const duration = shift.slotDuration;
    let breakStart = null, breakEnd = null;
    if (shift.breakTime && shift.breakTime.start && shift.breakTime.end) {
      breakStart = parseInt(shift.breakTime.start.split(':')[0]) * 60 + parseInt(shift.breakTime.start.split(':')[1]);
      breakEnd = parseInt(shift.breakTime.end.split(':')[0]) * 60 + parseInt(shift.breakTime.end.split(':')[1]);
    }

    const toCreate = [];
    for (let m = startMinutes; m < endMinutes; m += duration) {
      const slotEnd = m + duration;
      if (breakStart && breakEnd) {
        const overlapsBreak = (m >= breakStart && m < breakEnd) || (slotEnd > breakStart && slotEnd <= breakEnd);
        if (overlapsBreak) continue;
      }
      const slotStartTime = `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
      const slotEndTime = `${Math.floor(slotEnd / 60).toString().padStart(2, '0')}:${(slotEnd % 60).toString().padStart(2, '0')}`;

      const exists = await TimeSlot.findOne({ doctorId: covererId, date: date, startTime: slotStartTime });
      if (exists) continue;

      toCreate.push({
        shiftId: shift._id,
        doctorId: covererId,
        date: date,
        startTime: slotStartTime,
        endTime: slotEndTime,
        maxPatients: shift.maxPatientsPerHour,
        bookedPatients: 0,
        isAvailable: true,
        isBlocked: false
      });
    }
    if (toCreate.length > 0) {
      await TimeSlot.insertMany(toCreate);
      created += toCreate.length;
    }
  }
  return created;
};

// Helper: assign coverage for approved leave by creating slots for accepted covering staff
const assignCoverageForLeave = async (leaveRequest) => {
  try {
    const dates = getDatesBetween(leaveRequest.startDate, leaveRequest.endDate);

    // Build date -> assigned staff mapping
    const assignments = new Map(); // key: date ISO (yyyy-mm-dd), value: staffId
    const cs = Array.isArray(leaveRequest.coveringStaff) ? leaveRequest.coveringStaff : [];

    // Specific accepted entries with a shiftDate
    for (const entry of cs) {
      if (entry.status === 'accepted' && entry.shiftDate) {
        const key = new Date(entry.shiftDate); key.setHours(0,0,0,0);
        const iso = key.toISOString().slice(0,10);
        if (!assignments.has(iso)) assignments.set(iso, entry.staffId);
      }
    }

    // General accepted entries without a date
    const generalAccepts = cs.filter(x => x.status === 'accepted' && !x.shiftDate).map(x => x.staffId);

    // Distribute general accepts to unassigned dates (one coverer per day)
    let gi = 0;
    for (const date of dates) {
      const iso = date.toISOString().slice(0,10);
      if (!assignments.has(iso) && generalAccepts.length > 0) {
        assignments.set(iso, generalAccepts[gi % generalAccepts.length]);
        gi++;
      }
    }

    // For each date, clone RD's shifts into slots for the assigned covering staff
    const updatesToCovering = [];
    for (const date of dates) {
      const iso = date.toISOString().slice(0,10);
      const covererId = assignments.get(iso);
      if (!covererId) continue; // uncovered day
      await createCoverSlotsForDate(leaveRequest, date, covererId);

      // Record assignment on the leaveRequest if not already recorded
      const alreadyRecorded = (leaveRequest.coveringStaff || []).some(x => String(x.staffId) === String(covererId) && x.shiftDate && new Date(x.shiftDate).setHours(0,0,0,0) === date.getTime() && x.status === 'accepted');
      if (!alreadyRecorded) {
        updatesToCovering.push({ staffId: covererId, shiftDate: date, status: 'accepted' });
      }

      // Notify coverer
      await Notification.create({ userId: covererId, content: `You have been assigned to cover on ${iso} for a colleague's approved leave.` });
    }

    if (updatesToCovering.length > 0) {
      leaveRequest.coveringStaff = (leaveRequest.coveringStaff || []).concat(updatesToCovering);
      await leaveRequest.save();
    }
  } catch (error) {
    console.error('assignCoverageForLeave error:', error);
    // Do not throw to avoid failing approval after blocking RD slots; admins can resolve coverage manually
  }
};

// Helper: remove coverage slots created because of this leave (used when cancelling approved leave)
const removeCoverageSlotsForLeave = async (leaveRequest) => {
  try {
    const dates = getDatesBetween(leaveRequest.startDate, leaveRequest.endDate);
    const rdId = leaveRequest.doctorId._id || leaveRequest.doctorId;
    const shiftIds = new Set();
    // Collect RD shift ids used during the leave period
    for (const date of dates) {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const rdShifts = await Shift.find({ doctorId: rdId, daysOfWeek: weekday, isActive: true });
      rdShifts.forEach(s => shiftIds.add(String(s._id)));
    }
    if (shiftIds.size === 0) return;
    // Delete slots on those dates whose shiftId belongs to RD shifts but doctorId is NOT RD (i.e., created for coverers)
    for (const date of dates) {
      await TimeSlot.deleteMany({
        date: date,
        shiftId: { $in: Array.from(shiftIds) },
        doctorId: { $ne: rdId }
      });
    }
  } catch (error) {
    console.error('removeCoverageSlotsForLeave error:', error);
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

// Get coverage requests for the logged-in user (as potential covering staff)
const getMyCoverageRequests = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Only leave requests where this user is requested to cover (status 'requested')
    const requests = await LeaveRequest.find({
      status: { $in: ['pending', 'approved'] },
      coveringStaff: { $elemMatch: { staffId: userId, status: 'requested' } }
    })
      .populate('doctorId', 'firstname lastname email role')
      .lean();

    // Reduce coveringStaff to only current user's entries
    const data = requests.map(r => ({
      _id: r._id,
      doctorId: r.doctorId,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason,
      isEmergency: r.isEmergency,
      status: r.status,
      myCovering: (r.coveringStaff || []).filter(cs => String(cs.staffId) === String(userId) && cs.status === 'requested')
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getMyCoverageRequests error:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch coverage requests' });
  }
};

// Respond to a coverage request (accept/decline)
const respondCoveringRequest = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { requestId } = req.params;
    const { decision, shiftDate } = req.body; // decision: 'accepted' | 'declined', optional shiftDate
    if (!['accepted', 'declined'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision' });
    }
    const leaveRequest = await LeaveRequest.findById(requestId).populate('doctorId', 'firstname lastname');
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    let updated = false;
    let dateFilter = null;
    let normalizedShiftDate = null;
    if (shiftDate) {
      const d = new Date(shiftDate);
      d.setHours(0, 0, 0, 0);
      dateFilter = d.getTime();
      normalizedShiftDate = d;
    }

    if (!Array.isArray(leaveRequest.coveringStaff) || leaveRequest.coveringStaff.length === 0) {
      return res.status(400).json({ success: false, message: 'No covering staff requested for this leave' });
    }

    leaveRequest.coveringStaff = leaveRequest.coveringStaff.map(cs => {
      const isMe = String(cs.staffId) === String(userId);
      if (!isMe || cs.status !== 'requested') return cs;
      // If shiftDate is provided, match either the same date or a null date and set it
      if (dateFilter !== null) {
        const csDateVal = cs.shiftDate ? (new Date(cs.shiftDate).setHours(0,0,0,0)) : null;
        const matches = csDateVal === null || csDateVal === dateFilter;
        if (matches) {
          updated = true;
          const base = { ...(cs.toObject?.() || cs), status: decision };
          if (!cs.shiftDate) base.shiftDate = normalizedShiftDate;
          return base;
        }
        return cs;
      }
      // No shiftDate provided: accept/decline generic requested entry
      updated = true;
      return { ...(cs.toObject?.() || cs), status: decision };
    });

    if (!updated) {
      return res.status(400).json({ success: false, message: 'No matching pending coverage found to respond to' });
    }

    await leaveRequest.save();

    // If the leave is already approved and decision is accepted, assign coverage immediately
    let assignedDates = [];
    if (decision === 'accepted' && leaveRequest.status === 'approved') {
      const allDates = getDatesBetween(leaveRequest.startDate, leaveRequest.endDate);
      const coveredIso = new Set(
        (leaveRequest.coveringStaff || [])
          .filter(cs => cs.status === 'accepted' && cs.shiftDate)
          .map(cs => new Date(cs.shiftDate).toISOString().slice(0,10))
      );

      if (shiftDate) {
        const d = new Date(shiftDate); d.setHours(0,0,0,0);
        const iso = d.toISOString().slice(0,10);
        const within = allDates.some(a => a.getTime() === d.getTime());
        if (within && !coveredIso.has(iso)) {
          await createCoverSlotsForDate(leaveRequest, d, userId);
          // Avoid duplicate entries if one was updated above
          const exists = (leaveRequest.coveringStaff || []).some(cs => String(cs.staffId) === String(userId) && cs.shiftDate && (new Date(cs.shiftDate).setHours(0,0,0,0)) === d.getTime() && cs.status === 'accepted');
          if (!exists) {
            leaveRequest.coveringStaff.push({ staffId: userId, shiftDate: d, status: 'accepted' });
          }
          assignedDates.push(iso);
          await leaveRequest.save();
        }
      } else {
        // Assign ALL uncovered dates in the approved range to this coverer
        const toAssign = allDates.filter(a => !coveredIso.has(a.toISOString().slice(0,10)));
        for (const dateObj of toAssign) {
          await createCoverSlotsForDate(leaveRequest, dateObj, userId);
          const exists = (leaveRequest.coveringStaff || []).some(cs => String(cs.staffId) === String(userId) && cs.shiftDate && (new Date(cs.shiftDate).setHours(0,0,0,0)) === dateObj.getTime() && cs.status === 'accepted');
          if (!exists) {
            leaveRequest.coveringStaff.push({ staffId: userId, shiftDate: dateObj, status: 'accepted' });
          }
          assignedDates.push(dateObj.toISOString().slice(0,10));
        }
        if (toAssign.length > 0) {
          await leaveRequest.save();
        }
      }
    }

    // Notify the leave requester (doctor)
    const content = `Your coverage request was ${decision} by a colleague${shiftDate ? ' for ' + new Date(shiftDate).toISOString().slice(0,10) : ''}.`;
    await Notification.create({ userId: leaveRequest.doctorId._id || leaveRequest.doctorId, content });
    // Notify the coverer if assigned post-approval
    if (assignedDates.length > 0) {
      // Collapse to a friendly range message if many dates
      const msg = assignedDates.length === 1 
        ? `You have been assigned to cover on ${assignedDates[0]}.`
        : `You have been assigned to cover on ${assignedDates[0]} to ${assignedDates[assignedDates.length - 1]}.`;
      await Notification.create({ userId, content: msg });
    }

    return res.json({ success: true, message: `Coverage ${decision}${assignedDates.length ? ' and assigned ' + assignedDates.join(', ') : ''}`, leaveRequest });
  } catch (error) {
    console.error('respondCoveringRequest error:', error);
    return res.status(500).json({ success: false, message: 'Unable to respond to coverage request' });
  }
};

module.exports = {
  submitLeaveRequest,
  getLeaveRequests,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics,
  getMyCoverageRequests,
  respondCoveringRequest
};
