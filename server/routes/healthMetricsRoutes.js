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

router.post("/create", auth, validateHealthMetrics, createHealthMetrics);
router.get("/patient/:patientId", auth, getPatientHealthMetrics);
router.get("/patient/:patientId/analytics", auth, getHealthMetricsAnalytics);router.get("/patient/:patientId/summary", auth, getHealthMetricsSummary);
router.get("/:id", auth, getHealthMetricsById);
router.put("/:id", auth, updateHealthMetrics);
router.delete("/:id", auth, deleteHealthMetrics);

module.exports = router;