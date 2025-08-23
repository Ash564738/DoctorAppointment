const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const TimeSlot = require("../models/timeSlotModel");
const logger = require("../utils/logger");

const createRecurringAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      startDate,
      time,
      symptoms,
      appointmentType = 'Regular',
      frequency,
      occurrences,
      endDate,
      estimatedDuration = 30
    } = req.body;
    if (!doctorId || !startDate || !time || !symptoms || !frequency) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided"
      });
    }
    if (!['Weekly', 'Biweekly', 'Monthly'].includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid frequency. Must be weekly, biweekly, or monthly"
      });
    }
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'Doctor') {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID"
      });
    }

    const userId = req.userId;
    const appointments = [];
    const currentDate = new Date(startDate);
    const finalEndDate = endDate ? new Date(endDate) : null;
    let appointmentCount = 0;
    const maxOccurrences = occurrences || 10; // Default to 10 if not specified
    while (appointmentCount < maxOccurrences) {
      if (finalEndDate && currentDate > finalEndDate) {
        break;
      }
      if (appointmentCount > 0 && currentDate < new Date()) {
        appointmentCount++;
        if (frequency === 'Weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (frequency === 'Biweekly') {
          currentDate.setDate(currentDate.getDate() + 14);
        } else if (frequency === 'Monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        continue;
      }
      const appointment = new Appointment({
        userId,
        doctorId,
        date: new Date(currentDate),
        time,
        symptoms: appointmentCount === 0 ? symptoms : `Follow-up: ${symptoms}`,
        appointmentType: appointmentCount === 0 ? appointmentType : 'Follow-up',
        status: 'Pending',
        isRecurring: true,
        recurringPattern: {
          frequency,
          endDate: finalEndDate,
          occurrences: maxOccurrences
        },
        estimatedDuration
      });
      appointments.push(appointment);
      appointmentCount++;
      if (frequency === 'Weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'Biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (frequency === 'Monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    const savedAppointments = await Appointment.insertMany(appointments);
    logger.info(`Created ${savedAppointments.length} recurring appointments for user ${userId}`);
    return res.status(201).json({
      success: true,
      message: `Successfully created ${savedAppointments.length} recurring appointments`,
      data: {
        appointments: savedAppointments,
        totalAppointments: savedAppointments.length,
        frequency,
        startDate,
        endDate: finalEndDate
      }
    });

  } catch (error) {
    logger.error("Error creating recurring appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create recurring appointments",
      error: error.message
    });
  }
};

const getRecurringAppointments = async (req, res) => {
  try {
    const userId = req.userId;
    const { doctorId, status, frequency } = req.query;

    let filter = {
      userId,
      isRecurring: true
    };
    if (doctorId) filter.doctorId = doctorId;
    if (status) filter.status = status;
    if (frequency) filter['recurringPattern.frequency'] = frequency;
    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'firstname lastname specialization')
      .populate('userId', 'firstname lastname')
      .sort({ date: 1 });
    const groupedAppointments = {};
    appointments.forEach(appointment => {
      const key = `${appointment.doctorId._id}_${appointment.recurringPattern.frequency}_${appointment.symptoms}`;
      if (!groupedAppointments[key]) {
        groupedAppointments[key] = {
          series: [],
          doctor: appointment.doctorId,
          frequency: appointment.recurringPattern.frequency,
          symptoms: appointment.symptoms,
          appointmentType: appointment.appointmentType
        };
      }
      groupedAppointments[key].series.push(appointment);
    });

    return res.status(200).json({
      success: true,
      message: "Recurring appointments fetched successfully",
      data: {
        individual: appointments,
        grouped: Object.values(groupedAppointments),
        totalSeries: Object.keys(groupedAppointments).length,
        totalAppointments: appointments.length
      }
    });

  } catch (error) {
    logger.error("Error fetching recurring appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recurring appointments",
      error: error.message
    });
  }
};

const cancelRecurringSeries = async (req, res) => {
  try {
    const { seriesId, cancelFuture = true, reason } = req.body;
    const userId = req.userId;
    const baseAppointment = await Appointment.findById(seriesId);
    if (!baseAppointment || baseAppointment.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or unauthorized"
      });
    }
    if (!baseAppointment.isRecurring) {
      return res.status(400).json({
        success: false,
        message: "This is not a recurring appointment"
      });
    }
    let cancelledCount = 0;
    if (cancelFuture) {
      const filter = {
        userId,
        doctorId: baseAppointment.doctorId,
        isRecurring: true,
        'recurringPattern.frequency': baseAppointment.recurringPattern.frequency,
        date: { $gte: baseAppointment.date },
        status: { $in: ['Pending', 'Confirmed'] }
      };

      const updateResult = await Appointment.updateMany(filter, {
        status: 'Cancelled',
        cancellationReason: reason || 'Series cancelled by patient',
        cancellationDate: new Date()
      });

      cancelledCount = updateResult.modifiedCount;
    } else {
      baseAppointment.status = 'Cancelled';
      baseAppointment.cancellationReason = reason || 'Single appointment cancelled';
      baseAppointment.cancellationDate = new Date();
      await baseAppointment.save();
      cancelledCount = 1;
    }

    logger.info(`Cancelled ${cancelledCount} recurring appointments for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: `Successfully cancelled ${cancelledCount} appointment(s)`,
      data: {
        cancelledCount,
        cancelFuture,
        reason: reason || 'No reason provided'
      }
    });

  } catch (error) {
    logger.error("Error cancelling recurring appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel recurring appointments",
      error: error.message
    });
  }
};

const updateRecurringSeries = async (req, res) => {
  try {
    const { seriesId, updateFuture = true, symptoms, appointmentType } = req.body;
    const userId = req.userId;
    const baseAppointment = await Appointment.findById(seriesId);
    if (!baseAppointment || baseAppointment.userId.toString() !== userId) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or unauthorized"
      });
    }
    if (!baseAppointment.isRecurring) {
      return res.status(400).json({
        success: false,
        message: "This is not a recurring appointment"
      });
    }
    let updatedCount = 0;
    const updateData = {};
    if (symptoms) updateData.symptoms = symptoms;
    if (appointmentType) updateData.appointmentType = appointmentType;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No update data provided"
      });
    }
    if (updateFuture) {
      const filter = {
        userId,
        doctorId: baseAppointment.doctorId,
        isRecurring: true,
        'recurringPattern.frequency': baseAppointment.recurringPattern.frequency,
        date: { $gte: baseAppointment.date },
        status: { $in: ['Pending', 'Confirmed'] }
      };
      const updateResult = await Appointment.updateMany(filter, updateData);
      updatedCount = updateResult.modifiedCount;
    } else {
      Object.assign(baseAppointment, updateData);
      await baseAppointment.save();
      updatedCount = 1;
    }
    logger.info(`Updated ${updatedCount} recurring appointments for user ${userId}`);
    return res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedCount} appointment(s)`,
      data: {
        updatedCount,
        updateFuture,
        updates: updateData
      }
    });

  } catch (error) {
    logger.error("Error updating recurring appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update recurring appointments",
      error: error.message
    });
  }
};

module.exports = {
  createRecurringAppointment,
  getRecurringAppointments,
  cancelRecurringSeries,
  updateRecurringSeries
};
