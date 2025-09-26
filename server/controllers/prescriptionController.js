const Prescription = require("../models/prescriptionModel");
const User = require("../models/userModel");
const Appointment = require("../models/appointmentModel");
const logger = require("../utils/logger");
const mongoose = require("mongoose");
const Notification = require("../models/notificationModel");

let RefillRequest;
try {
  RefillRequest = mongoose.model("RefillRequest");
} catch (e) {
  const refillRequestSchema = new mongoose.Schema({
    prescriptionId: { type: mongoose.SchemaTypes.ObjectId, ref: "Prescription", required: true },
    medicationName: { type: String, required: true },
    patientId: { type: mongoose.SchemaTypes.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    urgency: { type: String, enum: ["normal", "urgent", "emergency"], default: "normal" },
    status: { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    doctorResponse: { type: String },
  }, { timestamps: true });
  RefillRequest = mongoose.model("RefillRequest", refillRequestSchema);
}

const createPrescription = async (req, res) => {
  try {
    // Only use fields present in the Prescription model
    const allowedFields = [
      'patientId',
      'appointmentId',
      'medications',
      'diagnosis',
      'instructions',
      'followUpDate',
      'notes'
    ];
    const data = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        data[key] = req.body[key];
      }
    }
    if (data.symptoms) delete data.symptoms;
    if (req.user.role !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create prescriptions"
      });
    }
    const patient = await User.findById(data.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }
    if (data.appointmentId) {
      const appointment = await Appointment.findById(data.appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found"
        });
      }
      if (appointment.doctorId.toString() !== req.user._id.toString() ||
          appointment.userId.toString() !== data.patientId) {
        return res.status(403).json({
          success: false,
          message: "Appointment does not match doctor and patient"
        });
      }
    }
    data.doctorId = req.user._id;
    const prescription = new Prescription(data);
    await prescription.save();
    await prescription.populate([
      { path: 'patientId', select: 'firstname lastname email phone' },
      { path: 'doctorId', select: 'firstname lastname specialization' }
    ]);
    if (data.appointmentId) {
      const MedicalRecord = require('../models/medicalRecordModel');
      const medicalRecord = await MedicalRecord.findOne({ appointmentId: data.appointmentId });
      if (medicalRecord) {
        if (!Array.isArray(medicalRecord.prescriptionIds)) medicalRecord.prescriptionIds = [];
        if (!medicalRecord.prescriptionIds.includes(prescription._id)) {
          medicalRecord.prescriptionIds.push(prescription._id);
          await medicalRecord.save();
        }
      }
    }
    logger.info(`Prescription created: ${prescription._id} by Dr. ${req.user.firstname} ${req.user.lastname}`);
    await Notification.create({
      userId: data.patientId,
      content: `A new prescription has been created for you by Dr. ${req.user.firstname} ${req.user.lastname}.`
    });
    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription
    });
  } catch (error) {
    logger.error("Error creating prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create prescription",
      error: error.message
    });
  }
};

// Get all prescriptions for a patient
const getPatientPrescriptions = async (req, res) => {
  try {
    // Get patientId from params or use current user's id
    const patientId = req.params.patientId || req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if user can access these prescriptions
    if (req.userId !== patientId && !req.user?.isDoctor && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Build query
    const query = { patientId };
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await Prescription.countDocuments(query);

    // Get prescriptions with pagination
    const prescriptions = await Prescription.find(query)
      .populate('doctorId', 'firstname lastname specialization')
      .populate('appointmentId', 'appointmentDate appointmentTime')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: prescriptions.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching patient prescriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
      error: error.message
    });
  }
};

// Get all prescriptions by a doctor
const getDoctorPrescriptions = async (req, res) => {
  try {
    // Get doctorId from params or use current user's id
    const doctorId = req.params.doctorId || req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    // Check if user can access these prescriptions
    if (req.userId !== doctorId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Build query
    const query = { doctorId };
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await Prescription.countDocuments(query);

    // Get prescriptions with pagination
    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'firstname lastname email phone')
      .populate('appointmentId', 'appointmentDate appointmentTime')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: prescriptions.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching doctor prescriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
      error: error.message
    });
  }
};

// Get prescription by ID
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id)
      .populate('patientId', 'firstname lastname email phone dateOfBirth')
      .populate('doctorId', 'firstname lastname specialization')
      .populate('appointmentId', 'appointmentDate appointmentTime');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }

    // Check access permissions
    const canAccess = 
      req.user._id.toString() === prescription.patientId._id.toString() ||
      req.user._id.toString() === prescription.doctorId._id.toString() ||
      req.user.isAdmin;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: prescription
    });

  } catch (error) {
    logger.error("Error fetching prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescription",
      error: error.message
    });
  }
};

// Update prescription status
const updatePrescriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Only update fields that exist in the Prescription model
    const allowedFields = [
      'status',
      'acknowledgedAt',
      'notes'
    ];
    const updateData = req.body;
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }
    // Check permissions
    const canUpdate = 
      req.user._id.toString() === prescription.patientId.toString() ||
      req.user._id.toString() === prescription.doctorId.toString() ||
      req.user.isAdmin;
    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    // Only update allowed fields
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        prescription[key] = updateData[key];
      }
    }
    await prescription.save();
    logger.info(`Prescription ${id} status updated by ${req.user.firstname} ${req.user.lastname}`);
    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: prescription
    });
  } catch (error) {
    logger.error("Error updating prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update prescription",
      error: error.message
    });
  }
};

