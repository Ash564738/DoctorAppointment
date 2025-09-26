const Doctor = require("../models/doctorModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const Appointment = require("../models/appointmentModel");

const getalldoctors = async (req, res) => {
  try {
    let docs;
    if (!req.locals) {
      docs = await Doctor.find({ isDoctor: true }).populate("userId").lean();
    } else {
      docs = await Doctor.find({ isDoctor: true })
        .find({
          _id: { $ne: req.locals },
        })
        .populate("userId")
        .lean();
    }

    return res.send(docs);
  } catch (error) {
    res.status(500).send("Unable to get doctors");
  }
};

const getnotdoctors = async (req, res) => {
  try {
    const docs = await Doctor.find({ isDoctor: false })
      .find({
        _id: { $ne: req.locals },
      })
      .populate("userId")
      .lean();

    return res.send(docs);
  } catch (error) {
    res.status(500).send("Unable to get non doctors");
  }
};

const applyfordoctor = async (req, res) => {
  try {
    const alreadyFound = await Doctor.findOne({ userId: req.locals });
    if (alreadyFound) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a doctor application. Please wait for admin approval."
      });
    }

    const doctor = Doctor({ ...req.body.formDetails, userId: req.locals });
    const result = await doctor.save();
    const admins = await User.find({ role: 'Admin' });
    const user = await User.findById(req.locals);
    if (admins && user) {
      const notifications = admins.map(admin => ({
        userId: admin._id,
        content: `New doctor application submitted by ${user.firstname} ${user.lastname} (${user.email}).`
      }));
      await Notification.insertMany(notifications);
    }

    return res.status(201).send("Application submitted successfully");
  } catch (error) {
    res.status(500).send("Unable to submit application");
  }
};

const acceptdoctor = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.body.id },
      { isDoctor: true, status: "accepted" }
    );

    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.body.id },
      { isDoctor: true }
    );

    const notification = await Notification({
      userId: req.body.id,
      content: `Congratulations, Your application has been accepted.`,
    });

    await notification.save();

    return res.status(201).send("Application accepted notification sent");
  } catch (error) {
    res.status(500).send("Error while sending notification");
  }
};

const rejectdoctor = async (req, res) => {
  try {
    const details = await User.findOneAndUpdate(
      { _id: req.body.id },
      { isDoctor: false, status: "rejected" }
    );
    const delDoc = await Doctor.findOneAndDelete({ userId: req.body.id });

    const notification = await Notification({
      userId: req.body.id,
      content: `Sorry, Your application has been rejected.`,
    });

    await notification.save();

    return res.status(201).send("Application rejection notification sent");
  } catch (error) {
    res.status(500).send("Error while rejecting application");
  }
};

const deletedoctor = async (req, res) => {
  try {
    const result = await User.findByIdAndUpdate(req.body.userId, {
      isDoctor: false,
    });
    const removeDoc = await Doctor.findOneAndDelete({
      userId: req.body.userId,
    });
    const removeAppoint = await Appointment.findOneAndDelete({
      userId: req.body.userId,
    });

    const admins = await User.find({ role: 'Admin' });
    const user = await User.findById(req.body.userId);
    if (admins && user) {
      const notifications = admins.map(admin => ({
        userId: admin._id,
        content: `Doctor profile deleted for ${user.firstname} ${user.lastname} (${user.email}).`
      }));
      await Notification.insertMany(notifications);
    }

    return res.send("Doctor deleted successfully");
  } catch (error) {
    logger.error('Error deleting doctor:', error);
    res.status(500).send("Unable to delete doctor");
  }
};

const getMyPatients = async (req, res) => {
  try {
    const doctorId = req.userId; 
    const appointments = await Appointment.find({ doctorId })
      .populate('userId', 'firstname lastname email phone dateOfBirth gender')
      .distinct('userId');
    const patients = appointments.filter(patient => patient);
    res.status(200).json({
      success: true,
      patients
    });
  } catch (error) {
    console.error('Error fetching my patients:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get patients"
    });
  }
};

