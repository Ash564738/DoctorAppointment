const express = require("express");
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const {
  createMedicalRecord,
  getMedicalRecord,
  getPatientMedicalRecords,
  updateMedicalRecord,
  addVoiceNote,
  addAttachment,
  getPatientSummary,
} = require("../controllers/medicalRecordController");
const router = express.Router();
const medicalRecordValidation = [
  body("appointmentId").isMongoId().withMessage("Valid appointment ID required"),
  body("chiefComplaint")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Chief complaint must be between 10 and 1000 characters"),
  body("assessment")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Assessment must be between 10 and 2000 characters"),
  body("vitalSigns.bloodPressure.systolic")
    .optional()
    .isInt({ min: 50, max: 300 })
    .withMessage("Invalid systolic pressure"),
  body("vitalSigns.bloodPressure.diastolic")
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage("Invalid diastolic pressure"),
  body("vitalSigns.heartRate")
    .optional()
    .isInt({ min: 30, max: 200 })
    .withMessage("Invalid heart rate"),
  body("vitalSigns.temperature.value")
    .optional()
    .isFloat({ min: 30, max: 45 })
    .withMessage("Invalid temperature"),
  body("vitalSigns.weight")
    .optional()
    .isFloat({ min: 1, max: 300 })
    .withMessage("Invalid weight"),
  body("vitalSigns.height")
    .optional()
    .isFloat({ min: 30, max: 250 })
    .withMessage("Invalid height"),
];

router.post("/create", auth, medicalRecordValidation, createMedicalRecord);
router.get("/patient", auth, getPatientMedicalRecords);
router.get("/patient/:patientId", auth, getPatientMedicalRecords);
router.get("/:recordId", auth, getMedicalRecord);
router.put("/:recordId", auth, updateMedicalRecord);
router.post("/:recordId/attachment",auth,
  [
    body("filename").trim().notEmpty().withMessage("Filename required"),
    body("url").isURL().withMessage("Valid URL required"),
    body("type")
      .isIn(["image", "document", "lab_result", "imaging"])
      .withMessage("Invalid attachment type"),
  ],
  addAttachment
);
router.get("/patient/:patientId/summary", auth, getPatientSummary);

module.exports = router;