// Update prescription (doctor only)
const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    // Only update fields that exist in the Prescription model
    const allowedFields = [
      'medications',
      'diagnosis',
      'instructions',
      'followUpDate',
      'notes'
    ];
    const updateData = req.body;
    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }
    // Only the prescribing doctor can update
    if (req.user._id.toString() !== prescription.doctorId.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the prescribing doctor can update this prescription"
      });
    }
    // Don't allow updating if prescription is acknowledged
    if (prescription.status === 'acknowledged') {
      return res.status(400).json({
        success: false,
        message: "Cannot update acknowledged prescription"
      });
    }
    // Only update allowed fields
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        prescription[key] = updateData[key];
      }
    }
    // Remove symptoms if present in updateData (backward compatibility)
    if (prescription.symptoms) delete prescription.symptoms;
    await prescription.save();
    logger.info(`Prescription ${id} updated by Dr. ${req.user.firstname} ${req.user.lastname}`);
    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: prescription
    });
  } catch (error) {
    logger.error("Error updating prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update prescription",
      error: error.message
    });
  }
};

// Delete prescription (soft delete)
const deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found"
      });
    }

    // Only the prescribing doctor or admin can delete
    if (req.user._id.toString() !== prescription.doctorId.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the prescribing doctor can delete this prescription"
      });
    }

    // Soft delete by updating status
    prescription.status = 'cancelled';
    await prescription.save();

    logger.info(`Prescription ${id} deleted by ${req.user.firstname} ${req.user.lastname}`);

    res.status(200).json({
      success: true,
      message: "Prescription deleted successfully"
    });

  } catch (error) {
    logger.error("Error deleting prescription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete prescription",
      error: error.message
    });
  }
};

// Get prescription statistics
const getPrescriptionStats = async (req, res) => {
  try {
    // Only doctors and admins can view stats
    if (!req.user.isDoctor && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const stats = await Prescription.aggregate([
      ...(req.user.isDoctor && !req.user.isAdmin ? [{ $match: { doctorId: req.user._id } }] : []),
      {
        $group: {
          _id: null,
          totalPrescriptions: { $sum: 1 },
          sentPrescriptions: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
          acknowledgedPrescriptions: { $sum: { $cond: [{ $eq: ["$status", "acknowledged"] }, 1, 0] } },
          expiredPrescriptions: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
          draftPrescriptions: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } }
        }
      }
    ]);

    const monthlyStats = await Prescription.aggregate([
      ...(req.user.isDoctor && !req.user.isAdmin ? [{ $match: { doctorId: req.user._id } }] : []),
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalPrescriptions: 0,
          sentPrescriptions: 0,
          acknowledgedPrescriptions: 0,
          expiredPrescriptions: 0,
          draftPrescriptions: 0
        },
        monthlyStats
      }
    });

  } catch (error) {
    logger.error("Error fetching prescription stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescription statistics",
      error: error.message
    });
  }
};

// Get common medications (moved from route)
const getCommonMedications = (req, res) => {
  const commonMedications = [
    { id: 1, name: "Paracetamol", dosage: "500mg", frequency: "3 times daily" },
    { id: 2, name: "Ibuprofen", dosage: "400mg", frequency: "2 times daily" },
    { id: 3, name: "Amoxicillin", dosage: "250mg", frequency: "3 times daily" },
    { id: 4, name: "Omeprazole", dosage: "20mg", frequency: "Once daily" },
    { id: 5, name: "Metformin", dosage: "500mg", frequency: "2 times daily" },
  ];
  res.json({ success: true, medications: commonMedications });
};

// --- Refill request controllers ---
const getRefillRequests = async (req, res) => {
  try {
    const patientId = req.userId;
    if (!patientId) {
      return res.status(400).json({ success: false, message: "Missing patientId" });
    }
    // Defensive: ensure model is correct
    if (!RefillRequest || typeof RefillRequest.find !== "function") {
      logger.error("RefillRequest model is not defined or invalid");
      return res.status(500).json({ success: false, message: "Server error: RefillRequest model missing" });
    }
    const requests = await RefillRequest.find({ patientId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, refillRequests: requests || [] });
  } catch (error) {
    logger.error("Error in getRefillRequests:", error);
    res.status(500).json({ success: false, message: "Failed to fetch refill requests" });
  }
};

const createRefillRequest = async (req, res) => {
  try {
    // Only use fields present in the RefillRequest model
    const allowedFields = [
      'prescriptionId',
      'medicationName',
      'patientId',
      'reason',
      'urgency'
    ];
    const data = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        data[key] = req.body[key];
      }
    }
    if (!data.prescriptionId || !data.medicationName || !data.reason || !data.urgency || !data.patientId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    // Optionally, check if prescription exists and belongs to patient
    const prescription = await Prescription.findById(data.prescriptionId);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }
    if (prescription.patientId.toString() !== data.patientId) {
      return res.status(403).json({ success: false, message: "Prescription does not belong to patient" });
    }
    const refillRequest = new RefillRequest({
      prescriptionId: data.prescriptionId,
      medicationName: data.medicationName,
      patientId: data.patientId,
      reason: data.reason,
      urgency: data.urgency,
      status: "pending"
    });
    await refillRequest.save();

    // --- Notify doctor about refill request ---
    if (prescription && prescription.doctorId) {
      await Notification.create({
        userId: prescription.doctorId,
        content: `A refill request for "${data.medicationName}" has been submitted by the patient.`
      });
    }

    res.status(201).json({ success: true, message: "Refill request submitted", refillRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit refill request" });
  }
};

module.exports = {
  createPrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
  updatePrescriptionStatus,
  updatePrescription,
  deletePrescription,
  getPrescriptionStats,
  getCommonMedications,
  getRefillRequests,
  createRefillRequest,
};
