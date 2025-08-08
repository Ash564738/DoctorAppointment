const mongoose = require("mongoose");

const videoConsultationSchema = mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
      index: true
    },
    patientId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true
    },
    duration: {
      type: Number, // in minutes
      default: 30,
      min: 15,
      max: 120
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
      index: true
    },
    platform: {
      type: String,
      enum: ['zoom', 'meet', 'teams', 'webrtc', 'twilio'],
      default: 'webrtc'
    },
    meetingId: {
      type: String,
      required: true,
      unique: true
    },
    meetingPassword: {
      type: String
    },
    meetingUrl: {
      type: String,
      required: true
    },
    recordingEnabled: {
      type: Boolean,
      default: false
    },
    recordingUrl: {
      type: String
    },
    recordingDuration: {
      type: Number // in minutes
    },
    actualStartTime: {
      type: Date
    },
    actualEndTime: {
      type: Date
    },
    actualDuration: {
      type: Number // in minutes
    },
    patientJoinedAt: {
      type: Date
    },
    doctorJoinedAt: {
      type: Date
    },
    patientLeftAt: {
      type: Date
    },
    doctorLeftAt: {
      type: Date
    },
    connectionQuality: {
      patient: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor']
      },
      doctor: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor']
      }
    },
    technicalIssues: [{
      timestamp: Date,
      issue: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      resolved: {
        type: Boolean,
        default: false
      }
    }],
    consultation: {
      symptoms: String,
      diagnosis: String,
      treatment: String,
      prescriptions: [{
        medication: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String
      }],
      followUpRequired: {
        type: Boolean,
        default: false
      },
      followUpDate: Date,
      referrals: [{
        specialist: String,
        reason: String,
        urgency: {
          type: String,
          enum: ['low', 'medium', 'high', 'urgent']
        }
      }]
    },
    feedback: {
      patientRating: {
        type: Number,
        min: 1,
        max: 5
      },
      patientFeedback: String,
      doctorRating: {
        type: Number,
        min: 1,
        max: 5
      },
      doctorFeedback: String,
      technicalRating: {
        type: Number,
        min: 1,
        max: 5
      },
      overallSatisfaction: {
        type: String,
        enum: ['very-dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very-satisfied']
      }
    },
    billing: {
      consultationFee: {
        type: Number,
        required: true
      },
      additionalCharges: [{
        description: String,
        amount: Number
      }],
      totalAmount: {
        type: Number,
        required: true
      },
      paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
      },
      paymentMethod: String,
      transactionId: String
    },
    systemMetrics: {
      bandwidth: {
        patient: String,
        doctor: String
      },
      deviceInfo: {
        patient: {
          device: String,
          browser: String,
          os: String
        },
        doctor: {
          device: String,
          browser: String,
          os: String
        }
      },
      serverLocation: String,
      latency: {
        patient: Number,
        doctor: Number
      }
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
videoConsultationSchema.index({ appointmentId: 1 });
videoConsultationSchema.index({ patientId: 1, status: 1 });
videoConsultationSchema.index({ doctorId: 1, status: 1 });
videoConsultationSchema.index({ scheduledTime: 1, status: 1 });
videoConsultationSchema.index({ meetingId: 1 });

// Virtual for consultation summary
videoConsultationSchema.virtual('consultationSummary').get(function() {
  return {
    id: this._id,
    appointmentId: this.appointmentId,
    scheduledTime: this.scheduledTime,
    actualDuration: this.actualDuration,
    status: this.status,
    platform: this.platform,
    participantCount: this.getParticipantCount(),
    hasRecording: !!this.recordingUrl
  };
});

// Method to get participant count
videoConsultationSchema.methods.getParticipantCount = function() {
  let count = 0;
  if (this.patientJoinedAt) count++;
  if (this.doctorJoinedAt) count++;
  return count;
};

// Method to calculate actual duration
videoConsultationSchema.methods.calculateActualDuration = function() {
  if (this.actualStartTime && this.actualEndTime) {
    const duration = Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60));
    this.actualDuration = duration;
    return duration;
  }
  return 0;
};

// Method to check if consultation is overdue
videoConsultationSchema.methods.isOverdue = function() {
  const now = new Date();
  const scheduledEnd = new Date(this.scheduledTime.getTime() + (this.duration * 60 * 1000));
  return now > scheduledEnd && this.status !== 'completed';
};

// Pre-save middleware
videoConsultationSchema.pre('save', function(next) {
  // Calculate total billing amount
  if (this.billing && this.billing.consultationFee) {
    let total = this.billing.consultationFee;
    if (this.billing.additionalCharges) {
      total += this.billing.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
    }
    this.billing.totalAmount = total;
  }
  
  // Set actual duration if start and end times are available
  if (this.actualStartTime && this.actualEndTime && !this.actualDuration) {
    this.calculateActualDuration();
  }
  
  next();
});

const VideoConsultation = mongoose.model("VideoConsultation", videoConsultationSchema);

module.exports = VideoConsultation;
