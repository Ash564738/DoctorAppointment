const mongoose = require("mongoose");

const medicationSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medication name is required'],
    trim: true,
    maxlength: [200, 'Medication name too long']
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required'],
    trim: true,
    maxlength: [100, 'Dosage description too long']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: [
      'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
      'As needed', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours'
    ]
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true,
    maxlength: [100, 'Duration description too long']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Instructions too long']
  },
  quantity: {
    type: String,
    trim: true,
    maxlength: [50, 'Quantity description too long']
  }
});

const prescriptionSchema = mongoose.Schema(
  {
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: [true, 'Doctor ID is required'],
      index: true
    },
    patientId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User", 
      required: [true, 'Patient ID is required'],
      index: true
    },
    appointmentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Appointment",
      index: true
    },
    medications: {
      type: [medicationSchema],
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'At least one medication is required'
      }
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
      maxlength: [500, 'Diagnosis too long']
    },
    symptoms: {
      type: String,
      required: [true, 'Symptoms are required'],
      trim: true,
      maxlength: [1000, 'Symptoms description too long']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes too long']
    },
    followUpDate: {
      type: Date,
      index: true
    },
    isUrgent: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'acknowledged', 'expired'],
      default: 'draft',
      index: true
    },
    sentAt: {
      type: Date
    },
    acknowledgedAt: {
      type: Date
    },
    prescriptionNumber: {
      type: String,
      unique: true,
      index: true
    },
    validUntil: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate prescription number before saving
prescriptionSchema.pre('save', async function(next) {
  if (this.isNew && !this.prescriptionNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Count today's prescriptions to generate sequence number
    const todayStart = new Date(year, date.getMonth(), date.getDate());
    const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);
    
    const todayCount = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const sequence = String(todayCount + 1).padStart(4, '0');
    this.prescriptionNumber = `RX${year}${month}${day}${sequence}`;
  }
  next();
});

// Virtual for checking if prescription is expired
prescriptionSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date();
});

// Virtual for days until expiry
prescriptionSchema.virtual('daysUntilExpiry').get(function() {
  if (this.isExpired) return 0;
  const diffTime = this.validUntil - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Indexes for better performance
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, validUntil: 1 });
prescriptionSchema.index({ prescriptionNumber: 1 }, { unique: true });

module.exports = mongoose.model("Prescription", prescriptionSchema);
