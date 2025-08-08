const VideoConsultation = require("../models/videoConsultationModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Create video consultation session
const createVideoConsultation = async (req, res) => {
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
      appointmentId,
      duration = 30,
      platform = 'webrtc',
      recordingEnabled = false
    } = req.body;

    // Verify appointment exists and user has access
    const appointment = await Appointment.findById(appointmentId)
      .populate('userId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user is either the patient or doctor
    const userId = req.userId;
    if (appointment.userId._id.toString() !== userId && appointment.doctorId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this appointment'
      });
    }

    // Check if video consultation already exists
    const existingConsultation = await VideoConsultation.findOne({ appointmentId });
    if (existingConsultation) {
      return res.status(400).json({
        success: false,
        message: 'Video consultation already exists for this appointment'
      });
    }

    // Generate unique meeting ID and URL
    const meetingId = crypto.randomBytes(16).toString('hex');
    const meetingPassword = crypto.randomBytes(4).toString('hex');
    const meetingUrl = `${process.env.FRONTEND_URL}/video-consultation/${meetingId}`;

    // Create consultation fee based on doctor's rate or default
    const consultationFee = 50; // Default fee, should be dynamic based on doctor

    const videoConsultation = new VideoConsultation({
      appointmentId,
      patientId: appointment.userId._id,
      doctorId: appointment.doctorId._id,
      scheduledTime: appointment.appointmentDateTime || new Date(appointment.date),
      duration,
      platform,
      meetingId,
      meetingPassword,
      meetingUrl,
      recordingEnabled,
      billing: {
        consultationFee,
        totalAmount: consultationFee
      }
    });

    await videoConsultation.save();

    // Update appointment to include video consultation
    appointment.appointmentType = 'telemedicine';
    await appointment.save();

    // Create notifications for both patient and doctor
    const patientNotification = new Notification({
      userId: appointment.userId._id,
      content: `Video consultation scheduled with Dr. ${appointment.doctorId.firstname} ${appointment.doctorId.lastname}. Meeting ID: ${meetingId}`
    });

    const doctorNotification = new Notification({
      userId: appointment.doctorId._id,
      content: `Video consultation scheduled with ${appointment.userId.firstname} ${appointment.userId.lastname}. Meeting ID: ${meetingId}`
    });

    await Promise.all([patientNotification.save(), doctorNotification.save()]);

    res.status(201).json({
      success: true,
      message: 'Video consultation created successfully',
      consultation: {
        id: videoConsultation._id,
        meetingId,
        meetingUrl,
        scheduledTime: videoConsultation.scheduledTime,
        duration,
        platform
      }
    });

  } catch (error) {
    console.error('Create video consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to create video consultation'
    });
  }
};

// Join video consultation
const joinVideoConsultation = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.userId;

    const consultation = await VideoConsultation.findOne({ meetingId })
      .populate('patientId', 'firstname lastname')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId');

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Video consultation not found'
      });
    }

    // Check if user is authorized to join
    if (consultation.patientId._id.toString() !== userId && consultation.doctorId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation'
      });
    }

    // Check if consultation is scheduled for today
    const now = new Date();
    const scheduledDate = new Date(consultation.scheduledTime);
    const timeDiff = Math.abs(now - scheduledDate);
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 2) { // Allow joining 2 hours before/after scheduled time
      return res.status(400).json({
        success: false,
        message: 'Consultation is not available at this time'
      });
    }

    // Update join time
    const isPatient = consultation.patientId._id.toString() === userId;
    const updateField = isPatient ? 'patientJoinedAt' : 'doctorJoinedAt';
    
    if (!consultation[updateField]) {
      consultation[updateField] = new Date();
      
      // Start consultation if both have joined
      if (consultation.patientJoinedAt && consultation.doctorJoinedAt && !consultation.actualStartTime) {
        consultation.actualStartTime = new Date();
        consultation.status = 'in-progress';
      }
      
      await consultation.save();
    }

    res.json({
      success: true,
      consultation: {
        id: consultation._id,
        meetingId: consultation.meetingId,
        meetingUrl: consultation.meetingUrl,
        status: consultation.status,
        participants: {
          patient: consultation.patientId,
          doctor: consultation.doctorId
        },
        recordingEnabled: consultation.recordingEnabled
      }
    });

  } catch (error) {
    console.error('Join video consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to join video consultation'
    });
  }
};

