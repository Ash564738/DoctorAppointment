const MedicalRecord = require("../models/medicalRecordModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const { validationResult } = require('express-validator');

// Create a new medical record
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

    const {
      patientId,
      appointmentId,
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      familyHistory,
      socialHistory,
      allergies,
      currentMedications,
      vitalSigns,
      physicalExamination,
      assessment,
      diagnosis,
      treatment,
      prescriptions,
      labOrders,
      imagingOrders,
      followUp,
      referrals,
      isConfidential
    } = req.body;

    // Verify the appointment exists and belongs to this doctor
    const appointment = await Appointment.findById(appointmentId)
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

    // Check if medical record already exists for this appointment
    const existingRecord = await MedicalRecord.findOne({ appointmentId });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: "Medical record already exists for this appointment"
      });
    }

    // Calculate BMI if height and weight are provided
    if (vitalSigns && vitalSigns.height && vitalSigns.weight) {
      const heightInMeters = vitalSigns.height / 100;
      vitalSigns.bmi = parseFloat((vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1));
    }

    const medicalRecord = new MedicalRecord({
      patientId: patientId || appointment.userId._id,
      doctorId: req.userId,
      appointmentId,
      visitDate: appointment.date,
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      familyHistory,
      socialHistory,
      allergies,
      currentMedications,
      vitalSigns,
      physicalExamination,
      assessment,
      diagnosis,
      treatment,
      prescriptions,
      labOrders,
      imagingOrders,
      followUp,
      referrals,
      isConfidential: isConfidential || false
    });

    await medicalRecord.save();

    // Update the appointment with the medical record reference
    appointment.medicalRecordId = medicalRecord._id;
    await appointment.save();

    const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
      .populate('patientId', 'firstname lastname email dateOfBirth gender')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId');

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

// Get medical record by ID
const getMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;

    const medicalRecord = await MedicalRecord.findById(recordId)
      .populate('patientId', 'firstname lastname email dateOfBirth gender bloodGroup')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId');

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check authorization
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

// Get medical records for a patient
const getPatientMedicalRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10, doctorId, startDate, endDate } = req.query;

    // Check authorization
    const isOwnRecords = patientId === req.userId;
    const isAdmin = req.userRole === 'Admin';
    
    if (!isOwnRecords && !isAdmin) {
      // Check if requesting user is a doctor who has treated this patient
      const hasAppointment = await Appointment.findOne({
        userId: patientId,
        doctorId: req.userId
      });

      if (!hasAppointment) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view these medical records'
        });
      }
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

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { visitDate: -1 },
      populate: [
        { path: 'doctorId', select: 'firstname lastname' },
        { path: 'appointmentId', select: 'date time status' }
      ]
    };

    const medicalRecords = await MedicalRecord.paginate(query, options);

    res.json({
      success: true,
      medicalRecords: medicalRecords.docs,
      pagination: {
        page: medicalRecords.page,
        pages: medicalRecords.pages,
        total: medicalRecords.total,
        limit: medicalRecords.limit
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

// Update medical record
const updateMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const updates = req.body;

    const medicalRecord = await MedicalRecord.findById(recordId);

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Only the doctor who created the record can update it
    if (medicalRecord.doctorId.toString() !== req.userId && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this medical record'
      });
    }

    // Calculate BMI if height and weight are provided
    if (updates.vitalSigns && updates.vitalSigns.height && updates.vitalSigns.weight) {
      const heightInMeters = updates.vitalSigns.height / 100;
      updates.vitalSigns.bmi = parseFloat((updates.vitalSigns.weight / (heightInMeters * heightInMeters)).toFixed(1));
    }

    Object.assign(medicalRecord, updates);
    await medicalRecord.save();

    const updatedRecord = await MedicalRecord.findById(recordId)
      .populate('patientId', 'firstname lastname email')
      .populate('doctorId', 'firstname lastname')
      .populate('appointmentId');

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

// Add voice note to medical record
const addVoiceNote = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { filename, url, duration, transcription } = req.body;

    const medicalRecord = await MedicalRecord.findById(recordId);

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    if (medicalRecord.doctorId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to add voice notes to this record'
      });
    }

    const voiceNote = {
      filename,
      url,
      duration,
      transcription,
      recordedAt: new Date()
    };

    medicalRecord.voiceNotes.push(voiceNote);
    await medicalRecord.save();

    res.json({
      success: true,
      message: 'Voice note added successfully',
      voiceNote
    });
  } catch (error) {
    console.error('Add voice note error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add voice note'
    });
  }
};

// Add attachment to medical record
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

    // Check authorization
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

// Get patient summary for doctor
const getPatientSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify doctor has treated this patient
    const hasAppointment = await Appointment.findOne({
      userId: patientId,
      doctorId: req.userId
    });

    if (!hasAppointment && req.userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view patient summary'
      });
    }

    const patient = await User.findById(patientId)
      .select('firstname lastname email dateOfBirth gender bloodGroup mobile familyDiseases');

    const recentRecords = await MedicalRecord.find({ patientId })
      .sort({ visitDate: -1 })
      .limit(5)
      .populate('doctorId', 'firstname lastname')
      .select('visitDate chiefComplaint diagnosis prescriptions assessment');

    const allergies = await MedicalRecord.aggregate([
      { $match: { patientId: mongoose.Types.ObjectId(patientId) } },
      { $unwind: '$allergies' },
      { $group: { 
        _id: '$allergies.allergen', 
        reaction: { $first: '$allergies.reaction' },
        severity: { $first: '$allergies.severity' }
      }},
      { $sort: { severity: -1 } }
    ]);

    const currentMedications = await MedicalRecord.aggregate([
      { $match: { patientId: mongoose.Types.ObjectId(patientId) } },
      { $unwind: '$currentMedications' },
      { $sort: { visitDate: -1 } },
      { $group: {
        _id: '$currentMedications.name',
        dosage: { $first: '$currentMedications.dosage' },
        frequency: { $first: '$currentMedications.frequency' },
        startDate: { $first: '$currentMedications.startDate' }
      }}
    ]);

    res.json({
      success: true,
      patientSummary: {
        patient,
        recentRecords,
        allergies,
        currentMedications,
        totalRecords: await MedicalRecord.countDocuments({ patientId })
      }
    });
  } catch (error) {
    console.error('Get patient summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch patient summary'
    });
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecord,
  getPatientMedicalRecords,
  updateMedicalRecord,
  addVoiceNote,
  addAttachment,
  getPatientSummary
};
