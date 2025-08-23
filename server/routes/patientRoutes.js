const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const { getFamilyMembers } = require("../controllers/familyMemberController");
const { getPatientHealthMetrics } = require("../controllers/healthMetricsController");

// Get current patient's family members
router.get("/family-members", auth, (req, res) => {
  req.params.patientId = req.userId;
  getFamilyMembers(req, res);
});

// Get current patient's health metrics
router.get("/health-metrics", auth, (req, res) => {
  req.params.patientId = req.userId;
  getPatientHealthMetrics(req, res);
});

module.exports = router;
