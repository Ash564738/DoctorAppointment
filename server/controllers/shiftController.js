const Shift = require("../models/shiftModel");
const TimeSlot = require("../models/timeSlotModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const Doctor = require("../models/doctorModel");
const LeaveRequest = require("../models/leaveRequestModel");
const Overtime = require("../models/overtimeModel");
const ShiftSwap = require("../models/shiftSwapModel");
const { validationResult } = require('express-validator');

const isAdmin = user => user && user.role && user.role.toLowerCase() === 'admin';

const generateTimeSlots = (shift, date) => {
  const slots = [];
  const startTime = shift.startTime;
  const endTime = shift.endTime;
  const slotDuration = shift.slotDuration;
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    let breakStartMinutes = null;
  let breakEndMinutes = null;
  if (shift.breakTime && shift.breakTime.start && shift.breakTime.end) {
    breakStartMinutes = parseInt(shift.breakTime.start.split(':')[0]) * 60 + parseInt(shift.breakTime.start.split(':')[1]);
    breakEndMinutes = parseInt(shift.breakTime.end.split(':')[0]) * 60 + parseInt(shift.breakTime.end.split(':')[1]);
  }
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    const slotEndMinutes = minutes + slotDuration;
        if (breakStartMinutes && breakEndMinutes) {
      if ((minutes >= breakStartMinutes && minutes < breakEndMinutes) ||
          (slotEndMinutes > breakStartMinutes && slotEndMinutes <= breakEndMinutes)) {
        continue;
      }
    }
    
    const slotStartTime = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
    const slotEndTime = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;
    
    slots.push({
      shiftId: shift._id,
      doctorId: shift.doctorId,
      date: date,
      startTime: slotStartTime,
      endTime: slotEndTime,
      maxPatients: shift.maxPatientsPerHour,
      bookedPatients: 0,
      isAvailable: true,
      isBlocked: false
    });
  }
  
  return slots;
};

// Create a new shift
const createShift = async (req, res) => {
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
      title,
      startTime,
      endTime,
      daysOfWeek,
      maxPatientsPerHour,
      slotDuration,
      department,
      specialNotes,
      breakTime
    } = req.body;

    // Check if user is a doctor
    const doctor = await User.findById(req.user._id);
    if (!doctor || doctor.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can create shifts'
      });
    }

    const shift = new Shift({
      doctorId: req.user._id,
      title,
      startTime,
      endTime,
      daysOfWeek,
      maxPatientsPerHour: maxPatientsPerHour || 4,
      slotDuration: slotDuration || 30,
      department: department || 'General',
      specialNotes,
      breakTime,
      status: 'pending',
      requestedBy: req.user._id
    });

    await shift.save();

    // --- Notify doctor about pending shift ---
    await Notification.create({
      userId: req.user._id,
      content: `Your shift request "${shift.title}" was submitted and is pending approval.`
    });

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      shift
    });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to create shift'
    });
  }
};

// Admin: list pending shift requests
const listPendingShiftRequests = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Admin only' });
    const shifts = await Shift.find({ status: 'pending', isActive: true })
      .populate('doctorId', 'firstname lastname email')
      .populate('requestedBy', 'firstname lastname email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, shifts });
  } catch (e) {
    console.error('List pending shift requests error:', e);
    res.status(500).json({ success: false, message: 'Unable to fetch pending shifts' });
  }
};

// Admin: approve/reject pending shift request
const processShiftRequest = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Admin only' });
    const { id } = req.params;
    const { decision, adminComment } = req.body; // 'approved' | 'rejected'
    const shift = await Shift.findById(id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    if (shift.status !== 'pending') return res.status(400).json({ success: false, message: 'Shift is not pending' });
    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Invalid decision' });
    }
    shift.status = decision;
    shift.adminComment = adminComment || '';
    await shift.save();
    try {
      await Notification.create({
        userId: shift.requestedBy || shift.doctorId,
        content: `Your shift request "${shift.title}" was ${decision}${adminComment ? `: ${adminComment}` : ''}.`
      });
    } catch (_) {}
    res.json({ success: true, message: `Shift ${decision}`, shift });
  } catch (e) {
    console.error('Process shift request error:', e);
    res.status(500).json({ success: false, message: 'Unable to process shift request' });
  }
};

// Get all shifts for a doctor
const getDoctorShifts = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.user.userId || req.user._id;
    const shifts = await Shift.find({ 
      doctorId,
      isActive: true 
    })
    .populate('doctorId', 'firstname lastname email')
    .lean();
    res.json({
      success: true,
      shifts
    });
  } catch (error) {
    console.error('Get doctor shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch shifts'
    });
  }
};

