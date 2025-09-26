const MedicalRecord = require("../models/medicalRecordModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const { validationResult } = require('express-validator');

const createMedicalRecord = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const allowedFields = [
      'patientId',
      'appointmentId',
      'chiefComplaint',
      'symptoms',
      'historyOfPresentIllness',
      'pastMedicalHistory',
      'familyHistory',
      'socialHistory',
      'allergies',
      'healthMetricsIds',
      'prescriptionIds',
      'physicalExamination',
      'assessment',
      'diagnosis',
      'treatment',
      'followUp',
      'attachments'
    ];
    const data = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        data[key] = req.body[key];
      }
    }
    const appointment = await Appointment.findById(data.appointmentId)
      .populate('userId')
      .populate('doctorId');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    if (appointment.doctorId._id.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned doctor can create medical records"
      });
    }
    const existingRecord = await MedicalRecord.findOne({ appointmentId: data.appointmentId });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: "Medical record already exists for this appointment"
      });
    }
    data.patientId = data.patientId || appointment.userId._id;
    data.doctorId = req.userId;
    data.visitDate = appointment.date;
    const medicalRecord = new MedicalRecord(data);
    await medicalRecord.save();
    appointment.medicalRecordId = medicalRecord._id;
    await appointment.save();
    await Notification.create({
      userId: medicalRecord.patientId,
      content: `A new medical record has been added for your appointment on ${appointment.date}.`
    });
    const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
      .populate('patientId', 'firstname lastname email dateOfBirth gender')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId')
      .populate({
        path: 'prescriptionIds',
        populate: [
          { path: 'doctorId', select: 'firstname lastname specialization' },
          { path: 'patientId', select: 'firstname lastname email' }
        ]
      })
      .populate({
        path: 'healthMetricsIds',
        populate: [
          { path: 'userId', select: 'firstname lastname email' }
        ]
      });
    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      medicalRecord: populatedRecord
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to create medical record'
    });
  }
};

const getMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const medicalRecord = await MedicalRecord.findById(recordId)
      .populate('patientId', 'firstname lastname email dateOfBirth gender bloodGroup')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId')
      .populate({
        path: 'prescriptionIds',
        populate: [
          { path: 'doctorId', select: 'firstname lastname specialization' },
          { path: 'patientId', select: 'firstname lastname email' }
        ]
      })
      .populate({
        path: 'healthMetricsIds',
        populate: [
          { path: 'userId', select: 'firstname lastname email' }
        ]
      });
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    const isPatient = medicalRecord.patientId._id.toString() === req.userId;
    const isDoctor = medicalRecord.doctorId._id.toString() === req.userId;
    const isAdmin = req.userRole === 'Admin';
    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this medical record'
      });
    }
    res.json({
      success: true,
      medicalRecord
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch medical record'
    });
  }
};

const getPatientMedicalRecords = async (req, res) => {
  try {
    const patientId = req.params.patientId || req.userId;
    const { page = 1, limit = 10, doctorId, startDate, endDate } = req.query;
    const isOwnRecords = patientId === req.userId;
    const isAdmin = req.userRole === 'Admin';
    let isDoctorOfPatient = false;
    if (req.userRole === 'Doctor') {
      const assignedAppointments = await Appointment.find({ userId: patientId, doctorId: req.userId });
      if (assignedAppointments && assignedAppointments.length > 0) isDoctorOfPatient = true;
    }
    if (!isOwnRecords && !isAdmin && !isDoctorOfPatient) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    let query = { patientId };
    if (doctorId) {
      query.doctorId = doctorId;
    }
    if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) query.visitDate.$gte = new Date(startDate);
      if (endDate) query.visitDate.$lte = new Date(endDate);
    }
    const limitNum = parseInt(limit);
    const skipNum = (parseInt(page) - 1) * limitNum;
    const total = await MedicalRecord.countDocuments(query);
    const medicalRecords = await MedicalRecord.find(query)
      .sort({ visitDate: -1 })
      .skip(skipNum)
      .limit(limitNum)
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId', 'date time status')
      .populate({
        path: 'prescriptionIds',
        populate: [
          { path: 'doctorId', select: 'firstname lastname specialization' },
          { path: 'patientId', select: 'firstname lastname email' }
        ]
      })
      .populate({
        path: 'healthMetricsIds',
        populate: [
          { path: 'userId', select: 'firstname lastname email' }
        ]
      });
    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      medicalRecords,
      pagination: {
        page: parseInt(page),
        pages,
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get patient medical records error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch medical records'
    });
  }
};

const updateMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const allowedFields = [
      'chiefComplaint',
      'symptoms',
      'historyOfPresentIllness',
      'pastMedicalHistory',
      'familyHistory',
      'socialHistory',
      'allergies',
      'healthMetricsIds',
      'prescriptionIds',
      'physicalExamination',
      'assessment',
      'diagnosis',
      'treatment',
      'followUp',
      'attachments'
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }
    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      recordId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('patientId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId')
      .populate({
        path: 'prescriptionIds',
        populate: [
          { path: 'doctorId', select: 'firstname lastname specialization' },
          { path: 'patientId', select: 'firstname lastname email' }
        ]
      })
      .populate({
        path: 'healthMetricsIds',
        populate: [
          { path: 'userId', select: 'firstname lastname email' }
        ]
      });
    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    res.json({
      success: true,
      message: 'Medical record updated successfully',
      medicalRecord: updatedRecord
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to update medical record'
    });
  }
};
const addAttachment = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { filename, url, type } = req.body;
    const medicalRecord = await MedicalRecord.findById(recordId);
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    const isDoctor = medicalRecord.doctorId.toString() === req.userId;
    const isPatient = medicalRecord.patientId.toString() === req.userId;
    if (!isDoctor && !isPatient && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to add attachments to this record'
      });
    }
    const attachment = {
      filename,
      url,
      type,
      uploadDate: new Date()
    };
    if (!Array.isArray(medicalRecord.attachments)) medicalRecord.attachments = [];
    medicalRecord.attachments.push(attachment);
    await medicalRecord.save();
    res.json({
      success: true,
      message: 'Attachment added successfully',
      attachment
    });
  } catch (error) {
    console.error('Add attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add attachment'
    });
  }
};

const getPatientSummary = async (req, res) => {
  try {
    const { recordId } = req.params;
    const medicalRecord = await MedicalRecord.findById(recordId)
      .populate('patientId', 'firstname lastname email dateOfBirth gender bloodGroup')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId')
      .populate({
        path: 'prescriptionIds',
        populate: [
          { path: 'doctorId', select: 'firstname lastname specialization' },
          { path: 'patientId', select: 'firstname lastname email' }
        ]
      })
      .populate({
        path: 'healthMetricsIds',
        populate: [
          { path: 'userId', select: 'firstname lastname email' }
        ]
      });
    if (!medicalRecord) {
      return res.status(404).json({ success: false, message: 'Medical record not found' });
    }
    const isPatient = medicalRecord.patientId._id.toString() === req.userId;
    const isDoctor = medicalRecord.doctorId._id.toString() === req.userId;
    const isAdmin = req.userRole === 'Admin';
    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    res.json({
      success: true,
      medicalRecord
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch medical record'
    });
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecord,
  getPatientMedicalRecords,
  updateMedicalRecord,
  addAttachment,
  getPatientSummary
};