const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const {
  getDashboardAnalytics,
  getUserAnalytics,
  getAppointmentAnalytics,
  getSystemPerformance,
  getFinancialAnalytics,
  getBillingReports,
  exportAnalyticsData,
} = require("../controllers/adminAnalyticsController");

router.get("/dashboard", auth, getDashboardAnalytics);
router.get("/users", auth, getUserAnalytics);
router.get("/appointments", auth, getAppointmentAnalytics);
router.get("/system", auth, getSystemPerformance);
router.get("/financial", auth, getFinancialAnalytics);
router.get("/billing-reports", auth, getBillingReports);
router.get("/export", auth, exportAnalyticsData);

module.exports = router;