// End video consultation
const endVideoConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.userId;

    const consultation = await VideoConsultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Video consultation not found'
      });
    }

    // Check if user is authorized
    if (consultation.patientId.toString() !== userId && consultation.doctorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation'
      });
    }

    const now = new Date();
    const isPatient = consultation.patientId.toString() === userId;

    // Update leave time
    if (isPatient && !consultation.patientLeftAt) {
      consultation.patientLeftAt = now;
    } else if (!isPatient && !consultation.doctorLeftAt) {
      consultation.doctorLeftAt = now;
    }

    // End consultation if doctor leaves or both have left
    if (!isPatient || (consultation.patientLeftAt && consultation.doctorLeftAt)) {
      consultation.actualEndTime = now;
      consultation.status = 'completed';
      consultation.calculateActualDuration();
    }

    await consultation.save();

    res.json({
      success: true,
      message: 'Successfully left video consultation',
      consultation: {
        id: consultation._id,
        status: consultation.status,
        actualDuration: consultation.actualDuration
      }
    });

  } catch (error) {
    console.error('End video consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to end video consultation'
    });
  }
};

// Add consultation notes
const addConsultationNotes = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.userId;
    const {
      symptoms,
      diagnosis,
      treatment,
      prescriptions,
      followUpRequired,
      followUpDate,
      referrals
    } = req.body;

    const consultation = await VideoConsultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Video consultation not found'
      });
    }

    // Only doctor can add consultation notes
    if (consultation.doctorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the doctor can add consultation notes'
      });
    }

    consultation.consultation = {
      symptoms,
      diagnosis,
      treatment,
      prescriptions,
      followUpRequired,
      followUpDate,
      referrals
    };

    await consultation.save();

    res.json({
      success: true,
      message: 'Consultation notes added successfully',
      consultation: consultation.consultation
    });

  } catch (error) {
    console.error('Add consultation notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add consultation notes'
    });
  }
};

// Submit feedback
const submitFeedback = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.userId;
    const {
      rating,
      feedback,
      technicalRating,
      overallSatisfaction
    } = req.body;

    const consultation = await VideoConsultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Video consultation not found'
      });
    }

    // Check if user is authorized
    if (consultation.patientId.toString() !== userId && consultation.doctorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation'
      });
    }

    const isPatient = consultation.patientId.toString() === userId;

    if (!consultation.feedback) {
      consultation.feedback = {};
    }

    if (isPatient) {
      consultation.feedback.patientRating = rating;
      consultation.feedback.patientFeedback = feedback;
    } else {
      consultation.feedback.doctorRating = rating;
      consultation.feedback.doctorFeedback = feedback;
    }

    consultation.feedback.technicalRating = technicalRating;
    consultation.feedback.overallSatisfaction = overallSatisfaction;

    await consultation.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to submit feedback'
    });
  }
};

// Get user's video consultations
const getUserConsultations = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = {
      $or: [
        { patientId: userId },
        { doctorId: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const consultations = await VideoConsultation.find(query)
      .populate('patientId', 'firstname lastname')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId', 'date time symptoms')
      .sort({ scheduledTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await VideoConsultation.countDocuments(query);

    res.json({
      success: true,
      consultations: consultations.map(c => c.consultationSummary),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user consultations error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch consultations'
    });
  }
};

// Get consultation details
const getConsultationDetails = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.userId;

    const consultation = await VideoConsultation.findById(consultationId)
      .populate('patientId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname email')
      .populate('appointmentId');

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Video consultation not found'
      });
    }

    // Check if user is authorized
    if (consultation.patientId._id.toString() !== userId && consultation.doctorId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation'
      });
    }

    res.json({
      success: true,
      consultation
    });

  } catch (error) {
    console.error('Get consultation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch consultation details'
    });
  }
};

// Report technical issue
const reportTechnicalIssue = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.userId;
    const { issue, severity = 'medium' } = req.body;

    const consultation = await VideoConsultation.findById(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Video consultation not found'
      });
    }

    // Check if user is authorized
    if (consultation.patientId.toString() !== userId && consultation.doctorId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this consultation'
      });
    }

    if (!consultation.technicalIssues) {
      consultation.technicalIssues = [];
    }

    consultation.technicalIssues.push({
      timestamp: new Date(),
      issue,
      severity
    });

    await consultation.save();

    res.json({
      success: true,
      message: 'Technical issue reported successfully'
    });

  } catch (error) {
    console.error('Report technical issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to report technical issue'
    });
  }
};

module.exports = {
  createVideoConsultation,
  joinVideoConsultation,
  endVideoConsultation,
  addConsultationNotes,
  submitFeedback,
  getUserConsultations,
  getConsultationDetails,
  reportTechnicalIssue
};
