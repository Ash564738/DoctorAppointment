const mongoose = require("mongoose");

const schema = mongoose.Schema(
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
    status: {
      type: String,
      default: "Pending",
      enum: {
        values: ["Pending", "Confirmed", "Completed", "Cancelled"],
        message: 'Invalid status'
      },
      index: true
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
      enum: ['Regular', 'Emergency', 'Follow-up', 'Consultation'],
      default: 'Regular'
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal'
    },
    medicalRecordId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "MedicalRecord"
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
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
        enum: ['Weekly', 'Biweekly', 'Monthly']
      },
      endDate: Date,
      occurrences: Number
    },
    estimatedDuration: {
      type: Number,
      default: 30
    },
    prescriptionId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Prescription"
    }
  },
  {
    timestamps: true,
  }
);

schema.index({ doctorId: 1, date: 1 });
schema.index({ userId: 1, status: 1 });
schema.index({ date: 1, status: 1 });

schema.virtual('appointmentDateTime').get(function() {
  const [hours, minutes] = this.time.split(':');
  const datetime = new Date(this.date);
  datetime.setHours(parseInt(hours), parseInt(minutes));
  return datetime;
});

schema.pre('save', function(next) {
  if (this.isNew) {
    const appointmentDate = this.date instanceof Date ? this.date : new Date(this.date);
    if (isNaN(appointmentDate.getTime())) {
      return next();
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      if (this.status && this.status === 'Completed') {
        return next();
      }
      return next(new Error('Appointment date cannot be in the past'));
    }
  }
  next();
});

const Appointment = mongoose.model("Appointment", schema);
module.exports = Appointment;