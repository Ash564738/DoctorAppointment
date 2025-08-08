const mongoose = require("mongoose");

const timeSlotSchema = mongoose.Schema(
  {
    shiftId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Shift",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
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
    maxPatients: {
      type: Number,
      required: true,
      min: [1, 'Must allow at least 1 patient'],
      max: [20, 'Cannot exceed 20 patients']
    },
    bookedPatients: {
      type: Number,
      default: 0,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockReason: {
      type: String,
      maxlength: [200, 'Block reason too long']
    },
    appointments: [{
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Appointment"
    }]
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient slot queries
timeSlotSchema.index({ 
  doctorId: 1, 
  date: 1, 
  startTime: 1,
  isAvailable: 1 
});

// Virtual for availability status
timeSlotSchema.virtual('availabilityStatus').get(function() {
  if (this.isBlocked) return 'blocked';
  if (this.bookedPatients >= this.maxPatients) return 'full';
  if (!this.isAvailable) return 'unavailable';
  return 'available';
});

// Method to check if slot can accept more bookings
timeSlotSchema.methods.canAcceptBooking = function() {
  return this.isAvailable && 
         !this.isBlocked && 
         this.bookedPatients < this.maxPatients;
};

// Method to book a slot
timeSlotSchema.methods.bookSlot = function(appointmentId) {
  if (!this.canAcceptBooking()) {
    throw new Error('Slot is not available for booking');
  }
  
  this.bookedPatients += 1;
  this.appointments.push(appointmentId);
  
  if (this.bookedPatients >= this.maxPatients) {
    this.isAvailable = false;
  }
  
  return this.save();
};

// Method to cancel a booking
timeSlotSchema.methods.cancelBooking = function(appointmentId) {
  this.bookedPatients = Math.max(0, this.bookedPatients - 1);
  this.appointments = this.appointments.filter(id => !id.equals(appointmentId));
  
  if (this.bookedPatients < this.maxPatients && !this.isBlocked) {
    this.isAvailable = true;
  }
  
  return this.save();
};

const TimeSlot = mongoose.model("TimeSlot", timeSlotSchema);

module.exports = TimeSlot;
