const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { validateHealthMetrics } = require("../middleware/validation");
const {
  createHealthMetrics,
  getPatientHealthMetrics,
  getHealthMetricsById,
  updateHealthMetrics,
  deleteHealthMetrics,
  getHealthMetricsAnalytics,
  getHealthMetricsSummary,
} = require("../controllers/healthMetricsController");

// Create new health metrics entry
router.post("/", auth, validateHealthMetrics, createHealthMetrics);

// Get health metrics for a specific patient
router.get("/patient/:patientId", auth, getPatientHealthMetrics);

// Get health metrics analytics for a patient
router.get("/patient/:patientId/analytics", auth, getHealthMetricsAnalytics);

// Get health metrics summary for a patient
router.get("/patient/:patientId/summary", auth, getHealthMetricsSummary);

// Get specific health metrics entry by ID
router.get("/:id", auth, getHealthMetricsById);

// Update health metrics entry
router.put("/:id", auth, updateHealthMetrics);

// Delete health metrics entry
router.delete("/:id", auth, deleteHealthMetrics);

module.exports = router;