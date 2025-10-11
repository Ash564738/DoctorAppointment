const FamilyMember = require("../models/familyMemberModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const logger = require("../utils/logger");

// Add a new family member
const addFamilyMember = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      relationship,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      medicalHistory,
      allergies,
      medications,
      emergencyContacts,
      insuranceInfo,
      preferences,
      notes
    } = req.body;

    if (email) {
      const existingUser = await User.findOne({ email });
      const existingFamilyMember = await FamilyMember.findOne({ 
        email, 
        primaryUserId: { $ne: req.user._id } 
      });

      if (existingUser || existingFamilyMember) {
        return res.status(400).json({
          success: false,
          message: "Email already in use"
        });
      }
    }

    const familyMember = new FamilyMember({
      primaryUserId: req.user._id,
      firstname,
      lastname,
      relationship,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      medicalHistory,
      allergies,
      medications,
      emergencyContacts,
      insuranceInfo,
      preferences,
      notes
    });

    await familyMember.save();

    logger.info(`Family member added: ${familyMember._id} by user ${req.user._id}`);

    // --- Notify user about new family member ---
    await Notification.create({
      userId: req.user._id,
      content: `A new family member (${familyMember.firstname} ${familyMember.lastname}) has been added to your account.`
    });

    res.status(201).json({
      success: true,
      message: "Family member added successfully",
      data: familyMember
    });

  } catch (error) {
    logger.error("Error adding family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add family member",
      error: error.message
    });
  }
};

// Get all family members for the logged-in user
const getFamilyMembers = async (req, res) => {
  try {
    const { includeInactive = false, relationship, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { primaryUserId: req.user._id };
    
    if (!includeInactive) {
      query.isActive = true;
    }

    if (relationship) {
      query.relationship = relationship;
    }

    // Get total count
    const total = await FamilyMember.countDocuments(query);

    // Get family members with pagination
    const familyMembers = await FamilyMember.find(query)
      .sort({ relationship: 1, firstname: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      data: {
        familyMembers,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: familyMembers.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching family members:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch family members",
      error: error.message
    });
  }
};

// Get specific family member
const getFamilyMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const familyMember = await FamilyMember.findById(id);

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found"
      });
    }

    // Check if the family member belongs to the logged-in user
    if (familyMember.primaryUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: familyMember
    });

  } catch (error) {
    logger.error("Error fetching family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch family member",
      error: error.message
    });
  }
};

// Update family member
const updateFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const familyMember = await FamilyMember.findById(id);

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found"
      });
    }

    // Check if the family member belongs to the logged-in user
    if (familyMember.primaryUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Check if email is being updated and if it's already in use
    if (updateData.email && updateData.email !== familyMember.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      const existingFamilyMember = await FamilyMember.findOne({ 
        email: updateData.email, 
        _id: { $ne: id },
        primaryUserId: { $ne: req.user._id } 
      });

      if (existingUser || existingFamilyMember) {
        return res.status(400).json({
          success: false,
          message: "Email already in use"
        });
      }
    }

    // Update family member
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'primaryUserId' && key !== 'createdAt' && key !== 'updatedAt') {
        familyMember[key] = updateData[key];
      }
    });

    await familyMember.save();

    logger.info(`Family member updated: ${id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: "Family member updated successfully",
      data: familyMember
    });

  } catch (error) {
    logger.error("Error updating family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update family member",
      error: error.message
    });
  }
};

// Delete family member (soft delete)
const deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const familyMember = await FamilyMember.findById(id);

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found"
      });
    }

    // Check if the family member belongs to the logged-in user
    if (familyMember.primaryUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (permanent === 'true') {
      // Permanent deletion
      await FamilyMember.findByIdAndDelete(id);
      logger.info(`Family member permanently deleted: ${id} by user ${req.user._id}`);
    } else {
      // Soft delete
      familyMember.isActive = false;
      await familyMember.save();
      logger.info(`Family member soft deleted: ${id} by user ${req.user._id}`);
    }

    // --- Notify user about family member deletion ---
    await Notification.create({
      userId: req.user._id,
      content: `A family member (${familyMember.firstname} ${familyMember.lastname}) has been removed from your account.`
    });

    res.status(200).json({
      success: true,
      message: "Family member deleted successfully"
    });

  } catch (error) {
    logger.error("Error deleting family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete family member",
      error: error.message
    });
  }
};

// Search family members
const searchFamilyMembers = async (req, res) => {
  try {
    const { query: searchTerm, page = 1, limit = 10 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: "Search term is required"
      });
    }

    // Get total count
    const total = await FamilyMember.countDocuments({
      primaryUserId: req.user._id,
      isActive: true,
      $or: [
        { firstname: { $regex: searchTerm, $options: 'i' } },
        { lastname: { $regex: searchTerm, $options: 'i' } },
        { relationship: { $regex: searchTerm, $options: 'i' } }
      ]
    });

    // Search family members
    const familyMembers = await FamilyMember.find({
      primaryUserId: req.user._id,
      isActive: true,
      $or: [
        { firstname: { $regex: searchTerm, $options: 'i' } },
        { lastname: { $regex: searchTerm, $options: 'i' } },
        { relationship: { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .sort({ firstname: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.status(200).json({
      success: true,
      data: {
        familyMembers,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: familyMembers.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    logger.error("Error searching family members:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search family members",
      error: error.message
    });
  }
};

// Add medical history to family member
const addMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition, diagnosedDate, status, notes } = req.body;

    const familyMember = await FamilyMember.findById(id);

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found"
      });
    }

    // Check if the family member belongs to the logged-in user
    if (familyMember.primaryUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Add medical history
    familyMember.medicalHistory.push({
      condition,
      diagnosedDate,
      status,
      notes
    });

    await familyMember.save();

    logger.info(`Medical history added to family member: ${id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: "Medical history added successfully",
      data: familyMember
    });

  } catch (error) {
    logger.error("Error adding medical history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add medical history",
      error: error.message
    });
  }
};

