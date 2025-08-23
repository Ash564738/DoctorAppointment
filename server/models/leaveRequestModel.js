const mongoose = require("mongoose");

const leaveRequestSchema = mongoose.Schema(
  {
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      required: true,
      enum: ['sick', 'vacation', 'personal', 'emergency', 'maternity', 'paternity', 'bereavement'],
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v >= this.startDate;
        },
        message: 'End date must be after or equal to start date'
      }
    },
    reason: {
      type: String,
      required: true,
      maxlength: [500, 'Reason too long'],
      minlength: [10, 'Please provide a detailed reason']
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      index: true
    },
    approvedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User"
    },
    approvalDate: {
      type: Date
    },
    rejectionReason: {
      type: String,
      maxlength: [300, 'Rejection reason too long']
    },
    isEmergency: {
      type: Boolean,
      default: false
    },
    attachments: [{
      filename: String,
      url: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }],
    coveringStaff: [{
      staffId: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "User"
      },
      shiftDate: Date,
      status: {
        type: String,
        enum: ['requested', 'accepted', 'declined'],
        default: 'requested'
      }
    }]
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
leaveRequestSchema.index({ staffId: 1, status: 1, startDate: 1 });

// Virtual for leave duration in days
leaveRequestSchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

module.exports = LeaveRequest;
