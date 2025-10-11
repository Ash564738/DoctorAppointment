const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const auth = require("../middleware/auth");

router.get("/getalldoctors", doctorController.getalldoctors);
router.get("/colleagues", auth, doctorController.getalldoctors);
router.get("/available", auth, doctorController.getalldoctors);
router.get("/getnotdoctors", auth, doctorController.getnotdoctors);
router.post("/applyfordoctor", auth, doctorController.applyfordoctor);
router.put("/deletedoctor", auth, doctorController.deletedoctor);
router.put("/acceptdoctor", auth, doctorController.acceptdoctor);
router.put("/rejectdoctor", auth, doctorController.rejectdoctor);
router.put("/admin-update/:id", auth, doctorController.adminUpdateDoctor);
router.get("/my-patients", auth, doctorController.getMyPatients);
router.get("/analytics", auth, doctorController.getDoctorAnalytics);
router.get("/recent-activity", auth, doctorController.getRecentActivity);
router.get("/:doctorId/availability", doctorController.getDoctorAvailability);
router.get("/:doctorId/status", doctorController.getDoctorCurrentStatus);

module.exports = router;
