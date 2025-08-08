const Waitlist = require("../models/waitlistModel");
const Appointment = require("../models/appointmentModel");
const TimeSlot = require("../models/timeSlotModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { validationResult } = require('express-validator');

// Join waitlist for a specific slot
const joinWaitlist = async (req, res) => {
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
      doctorId,
      date,
      time,
      symptoms,
      appointmentType = 'regular',
      priority = 'normal',
      isFlexibleTime = false,
      flexibleTimeRange,
      isFlexibleDate = false,
      flexibleDateRange
    } = req.body;

    const userId = req.userId;

    // Check if user is already in waitlist for this slot
    const existingWaitlist = await Waitlist.findOne({
      userId,
      doctorId,
      date,
      time,
      status: { $in: ['waiting', 'notified'] }
    });

    if (existingWaitlist) {
      return res.status(400).json({
        success: false,
        message: 'You are already in the waitlist for this slot'
      });
    }

    // Check if user already has an appointment for this slot
    const existingAppointment = await Appointment.findOne({
      userId,
      doctorId,
      date,
      time,
      status: { $ne: 'Cancelled' }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'You already have an appointment for this slot'
      });
    }

    // Get current queue position
    const queueCount = await Waitlist.countDocuments({
      doctorId,
      date,
      time,
      status: { $in: ['waiting', 'notified'] }
    });

    const waitlistEntry = new Waitlist({
      userId,
      doctorId,
      date,
      time,
      symptoms,
      appointmentType,
      priority,
      positionInQueue: queueCount + 1,
      isFlexibleTime,
      flexibleTimeRange,
      isFlexibleDate,
      flexibleDateRange
    });

    await waitlistEntry.save();

    // Populate user and doctor info
    await waitlistEntry.populate('userId', 'firstname lastname email mobile');
    await waitlistEntry.populate('doctorId', 'firstname lastname specialization');

    // Create notification
    const notification = new Notification({
      userId,
      content: `You have been added to the waitlist for Dr. ${waitlistEntry.doctorId.firstname} ${waitlistEntry.doctorId.lastname} on ${new Date(date).toLocaleDateString()} at ${time}. Your position: ${waitlistEntry.positionInQueue}`
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Successfully added to waitlist',
      waitlist: waitlistEntry
    });

  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to join waitlist'
    });
  }
};

// Get user's waitlist entries
const getUserWaitlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const waitlistEntries = await Waitlist.find(query)
      .populate('doctorId', 'firstname lastname specialization')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Waitlist.countDocuments(query);

    res.json({
      success: true,
      waitlist: waitlistEntries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch waitlist'
    });
  }
};

// Get doctor's waitlist
const getDoctorWaitlist = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { date, status, page = 1, limit = 20 } = req.query;

    const query = { doctorId };
    
    if (date) {
      query.date = new Date(date);
    }
    
    if (status) {
      query.status = status;
    }

    const waitlistEntries = await Waitlist.find(query)
      .populate('userId', 'firstname lastname email mobile age gender')
      .sort({ date: 1, time: 1, positionInQueue: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Waitlist.countDocuments(query);

    res.json({
      success: true,
      waitlist: waitlistEntries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get doctor waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch waitlist'
    });
  }
};

// Notify next person in waitlist when slot becomes available
const notifyNextInWaitlist = async (doctorId, date, time) => {
  try {
    // Find the next person in line
    const nextInLine = await Waitlist.findOne({
      doctorId,
      date,
      time,
      status: 'waiting'
    })
    .sort({ priority: -1, positionInQueue: 1 })
    .populate('userId', 'firstname lastname email mobile');

    if (!nextInLine) {
      return { success: false, message: 'No one in waitlist' };
    }

    // Update status to notified
    nextInLine.status = 'notified';
    nextInLine.notificationDate = new Date();
    nextInLine.expiryDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours to respond
    await nextInLine.save();

    // Create notification
    const notification = new Notification({
      userId: nextInLine.userId._id,
      content: `A slot is now available! You have 2 hours to book your appointment with Dr. ${nextInLine.doctorId.firstname} on ${new Date(date).toLocaleDateString()} at ${time}.`,
      isUrgent: true
    });
    await notification.save();

    // TODO: Send email/SMS notification here
    console.log(`Notified ${nextInLine.userId.firstname} about available slot`);

    return {
      success: true,
      message: 'Next person notified',
      notifiedUser: nextInLine
    };

  } catch (error) {
    console.error('Notify waitlist error:', error);
    return { success: false, message: 'Failed to notify waitlist' };
  }
};

