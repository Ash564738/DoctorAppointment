const HealthMetrics = require("../models/healthMetricsModel");
const User = require("../models/userModel");
const logger = require("../utils/logger");

// Create new health metrics entry
const createHealthMetrics = async (req, res) => {
  try {
    const {
      patientId,
      vitalSigns,
      measurements,
      deviceData,
      recordedBy,
      notes
    } = req.body;

    // If patientId is not provided, use the logged-in user
    const targetPatientId = patientId || req.user._id;

    // Check if user can create metrics for this patient
    if (targetPatientId !== req.user._id.toString() && !req.user.isDoctor && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Verify patient exists
    const patient = await User.findById(targetPatientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Create health metrics entry
    const healthMetrics = new HealthMetrics({
      patientId: targetPatientId,
      vitalSigns,
      measurements,
      deviceData,
      recordedBy: recordedBy || req.user._id,
      notes
    });

    await healthMetrics.save();

    // Populate the entry with patient and recorded by details
    await healthMetrics.populate([
      { path: 'patientId', select: 'firstname lastname email' },
      { path: 'recordedBy', select: 'firstname lastname isDoctor' }
    ]);

    logger.info(`Health metrics created for patient ${targetPatientId} by ${req.user.firstname} ${req.user.lastname}`);

    res.status(201).json({
      success: true,
      message: "Health metrics recorded successfully",
      data: healthMetrics
    });

  } catch (error) {
    logger.error("Error creating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record health metrics",
      error: error.message
    });
  }
};

// Get health metrics for a patient
const getPatientHealthMetrics = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      metricType,
      sortBy = 'recordedAt',
      sortOrder = 'desc'
    } = req.query;

    // Check if user can access these metrics
    if (patientId !== req.user._id.toString() && !req.user.isDoctor && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Build query
    const query = { patientId };

    // Date range filter
    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) query.recordedAt.$gte = new Date(startDate);
      if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    // Get total count
    const total = await HealthMetrics.countDocuments(query);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get health metrics with pagination
    const healthMetrics = await HealthMetrics.find(query)
      .populate('recordedBy', 'firstname lastname isDoctor')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter by metric type if specified
    let filteredMetrics = healthMetrics;
    if (metricType) {
      filteredMetrics = healthMetrics.filter(metric => {
        if (metricType === 'bloodPressure') return metric.vitalSigns.bloodPressure.systolic;
        if (metricType === 'heartRate') return metric.vitalSigns.heartRate;
        if (metricType === 'temperature') return metric.vitalSigns.temperature;
        if (metricType === 'weight') return metric.measurements.weight;
        if (metricType === 'height') return metric.measurements.height;
        return true;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        healthMetrics: filteredMetrics,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: filteredMetrics.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    logger.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health metrics",
      error: error.message
    });
  }
};

// Get specific health metrics entry
const getHealthMetricsById = async (req, res) => {
  try {
    const { id } = req.params;

    const healthMetrics = await HealthMetrics.findById(id)
      .populate('patientId', 'firstname lastname email dateOfBirth')
      .populate('recordedBy', 'firstname lastname isDoctor');

    if (!healthMetrics) {
      return res.status(404).json({
        success: false,
        message: "Health metrics not found"
      });
    }

    // Check access permissions
    const canAccess = 
      req.user._id.toString() === healthMetrics.patientId._id.toString() ||
      req.user.isDoctor ||
      req.user.isAdmin;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: healthMetrics
    });

  } catch (error) {
    logger.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health metrics",
      error: error.message
    });
  }
};

// Update health metrics entry
const updateHealthMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const healthMetrics = await HealthMetrics.findById(id);
    
    if (!healthMetrics) {
      return res.status(404).json({
        success: false,
        message: "Health metrics not found"
      });
    }

    // Check permissions - only patient, recording person, doctors, or admins can update
    const canUpdate = 
      req.user._id.toString() === healthMetrics.patientId.toString() ||
      req.user._id.toString() === healthMetrics.recordedBy.toString() ||
      req.user.isDoctor ||
      req.user.isAdmin;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Update health metrics
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'patientId') {
        healthMetrics[key] = updateData[key];
      }
    });

    await healthMetrics.save();

    logger.info(`Health metrics ${id} updated by ${req.user.firstname} ${req.user.lastname}`);

    res.status(200).json({
      success: true,
      message: "Health metrics updated successfully",
      data: healthMetrics
    });

  } catch (error) {
    logger.error("Error updating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update health metrics",
      error: error.message
    });
  }
};

