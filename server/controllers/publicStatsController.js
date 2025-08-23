const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const Appointment = require("../models/appointmentModel");
const logger = require("../utils/logger");

const getPublicStats = async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      specialistDoctors,
      completedAppointments
    ] = await Promise.all([
      User.countDocuments({ role: "Patient" }),
      Doctor.countDocuments(), 
      Doctor.countDocuments({ 
        specialization: { $exists: true, $ne: "" }
      }),
      Appointment.countDocuments({ status: "Completed" })
    ]);
    const stats = {
      satisfiedPatients: totalPatients,
      verifiedDoctors: totalDoctors,
      specialistDoctors: specialistDoctors
    };

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error("Error fetching public stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message
    });
  }
};

module.exports = {
  getPublicStats
};
