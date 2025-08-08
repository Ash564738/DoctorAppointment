const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Appointment",
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR']
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['card', 'paypal', 'bank_transfer', 'wallet']
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true
    },
    stripeChargeId: {
      type: String
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    refundReason: {
      type: String,
      maxLength: [500, 'Refund reason too long']
    },
    refundDate: {
      type: Date
    },
    platformFee: {
      type: Number,
      default: 0,
      min: [0, 'Platform fee cannot be negative']
    },
    doctorEarnings: {
      type: Number,
      required: true,
      min: [0, 'Doctor earnings cannot be negative']
    },
    paymentMetadata: {
      customerEmail: String,
      customerName: String,
      billingAddress: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        postal_code: String,
        country: String
      }
    },
    receiptUrl: {
      type: String
    },
    failureReason: {
      type: String
    },
    notes: {
      type: String,
      maxLength: [1000, 'Notes too long']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
paymentSchema.index({ appointmentId: 1, status: 1 });
paymentSchema.index({ patientId: 1, paymentDate: -1 });
paymentSchema.index({ doctorId: 1, paymentDate: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

// Virtual for net amount after refunds
paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.refundAmount;
});

// Method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  return this.status === 'succeeded' && this.refundAmount < this.amount;
};

// Method to calculate refund amount
paymentSchema.methods.calculateRefund = function(refundAmount) {
  const maxRefund = this.amount - this.refundAmount;
  return Math.min(refundAmount, maxRefund);
};

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