// Delete health metrics entry
const deleteHealthMetrics = async (req, res) => {
  try {
    const { id } = req.params;

    const healthMetrics = await HealthMetrics.findById(id);
    
    if (!healthMetrics) {
      return res.status(404).json({
        success: false,
        message: "Health metrics not found"
      });
    }

    // Check permissions - only patient, recording person, or admins can delete
    const canDelete = 
      req.user._id.toString() === healthMetrics.patientId.toString() ||
      req.user._id.toString() === healthMetrics.recordedBy.toString() ||
      req.user.isAdmin;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await HealthMetrics.findByIdAndDelete(id);

    logger.info(`Health metrics ${id} deleted by ${req.user.firstname} ${req.user.lastname}`);

    res.status(200).json({
      success: true,
      message: "Health metrics deleted successfully"
    });

  } catch (error) {
    logger.error("Error deleting health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete health metrics",
      error: error.message
    });
  }
};

// Get health metrics analytics
const getHealthMetricsAnalytics = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { days = 30 } = req.query;

    // Check access permissions
    if (patientId !== req.user._id.toString() && !req.user.isDoctor && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get health metrics for the specified period
    const metrics = await HealthMetrics.find({
      patientId,
      recordedAt: { $gte: startDate }
    }).sort({ recordedAt: 1 });

    // Calculate analytics
    const analytics = {
      totalReadings: metrics.length,
      period: `${days} days`,
      trends: {
        bloodPressure: {
          systolic: [],
          diastolic: [],
          average: { systolic: 0, diastolic: 0 },
          trend: 'stable'
        },
        heartRate: {
          values: [],
          average: 0,
          min: 0,
          max: 0,
          trend: 'stable'
        },
        weight: {
          values: [],
          average: 0,
          change: 0,
          trend: 'stable'
        },
        bmi: {
          values: [],
          average: 0,
          category: 'Normal'
        }
      },
      alerts: []
    };

    // Process metrics
    metrics.forEach(metric => {
      // Blood pressure
      if (metric.vitalSigns.bloodPressure.systolic) {
        analytics.trends.bloodPressure.systolic.push({
          value: metric.vitalSigns.bloodPressure.systolic,
          date: metric.recordedAt
        });
        analytics.trends.bloodPressure.diastolic.push({
          value: metric.vitalSigns.bloodPressure.diastolic,
          date: metric.recordedAt
        });
      }

      // Heart rate
      if (metric.vitalSigns.heartRate) {
        analytics.trends.heartRate.values.push({
          value: metric.vitalSigns.heartRate,
          date: metric.recordedAt
        });
      }

      // Weight
      if (metric.measurements.weight) {
        analytics.trends.weight.values.push({
          value: metric.measurements.weight,
          date: metric.recordedAt
        });
      }

      // BMI
      if (metric.bmi) {
        analytics.trends.bmi.values.push({
          value: metric.bmi,
          date: metric.recordedAt
        });
      }
    });

    // Calculate averages and trends
    if (analytics.trends.bloodPressure.systolic.length > 0) {
      const systolicSum = analytics.trends.bloodPressure.systolic.reduce((sum, item) => sum + item.value, 0);
      const diastolicSum = analytics.trends.bloodPressure.diastolic.reduce((sum, item) => sum + item.value, 0);
      analytics.trends.bloodPressure.average.systolic = Math.round(systolicSum / analytics.trends.bloodPressure.systolic.length);
      analytics.trends.bloodPressure.average.diastolic = Math.round(diastolicSum / analytics.trends.bloodPressure.diastolic.length);
    }

    if (analytics.trends.heartRate.values.length > 0) {
      const heartRateValues = analytics.trends.heartRate.values.map(item => item.value);
      analytics.trends.heartRate.average = Math.round(heartRateValues.reduce((sum, val) => sum + val, 0) / heartRateValues.length);
      analytics.trends.heartRate.min = Math.min(...heartRateValues);
      analytics.trends.heartRate.max = Math.max(...heartRateValues);
    }

    if (analytics.trends.weight.values.length > 0) {
      const weights = analytics.trends.weight.values.map(item => item.value);
      analytics.trends.weight.average = (weights.reduce((sum, val) => sum + val, 0) / weights.length).toFixed(1);
      if (weights.length >= 2) {
        analytics.trends.weight.change = (weights[weights.length - 1] - weights[0]).toFixed(1);
      }
    }

    if (analytics.trends.bmi.values.length > 0) {
      const bmiValues = analytics.trends.bmi.values.map(item => item.value);
      analytics.trends.bmi.average = (bmiValues.reduce((sum, val) => sum + val, 0) / bmiValues.length).toFixed(1);
      
      // Determine BMI category
      const latestBMI = bmiValues[bmiValues.length - 1];
      if (latestBMI < 18.5) analytics.trends.bmi.category = 'Underweight';
      else if (latestBMI < 25) analytics.trends.bmi.category = 'Normal';
      else if (latestBMI < 30) analytics.trends.bmi.category = 'Overweight';
      else analytics.trends.bmi.category = 'Obese';
    }

    // Generate alerts based on latest readings
    const latestMetric = metrics[metrics.length - 1];
    if (latestMetric) {
      if (latestMetric.vitalSigns.bloodPressure.systolic > 140 || latestMetric.vitalSigns.bloodPressure.diastolic > 90) {
        analytics.alerts.push({
          type: 'warning',
          message: 'High blood pressure detected',
          value: `${latestMetric.vitalSigns.bloodPressure.systolic}/${latestMetric.vitalSigns.bloodPressure.diastolic} mmHg`
        });
      }
      
      if (latestMetric.vitalSigns.heartRate > 100) {
        analytics.alerts.push({
          type: 'warning',
          message: 'Elevated heart rate detected',
          value: `${latestMetric.vitalSigns.heartRate} bpm`
        });
      }
    }

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error("Error generating health metrics analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate analytics",
      error: error.message
    });
  }
};

