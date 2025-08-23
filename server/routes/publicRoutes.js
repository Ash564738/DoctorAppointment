const express = require("express");
const router = express.Router();
const { getPublicStats } = require("../controllers/publicStatsController");

// Get public statistics for home page (no authentication required)
router.get("/stats", getPublicStats);

module.exports = router;