// Generate time slots for shifts
const generateSlotsForDate = async (req, res) => {
  try {
    const { date, doctorId } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const targetDate = new Date(date);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find active shifts for this doctor on this day
    const shifts = await Shift.find({
      doctorId: doctorId || req.user._id,
      daysOfWeek: dayName,
      isActive: true
    });

    if (shifts.length === 0) {
      return res.json({
        success: true,
        message: 'No shifts found for this day',
        slots: []
      });
    }

    // Check if slots already exist for this date
    const existingSlots = await TimeSlot.find({
      doctorId: doctorId || req.user._id,
      date: targetDate
    });

    if (existingSlots.length > 0) {
      return res.json({
        success: true,
        message: 'Slots already exist for this date',
        slots: existingSlots
      });
    }

    // Generate slots for all shifts
    let allSlots = [];
    for (const shift of shifts) {
      const slots = generateTimeSlots(shift, targetDate);
      allSlots = allSlots.concat(slots);
    }

    // Save all slots to database
    const createdSlots = await TimeSlot.insertMany(allSlots);

    res.json({
      success: true,
      message: `Generated ${createdSlots.length} time slots`,
      slots: createdSlots
    });
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to generate time slots'
    });
  }
};

// Get available time slots for a doctor on a specific date
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    const targetDate = new Date(date);
    
    const slots = await TimeSlot.find({
      doctorId,
      date: targetDate,
      isAvailable: true,
      isBlocked: false
    })
    .populate('shiftId', 'title department')
    .sort({ startTime: 1 })
    .lean();
    const available = slots.filter(slot => {
      const max = typeof slot.maxPatients === 'number' ? slot.maxPatients : 0;
      const booked = typeof slot.bookedPatients === 'number' ? slot.bookedPatients : 0;
      return booked < max;
    });

    res.json({
      success: true,
      slots: available
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch available slots'
    });
  }
};

// Update shift
const updateShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const updates = req.body;

    // Ensure only the doctor who owns the shift can update it
    const shift = await Shift.findOne({ _id: shiftId, doctorId: req.user._id });
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found or unauthorized'
      });
    }

    Object.assign(shift, updates);
    await shift.save();

    res.json({
      success: true,
      message: 'Shift updated successfully',
      shift
    });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to update shift'
    });
  }
};

// Delete shift
const deleteShift = async (req, res) => {
  try {
    const { shiftId } = req.params;

    const shift = await Shift.findOne({ _id: shiftId, doctorId: req.user._id });
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found or unauthorized'
      });
    }

    // Soft delete by setting isActive to false
    shift.isActive = false;
    await shift.save();

    // Also make associated future time slots unavailable
    await TimeSlot.updateMany(
      { 
        shiftId: shiftId,
        date: { $gte: new Date() }
      },
      { 
        isAvailable: false,
        isBlocked: true,
        blockReason: 'Shift deleted'
      }
    );

    // --- Notify doctor about shift deletion ---
    await Notification.create({
      userId: req.user._id,
      content: `Your shift "${shift.title}" has been deleted.`
    });

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to delete shift'
    });
  }
};

// Get all shifts (admin only)
const getAllShifts = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: 'Admin only' });
    
    const shifts = await Shift.find({ isActive: true })
      .populate('doctorId', 'firstname lastname email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      shifts
    });
  } catch (error) {
    console.error('Get all shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch shifts'
    });
  }
};

