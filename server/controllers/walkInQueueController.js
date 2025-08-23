const WalkInQueue = require("../models/walkInQueueModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const logger = require("../utils/logger");

// Get walk-in queue with filtering and pagination
const getWalkInQueue = async (req, res) => {
  try {
    const { 
      status = 'waiting', 
      doctorId, 
      priority, 
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'asc'
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (doctorId) filter.doctorId = doctorId;
    if (priority) filter.priority = priority;

    // Today's queue only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    filter.createdAt = { $gte: today, $lt: tomorrow };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sort = {};
    
    // Priority sorting: urgent -> high -> normal -> low
    if (sortBy === 'priority') {
      sort.priority = -1;
      sort.createdAt = 1;
    } else {
      sort[sortBy] = sortDirection;
    }

    const queue = await WalkInQueue.find(filter)
      .populate('patientId', 'firstname lastname mobile email')
      .populate('doctorId', 'firstname lastname specialization')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WalkInQueue.countDocuments(filter);

    // Calculate estimated wait times
    const queueWithEstimates = queue.map((entry, index) => {
      if (entry.status === 'waiting') {
        // Estimate 20 minutes per patient ahead in queue
        entry.estimatedWaitTime = index * 20;
      }
      return entry;
    });

    // Get queue statistics
    const stats = await WalkInQueue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$actualWaitTime' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Walk-in queue retrieved successfully",
      data: {
        queue: queueWithEstimates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgWaitTime: Math.round(stat.avgWaitTime || 0)
          };
          return acc;
        }, {})
      }
    });

  } catch (error) {
    logger.error("Error fetching walk-in queue:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch walk-in queue",
      error: error.message
    });
  }
};

// Add patient to walk-in queue
const addToWalkInQueue = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      reason,
      doctorId,
      priority = 'normal',
      isEmergency = false,
      vitalSigns = {},
      notes
    } = req.body;

    // Validation
    if (!name || !mobile || !reason) {
      return res.status(400).json({
        success: false,
        message: "Name, mobile, and reason are required"
      });
    }

    // Check if doctor exists (if specified)
    if (doctorId) {
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== 'Doctor') {
        return res.status(400).json({
          success: false,
          message: "Invalid doctor ID"
        });
      }
    }

    // Check if patient already in queue today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEntry = await WalkInQueue.findOne({
      mobile: mobile,
      status: { $in: ['waiting', 'in-progress'] },
      createdAt: { $gte: today, $lt: tomorrow }
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "Patient already in queue for today",
        data: existingEntry
      });
    }

    // Check if this is a registered patient
    let patientId = null;
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        patientId = existingUser._id;
      }
    }

    // Set priority based on emergency status
    const finalPriority = isEmergency ? 'urgent' : priority;

    const queueEntry = new WalkInQueue({
      patientId,
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      reason: reason.trim(),
      doctorId: doctorId || undefined,
      priority: finalPriority,
      isEmergency,
      vitalSigns,
      notes: notes ? notes.trim() : undefined
    });

    await queueEntry.save();

    // Populate the entry for response
    await queueEntry.populate('patientId', 'firstname lastname email');
    await queueEntry.populate('doctorId', 'firstname lastname specialization');

    // Send notification to staff/doctors
    if (doctorId) {
      const notification = new Notification({
        userId: doctorId,
        content: `New walk-in patient: ${name} - ${reason} (Priority: ${finalPriority})`
      });
      await notification.save();
    }

    // Log the addition
    logger.info(`Added ${name} to walk-in queue with queue number ${queueEntry.queueNumber}`);

    return res.status(201).json({
      success: true,
      message: "Successfully added to walk-in queue",
      data: {
        queueEntry,
        queueNumber: queueEntry.queueNumber,
        estimatedWaitTime: await calculateEstimatedWaitTime(queueEntry)
      }
    });

  } catch (error) {
    logger.error("Error adding to walk-in queue:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add to walk-in queue",
      error: error.message
    });
  }
};

