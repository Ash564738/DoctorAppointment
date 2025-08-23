const mongoose = require('mongoose');

const calendarSyncSchema = mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['google', 'outlook', 'apple', 'other'],
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  syncEnabled: {
    type: Boolean,
    default: true
  },
  lastSync: {
    type: Date
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

calendarSyncSchema.index({ userId: 1, provider: 1 });

const CalendarSync = mongoose.model('CalendarSync', calendarSyncSchema);
module.exports = CalendarSync;
