const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const calendarSyncController = require("../controllers/calendarSyncController");

// Add or update calendar sync settings
router.post("/upsert", auth, calendarSyncController.upsertCalendarSync);

// Get calendar sync settings
router.get("/my", auth, calendarSyncController.getCalendarSync);

// Remove calendar sync
router.delete("/delete", auth, calendarSyncController.deleteCalendarSync);

// Sync appointments to Google Calendar (demo)
router.post("/sync-google", auth, calendarSyncController.syncAppointmentsToGoogle);

// Sync appointments to Calendar (newly added)
// Commented out because syncCalendar is undefined or not implemented
// router.post("/sync", calendarSyncController.syncCalendar);

module.exports = router;