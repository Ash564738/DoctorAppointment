const Appointment = require("../models/appointmentModel");
const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Payment = require("../models/paymentModel");
const Doctor = require("../models/doctorModel");
const Shift = require("../models/shiftModel");
const LeaveRequest = require("../models/leaveRequestModel");
const TimeSlot = require("../models/timeSlotModel");
const logger = require('../utils/logger');

const getallappointments = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status, date } = req.query;

    // Base keyword used for global statusCounts and as foundation for data query
    const baseKeyword = {};
    if (search) {
      baseKeyword.$or = [{ userId: search }, { doctorId: search }];
    }
    if (date) {
      // Expecting YYYY-MM-DD; match same day range
      const dt = new Date(date);
      if (!isNaN(dt)) {
        const start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        const end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
        baseKeyword.date = { $gte: start, $lt: end };
      }
    }

    // Apply status filter if provided and not 'all'
    let retrievalKeyword = { ...baseKeyword };
    if (status && typeof status === 'string' && status.toLowerCase() !== 'all') {
      const s = status.toLowerCase();
      if (s.startsWith('confirm')) {
        retrievalKeyword.status = { $regex: /^confirm/i };
      } else if (s.startsWith('complete')) {
        retrievalKeyword.status = { $regex: /^complete/i };
      } else if (s.startsWith('cancel')) {
        retrievalKeyword.status = { $regex: /^cancel/i };
      } else {
        // Fallback: exact case-insensitive
        retrievalKeyword.status = { $regex: new RegExp(`^${s}$`, 'i') };
      }
    }

    const appointments = await Appointment.find(retrievalKeyword)
      .populate("doctorId", "firstname lastname email")
      .populate("userId", "firstname lastname email dateOfBirth")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const appointmentsWithCalculatedAge = appointments.map(appointment => {
      const appointmentObj = appointment;

      if (appointmentObj.userId && appointmentObj.userId.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(appointmentObj.userId.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        appointmentObj.userId.age = age;
      }

      return appointmentObj;
    });

  const total = await Appointment.countDocuments(retrievalKeyword);
    const statusAgg = await Appointment.aggregate([
      { $match: baseKeyword },
      { $project: { normalizedStatus: { $toLower: { $trim: { input: { $ifNull: ["$status", ""] } } } } } },
      { $group: { _id: "$normalizedStatus", count: { $sum: 1 } } }
    ]);
    let confirmedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    for (const row of statusAgg) {
      const s = (row._id || '').toString();
      const c = row.count || 0;
      if (s === 'confirmed' || s === 'confirm' || s === 'appointment confirmed') confirmedCount += c;
      else if (s.startsWith('complete')) completedCount += c; 
      else if (s.startsWith('cancel')) cancelledCount += c;
    }
    const statusCounts = {
      all: total,
      confirmed: confirmedCount,
      completed: completedCount,
      cancelled: cancelledCount
    };

    return res.json({
      success: true,
      appointments: appointmentsWithCalculatedAge,
      pagination: {
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        total
      },
      statusCounts
    });
  } catch (error) {
    res.status(500).send("Unable to get apponintments");
  }
};

const bookappointment = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This booking endpoint is deprecated. Please use /api/payment/create-payment-intent followed by /api/payment/confirm-payment.'
  });
};

const completed = async (req, res) => {
  try {
    const alreadyFound = await Appointment.findOneAndUpdate(
      { _id: req.body.appointid },
      { status: "Completed" }
    );
    const usernotification = Notification({
      userId: req.locals,
      content: `Your appointment with ${req.body.doctorname} has been completed`,
    });
    await usernotification.save();
    const user = await User.findById(req.locals);
    const doctornotification = Notification({
      userId: req.body.doctorId,
      content: `Your appointment with ${user.firstname} ${user.lastname} has been completed`,
    });
    await doctornotification.save();
    return res.status(201).send("Appointment completed");
  } catch (error) {
    res.status(500).send("Unable to complete appointment");
  }
};

const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.userId;
    const appointments = await Appointment.find({ doctorId })
      .populate('userId', 'firstname lastname email phone')
      .populate('doctorId', 'firstname lastname')
      .sort({ date: 1, time: 1 })
      .lean();

    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get doctor appointments"
    });
  }
};

