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

// Dashboard analytics (admin only)
router.get("/dashboard", auth, getDashboardAnalytics);

// User analytics (admin only)
router.get("/users", auth, getUserAnalytics);

// Appointment analytics (admin only)
router.get("/appointments", auth, getAppointmentAnalytics);

// System performance metrics (admin only)
router.get("/system", auth, getSystemPerformance);

// Financial analytics (admin only)
router.get("/financial", auth, getFinancialAnalytics);

// Billing reports (admin only)
router.get("/billing-reports", auth, getBillingReports);

// Export analytics data (admin only)
router.get("/export", auth, exportAnalyticsData);

module.exports = router;