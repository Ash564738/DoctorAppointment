const mongoose = require("mongoose");

const waitlistSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Time must be in HH:MM format'
      }
    },
    symptoms: {
      type: String,
      required: true,
      maxlength: [1000, 'Symptoms description too long'],
      minlength: [3, 'Please provide at least 3 characters for symptoms']
    },
    appointmentType: {
      type: String,
      enum: ['regular', 'emergency', 'follow-up', 'consultation', 'telemedicine'],
      default: 'regular'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'booked', 'expired'],
      default: 'waiting',
      index: true
    },
    positionInQueue: {
      type: Number,
      required: true
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    notificationDate: {
      type: Date
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true
    },
    isFlexibleTime: {
      type: Boolean,
      default: false
    },
    flexibleTimeRange: {
      startTime: String,
      endTime: String
    },
    isFlexibleDate: {
      type: Boolean,
      default: false
    },
    flexibleDateRange: {
      startDate: Date,
      endDate: Date
    }
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
waitlistSchema.index({ doctorId: 1, date: 1, status: 1 });
waitlistSchema.index({ userId: 1, status: 1 });
waitlistSchema.index({ expiryDate: 1, status: 1 });
waitlistSchema.index({ priority: 1, createdAt: 1 });

// Virtual for queue position display
waitlistSchema.virtual('queuePosition').get(function() {
  return `Position ${this.positionInQueue} in queue`;
});

// Method to check if waitlist entry has expired
waitlistSchema.methods.isExpired = function() {
  return new Date() > this.expiryDate;
};

// Method to move up in queue
waitlistSchema.methods.moveUpInQueue = function(newPosition) {
  this.positionInQueue = newPosition;
  return this.save();
};

// Pre-save middleware to set expiry date (24 hours from creation)
waitlistSchema.pre('save', function(next) {
  if (this.isNew && !this.expiryDate) {
    this.expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

const Waitlist = mongoose.model("Waitlist", waitlistSchema);

module.exports = Waitlist;
