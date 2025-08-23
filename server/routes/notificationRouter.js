const express = require("express");
const auth = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Get all notifications
router.get("/getallnotifs", auth, notificationController.getallnotifs);

// Get all patient notifications
router.get("/patient", auth, notificationController.getallnotifs);

// Clear all notifications
router.delete("/clearallnotifs", auth, notificationController.clearallnotifs);

module.exports = router;
