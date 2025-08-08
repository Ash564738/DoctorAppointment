const Shift = require("../models/shiftModel");
const TimeSlot = require("../models/timeSlotModel");
const User = require("../models/userModel");
const { validationResult } = require('express-validator');

// Generate time slots for a shift
const generateTimeSlots = (shift, date) => {
  const slots = [];
  const startTime = shift.startTime;
  const endTime = shift.endTime;
  const slotDuration = shift.slotDuration;
  
  // Convert time strings to minutes
  const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  
  // Check for break time
  let breakStartMinutes = null;
  let breakEndMinutes = null;
  if (shift.breakTime && shift.breakTime.start && shift.breakTime.end) {
    breakStartMinutes = parseInt(shift.breakTime.start.split(':')[0]) * 60 + parseInt(shift.breakTime.start.split(':')[1]);
    breakEndMinutes = parseInt(shift.breakTime.end.split(':')[0]) * 60 + parseInt(shift.breakTime.end.split(':')[1]);
  }
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    const slotEndMinutes = minutes + slotDuration;
    
    // Skip if slot overlaps with break time
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
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can create shifts'
      });
    }

    const shift = new Shift({
      doctorId: req.userId,
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

// Get all shifts for a doctor
const getDoctorShifts = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.userId;
    
    const shifts = await Shift.find({ 
      doctorId,
      isActive: true 
    }).populate('doctorId', 'firstname lastname email');

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
      doctorId: doctorId || req.userId,
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
      doctorId: doctorId || req.userId,
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
    }).populate('shiftId', 'title department').sort({ startTime: 1 });

    res.json({
      success: true,
      slots: slots.filter(slot => slot.canAcceptBooking())
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
    const shift = await Shift.findOne({ _id: shiftId, doctorId: req.userId });
    
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

    const shift = await Shift.findOne({ _id: shiftId, doctorId: req.userId });
    
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
    const shifts = await Shift.find({ isActive: true })
      .populate('doctorId', 'firstname lastname email')
      .sort({ createdAt: -1 });

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
      doctorId: req.userId 
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

module.exports = {
  createShift,
  getDoctorShifts,
  generateSlotsForDate,
  getAvailableSlots,
  updateShift,
  deleteShift,
  getAllShifts,
  toggleSlotAvailability
};
