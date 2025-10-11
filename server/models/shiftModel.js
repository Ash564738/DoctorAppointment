const mongoose = require("mongoose");

const shiftSchema = mongoose.Schema(
  {
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Shift title too long']
    },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'End time must be in HH:MM format'
      }
    },
    daysOfWeek: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    }],
    maxPatientsPerHour: {
      type: Number,
      default: 4,
      min: [1, 'Must allow at least 1 patient per hour'],
      max: [20, 'Cannot exceed 20 patients per hour']
    },
    slotDuration: {
      type: Number,
      default: 15,
      enum: [15, 30, 45, 60],
      required: true
    },
    department: {
      type: String,
      default: 'General'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true
    },
    requestedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User'
    },
    adminComment: {
      type: String,
      maxlength: [500, 'Admin comment too long']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    specialNotes: {
      type: String,
      maxlength: [500, 'Special notes too long']
    },
    breakTime: {
      start: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Break start time must be in HH:MM format'
        }
      },
      end: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Break end time must be in HH:MM format'
        }
      }
    }
  },
  {
    timestamps: true,
  }
);

shiftSchema.index({ doctorId: 1, daysOfWeek: 1, isActive: 1 });
shiftSchema.pre('save', function(next) {
  const startHour = parseInt(this.startTime.split(':')[0]);
  const startMinute = parseInt(this.startTime.split(':')[1]);
  const endHour = parseInt(this.endTime.split(':')[0]);
  const endMinute = parseInt(this.endTime.split(':')[1]);
  
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  
  if (endTotal <= startTotal) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});
const Shift = mongoose.model("Shift", shiftSchema);

module.exports = Shift;
