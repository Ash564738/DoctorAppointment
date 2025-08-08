import React, { useState, useRef } from "react";
import "../styles/bookappointment.css";
import toast from "react-hot-toast";
import { IoMdClose } from "react-icons/io";
import PaymentForm from "./PaymentForm";
import ChatInterface from "./ChatInterface";

const BookAppointment = ({ setModalOpen, ele }) => {
  const [formDetails, setFormDetails] = useState({
    date: "",
    time: "",
    symptoms: "",
  });
  const [showPayment, setShowPayment] = useState(false);
  const [appointmentData, setAppointmentData] = useState(null);
  const [currentAppointmentInfo, setCurrentAppointmentInfo] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const appointmentRef = useRef(null);

  // No auto-fill needed - all data is in user profile

  const inputChange = (e) => {
    const { name, value } = e.target;
    return setFormDetails({
      ...formDetails,
      [name]: value,
    });
  };

  const bookAppointment = async (e) => {
    e.preventDefault();

    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to book an appointment");
      return;
    }

    // Validate form data
    if (!formDetails.date || !formDetails.time || !formDetails.symptoms) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formDetails.symptoms.length < 3) {
      toast.error("Please provide more detailed symptoms (minimum 3 characters)");
      return;
    }

    // Store appointment data and show payment form (NO DATABASE CREATION YET)
    const appointmentInfo = {
      doctorId: ele?.userId?._id,
      date: formDetails.date,
      time: formDetails.time,
      symptoms: formDetails.symptoms,
      doctorname: `${ele?.userId?.firstname} ${ele?.userId?.lastname}`,
    };

    // Set appointment data in multiple ways to ensure it's available
    setAppointmentData(appointmentInfo);
    setCurrentAppointmentInfo(appointmentInfo);
    appointmentRef.current = appointmentInfo;

    // Use setTimeout to ensure state update completes before showing payment
    setTimeout(() => {
      setShowPayment(true);
    }, 100);
  };



    const onPaymentSuccess = (paymentData) => {
    // Payment successful - appointment should already be created by backend
    toast.success('Payment successful and appointment booked!');
    setShowPayment(false);
    // Clear form or redirect
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    toast.error("Payment cancelled. Appointment not confirmed.");
  };

  return (
    <>
      {!showPayment && !showChat && (
        <div className="modal flex-center">
          <div className="modal__content">
            <IoMdClose
              onClick={() => {
                setModalOpen(false);
              }}
              className="booking-modal-close-btn"
            />
            <div className="register-container flex-center book">
              <form className="register-form">
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  value={formDetails.date}
                  onChange={inputChange}
                />
                <input
                  type="time"
                  name="time"
                  className="form-input"
                  value={formDetails.time}
                  onChange={inputChange}
                />
              <textarea
                name="symptoms"
                placeholder="Describe your symptoms or reason for visit (minimum 3 characters)"
                className="form-input"
                value={formDetails.symptoms}
                onChange={inputChange}
                rows="4"
                required
                minLength="3"
              ></textarea>
              <p style={{fontSize: '14px', color: '#666', marginTop: '10px'}}>
                Your personal information (age, blood group, contact details, etc.) will be automatically taken from your profile.
              </p>

              <div style={{marginTop: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9'}}>
                <p style={{fontSize: '14px', color: '#0c4a6e', margin: '0 0 5px 0', fontWeight: '500'}}>
                  💰 Consultation Fee: ${ele?.fees || 50}
                </p>
                <p style={{fontSize: '12px', color: '#0369a1', margin: '0'}}>
                  Payment will be processed after booking confirmation
                </p>
              </div>

                <button
                  type="submit"
                  className="btn form-btn"
                  onClick={bookAppointment}
                >
                  Book & Pay ${ele?.fees || 50}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {(() => {
        return showPayment && (appointmentRef.current || currentAppointmentInfo);
      })() && (
        <div className="modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="modal__content payment-modal" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <PaymentForm
              appointmentData={appointmentRef.current || currentAppointmentInfo}
              amount={ele?.fees || 50}
              onPaymentSuccess={onPaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}

      {showChat && (
        <div className="modal">
          <div className="modal__content chat-modal">
            <ChatInterface
              appointmentId={null}
              onClose={() => {
                setShowChat(false);
                setModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default BookAppointment;
