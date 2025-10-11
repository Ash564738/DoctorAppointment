const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const { getFamilyMembers } = require("../controllers/familyMemberController");

router.get("/family-members", auth, (req, res) => {
  req.params.patientId = req.userId;
  getFamilyMembers(req, res);
});
router.get("/health-metrics", auth, (req, res) => {
  req.params.patientId = req.userId;
  getPatientHealthMetrics(req, res);
});

module.exports = router;
