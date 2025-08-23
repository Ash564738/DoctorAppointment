const Branch = require('../models/branchModel');
const logger = require('../utils/logger');

// Get all branches
const getBranches = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      location,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { manager: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const branches = await Branch.find(filter)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Branch.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: branches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching branches:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
};

// Get branch by ID
const getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: branch
    });

  } catch (error) {
    logger.error('Error fetching branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch branch',
      error: error.message
    });
  }
};

// Create new branch
const createBranch = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const branchData = req.body;

    // Check if branch name already exists
    const existingBranch = await Branch.findOne({ 
      name: { $regex: new RegExp(`^${branchData.name}$`, 'i') }
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'Branch with this name already exists'
      });
    }

    const branch = new Branch(branchData);
    await branch.save();

    logger.info(`New branch created: ${branch.name} by user ${req.userId}`);

    return res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch
    });

  } catch (error) {
    logger.error('Error creating branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create branch',
      error: error.message
    });
  }
};

// Update branch
const updateBranch = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { branchId } = req.params;
    const updateData = req.body;

    // Check if branch exists
    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Check if new name conflicts with existing branch (if name is being changed)
    if (updateData.name && updateData.name !== existingBranch.name) {
      const conflictingBranch = await Branch.findOne({
        _id: { $ne: branchId },
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') }
      });

      if (conflictingBranch) {
        return res.status(400).json({
          success: false,
          message: 'Branch with this name already exists'
        });
      }
    }

    const updatedBranch = await Branch.findByIdAndUpdate(
      branchId,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info(`Branch updated: ${updatedBranch.name} by user ${req.userId}`);

    return res.status(200).json({
      success: true,
      message: 'Branch updated successfully',
      data: updatedBranch
    });

  } catch (error) {
    logger.error('Error updating branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update branch',
      error: error.message
    });
  }
};

// Delete branch
const deleteBranch = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { branchId } = req.params;

    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    await Branch.findByIdAndDelete(branchId);

    logger.info(`Branch deleted: ${branch.name} by user ${req.userId}`);

    return res.status(200).json({
      success: true,
      message: 'Branch deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete branch',
      error: error.message
    });
  }
};

// Get branch statistics
const getBranchStats = async (req, res) => {
  try {
    // Check admin permissions
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const stats = await Branch.aggregate([
      {
        $group: {
          _id: null,
          totalBranches: { $sum: 1 },
          activeBranches: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          inactiveBranches: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
          maintenanceBranches: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
          totalBeds: { $sum: '$capacity.beds' },
          totalRooms: { $sum: '$capacity.rooms' },
          totalStaff: { $sum: '$capacity.staff' },
          averageRating: { $avg: '$metadata.averageRating' }
        }
      }
    ]);

    // Get location distribution
    const locationStats = await Branch.aggregate([
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          statuses: { $push: '$status' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalBranches: 0,
          activeBranches: 0,
          inactiveBranches: 0,
          maintenanceBranches: 0,
          totalBeds: 0,
          totalRooms: 0,
          totalStaff: 0,
          averageRating: 0
        },
        locationDistribution: locationStats
      }
    });

  } catch (error) {
    logger.error('Error fetching branch statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch branch statistics',
      error: error.message
    });
  }
};

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats
};
