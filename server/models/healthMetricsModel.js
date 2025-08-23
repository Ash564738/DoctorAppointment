const mongoose = require("mongoose");

const healthMetricsSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: [true, 'User ID is required'],
      index: true
    },
    weight: {
      type: Number,
      min: [1, 'Weight must be positive'],
      max: [1000, 'Weight seems unrealistic']
    },
    height: {
      type: Number,
      min: [50, 'Height must be at least 50cm'],
      max: [300, 'Height seems unrealistic']
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: [60, 'Systolic pressure too low'],
        max: [300, 'Systolic pressure too high']
      },
      diastolic: {
        type: Number,
        min: [40, 'Diastolic pressure too low'],
        max: [200, 'Diastolic pressure too high']
      },
      formatted: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^\d{2,3}\/\d{2,3}$/.test(v);
          },
          message: 'Blood pressure must be in format XXX/XX'
        }
      }
    },
    heartRate: {
      type: Number,
      min: [30, 'Heart rate too low'],
      max: [220, 'Heart rate too high']
    },
    temperature: {
      value: {
        type: Number,
        min: [30, 'Temperature too low'],
        max: [45, 'Temperature too high']
      },
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    bloodSugar: {
      value: {
        type: Number,
        min: [20, 'Blood sugar too low'],
        max: [800, 'Blood sugar too high']
      },
      testType: {
        type: String,
        enum: ['fasting', 'random', 'post_meal', 'hba1c']
      },
      unit: {
        type: String,
        enum: ['mg/dl', 'mmol/l'],
        default: 'mg/dl'
      }
    },
    oxygenSaturation: {
      type: Number,
      min: [70, 'Oxygen saturation too low'],
      max: [100, 'Oxygen saturation cannot exceed 100%']
    },
    respiratoryRate: {
      type: Number,
      min: [5, 'Respiratory rate too low'],
      max: [60, 'Respiratory rate too high']
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes too long']
    },
    recordedBy: {
      type: String,
      enum: ['patient', 'doctor', 'nurse', 'device'],
      default: 'patient'
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    deviceInfo: {
      deviceType: String,
      deviceModel: String,
      accuracy: String
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User"
    },
    verifiedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for BMI calculation
healthMetricsSchema.virtual('bmi').get(function() {
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    return Math.round((this.weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
  return null;
});

// Virtual for BMI category
healthMetricsSchema.virtual('bmiCategory').get(function() {
  const bmi = this.bmi;
  if (!bmi) return null;
  
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
});

// Virtual for blood pressure category
healthMetricsSchema.virtual('bloodPressureCategory').get(function() {
  if (!this.bloodPressure || !this.bloodPressure.systolic || !this.bloodPressure.diastolic) {
    return null;
  }
  
  const { systolic, diastolic } = this.bloodPressure;
  
  if (systolic < 120 && diastolic < 80) return 'Normal';
  if (systolic < 130 && diastolic < 80) return 'Elevated';
  if (systolic < 140 || diastolic < 90) return 'High Blood Pressure Stage 1';
  if (systolic < 180 || diastolic < 120) return 'High Blood Pressure Stage 2';
  return 'Hypertensive Crisis';
});

// Virtual for heart rate category
healthMetricsSchema.virtual('heartRateCategory').get(function() {
  if (!this.heartRate) return null;
  
  if (this.heartRate < 60) return 'Below Normal (Bradycardia)';
  if (this.heartRate <= 100) return 'Normal';
  return 'Above Normal (Tachycardia)';
});

// Pre-save middleware to format blood pressure
healthMetricsSchema.pre('save', function(next) {
  if (this.bloodPressure && this.bloodPressure.systolic && this.bloodPressure.diastolic) {
    this.bloodPressure.formatted = `${this.bloodPressure.systolic}/${this.bloodPressure.diastolic}`;
  }
  next();
});

// Indexes for better performance
healthMetricsSchema.index({ userId: 1, recordedAt: -1 });
healthMetricsSchema.index({ userId: 1, createdAt: -1 });
healthMetricsSchema.index({ recordedBy: 1, recordedAt: -1 });

// Method to get latest metrics for a user
healthMetricsSchema.statics.getLatestForUser = function(userId) {
  return this.findOne({ userId }).sort({ recordedAt: -1 });
};

// Method to get metrics in date range
healthMetricsSchema.statics.getMetricsInRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    recordedAt: { $gte: startDate, $lte: endDate }
  }).sort({ recordedAt: 1 });
};

module.exports = mongoose.model("HealthMetrics", healthMetricsSchema);
