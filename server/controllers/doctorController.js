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
    const { startDate, endDate } = req.query;
    const totalAppointments = await Appointment.countDocuments({ doctorId });
    const completedAppointments = await Appointment.countDocuments({ 
      doctorId, 
      status: 'Completed' 
    });
    const pendingAppointments = await Appointment.countDocuments({ 
      doctorId, 
      status: 'Pending' 
    });
    const analytics = {
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      patientSatisfaction: 4.5,
      averageConsultationTime: 25,
      monthlyStats: [
        { month: 'Jan', appointments: 45, revenue: 4500 },
        { month: 'Feb', appointments: 52, revenue: 5200 },
        { month: 'Mar', appointments: 48, revenue: 4800 },
        { month: 'Apr', appointments: 61, revenue: 6100 },
        { month: 'May', appointments: 55, revenue: 5500 },
        { month: 'Jun', appointments: 58, revenue: 5800 },
      ]
    };
    res.status(200).json({
      success: true,
      analytics
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
