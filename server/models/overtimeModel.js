const mongoose = require('mongoose');

const overtimeSchema = mongoose.Schema({
  doctorId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  shiftId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Shift',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0.25,
    max: 24
  },
  reason: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  decisionAt: Date,
  adminComment: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Overtime', overtimeSchema);