// Get health metrics summary
const getHealthMetricsSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check access permissions
    if (patientId !== req.user._id.toString() && !req.user.isDoctor && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get latest health metrics
    const latestMetrics = await HealthMetrics.findOne({ patientId })
      .sort({ recordedAt: -1 })
      .populate('recordedBy', 'firstname lastname');

    // Get metrics count for different periods
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [weeklyCount, monthlyCount, totalCount] = await Promise.all([
      HealthMetrics.countDocuments({ patientId, recordedAt: { $gte: weekAgo } }),
      HealthMetrics.countDocuments({ patientId, recordedAt: { $gte: monthAgo } }),
      HealthMetrics.countDocuments({ patientId })
    ]);

    const summary = {
      latestReading: latestMetrics,
      statistics: {
        totalReadings: totalCount,
        thisWeek: weeklyCount,
        thisMonth: monthlyCount
      },
      quickStats: null
    };

    // Add quick stats if latest metrics exist
    if (latestMetrics) {
      summary.quickStats = {
        bloodPressure: latestMetrics.bloodPressureCategory,
        heartRate: latestMetrics.heartRateCategory,
        bmi: latestMetrics.bmiCategory,
        lastRecorded: latestMetrics.recordedAt
      };
    }

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error("Error fetching health metrics summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
      error: error.message
    });
  }
};

module.exports = {
  createHealthMetrics,
  getPatientHealthMetrics,
  getHealthMetricsById,
  updateHealthMetrics,
  deleteHealthMetrics,
  getHealthMetricsAnalytics,
  getHealthMetricsSummary
};
