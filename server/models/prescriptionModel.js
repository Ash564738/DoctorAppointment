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
    trim: true,
    maxlength: [100, 'Frequency description too long']
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
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


prescriptionSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date();
});

prescriptionSchema.virtual('daysUntilExpiry').get(function() {
  if (this.isExpired) return 0;
  const diffTime = this.validUntil - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, validUntil: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
