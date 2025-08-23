const mongoose = require('mongoose');

const walkInQueueSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: false // Allow anonymous walk-ins
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Name too long']
  },
  mobile: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^\+?[\d\s\-\(\)]+$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  reason: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [500, 'Reason too long']
  },
  doctorId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
    required: false // For general queue
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'waiting'
  },
  queueNumber: {
    type: Number,
    required: true
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  actualWaitTime: {
    type: Number // in minutes
  },
  checkedInAt: {
    type: Date,
    default: Date.now
  },
  calledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes too long']
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  vitalSigns: {
    bloodPressure: String,
    temperature: Number,
    heartRate: Number,
    weight: Number,
    height: Number
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
walkInQueueSchema.index({ status: 1, createdAt: 1 });
walkInQueueSchema.index({ doctorId: 1, status: 1 });
walkInQueueSchema.index({ queueNumber: 1 });
walkInQueueSchema.index({ priority: 1, createdAt: 1 });

// Virtual for current wait time
walkInQueueSchema.virtual('currentWaitTime').get(function() {
  if (this.status !== 'waiting') return this.actualWaitTime || 0;
  return Math.floor((new Date() - this.checkedInAt) / (1000 * 60)); // in minutes
});

// Static method to get next queue number
walkInQueueSchema.statics.getNextQueueNumber = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const lastEntry = await this.findOne({
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ queueNumber: -1 });

  return lastEntry ? lastEntry.queueNumber + 1 : 1;
};

// Pre-save middleware to set queue number
walkInQueueSchema.pre('save', async function(next) {
  if (this.isNew && !this.queueNumber) {
    this.queueNumber = await this.constructor.getNextQueueNumber();
  }
  next();
});

module.exports = mongoose.model('WalkInQueue', walkInQueueSchema);
