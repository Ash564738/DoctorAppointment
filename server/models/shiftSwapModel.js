const mongoose = require('mongoose');

const shiftSwapSchema = mongoose.Schema({
  requesterId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalShiftId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Shift',
    required: true
  },
  requestedShiftId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'Shift',
    required: true
  },
  swapWithId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  reason: {
    type: String,
    maxlength: 500
  },
  adminComment: {
    type: String,
    maxlength: 500
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  decisionAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('ShiftSwap', shiftSwapSchema);
