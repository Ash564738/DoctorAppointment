const mongoose = require("mongoose");

const ratingSchema = mongoose.Schema({
  appointmentId: { type: mongoose.SchemaTypes.ObjectId, ref: "Appointment", required: true, index: true },
  doctorId: { type: mongoose.SchemaTypes.ObjectId, ref: "User", required: true }, // doctorId is User._id
  patientId: { type: mongoose.SchemaTypes.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

// Ensure a patient can only rate an appointment once
ratingSchema.index({ appointmentId: 1, patientId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);