// Block/Unblock time slot
const toggleSlotAvailability = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { isBlocked, blockReason } = req.body;

    const slot = await TimeSlot.findOne({ 
      _id: slotId, 
      doctorId: req.user._id 
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found or unauthorized'
      });
    }

    slot.isBlocked = isBlocked;
    slot.blockReason = isBlocked ? blockReason : '';
    slot.isAvailable = !isBlocked && slot.bookedPatients < slot.maxPatients;

    await slot.save();

    res.json({
      success: true,
      message: `Time slot ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      slot
    });
  } catch (error) {
    console.error('Toggle slot availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update slot availability'
    });
  }
};

const getSchedulesByWeek = async (req, res) => {
  try {
  const { week, weekStart, doctorId } = req.query;
    const toLocalDateString = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    let start = (() => {
      if (week || weekStart) {
        const s = (week || weekStart);
        const [yy, mm, dd] = s.split('-').map(Number);
        return new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
      }
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    })();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const shifts = await Shift.find({ isActive: true, $or: [{ status: 'approved' }, { status: { $exists: false } }] })
      .populate('doctorId', 'firstname lastname email')
      .sort({ createdAt: -1 });

    // Preload approved leaves within the week
    const approvedLeaves = await LeaveRequest.find({
      status: 'approved',
      startDate: { $lte: end },
      endDate: { $gte: start }
    }).select('doctorId startDate endDate').lean();
    const leaveSet = new Set(); // key: doctorId_dateStr (local)
    approvedLeaves.forEach(l => {
      const s = new Date(l.startDate); s.setHours(0,0,0,0);
      const e = new Date(l.endDate); e.setHours(0,0,0,0);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
        const key = `${l.doctorId.toString()}_${toLocalDateString(d)}`;
        leaveSet.add(key);
      }
    });

    // Preload approved overtime within the week
    const approvedOvertime = await Overtime.find({
      status: 'approved',
      date: { $gte: start, $lte: end }
    }).select('doctorId shiftId date hours').lean();
    const overtimeMap = new Map(); // key: shiftId_date_doctorId (local) -> hours
    approvedOvertime.forEach(ot => {
      const dateStr = toLocalDateString(new Date(ot.date));
      overtimeMap.set(`${ot.shiftId.toString()}_${dateStr}_${ot.doctorId.toString()}`, ot.hours);
    });

    // Preload approved swaps within the week (single date or date range)
    const approvedSwaps = await ShiftSwap.find({
      status: 'approved',
      $or: [
        { swapDate: { $gte: start, $lte: end } },
        { swapStartDate: { $lte: end }, swapEndDate: { $gte: start } }
      ]
    })
      .populate('requesterId swapWithId', 'firstname lastname')
      .select('originalShiftId requestedShiftId requesterId swapWithId swapDate swapStartDate swapEndDate swapType')
      .lean();
    const swapMap = new Map(); // key: shiftId_date (local) -> { userId, name }
    const iterRange = (s, e, fn) => {
      const startD = new Date(s); startD.setHours(0,0,0,0);
      const endD = new Date(e); endD.setHours(0,0,0,0);
      for (let d = new Date(startD); d <= endD; d.setDate(d.getDate()+1)) fn(new Date(d));
    };
    approvedSwaps.forEach(sw => {
      if (sw.swapDate) {
        const dateStr = toLocalDateString(new Date(sw.swapDate));
        swapMap.set(`${sw.originalShiftId.toString()}_${dateStr}`, {
          userId: sw.swapWithId._id ? sw.swapWithId._id.toString() : sw.swapWithId.toString(),
          name: sw.swapWithId.firstname ? `${sw.swapWithId.firstname} ${sw.swapWithId.lastname}` : ''
        });
        if (sw.swapType === 'trade' && sw.requestedShiftId) {
          swapMap.set(`${sw.requestedShiftId.toString()}_${dateStr}`, {
            userId: sw.requesterId._id ? sw.requesterId._id.toString() : sw.requesterId.toString(),
            name: sw.requesterId.firstname ? `${sw.requesterId.firstname} ${sw.requesterId.lastname}` : ''
          });
        }
      } else if (sw.swapStartDate && sw.swapEndDate) {
        iterRange(sw.swapStartDate, sw.swapEndDate, (d) => {
          const dateStr = toLocalDateString(d);
          swapMap.set(`${sw.originalShiftId.toString()}_${dateStr}`, {
            userId: sw.swapWithId._id ? sw.swapWithId._id.toString() : sw.swapWithId.toString(),
            name: sw.swapWithId.firstname ? `${sw.swapWithId.firstname} ${sw.swapWithId.lastname}` : ''
          });
          if (sw.swapType === 'trade' && sw.requestedShiftId) {
            swapMap.set(`${sw.requestedShiftId.toString()}_${dateStr}`, {
              userId: sw.requesterId._id ? sw.requesterId._id.toString() : sw.requesterId.toString(),
              name: sw.requesterId.firstname ? `${sw.requesterId.firstname} ${sw.requesterId.lastname}` : ''
            });
          }
        });
      }
    });

  const schedules = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = toLocalDateString(currentDate);

      shifts.forEach(shift => {
        if (shift.daysOfWeek.includes(dayName)) {
          let effDoctorId = shift.doctorId._id.toString();
          let effDoctorName = `${shift.doctorId.firstname} ${shift.doctorId.lastname}`;
          const swapKey = `${shift._id.toString()}_${dateStr}`;
          if (swapMap.has(swapKey)) {
            const swUser = swapMap.get(swapKey);
            effDoctorId = swUser.userId;
            effDoctorName = swUser.name || effDoctorName;
          }
          if (!doctorId || effDoctorId === doctorId) {
            if (leaveSet.has(`${effDoctorId}_${dateStr}`)) {
              return;
            }
            schedules.push({
              _id: `${shift._id}_${dateStr}`,
              shiftId: shift._id,
              doctorId: effDoctorId,
              doctorName: effDoctorName,
              date: dateStr,
              dayName: dayName,
              startTime: shift.startTime,
              endTime: shift.endTime,
              breakStart: shift.breakTime?.start || '',
              breakEnd: shift.breakTime?.end || '',
              maxPatients: shift.maxPatientsPerHour,
              slotDuration: shift.slotDuration,
              department: shift.department,
              title: shift.title,
              specialNotes: shift.specialNotes,
              status: 'available'
            });
            const otKey = `${shift._id.toString()}_${dateStr}_${effDoctorId}`;
            if (overtimeMap.has(otKey)) {
              const hours = overtimeMap.get(otKey);
              const addMinutes = Math.round(Number(hours) * 60);
              const [eh, em] = shift.endTime.split(':').map(Number);
              let endTotal = eh * 60 + em + addMinutes;
              if (endTotal > 24 * 60) endTotal = 24 * 60; // clamp to end of day
              const newEndH = String(Math.floor(endTotal / 60)).padStart(2, '0');
              const newEndM = String(endTotal % 60).padStart(2, '0');
              const extendedEnd = `${newEndH}:${newEndM === '60' ? '59' : newEndM}`;
              schedules.push({
                _id: `${shift._id}_${dateStr}_ot`,
                shiftId: shift._id,
                doctorId: effDoctorId,
                doctorName: effDoctorName,
                date: dateStr,
                dayName: dayName,
                startTime: shift.endTime,
                endTime: extendedEnd,
                breakStart: '',
                breakEnd: '',
                maxPatients: shift.maxPatientsPerHour,
                slotDuration: shift.slotDuration,
                department: shift.department,
                title: `${shift.title} (Overtime)`,
                specialNotes: shift.specialNotes,
                status: 'overtime'
              });
            }
          }
        }
      });
    }

    
    res.json({
      success: true,
      schedules
    });
  } catch (error) {
    console.error('Get schedules by week error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch schedules'
    });
  }
};

const adminCreateShift = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.user || req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const doctorModelId = req.params.doctorId;
    const doctorDoc = await Doctor.findById(doctorModelId);
    if (!doctorDoc) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    const userId = doctorDoc.userId;
    const {
      title,
      startTime,
      endTime,
      daysOfWeek,
      maxPatientsPerHour,
      slotDuration,
      department,
      specialNotes,
      breakTime
    } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'Doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor user not found'
      });
    }
    const shift = new Shift({
      doctorId: userId,
      title,
      startTime,
      endTime,
      daysOfWeek,
      maxPatientsPerHour: maxPatientsPerHour || 4,
      slotDuration: slotDuration || 30,
      department: department || 'General',
      specialNotes,
      breakTime
    });
    await shift.save();
    const populatedShift = await Shift.findById(shift._id).populate('doctorId', 'firstname lastname email');

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      shift: populatedShift
    });

  } catch (error) {
    console.error('Admin create shift error:', error);
    res.status(500).json({
      success: false,
      message: `Unable to create shift: ${error.message}`
    });
  }
};

const adminDeleteShift = async (req, res) => {
  try {
    if (!req.user || req.user.role.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { shiftId } = req.params;
    const shift = await Shift.findById(shiftId);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    shift.isActive = false;
    await shift.save();
    await TimeSlot.updateMany(
      { 
        shiftId: shiftId,
        date: { $gte: new Date() }
      },
      { 
        isAvailable: false,
        isBlocked: true,
        blockReason: 'Shift deleted by admin'
      }
    );

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });

  } catch (error) {
    console.error('Admin delete shift error:', error);
    res.status(500).json({
      success: false,
      message: `Unable to delete shift: ${error.message}`
    });
  }
};

module.exports = {
  createShift,
  getDoctorShifts,
  generateSlotsForDate,
  getAvailableSlots,
  updateShift,
  deleteShift,
  getAllShifts,
  toggleSlotAvailability,
  getSchedulesByWeek,
  adminCreateShift,
  adminDeleteShift,
  listPendingShiftRequests,
  processShiftRequest
};