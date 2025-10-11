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
      enum: ['Card', 'Paypal', 'Bank_transfer', 'Wallet']
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
      enum: ['Pending', 'Processing', 'Succeeded', 'Failed', 'Cancelled', 'Refunded', 'Partially_Refunded'],
      default: 'Pending',
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
    refundProcessedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User"
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
      type: String,
      default: null
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

paymentSchema.index({ appointmentId: 1, status: 1 });
paymentSchema.index({ patientId: 1, paymentDate: -1 });
paymentSchema.index({ doctorId: 1, paymentDate: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.refundAmount;
});

paymentSchema.methods.canRefund = function() {
  return this.status === 'Succeeded' && this.refundAmount < this.amount;
};

paymentSchema.methods.calculateRefund = function(refundAmount) {
  const maxRefund = this.amount - this.refundAmount;
  return Math.min(refundAmount, maxRefund);
};

paymentSchema.methods.processRefund = function(refundAmount, reason, processedBy = null) {
  if (!this.canRefund()) {
    throw new Error('Payment is not eligible for refund');
  }
  
  const actualRefundAmount = this.calculateRefund(refundAmount);
  this.refundAmount = (this.refundAmount || 0) + actualRefundAmount;
  this.refundReason = reason;
  this.refundDate = new Date();
  this.refundProcessedBy = processedBy;
  
  // Update status based on refund amount
  if (this.refundAmount >= this.amount) {
    this.status = 'Refunded';
  } else if (this.refundAmount > 0) {
    this.status = 'Partially_Refunded';
  }
  
  return actualRefundAmount;
};

paymentSchema.methods.getRefundPercentage = function() {
  if (this.amount === 0) return 0;
  return Math.round((this.refundAmount / this.amount) * 100);
};

paymentSchema.methods.isFullyRefunded = function() {
  return this.refundAmount >= this.amount;
};

paymentSchema.methods.isPartiallyRefunded = function() {
  return this.refundAmount > 0 && this.refundAmount < this.amount;
};

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
