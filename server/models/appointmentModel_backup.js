const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for faster queries
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true, // Add index for faster queries
    },
    date: {
      type: Date, // Changed from String to Date for better performance
      required: true,
      index: true, // Add index for date-based queries
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
    prescription: {
      type: String,
      required: false,
      maxlength: [1000, 'Prescription too long']
    },
    status: {
      type: String,
      default: "Pending",
      enum: {
        values: ["Pending", "Confirmed", "Completed", "Cancelled"],
        message: 'Invalid status'
      },
      index: true // Add index for status-based queries
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes too long']
    },
    timeSlotId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "TimeSlot",
      index: true
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
    medicalRecordId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "MedicalRecord"
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Payment"
    },
    cancellationReason: {
      type: String,
      maxlength: [300, 'Cancellation reason too long']
    },
    cancellationDate: {
      type: Date
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly']
      },
      endDate: Date,
      occurrences: Number
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      ratedAt: Date
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 30
    }
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
schema.index({ doctorId: 1, date: 1 }); // Doctor's appointments by date
schema.index({ userId: 1, status: 1 }); // User's appointments by status
schema.index({ date: 1, status: 1 }); // Appointments by date and status

// Virtual for appointment datetime
schema.virtual('appointmentDateTime').get(function() {
  const [hours, minutes] = this.time.split(':');
  const datetime = new Date(this.date);
  datetime.setHours(parseInt(hours), parseInt(minutes));
  return datetime;
});

// Pre-save middleware to validate appointment time
schema.pre('save', function(next) {
  const appointmentDate = new Date(this.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (appointmentDate < today) {
    next(new Error('Appointment date cannot be in the past'));
  } else {
    next();
  }
});

const Appointment = mongoose.model("Appointment", schema);

module.exports = Appointment;
