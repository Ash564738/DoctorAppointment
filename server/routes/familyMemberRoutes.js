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

// Add a new family member
router.post("/", auth, validateFamilyMember, addFamilyMember);
// Get all family members for the logged-in user
router.get("/", auth, getFamilyMembers);
// Search family members
router.get("/search", auth, searchFamilyMembers);
// Get family member statistics
router.get("/stats", auth, getFamilyMemberStats);
// Get specific family member by ID
router.get("/:id", auth, getFamilyMemberById);
// Update family member
router.put("/:id", auth, updateFamilyMember);
// Delete family member
router.delete("/:id", auth, deleteFamilyMember);
// Add medical history to family member
router.post("/:id/medical-history", auth, addMedicalHistory);
// Add allergy to family member
router.post("/:id/allergies", auth, addAllergy);
// Link family member to existing user account
router.post("/:id/link-user", auth, linkFamilyMemberToUser);

module.exports = router;
