const mongoose = require("mongoose");

const analyticsSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'appointment_analytics',
        'doctor_productivity', 
        'patient_trends',
        'revenue_analytics',
        'system_performance',
        'user_engagement'
      ],
      required: true,
      index: true
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      index: true // Optional, for doctor-specific analytics
    },
    departmentId: {
      type: String,
      index: true // Optional, for department-specific analytics
    },
    metrics: {
      // Appointment Metrics
      totalAppointments: Number,
      completedAppointments: Number,
      cancelledAppointments: Number,
      noShowAppointments: Number,
      rescheduledAppointments: Number,
      
      // Booking Metrics
      advanceBookings: Number, // Days in advance
      lastMinuteBookings: Number, // Within 24 hours
      recurringAppointments: Number,
      emergencyAppointments: Number,
      
      // Doctor Productivity
      workingHours: Number,
      patientsSeen: Number,
      averageConsultationTime: Number, // in minutes
      utilizationRate: Number, // percentage
      patientSatisfactionScore: Number,
      
      // Revenue Metrics
      totalRevenue: Number,
      averageRevenuePerAppointment: Number,
      paymentSuccess: Number,
      paymentFailures: Number,
      refunds: Number,
      
      // Patient Trends
      newPatients: Number,
      returningPatients: Number,
      patientRetentionRate: Number,
      averageAge: Number,
      genderDistribution: {
        male: Number,
        female: Number,
        other: Number
      },
      
      // System Performance
      averageResponseTime: Number, // in milliseconds
      systemUptime: Number, // percentage
      errorRate: Number, // percentage
      activeUsers: Number,
      concurrentUsers: Number,
      
      // User Engagement
      loginCount: Number,
      sessionDuration: Number, // average in minutes
      featureUsage: {
        appointments: Number,
        medicalRecords: Number,
        chat: Number,
        videoConsultation: Number,
        payments: Number
      },
      
      // Waitlist Metrics
      waitlistCount: Number,
      averageWaitTime: Number, // in hours
      waitlistConversionRate: Number, // percentage
      
      // Video Consultation Metrics
      videoConsultations: Number,
      videoConsultationDuration: Number, // average in minutes
      technicalIssues: Number,
      videoQualityRating: Number
    },
    comparisons: {
      previousPeriod: {
        value: Number,
        percentageChange: Number,
        trend: {
          type: String,
          enum: ['up', 'down', 'stable']
        }
      },
      samePeridLastYear: {
        value: Number,
        percentageChange: Number,
        trend: {
          type: String,
          enum: ['up', 'down', 'stable']
        }
      }
    },
    insights: [{
      category: {
        type: String,
        enum: ['performance', 'efficiency', 'revenue', 'patient_care', 'system']
      },
      message: String,
      severity: {
        type: String,
        enum: ['info', 'warning', 'critical']
      },
      actionRequired: Boolean,
      recommendation: String
    }],
    alerts: [{
      type: {
        type: String,
        enum: ['threshold_exceeded', 'performance_issue', 'revenue_drop', 'patient_satisfaction']
      },
      message: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      resolved: {
        type: Boolean,
        default: false
      },
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User"
      }
    }],
    processedAt: {
      type: Date,
      default: Date.now
    },
    dataSource: [{
      collection: String,
      recordCount: Number,
      lastUpdate: Date
    }]
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
analyticsSchema.index({ type: 1, period: 1, date: -1 });
analyticsSchema.index({ doctorId: 1, type: 1, period: 1 });
analyticsSchema.index({ departmentId: 1, type: 1, period: 1 });
analyticsSchema.index({ date: -1, type: 1 });

// Virtual for analytics summary
analyticsSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    type: this.type,
    period: this.period,
    date: this.date,
    keyMetrics: this.getKeyMetrics(),
    trendDirection: this.getTrendDirection(),
    alertCount: this.alerts ? this.alerts.length : 0
  };
});

// Method to get key metrics based on type
analyticsSchema.methods.getKeyMetrics = function() {
  const { metrics } = this;
  
  switch(this.type) {
    case 'appointment_analytics':
      return {
        total: metrics.totalAppointments,
        completed: metrics.completedAppointments,
        cancelled: metrics.cancelledAppointments,
        completionRate: metrics.totalAppointments ? 
          (metrics.completedAppointments / metrics.totalAppointments * 100).toFixed(1) : 0
      };
    
    case 'doctor_productivity':
      return {
        patientsSeen: metrics.patientsSeen,
        workingHours: metrics.workingHours,
        utilizationRate: metrics.utilizationRate,
        satisfaction: metrics.patientSatisfactionScore
      };
    
    case 'revenue_analytics':
      return {
        totalRevenue: metrics.totalRevenue,
        averagePerAppointment: metrics.averageRevenuePerAppointment,
        paymentSuccessRate: metrics.totalAppointments ? 
          (metrics.paymentSuccess / metrics.totalAppointments * 100).toFixed(1) : 0
      };
    
    default:
      return metrics;
  }
};

// Method to determine overall trend direction
analyticsSchema.methods.getTrendDirection = function() {
  if (!this.comparisons || !this.comparisons.previousPeriod) return 'stable';
  
  const change = this.comparisons.previousPeriod.percentageChange;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
};

// Method to generate insights
analyticsSchema.methods.generateInsights = function() {
  const insights = [];
  const { metrics } = this;
  
  // Performance insights
  if (metrics.utilizationRate && metrics.utilizationRate < 60) {
    insights.push({
      category: 'performance',
      message: 'Doctor utilization rate is below optimal level',
      severity: 'warning',
      actionRequired: true,
      recommendation: 'Consider adjusting shift schedules or marketing to increase patient bookings'
    });
  }
  
  // Revenue insights
  if (this.comparisons?.previousPeriod?.percentageChange < -10) {
    insights.push({
      category: 'revenue',
      message: 'Significant revenue decline compared to previous period',
      severity: 'critical',
      actionRequired: true,
      recommendation: 'Review pricing strategy and patient acquisition efforts'
    });
  }
  
  // Patient care insights
  if (metrics.patientSatisfactionScore && metrics.patientSatisfactionScore < 3.5) {
    insights.push({
      category: 'patient_care',
      message: 'Patient satisfaction scores are below acceptable levels',
      severity: 'critical',
      actionRequired: true,
      recommendation: 'Conduct patient feedback analysis and implement quality improvement measures'
    });
  }
  
  this.insights = insights;
  return insights;
};

// Static method to aggregate analytics data
analyticsSchema.statics.aggregateMetrics = async function(type, period, startDate, endDate, filters = {}) {
  const pipeline = [
    {
      $match: {
        type,
        period,
        date: {
          $gte: startDate,
          $lte: endDate
        },
        ...filters
      }
    },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        avgMetrics: {
          $accumulator: {
            init: function() { return {}; },
            accumulate: function(state, metrics) {
              // Custom aggregation logic here
              return state;
            },
            accumulateArgs: ["$metrics"],
            merge: function(state1, state2) {
              return state1;
            },
            finalize: function(state) {
              return state;
            },
            lang: "js"
          }
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;
