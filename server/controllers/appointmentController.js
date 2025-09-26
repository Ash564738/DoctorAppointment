const Appointment = require("../models/appointmentModel");
const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Payment = require("../models/paymentModel");
const Doctor = require("../models/doctorModel");
const WalkInQueue = require('../models/walkInQueueModel');
const logger = require('../utils/logger');

const getWalkInQueue = async (req, res) => {
  try {
    const queue = await WalkInQueue.find({}).sort({ createdAt: 1 });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: 'Unable to fetch walk-in queue' });
  }
};

const addToWalkInQueue = async (req, res) => {
  try {
    const { name, reason } = req.body;
    if (!name || !reason) return res.status(400).json({ message: 'Name and reason required' });
    const entry = new WalkInQueue({ name, reason });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Unable to add to walk-in queue' });
  }
};
const getallappointments = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const keyword = search
      ? { $or: [{ userId: search }, { doctorId: search }] }
      : {};

    const appointments = await Appointment.find(keyword)
      .populate("doctorId", "firstname lastname email")
      .populate("userId", "firstname lastname email dateOfBirth")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Calculate age for populated user data
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

    const total = await Appointment.countDocuments(keyword);

    return res.json({
      success: true,
      appointments: appointmentsWithCalculatedAge,
      pagination: {
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).send("Unable to get apponintments");
  }
};

const bookappointment = async (req, res) => {
  try {
    const { doctorId, date, time, symptoms, isRecurring, recurringPattern, consultationFee, paymentMethod, appointmentType, priority } = req.body;
    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID, date, and time are required"
      });
    }

    // Get doctor information for fees and appointment defaults
    const doctor = await Doctor.findOne({ userId: doctorId }).populate('userId');
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    // Use doctor's default values for appointmentType, priority, estimatedDuration
    const defaultAppointmentType = doctor.appointmentType || 'Regular';
    const defaultPriority = doctor.priority || 'Normal';
    const defaultEstimatedDuration = doctor.estimatedDuration || 30;

    // Use the consultation fee from request or doctor's default fee
    const fee = consultationFee || doctor.fees || 100;

    let appointments = [];
    let notifications = [];
    let payments = [];
    const userId = req.locals;
    const user = await User.findById(userId);

    // Helper to capitalize first letter
    const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : undefined;

    // Helper to create appointment, payment, and notifications
    const createOneAppointment = async (aptDate, aptTime) => {
      // Create appointment with payment status
      const appointment = new Appointment({
        date: aptDate,
        time: aptTime,
        symptoms,
        doctorId,
        userId,
        isRecurring: !!isRecurring,
        recurringPattern: isRecurring && recurringPattern ? {
          ...recurringPattern,
          frequency: capitalize(recurringPattern.frequency)
        } : undefined,
        paymentStatus: 'Paid',
        appointmentType: defaultAppointmentType,
        priority: defaultPriority,
        estimatedDuration: defaultEstimatedDuration
      });

      const payment = new Payment({
        appointmentId: appointment._id,
        patientId: userId,
        doctorId: doctorId,
        amount: fee,
        currency: 'USD',
        paymentMethod: capitalize(paymentMethod) || 'Card',
        stripePaymentIntentId: `pi_fake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Fake for demo
        status: 'Succeeded',
        doctorEarnings: fee * 0.9,
        platformFee: fee * 0.1
      });
      appointment.paymentId = payment._id;
      appointments.push(appointment);
      payments.push(payment);

      notifications.push(new Notification({
        userId,
        content: `You booked an appointment with Dr. ${req.body.doctorname} for ${aptDate} ${aptTime}. Payment of $${fee} processed successfully.`,
      }));
      notifications.push(new Notification({
        userId: doctorId,
        content: `You have an appointment with ${user.firstname} ${user.lastname} on ${aptDate} at ${aptTime}. Patient Age: ${user.age || 'Not specified'}, Blood Group: ${user.bloodGroup || 'Not specified'}, Gender: ${user.gender || 'Not specified'}, Mobile: ${user.mobile || 'Not specified'}. Symptoms: ${symptoms}` ,
      }));
    };

    if (isRecurring && recurringPattern && recurringPattern.frequency && (recurringPattern.endDate || recurringPattern.occurrences)) {
      let startDate = new Date(date);
      let endDate = recurringPattern.endDate ? new Date(recurringPattern.endDate) : null;
      let occurrences = recurringPattern.occurrences || 0;
      let count = 0;
      let currentDate = new Date(startDate);
      while ((endDate ? currentDate <= endDate : count < occurrences) && count < 100) {
        await createOneAppointment(new Date(currentDate), time);
        switch (recurringPattern.frequency) {
          case 'Weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'Biweekly':
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case 'Monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            currentDate.setDate(currentDate.getDate() + 7);
        }
        count++;
      }
    } else {
      await createOneAppointment(date, time);
    }

    const appointmentResults = await Promise.all(appointments.map(apt => apt.save()));
    const paymentResults = await Promise.all(payments.map(p => p.save()));
    await Promise.all(notifications.map(n => n.save()));

    return res.status(201).json({
      message: isRecurring ? 'Recurring appointments booked and paid successfully' : 'Appointment booked and paid successfully',
      appointments: appointmentResults,
      payments: paymentResults,
      totalAmount: fee * appointments.length
    });
  } catch (error) {
    logger.error('Error booking appointment:', error);
    res.status(500).send("Unable to book appointment");
  }
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
      new Date(apt.date) >= startOfToday && (apt.status?.toLowerCase() === 'Confirmed')
    ).length;
    const completedAppointments = appointmentsWithSpecialization.filter(apt => 
      apt.status?.toLowerCase() === 'Completed'
    ).length;
    const cancelledAppointments = appointmentsWithSpecialization.filter(apt => 
      apt.status?.toLowerCase() === 'Cancelled'
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

    let isRecurringUpdate = {};
    if (recurringPattern && typeof recurringPattern === "object") {
      if (recurringPattern.frequency) {
        isRecurringUpdate.isRecurring = true;
      } else {
        isRecurringUpdate.isRecurring = false;
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status, recurringPattern, ...updateData, ...isRecurringUpdate },
      { new: true }
    ).populate("doctorId").populate("userId");
    if (status && updatedAppointment.paymentId) {
      let newPaymentStatus = undefined;
      if (status.toLowerCase() === 'cancelled') newPaymentStatus = 'Refunded';
      if (status.toLowerCase() === 'completed') newPaymentStatus = 'Paid';
      if (newPaymentStatus) {
        await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: newPaymentStatus });
        await Payment.findByIdAndUpdate(updatedAppointment.paymentId, {
          status: newPaymentStatus === 'Refunded' ? 'Refunded' : 'Succeeded'
        });
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
  getWalkInQueue,
  addToWalkInQueue,
  updateAppointment,
};