// Convert waitlist to appointment
const convertWaitlistToAppointment = async (req, res) => {
  try {
    const { waitlistId } = req.params;
    const userId = req.userId;

    const waitlistEntry = await Waitlist.findOne({
      _id: waitlistId,
      userId,
      status: 'notified'
    }).populate('doctorId', 'firstname lastname');

    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found or not available for booking'
      });
    }

    // Check if still within notification window
    if (waitlistEntry.isExpired()) {
      waitlistEntry.status = 'expired';
      await waitlistEntry.save();
      
      return res.status(400).json({
        success: false,
        message: 'Notification has expired. The slot has been offered to the next person in line.'
      });
    }

    // Check if slot is still available
    const timeSlot = await TimeSlot.findOne({
      doctorId: waitlistEntry.doctorId,
      date: waitlistEntry.date,
      startTime: { $lte: waitlistEntry.time },
      endTime: { $gt: waitlistEntry.time },
      isAvailable: true
    });

    if (!timeSlot || !timeSlot.canAcceptBooking()) {
      // Slot no longer available, notify next person
      waitlistEntry.status = 'expired';
      await waitlistEntry.save();
      
      await notifyNextInWaitlist(
        waitlistEntry.doctorId,
        waitlistEntry.date,
        waitlistEntry.time
      );

      return res.status(400).json({
        success: false,
        message: 'Slot is no longer available'
      });
    }

    // Create appointment
    const appointment = new Appointment({
      userId,
      doctorId: waitlistEntry.doctorId,
      date: waitlistEntry.date,
      time: waitlistEntry.time,
      symptoms: waitlistEntry.symptoms,
      appointmentType: waitlistEntry.appointmentType,
      priority: waitlistEntry.priority,
      timeSlotId: timeSlot._id,
      status: 'Confirmed'
    });

    await appointment.save();

    // Update time slot
    timeSlot.bookedPatients += 1;
    if (timeSlot.bookedPatients >= timeSlot.maxPatients) {
      timeSlot.isAvailable = false;
    }
    await timeSlot.save();

    // Update waitlist entry
    waitlistEntry.status = 'booked';
    await waitlistEntry.save();

    // Update queue positions for remaining waitlist entries
    await Waitlist.updateMany(
      {
        doctorId: waitlistEntry.doctorId,
        date: waitlistEntry.date,
        time: waitlistEntry.time,
        status: 'waiting',
        positionInQueue: { $gt: waitlistEntry.positionInQueue }
      },
      { $inc: { positionInQueue: -1 } }
    );

    // Create success notification
    const notification = new Notification({
      userId,
      content: `Your appointment has been confirmed with Dr. ${waitlistEntry.doctorId.firstname} ${waitlistEntry.doctorId.lastname} on ${new Date(waitlistEntry.date).toLocaleDateString()} at ${waitlistEntry.time}`
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Appointment successfully booked from waitlist',
      appointment
    });

  } catch (error) {
    console.error('Convert waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to convert waitlist to appointment'
    });
  }
};

// Remove from waitlist
const removeFromWaitlist = async (req, res) => {
  try {
    const { waitlistId } = req.params;
    const userId = req.userId;

    const waitlistEntry = await Waitlist.findOne({
      _id: waitlistId,
      userId,
      status: { $in: ['waiting', 'notified'] }
    });

    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    const removedPosition = waitlistEntry.positionInQueue;

    // Remove from waitlist
    await Waitlist.findByIdAndDelete(waitlistId);

    // Update queue positions for remaining entries
    await Waitlist.updateMany(
      {
        doctorId: waitlistEntry.doctorId,
        date: waitlistEntry.date,
        time: waitlistEntry.time,
        status: 'waiting',
        positionInQueue: { $gt: removedPosition }
      },
      { $inc: { positionInQueue: -1 } }
    );

    res.json({
      success: true,
      message: 'Successfully removed from waitlist'
    });

  } catch (error) {
    console.error('Remove from waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to remove from waitlist'
    });
  }
};

// Admin: Get all waitlist entries
const getAllWaitlist = async (req, res) => {
  try {
    const { status, doctorId, date, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;
    if (date) query.date = new Date(date);

    const waitlistEntries = await Waitlist.find(query)
      .populate('userId', 'firstname lastname email mobile')
      .populate('doctorId', 'firstname lastname specialization')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Waitlist.countDocuments(query);

    // Get statistics
    const stats = await Waitlist.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }},
      { $group: {
        _id: null,
        total: { $sum: '$count' },
        statuses: { $push: { status: '$_id', count: '$count' } }
      }}
    ]);

    res.json({
      success: true,
      waitlist: waitlistEntries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      statistics: stats[0] || { total: 0, statuses: [] }
    });

  } catch (error) {
    console.error('Get all waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch waitlist data'
    });
  }
};

// Cleanup expired waitlist entries
const cleanupExpiredEntries = async () => {
  try {
    const expiredEntries = await Waitlist.find({
      status: 'notified',
      expiryDate: { $lt: new Date() }
    });

    for (const entry of expiredEntries) {
      entry.status = 'expired';
      await entry.save();

      // Notify next person in line
      await notifyNextInWaitlist(entry.doctorId, entry.date, entry.time);
    }

    console.log(`Cleaned up ${expiredEntries.length} expired waitlist entries`);
    return { success: true, cleanedUp: expiredEntries.length };

  } catch (error) {
    console.error('Cleanup expired entries error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  joinWaitlist,
  getUserWaitlist,
  getDoctorWaitlist,
  notifyNextInWaitlist,
  convertWaitlistToAppointment,
  removeFromWaitlist,
  getAllWaitlist,
  cleanupExpiredEntries
};