// Update queue entry status
const updateQueueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, doctorId } = req.body;

    const validStatuses = ['waiting', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const queueEntry = await WalkInQueue.findById(id);
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found"
      });
    }

    // Calculate actual wait time if moving from waiting to in-progress
    if (queueEntry.status === 'waiting' && status === 'in-progress') {
      queueEntry.calledAt = new Date();
      queueEntry.actualWaitTime = Math.floor((queueEntry.calledAt - queueEntry.checkedInAt) / (1000 * 60));
    }

    // Set completion time if completing
    if (status === 'completed') {
      queueEntry.completedAt = new Date();
    }

    // Update fields
    queueEntry.status = status;
    if (notes) queueEntry.notes = notes;
    if (doctorId) queueEntry.doctorId = doctorId;

    await queueEntry.save();
    await queueEntry.populate('patientId', 'firstname lastname email');
    await queueEntry.populate('doctorId', 'firstname lastname specialization');

    // Send notification to patient if they have an account
    if (queueEntry.patientId) {
      const notification = new Notification({
        userId: queueEntry.patientId,
        content: `Your walk-in appointment status has been updated to: ${status}`
      });
      await notification.save();
    }

    logger.info(`Updated queue entry ${id} status to ${status}`);

    return res.status(200).json({
      success: true,
      message: "Queue entry updated successfully",
      data: queueEntry
    });

  } catch (error) {
    logger.error("Error updating queue status:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update queue status",
      error: error.message
    });
  }
};

// Remove from queue
const removeFromQueue = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const queueEntry = await WalkInQueue.findById(id);
    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found"
      });
    }

    queueEntry.status = 'cancelled';
    queueEntry.notes = reason || 'Removed from queue';
    await queueEntry.save();

    logger.info(`Removed queue entry ${id} from queue: ${reason || 'No reason provided'}`);

    return res.status(200).json({
      success: true,
      message: "Successfully removed from queue",
      data: queueEntry
    });

  } catch (error) {
    logger.error("Error removing from queue:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove from queue",
      error: error.message
    });
  }
};

// Get queue statistics
const getQueueStatistics = async (req, res) => {
  try {
    const { period = '7' } = req.query; // days
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.setDate() - daysAgo);

    const stats = await WalkInQueue.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status"
          },
          count: { $sum: 1 },
          avgWaitTime: { $avg: "$actualWaitTime" },
          maxWaitTime: { $max: "$actualWaitTime" },
          minWaitTime: { $min: "$actualWaitTime" }
        }
      },
      { $sort: { "_id.date": -1 } }
    ]);

    // Get overall statistics
    const overallStats = await WalkInQueue.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          completedPatients: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          cancelledPatients: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          },
          noShowPatients: {
            $sum: { $cond: [{ $eq: ["$status", "no-show"] }, 1, 0] }
          },
          avgWaitTime: { $avg: "$actualWaitTime" },
          maxWaitTime: { $max: "$actualWaitTime" }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Queue statistics retrieved successfully",
      data: {
        period: `${period} days`,
        dailyStats: stats,
        overallStats: overallStats[0] || {
          totalPatients: 0,
          completedPatients: 0,
          cancelledPatients: 0,
          noShowPatients: 0,
          avgWaitTime: 0,
          maxWaitTime: 0
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching queue statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch queue statistics",
      error: error.message
    });
  }
};

// Helper function to calculate estimated wait time
const calculateEstimatedWaitTime = async (queueEntry) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const waitingAhead = await WalkInQueue.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow },
    status: 'waiting',
    queueNumber: { $lt: queueEntry.queueNumber }
  });

  const inProgress = await WalkInQueue.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow },
    status: 'in-progress'
  });

  // Estimate 20 minutes per waiting patient + 10 minutes for in-progress
  return (waitingAhead * 20) + (inProgress * 10);
};

module.exports = {
  getWalkInQueue,
  addToWalkInQueue,
  updateQueueStatus,
  removeFromQueue,
  getQueueStatistics
};
