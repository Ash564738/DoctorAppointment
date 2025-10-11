const ShiftSwap = require('../models/shiftSwapModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const Shift = require('../models/shiftModel');

const createShiftSwap = async (req, res) => {
  try {
    const { originalShiftId, requestedShiftId, swapWithId, reason, swapDate, swapStartDate, swapEndDate, swapType = 'trade' } = req.body;
    if (!originalShiftId || !swapWithId) {
      return res.status(400).json({ success: false, message: 'Missing required fields: originalShiftId, swapWithId' });
    }
    if (!['trade', 'cover'].includes(swapType)) {
      return res.status(400).json({ success: false, message: 'swapType must be trade or cover' });
    }
    if (swapType === 'trade' && !requestedShiftId) {
      return res.status(400).json({ success: false, message: 'requestedShiftId required for trade swaps' });
    }
    if (!swapDate && !(swapStartDate && swapEndDate)) {
      return res.status(400).json({ success: false, message: 'Provide swapDate or swapStartDate/swapEndDate' });
    }

    const [requester, swapWith, origShift, reqShift] = await Promise.all([
      User.findById(req.user._id).lean(),
      User.findById(swapWithId).lean(),
      Shift.findById(originalShiftId).lean(),
      requestedShiftId ? Shift.findById(requestedShiftId).lean() : Promise.resolve(null)
    ]);
    if (!origShift) return res.status(404).json({ success: false, message: 'Original shift not found' });
    if (swapType === 'trade' && !reqShift) return res.status(404).json({ success: false, message: 'Requested shift not found' });
    const requesterId = requester?._id?.toString();
    if (String(origShift.doctorId) !== requesterId) {
      return res.status(400).json({ success: false, message: 'Original shift does not belong to requester' });
    }
    if (swapType === 'trade' && reqShift && String(reqShift.doctorId) !== String(swapWithId)) {
      return res.status(400).json({ success: false, message: 'Requested shift does not belong to selected colleague' });
    }
    const Doctor = require('../models/doctorModel');
    const [reqDoc, withDoc] = await Promise.all([
      Doctor.findOne({ userId: requesterId }).lean(),
      Doctor.findOne({ userId: swapWithId }).lean()
    ]);
    if (!reqDoc || !withDoc) {
      return res.status(400).json({ success: false, message: 'Doctor profiles not found for swap participants' });
    }
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const deptMatch = norm(reqDoc.department) && norm(reqDoc.department) === norm(withDoc.department);
    const specMatch = norm(reqDoc.specialization) && norm(reqDoc.specialization) === norm(withDoc.specialization);
    if (!deptMatch && !specMatch) {
      return res.status(400).json({ success: false, message: 'Swap not allowed: different specialization/department' });
    }

    const weekday = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
    const toMin = (t) => { const [h,m] = String(t).split(':').map(Number); return h*60+m; };
    const overlap = (aS,aE,bS,bE) => Math.max(aS,bS) < Math.min(aE,bE);
    const origStart = toMin(origShift.startTime), origEnd = toMin(origShift.endTime);

    const validateDate = async (dateVal) => {
      const day = weekday(dateVal);
      if (!origShift.daysOfWeek.includes(day)) { const err = new Error(`Original shift not scheduled on ${day}`); err.status = 400; throw err; }
      if (swapType === 'trade') {
        // If requested shift doesn't include this day, we treat that day as cover by swapWith.
        const requestedIncludes = reqShift && Array.isArray(reqShift.daysOfWeek) && reqShift.daysOfWeek.includes(day);
        if (!requestedIncludes) {
          // Ensure swapWith has no overlapping shift on this date (same check as cover)
          const swapWithShifts = await Shift.find({ doctorId: swapWithId, isActive: true, daysOfWeek: day }).lean();
          for (const s of swapWithShifts) {
            const sS = toMin(s.startTime), sE = toMin(s.endTime);
            if (overlap(origStart, origEnd, sS, sE)) { const err = new Error('Swap day includes cover but swapWith has overlapping shift on this date'); err.status = 400; throw err; }
          }
        }
      } else {
        // cover: prevent time overlap for swapWith's existing shifts on that day
        const swapWithShifts = await Shift.find({ doctorId: swapWithId, isActive: true, daysOfWeek: day }).lean();
        for (const s of swapWithShifts) {
          const sS = toMin(s.startTime), sE = toMin(s.endTime);
          if (overlap(origStart, origEnd, sS, sE)) { const err = new Error('Cover not allowed: swapWith has overlapping shift on this date'); err.status = 400; throw err; }
        }
      }
    };

    if (swapDate) await validateDate(new Date(swapDate));
    if (swapStartDate && swapEndDate) {
      const s = new Date(swapStartDate); const e = new Date(swapEndDate);
      if (e < s) return res.status(400).json({ success: false, message: 'swapEndDate must be >= swapStartDate' });
      for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
        await validateDate(new Date(d));
      }
    }

    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'Doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can request shift swaps' });
    }

    const swapRequest = new ShiftSwap({
      requesterId: req.user._id,
      originalShiftId,
      requestedShiftId: requestedShiftId || undefined,
      swapWithId,
      reason,
      swapType,
      swapDate: swapDate ? new Date(swapDate) : undefined,
      swapStartDate: swapStartDate ? new Date(swapStartDate) : undefined,
      swapEndDate: swapEndDate ? new Date(swapEndDate) : undefined
    });
    await swapRequest.save();

    await Notification.create({
      userId: swapWithId,
      content: `${user.firstname} ${user.lastname} has requested a ${swapType} shift swap with you.`
    });

    res.status(201).json({ success: true, message: 'Swap request created', data: swapRequest });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getUserShiftSwaps = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    if (!req.user || !userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: user not authenticated' });
    }
    let user = await User.findById(userId);
    if (!user) {
      const Doctor = require('../models/doctorModel');
      const doctorProfile = await Doctor.findById(userId);
      if (doctorProfile && doctorProfile.userId) {
        user = await User.findById(doctorProfile.userId);
      }
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
      if (status === 'approved') {
        if (swap.partnerDecision !== 'accepted') {
          return res.status(400).json({ success: false, message: 'Cannot approve: partner has not accepted the swap' });
        }
      }
      swap.status = status;
      swap.adminComment = adminComment || '';
      swap.decisionAt = new Date();
      await swap.save();
      if (status === 'approved') {
        const TimeSlot = require('../models/timeSlotModel');
        const LeaveRequest = require('../models/leaveRequestModel');
        // For trade: fetch requested shift once to check day inclusion per date
        let requestedShiftDoc = null;
        if (swap.swapType === 'trade' && swap.requestedShiftId) {
          requestedShiftDoc = await Shift.findById(swap.requestedShiftId).lean();
        }
        const ensureSlotsForShiftDate = async (shiftId, date, doctorId) => {
          const dateOnly = new Date(date); dateOnly.setHours(0,0,0,0);
          const existing = await TimeSlot.findOne({ shiftId, date: dateOnly });
          if (existing) return;
          const shift = await Shift.findById(shiftId).lean();
          if (!shift) return;
          const toMin = (t) => { const [h,m] = String(t).split(':').map(Number); return h*60+m; };
          const toTime = (m) => {
            const h = Math.floor(m/60), mm = m%60; const pad = (x)=> String(x).padStart(2,'0');
            return `${pad(h)}:${pad(mm)}`;
          };
          const startMin = toMin(shift.startTime);
          const endMin = toMin(shift.endTime);
          let breakStart = null, breakEnd = null;
          if (shift.breakTime && shift.breakTime.start && shift.breakTime.end) {
            breakStart = toMin(shift.breakTime.start); breakEnd = toMin(shift.breakTime.end);
          }
          const docs = [];
          for (let m = startMin; m < endMin; m += shift.slotDuration) {
            if (breakStart != null && breakEnd != null && m >= breakStart && m < breakEnd) continue;
            const slotStart = toTime(m);
            const slotEnd = toTime(Math.min(m + shift.slotDuration, endMin));
            docs.push({
              shiftId,
              doctorId: doctorId || shift.doctorId,
              date: dateOnly,
              startTime: slotStart,
              endTime: slotEnd,
              maxPatients: Math.max(1, Math.floor((shift.maxPatientsPerHour || 4) * (shift.slotDuration/60)))
            });
          }
          if (docs.length) await TimeSlot.insertMany(docs);
        };

        const applyForDate = async (date) => {
          const dateOnly = new Date(date); dateOnly.setHours(0,0,0,0);
          // Always move original shift to swapWith (cover or trade)
          await ensureSlotsForShiftDate(swap.originalShiftId, dateOnly, swap.swapWithId);
          await TimeSlot.updateMany(
            { shiftId: swap.originalShiftId, date: dateOnly },
            { $set: { doctorId: swap.swapWithId } }
          );
          // For trade: only move requested shift to requester if requested shift actually includes this weekday
          if (swap.swapType === 'trade' && swap.requestedShiftId && requestedShiftDoc) {
            const dayName = dateOnly.toLocaleDateString('en-US', { weekday: 'long' });
            const includes = Array.isArray(requestedShiftDoc.daysOfWeek) && requestedShiftDoc.daysOfWeek.includes(dayName);
            if (includes) {
              await ensureSlotsForShiftDate(swap.requestedShiftId, dateOnly, swap.requesterId);
              await TimeSlot.updateMany(
                { shiftId: swap.requestedShiftId, date: dateOnly },
                { $set: { doctorId: swap.requesterId } }
              );
            }
          }
        };
        const addCoveringForOverlap = async (date) => {
          const dateOnly = new Date(date); dateOnly.setHours(0,0,0,0);
          const findOverlap = async (doctorId) => {
            return LeaveRequest.findOne({
              doctorId,
              status: 'approved',
              startDate: { $lte: dateOnly },
              endDate: { $gte: dateOnly }
            });
          };
          const lrReq = await findOverlap(swap.requesterId);
          if (lrReq) {
            const exists = (lrReq.coveringStaff || []).some(cs => String(cs.staffId) === String(swap.swapWithId));
            if (!exists) {
              lrReq.coveringStaff = lrReq.coveringStaff || [];
              lrReq.coveringStaff.push({ staffId: swap.swapWithId, shiftDate: dateOnly, status: 'accepted' });
              await lrReq.save();
            }
          }
          const lrWith = await findOverlap(swap.swapWithId);
          if (lrWith) {
            const exists2 = (lrWith.coveringStaff || []).some(cs => String(cs.staffId) === String(swap.requesterId));
            if (!exists2) {
              lrWith.coveringStaff = lrWith.coveringStaff || [];
              lrWith.coveringStaff.push({ staffId: swap.requesterId, shiftDate: dateOnly, status: 'accepted' });
              await lrWith.save();
            }
          }
        };

        if (swap.swapDate) {
          await applyForDate(swap.swapDate);
          await addCoveringForOverlap(swap.swapDate);
        } else if (swap.swapStartDate && swap.swapEndDate) {
          const s = new Date(swap.swapStartDate); s.setHours(0,0,0,0);
          const e = new Date(swap.swapEndDate); e.setHours(0,0,0,0);
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            await applyForDate(new Date(d));
            await addCoveringForOverlap(new Date(d));
          }
        }
      }
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

const partnerRespondSwap = async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const { id } = req.params;
    const { decision } = req.body;
    if (!['accepted', 'declined'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision' });
    }
    const swap = await ShiftSwap.findById(id);
    if (!swap) return res.status(404).json({ success: false, message: 'Swap not found' });
    if (String(swap.swapWithId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the requested partner can respond' });
    }
    if (swap.partnerDecision && swap.partnerDecision !== 'pending') {
      return res.status(400).json({ success: false, message: 'Already responded' });
    }
    swap.partnerDecision = decision;
    swap.partnerDecisionAt = new Date();
    await swap.save();
    await Notification.create({
      userId: swap.requesterId,
      content: `Your shift swap request was ${decision} by the partner.`
    });

    return res.json({ success: true, message: `Swap ${decision} by partner`, data: swap });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createShiftSwap,
  getUserShiftSwaps,
  getAllShiftSwaps,
  updateShiftSwapStatus,
  partnerRespondSwap
};