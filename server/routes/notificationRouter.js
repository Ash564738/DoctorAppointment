const express = require("express");
const auth = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get("/getallnotifs", auth, notificationController.getallnotifs);
router.get("/patient", auth, notificationController.getallnotifs);
router.delete("/clearallnotifs", auth, notificationController.clearallnotifs);

module.exports = router;
