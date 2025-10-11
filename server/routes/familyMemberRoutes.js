const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { validateFamilyMember } = require("../middleware/validation");
const {
  addFamilyMember,
  getFamilyMembers,
  getFamilyMemberById,
  updateFamilyMember,
  deleteFamilyMember,
  searchFamilyMembers,
  addMedicalHistory,
  addAllergy,
  linkFamilyMemberToUser,
  getFamilyMemberStats
} = require("../controllers/familyMemberController");

router.post("/", auth, validateFamilyMember, addFamilyMember);
router.get("/", auth, getFamilyMembers);
router.get("/search", auth, searchFamilyMembers);
router.get("/stats", auth, getFamilyMemberStats);
router.get("/:id", auth, getFamilyMemberById);
router.put("/:id", auth, updateFamilyMember);
router.delete("/:id", auth, deleteFamilyMember);
router.post("/:id/medical-history", auth, addMedicalHistory);
router.post("/:id/allergies", auth, addAllergy);
router.post("/:id/link-user", auth, linkFamilyMemberToUser);

module.exports = router;
