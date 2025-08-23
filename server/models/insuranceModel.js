const mongoose = require('mongoose');

const insuranceSchema = mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true
  },
  policyNumber: {
    type: String,
    required: true,
    unique: true
  },
  groupNumber: {
    type: String
  },
  coverageType: {
    type: String,
    enum: ['medical', 'dental', 'vision', 'other'],
    default: 'medical'
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxLength: 1000
  }
}, {
  timestamps: true
});

insuranceSchema.index({ userId: 1, provider: 1 });

const Insurance = mongoose.model('Insurance', insuranceSchema);
module.exports = Insurance;