const getDoctorAnalytics = async (req, res) => {
  try {
    const doctorId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Total appointments
    const totalAppointments = await Appointment.countDocuments({ doctorId });
    // Today's appointments
    const todayAppointments = await Appointment.countDocuments({ doctorId, date: { $gte: today, $lt: tomorrow } });
    // Pending appointments
    const pendingAppointments = await Appointment.countDocuments({ doctorId, status: 'Pending' });
    // Total unique patients
    const totalPatients = await Appointment.distinct('userId', { doctorId });

    // Monthly earnings (current month)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthlyPayments = await require('../models/paymentModel').aggregate([
      { $match: { doctorId: require('mongoose').Types.ObjectId(doctorId), status: 'Succeeded', paymentDate: { $gte: startOfMonth, $lt: endOfMonth } } },
      { $group: { _id: null, total: { $sum: '$doctorEarnings' } } }
    ]);
    const monthlyEarnings = monthlyPayments[0]?.total || 0;

    // Average rating
    const Rating = require('../models/ratingModel');
    const ratingAgg = await Rating.aggregate([
      { $match: { doctorId: require('mongoose').Types.ObjectId(doctorId) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    const averageRating = ratingAgg[0]?.avg || 0;

    // Completion and cancellation rates
    const completedCount = await Appointment.countDocuments({ doctorId, status: 'Completed' });
    const cancelledCount = await Appointment.countDocuments({ doctorId, status: 'Cancelled' });
    const totalTracked = completedCount + cancelledCount;
    const completionRate = totalTracked > 0 ? Math.round((completedCount / totalTracked) * 100) : 0;
    const cancellationRate = totalTracked > 0 ? Math.round((cancelledCount / totalTracked) * 100) : 0;

    // Monthly trend (last 6 months)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        start: new Date(d),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
      });
    }
    const monthlyTrend = await Promise.all(months.map(async m => {
      const count = await Appointment.countDocuments({ doctorId, date: { $gte: m.start, $lt: m.end } });
      return { month: m.label, appointments: count };
    }));

    // Status distribution (pie chart)
    const statusAgg = await Appointment.aggregate([
      { $match: { doctorId: require('mongoose').Types.ObjectId(doctorId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusDistribution = statusAgg.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    // Time slot popularity (bar chart)
    const slotAgg = await Appointment.aggregate([
      { $match: { doctorId: require('mongoose').Types.ObjectId(doctorId) } },
      { $group: { _id: '$time', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const timeSlotPopularity = slotAgg.map(s => ({ time: s._id, count: s.count }));

    res.status(200).json({
      success: true,
      analytics: {
        totalAppointments,
        todayAppointments,
        pendingAppointments,
        totalPatients: totalPatients.length,
        monthlyEarnings,
        averageRating,
        completionRate,
        cancellationRate,
        monthlyTrend,
        statusDistribution,
        timeSlotPopularity
      }
    });
  } catch (error) {
    console.error('Error fetching doctor analytics:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get analytics"
    });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const doctorId = req.user.id;
        const recentAppointments = await Appointment.find({
      doctorId: doctorId,
      $or: [
        { status: 'Completed', updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        { status: 'Pending', date: { $gte: new Date() } }
      ]
    })
    .populate('userId', 'firstname lastname')
    .sort({ updatedAt: -1 })
    .limit(10);
    const activities = recentAppointments.map((appointment, index) => {
      const timeAgo = getTimeAgo(appointment.updatedAt || appointment.createdAt);
      const patient = appointment.userId;
      if (appointment.status === 'Completed') {
        return {
          id: `activity_${index}`,
          type: 'appointment',
          message: `Completed consultation with ${patient.firstname} ${patient.lastname}`,
          time: timeAgo,
          icon: 'FaUserMd'
        };
      } else {
        return {
          id: `activity_${index}`,
          type: 'upcoming',
          message: `Upcoming appointment with ${patient.firstname} ${patient.lastname}`,
          time: `Scheduled for ${new Date(appointment.date).toLocaleDateString()}`,
          icon: 'FaCalendarAlt'
        };
      }
    });

    res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: "Unable to get recent activity"
    });
  }
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Less than an hour ago';
  }
};

const adminUpdateDoctor = async (req, res) => {
  try {
    const currentUser = await User.findById(req.locals);
    if (currentUser?.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }
    const doctorId = req.params.id;
    const updateData = req.body;
    if (updateData.specialization && !updateData.specialization.trim()) {
      return res.status(400).json({
        success: false,
        message: "Specialization cannot be empty"
      });
    }
    if (updateData.experience !== undefined && (isNaN(updateData.experience) || updateData.experience < 0)) {
      return res.status(400).json({
        success: false,
        message: "Experience must be a valid positive number"
      });
    }
    if (updateData.fees !== undefined && (isNaN(updateData.fees) || updateData.fees < 0)) {
      return res.status(400).json({
        success: false,
        message: "Fees must be a valid positive number"
      });
    }
    const { _id, __v, userId, ...safeUpdateData } = updateData;
    const allowedFields = ['specialization', 'experience', 'fees', 'department'];
    const filteredUpdate = {};
    allowedFields.forEach(field => {
      if (safeUpdateData[field] !== undefined) filteredUpdate[field] = safeUpdateData[field];
    });
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      filteredUpdate,
      { new: true, runValidators: true }
    ).populate('userId', 'firstname lastname email mobile address');
    if (!updatedDoctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      doctor: updatedDoctor
    });
  } catch (error) {
    console.error('Admin update doctor error:', error);
    res.status(500).json({
      success: false,
      message: `Unable to update doctor: ${error.message}`
    });
  }
};

module.exports = {
  getalldoctors,
  getnotdoctors,
  deletedoctor,
  applyfordoctor,
  acceptdoctor,
  rejectdoctor,
  getMyPatients,
  getDoctorAnalytics,
  getRecentActivity,
  adminUpdateDoctor,
};
