import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { IoMdClose } from "react-icons/io";
import PaymentForm from "./PaymentForm";
import '../styles/enhancedbookappointment.css';

const EnhancedBookAppointment = ({ setModalOpen, doctor }) => {
  const [formDetails, setFormDetails] = useState({
    date: "",
    time: "",
    symptoms: "",
    appointmentType: "regular",
    priority: "normal"
  });
  
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [step, setStep] = useState(1); // 1: Date, 2: Time Slot, 3: Details, 4: Payment

  useEffect(() => {
    if (formDetails.date) {
      fetchAvailableSlots(formDetails.date);
    }
  }, [formDetails.date]);

  const fetchAvailableSlots = async (date) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/shift/available-slots/${doctor.userId._id}/${date}`
      );
      
      if (response.data.success) {
        setAvailableSlots(response.data.slots);
      } else {
        setAvailableSlots([]);
        toast.error("No available slots for this date");
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
      setAvailableSlots([]);
      toast.error("Failed to fetch available time slots");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormDetails({ ...formDetails, [name]: value });
    
    if (name === "date") {
      setSelectedSlot(null);
      setStep(1);
    }
  };

  const handleSlotSelection = (slot) => {
    setSelectedSlot(slot);
    setFormDetails({ ...formDetails, time: slot.startTime });
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }

    if (!formDetails.symptoms || formDetails.symptoms.length < 3) {
      toast.error("Please provide detailed symptoms (minimum 3 characters)");
      return;
    }

    setShowPayment(true);
  };

  const onPaymentSuccess = async (paymentData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const appointmentData = {
        doctorId: doctor.userId._id,
        date: formDetails.date,
        time: formDetails.time,
        symptoms: formDetails.symptoms,
        timeSlotId: selectedSlot._id,
        appointmentType: formDetails.appointmentType,
        priority: formDetails.priority,
        paymentData
      };

      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_DOMAIN}/api/appointment/bookappointment`,
        appointmentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Appointment booked successfully!");
        setModalOpen(false);
      } else {
        toast.error(response.data.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error(error.response?.data?.message || "Failed to book appointment");
    } finally {
      setLoading(false);
      setShowPayment(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    toast.error("Payment cancelled. Appointment not confirmed.");
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3); // Allow booking up to 3 months ahead
    return maxDate.toISOString().split('T')[0];
  };

  const formatSlotTime = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };

  const getSlotStatus = (slot) => {
    const percentage = (slot.bookedPatients / slot.maxPatients) * 100;
    if (percentage === 0) return { status: 'available', text: 'Available', class: 'available' };
    if (percentage < 50) return { status: 'low', text: 'Few spots left', class: 'low-availability' };
    if (percentage < 90) return { status: 'medium', text: 'Limited spots', class: 'medium-availability' };
    return { status: 'high', text: 'Almost full', class: 'high-availability' };
  };

  if (showPayment) {
    return (
      <PaymentForm
        appointmentData={{
          doctor: `Dr. ${doctor.userId.firstname} ${doctor.userId.lastname}`,
          date: formDetails.date,
          time: formDetails.time,
          symptoms: formDetails.symptoms,
          fee: doctor.fees || 100
        }}
        onSuccess={onPaymentSuccess}
        onCancel={handlePaymentCancel}
      />
    );
  }

  return (
    <div className="enhanced-booking-modal">
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Book Appointment</h2>
            <button 
              className="close-btn" 
              onClick={() => setModalOpen(false)}
              disabled={loading}
            >
              <IoMdClose />
            </button>
          </div>

          <div className="doctor-info">
            <div className="doctor-details">
              <h3>Dr. {doctor.userId.firstname} {doctor.userId.lastname}</h3>
              <p className="specialization">{doctor.specialization}</p>
              <p className="experience">{doctor.experience} years experience</p>
              <p className="fees">Consultation Fee: ₹{doctor.fees}</p>
            </div>
          </div>

          <div className="booking-steps">
            <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Select Date</span>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Choose Time</span>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Details</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="booking-form">
            {/* Step 1: Date Selection */}
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="date">Select Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formDetails.date}
                  onChange={handleInputChange}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  required
                />
              </div>
            </div>

            {/* Step 2: Time Slot Selection */}
            {formDetails.date && (
              <div className="form-section">
                <label>Available Time Slots *</label>
                
                {loading ? (
                  <div className="loading-slots">Loading available slots...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="no-slots">
                    <p>No available slots for this date.</p>
                    <p>Please select a different date.</p>
                  </div>
                ) : (
                  <div className="slots-grid">
                    {availableSlots.map((slot) => {
                      const slotStatus = getSlotStatus(slot);
                      return (
                        <div
                          key={slot._id}
                          className={`slot-card ${selectedSlot?._id === slot._id ? 'selected' : ''} ${slotStatus.class}`}
                          onClick={() => handleSlotSelection(slot)}
                        >
                          <div className="slot-time">
                            {formatSlotTime(slot.startTime, slot.endTime)}
                          </div>
                          <div className="slot-info">
                            <span className="availability-status">{slotStatus.text}</span>
                            <span className="slot-capacity">
                              {slot.maxPatients - slot.bookedPatients} spots left
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Appointment Details */}
            {selectedSlot && (
              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="appointmentType">Appointment Type</label>
                  <select
                    id="appointmentType"
                    name="appointmentType"
                    value={formDetails.appointmentType}
                    onChange={handleInputChange}
                  >
                    <option value="regular">Regular Consultation</option>
                    <option value="emergency">Emergency</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="consultation">General Consultation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formDetails.priority}
                    onChange={handleInputChange}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="symptoms">Describe your symptoms *</label>
                  <textarea
                    id="symptoms"
                    name="symptoms"
                    value={formDetails.symptoms}
                    onChange={handleInputChange}
                    placeholder="Please describe your symptoms, concerns, or reason for the appointment in detail..."
                    required
                    rows="4"
                    minLength="3"
                    maxLength="1000"
                  />
                  <small className="char-count">
                    {formDetails.symptoms.length}/1000 characters
                  </small>
                </div>
              </div>
            )}

            {/* Selected Appointment Summary */}
            {selectedSlot && formDetails.symptoms && (
              <div className="appointment-summary">
                <h4>Appointment Summary</h4>
                <div className="summary-details">
                  <p><strong>Doctor:</strong> Dr. {doctor.userId.firstname} {doctor.userId.lastname}</p>
                  <p><strong>Date:</strong> {new Date(formDetails.date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {formatSlotTime(selectedSlot.startTime, selectedSlot.endTime)}</p>
                  <p><strong>Type:</strong> {formDetails.appointmentType}</p>
                  <p><strong>Priority:</strong> {formDetails.priority}</p>
                  <p><strong>Fee:</strong> ₹{doctor.fees}</p>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              
              {selectedSlot && formDetails.symptoms && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Proceed to Payment"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnhancedBookAppointment;
