const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  address: {
    type: String,
    trim: true,
    maxLength: 500
  },
  manager: {
    type: String,
    trim: true,
    maxLength: 100
  },
  contact: {
    type: String,
    required: true,
    trim: true,
    maxLength: 20
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    maxLength: 100
  },
  operatingHours: {
    type: String,
    trim: true,
    maxLength: 100
  },
  services: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  establishedDate: {
    type: Date,
    default: Date.now
  },
  capacity: {
    beds: {
      type: Number,
      min: 0,
      default: 0
    },
    rooms: {
      type: Number,
      min: 0,
      default: 0
    },
    staff: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  metadata: {
    totalPatients: {
      type: Number,
      default: 0
    },
    totalAppointments: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
branchSchema.index({ name: 1 });
branchSchema.index({ location: 1 });
branchSchema.index({ status: 1 });
branchSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Virtual for full address
branchSchema.virtual('fullAddress').get(function() {
  return `${this.address}, ${this.location}`;
});

// Virtual for contact info
branchSchema.virtual('contactInfo').get(function() {
  const info = [`Phone: ${this.contact}`];
  if (this.email) info.push(`Email: ${this.email}`);
  if (this.operatingHours) info.push(`Hours: ${this.operatingHours}`);
  return info.join(' | ');
});

module.exports = mongoose.model('Branch', branchSchema);
