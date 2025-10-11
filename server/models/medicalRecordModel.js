const mongoose = require("mongoose");

const medicalRecordSchema = mongoose.Schema(
  {
    patientId: {
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
    appointmentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Appointment",
      required: true,
    },
    chiefComplaint: {
      type: String,
      required: true,
      maxlength: [1000, 'Chief complaint too long']
    },
    historyOfPresentIllness: {
      type: String,
      maxlength: [2000, 'History too long']
    },
    pastMedicalHistory: {
      type: String,
      maxlength: [1500, 'Past medical history too long']
    },
    familyHistory: {
      type: String,
      maxlength: [1000, 'Family history too long']
    },
    socialHistory: {
      smoking: {
        status: {
          type: String,
          enum: ['never', 'former', 'current']
        },
        details: String
      },
      alcohol: {
        status: {
          type: String,
          enum: ['never', 'occasional', 'regular', 'heavy']
        },
        details: String
      },
      drugs: {
        status: {
          type: String,
          enum: ['never', 'former', 'current']
        },
        details: String
      },
    },
    symptoms: {
      type: String,
      required: false,
      maxlength: [1000, 'Symptoms description too long']
    },
    allergies: [{
      allergen: String,
      reaction: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      }
    }],
    healthMetricsIds: [{
      type: mongoose.SchemaTypes.ObjectId,
      ref: "HealthMetrics"
    }],
    physicalExamination: {
      general: String,
      head: String,
      neck: String,
      chest: String,
      abdomen: String,
      extremities: String,
      neurological: String,
      other: String
    },
    assessment: {
      type: String,
      required: true,
      maxlength: [2000, 'Assessment too long']
    },
    diagnosis: [{
      code: String,
      description: String,
      type: {
        type: String,
        enum: ['primary', 'secondary', 'differential']
      }
    }],
    treatment: {
      type: String,
      maxlength: [2000, 'Treatment plan too long']
    },
    prescriptionIds: [{
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Prescription"
    }],
    attachments: [{
      filename: String,
      url: String,
      type: {
        type: String,
        enum: ['image', 'document', 'lab_result', 'imaging']
      },
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }],
  },
  {
    timestamps: true,
  }
);

medicalRecordSchema.index({ patientId: 1, visitDate: -1 });
medicalRecordSchema.index({ doctorId: 1, visitDate: -1 });
medicalRecordSchema.index({ appointmentId: 1 });
medicalRecordSchema.virtual('patientAgeAtVisit').get(function() {
  if (!this.populated('patientId') || !this.patientId.dateOfBirth) return null;
  const visitDate = this.visitDate;
  const birthDate = new Date(this.patientId.dateOfBirth);
  let age = visitDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = visitDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && visitDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});
const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

module.exports = MedicalRecord;