// Add allergy to family member
const addAllergy = async (req, res) => {
  try {
    const { id } = req.params;
    const { allergen, severity, reaction, notes } = req.body;

    const familyMember = await FamilyMember.findById(id);

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found"
      });
    }

    // Check if the family member belongs to the logged-in user
    if (familyMember.primaryUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Add allergy
    familyMember.allergies.push({
      allergen,
      severity,
      reaction,
      notes
    });

    await familyMember.save();

    logger.info(`Allergy added to family member: ${id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: "Allergy added successfully",
      data: familyMember
    });

  } catch (error) {
    logger.error("Error adding allergy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add allergy",
      error: error.message
    });
  }
};

// Link family member to existing user account
const linkFamilyMemberToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    const familyMember = await FamilyMember.findById(id);

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found"
      });
    }

    // Check if the family member belongs to the logged-in user
    if (familyMember.primaryUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find the user to link
    const userToLink = await User.findOne({ email: userEmail });

    if (!userToLink) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email"
      });
    }

    // Check if already linked
    if (familyMember.linkedUserId) {
      return res.status(400).json({
        success: false,
        message: "Family member is already linked to a user account"
      });
    }

    // Link the user
    familyMember.linkedUserId = userToLink._id;
    await familyMember.save();

    logger.info(`Family member ${id} linked to user ${userToLink._id} by user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: "Family member linked to user account successfully",
      data: familyMember
    });

  } catch (error) {
    logger.error("Error linking family member to user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to link family member to user",
      error: error.message
    });
  }
};

// Get family member statistics
const getFamilyMemberStats = async (req, res) => {
  try {
    const stats = await FamilyMember.aggregate([
      { $match: { primaryUserId: req.user._id } },
      {
        $group: {
          _id: null,
          totalMembers: { $sum: 1 },
          activeMembers: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactiveMembers: { $sum: { $cond: ["$isActive", 0, 1] } },
          linkedMembers: { $sum: { $cond: [{ $ifNull: ["$linkedUserId", false] }, 1, 0] } }
        }
      }
    ]);

    const relationshipStats = await FamilyMember.aggregate([
      { $match: { primaryUserId: req.user._id, isActive: true } },
      {
        $group: {
          _id: "$relationship",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const ageGroupStats = await FamilyMember.aggregate([
      { $match: { primaryUserId: req.user._id, isActive: true, dateOfBirth: { $exists: true } } },
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), "$dateOfBirth"] },
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ["$age", 13] }, then: "Child" },
                { case: { $lt: ["$age", 20] }, then: "Teenager" },
                { case: { $lt: ["$age", 60] }, then: "Adult" },
                { case: { $gte: ["$age", 60] }, then: "Senior" }
              ],
              default: "Unknown"
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalMembers: 0,
          activeMembers: 0,
          inactiveMembers: 0,
          linkedMembers: 0
        },
        relationshipBreakdown: relationshipStats,
        ageGroupBreakdown: ageGroupStats
      }
    });

  } catch (error) {
    logger.error("Error fetching family member stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch family member statistics",
      error: error.message
    });
  }
};

module.exports = {
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
};