const getPatientAppointments = async (req, res) => {
  try {
    const userId = req.userId;
    const appointments = await Appointment.find({ userId })
      .populate('doctorId', 'firstname lastname')
      .populate('userId', 'firstname lastname')
      .populate('paymentId', 'receiptUrl')
      .sort({ date: 1, time: 1 });

    const appointmentsWithSpecialization = await Promise.all(
      appointments.map(async (appointment) => {
        const appointmentObj = appointment.toObject();
        
        if (appointmentObj.doctorId && appointmentObj.doctorId._id) {
          const doctorRecord = await Doctor.findOne({ userId: appointmentObj.doctorId._id });
          if (doctorRecord) {
            appointmentObj.doctorId.specialization = doctorRecord.specialization;
            appointmentObj.doctorId.experience = doctorRecord.experience;
            appointmentObj.doctorId.fees = doctorRecord.fees;
            appointmentObj.doctorId.timing = doctorRecord.timing;
          }
        }
        return appointmentObj;
      })
    );
    res.status(200).json({
      success: true,
      appointments: appointmentsWithSpecialization
    });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get patient appointments"
    });
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.isDoctor ? 'doctor' : 'patient';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let query = {
      date: { $gte: today.toISOString() },
      status: { $in: ['Confirmed'] }
    };
    if (userType === 'doctor') {
      query.doctorId = userId;
    } else {
      query.userId = userId;
    }
    const appointments = await Appointment.find(query)
      .populate('doctorId', 'firstname lastname specialization')
      .populate('userId', 'firstname lastname')
      .sort({ date: 1, time: 1 })
      .limit(5);
    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get upcoming appointments"
    });
  }
};

const getPatientStats = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const allAppointments = await Appointment.find({ userId })
      .populate('doctorId', 'firstname lastname')
      .sort({ date: -1, time: -1 });
    const appointmentsWithSpecialization = await Promise.all(
      allAppointments.map(async (appointment) => {
        const appointmentObj = appointment.toObject();
        if (appointmentObj.doctorId && appointmentObj.doctorId._id) {
          const doctorRecord = await Doctor.findOne({ userId: appointmentObj.doctorId._id });
          if (doctorRecord) {
            appointmentObj.doctorId.specialization = doctorRecord.specialization;
          }
        }
        
        return appointmentObj;
      })
    );
    const totalAppointments = appointmentsWithSpecialization.length;
    const upcomingAppointments = appointmentsWithSpecialization.filter(apt => 
      new Date(apt.date) >= startOfToday && (apt.status?.toLowerCase() === 'confirmed')
    ).length;
    const completedAppointments = appointmentsWithSpecialization.filter(apt => 
      apt.status?.toLowerCase() === 'completed'
    ).length;
    const cancelledAppointments = appointmentsWithSpecialization.filter(apt => 
      apt.status?.toLowerCase() === 'cancelled'
    ).length;
    const recentAppointments = appointmentsWithSpecialization.slice(0, 5).map(apt => ({
      _id: apt._id,
      doctorId: apt.doctorId,
      date: apt.date,
      time: apt.time,
      status: apt.status,
      symptoms: apt.symptoms || 'Not specified'
    }));
    res.status(200).json({
      success: true,
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments,
      recentAppointments
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get patient statistics"
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, recurringPattern, ...updateData } = req.body;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId")
      .populate("userId");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    const updatePayload = { status, recurringPattern, ...updateData };
    if (typeof status === 'string' && status.toLowerCase() === 'cancelled' && !updatePayload.cancellationDate) {
      updatePayload.cancellationDate = new Date();
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updatePayload,
      { new: true }
    ).populate("doctorId").populate("userId");
    if (status && updatedAppointment.paymentId) {
      if (status.toLowerCase() === 'completed') {
        await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: 'Paid' });
        await Payment.findByIdAndUpdate(updatedAppointment.paymentId, { status: 'Succeeded' });
      }
    }
    if (status && status !== appointment.status) {
      let notificationContent = '';
      const doctorName = appointment.doctorId?.userId?.firstname 
        ? `Dr. ${appointment.doctorId.userId.firstname} ${appointment.doctorId.userId.lastname}`
        : 'the doctor';
      
      switch (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) {
        case 'Confirmed':
          notificationContent = `Your appointment with ${doctorName} has been confirmed for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}`;
          break;
        case 'Cancelled':
          notificationContent = `Your appointment with ${doctorName} scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time} has been cancelled`;
          break;
        case 'Completed':
          notificationContent = `Your appointment with ${doctorName} has been completed`;
          break;
        default:
          notificationContent = `Your appointment status has been updated to ${status}`;
      }
      const notification = new Notification({
        userId: appointment.userId._id,
        content: notificationContent,
      });
      await notification.save();
      if (status.toLowerCase() === 'confirmed') {
        const doctorNotification = new Notification({
          userId: appointment.doctorId.userId._id,
          content: `Appointment with ${appointment.userId.firstname} ${appointment.userId.lastname} has been confirmed for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}`,
        });
        await doctorNotification.save();
      }
    }

    logger.info(`Appointment ${appointmentId} updated to status: ${status}`);

    res.json({
      success: true,
      message: "Appointment updated successfully",
      appointment: updatedAppointment
    });

  } catch (error) {
    logger.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: "Unable to update appointment"
    });
  }
};
module.exports = {
  getallappointments,
  bookappointment,
  completed,
  getDoctorAppointments,
  getPatientAppointments,
  getUpcomingAppointments,
  getPatientStats,
  updateAppointment,
};
