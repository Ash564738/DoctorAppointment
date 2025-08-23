const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { validatePrescription } = require("../middleware/validation");
const {
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
} = require("../controllers/prescriptionController");

router.get("/refill-requests", auth, getRefillRequests);
router.post("/request-refill", auth, createRefillRequest);
router.get("/medication/common", auth, getCommonMedications);
router.get("/stats", auth, getPrescriptionStats);
router.get("/patient/:patientId", auth, getPatientPrescriptions);
router.get("/doctor/:doctorId", auth, getDoctorPrescriptions);
router.get("/doctor", auth, getDoctorPrescriptions);
router.get("/patient", auth, getPatientPrescriptions);
router.get("/:id", auth, getPrescriptionById);
router.patch("/:id/status", auth, updatePrescriptionStatus);
router.put("/:id", auth, updatePrescription);
router.delete("/:id", auth, deletePrescription);

module.exports = router;
