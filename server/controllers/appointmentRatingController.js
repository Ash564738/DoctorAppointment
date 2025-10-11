const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const Rating = require("../models/ratingModel");
const logger = require("../utils/logger");

const rateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { score, feedback } = req.body;
    const userId = req.userId;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating score must be between 1 and 5"
      });
    }
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'firstname lastname')
      .populate('userId', 'firstname lastname')
      .lean();
    logger.info('Fetched appointment for rating:', appointment?._id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    if (appointment.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only rate your own appointments"
      });
    }
    if (appointment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: "You can only rate completed appointments"
      });
    }
    const existingRating = await Rating.findOne({ appointmentId, patientId: userId });
    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "This appointment has already been rated. Use update rating instead."
      });
    }
    const ratingDoc = new Rating({
      appointmentId,
      doctorId: appointment.doctorId._id,
      patientId: userId,
      rating: score,
      comment: feedback || ''
    });
    await ratingDoc.save();
    const notification = new Notification({
      userId: appointment.doctorId._id,
      content: `You received a ${score}-star rating from ${appointment.userId.firstname} ${appointment.userId.lastname}${feedback ? `: "${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}"` : ''}`
    });
    await notification.save();
    await Notification.create({
      userId: userId,
      content: `Thank you for rating your appointment with Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}.`
    });
    logger.info(`Appointment ${appointmentId} rated with ${score} stars by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      data: {
        appointmentId,
        rating: ratingDoc,
        doctor: {
          id: appointment.doctorId._id,
          name: `${appointment.doctorId.firstname} ${appointment.doctorId.lastname}`
        }
      }
    });

  } catch (error) {
    logger.error("Error rating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit rating",
      error: error.message
    });
  }
};

const updateAppointmentRating = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { score, feedback } = req.body;
    const userId = req.userId;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating score must be between 1 and 5"
      });
    }
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'firstname lastname')
      .populate('userId', 'firstname lastname')
      .lean();
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    // Ensure only completed appointments' ratings can be updated
    if (appointment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: "You can only rate or update ratings for completed appointments"
      });
    }
    if (appointment.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own ratings"
      });
    }
    const existingRating = await Rating.findOne({ appointmentId, patientId: userId });
    if (!existingRating) {
      return res.status(404).json({
        success: false,
        message: "No existing rating found. Use rate appointment instead."
      });
    }
    existingRating.rating = score;
    existingRating.comment = feedback || existingRating.comment;
    await existingRating.save();
    await Notification.create({
      userId: appointment.doctorId._id,
      content: `A rating for your appointment with ${appointment.userId.firstname} ${appointment.userId.lastname} was updated to ${score} stars${feedback ? `: "${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}"` : ''}.`
    });
    await Notification.create({
      userId: userId,
      content: `Your rating for Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname} was updated.`
    });
    logger.info(`Rating updated for appointment ${appointmentId} by user ${userId}`);
    return res.status(200).json({
      success: true,
      message: "Rating updated successfully",
      data: {
        appointmentId,
        rating: existingRating
      }
    });

  } catch (error) {
    logger.error("Error updating appointment rating:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update rating",
      error: error.message
    });
  }
};

const getDoctorRatings = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    logger.info(`[getDoctorRatings] doctorId param: ${doctorId}`);
    const doctor = await User.findById(doctorId);
    logger.info(`[getDoctorRatings] User.findById result: ${doctor ? doctor._id : 'null'}`);

    if (!doctor) {
      logger.warn(`[getDoctorRatings] No User found for id: ${doctorId}. Make sure you are passing the User _id, not Doctor _id.`);
      return res.status(404).json({
        success: false,
        message: "Doctor not found. Make sure you are passing the User _id, not Doctor _id."
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const ratings = await Rating.find({ doctorId: doctorId })
      .populate('patientId', 'firstname lastname pic')
      .select('rating createdAt comment')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit));

    const ratingStats = await Rating.aggregate([
      {
        $match: {
          doctorId: doctor._id
        }
      },
      {
        $group: {
          _id: null,
          totalRatings: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    const stats = ratingStats[0] || {
      totalRatings: 0,
      averageRating: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0
    };

    const ratingDistribution = {
      5: stats.totalRatings ? Math.round((stats.rating5 / stats.totalRatings) * 100) : 0,
      4: stats.totalRatings ? Math.round((stats.rating4 / stats.totalRatings) * 100) : 0,
      3: stats.totalRatings ? Math.round((stats.rating3 / stats.totalRatings) * 100) : 0,
      2: stats.totalRatings ? Math.round((stats.rating2 / stats.totalRatings) * 100) : 0,
      1: stats.totalRatings ? Math.round((stats.rating1 / stats.totalRatings) * 100) : 0
    };

    const total = await Rating.countDocuments({
      doctorId: doctorId
    });

    return res.status(200).json({
      success: true,
      message: "Doctor ratings retrieved successfully",
      data: {
        doctor: {
          id: doctor._id,
          name: `${doctor.firstname} ${doctor.lastname}`,
          specialization: doctor.specialization,
          pic: doctor.pic
        },
        ratings,
        statistics: {
          ...stats,
          averageRating: Math.round(stats.averageRating * 10) / 10
        },
        ratingDistribution,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching doctor ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor ratings",
      error: error.message
    });
  }
};

const getPatientRatings = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const ratings = await Rating.find({ patientId: userId })
      .populate('doctorId', 'firstname lastname specialization pic')
      .select('rating createdAt comment appointmentId')
      .sort({ 'createdAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({
      patientId: userId
    });

    return res.status(200).json({
      success: true,
      message: "Patient ratings retrieved successfully",
      data: {
        ratings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching patient ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient ratings",
      error: error.message
    });
  }
};

const getMyDoctorRatings = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const doctor = await User.findById(userId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const ratings = await Rating.find({ doctorId: userId })
      .populate('patientId', 'firstname lastname pic')
      .select('rating createdAt comment')
      .sort({ 'createdAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const formattedRatings = ratings.map(rating => ({
      _id: rating._id,
      rating: rating.rating,
      comment: rating.comment,
      patientName: rating.patientId 
        ? `${rating.patientId.firstname} ${rating.patientId.lastname}`
        : 'Anonymous',
      createdAt: rating.createdAt
    }));
    const total = await Rating.countDocuments({ doctorId: userId });
    return res.status(200).json({
      success: true,
      message: "Doctor ratings retrieved successfully",
      data: formattedRatings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error("Error fetching doctor's own ratings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor ratings",
      error: error.message
    });
  }
};

const updateDoctorAverageRating = async (doctorId) => {
  try {
    const stats = await Rating.aggregate([
      {
        $match: {
          doctorId: doctorId
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(doctorId, {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        totalRatings: stats[0].totalRatings
      });
    }
  } catch (error) {
    logger.error("Error updating doctor average rating:", error);
  }
};

module.exports = {
  rateAppointment,
  updateAppointmentRating,
  getDoctorRatings,
  getPatientRatings,
  getMyDoctorRatings
};