import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiCall } from '../../../helper/apiCall';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './BookAppointment.css';
import ReactDOM from 'react-dom';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const BookAppointment_paymentForm = ({
  consultationFee,
  appointmentData,
  onPaymentSuccess,
  onPaymentError,
  isLoading,
  setIsLoading
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [BookAppointment_clientSecret, setBookAppointment_clientSecret] = useState('');
  const [BookAppointment_paymentIntentId, setBookAppointment_paymentIntentId] = useState('');
  useEffect(() => {
    createPaymentIntent();
  }, []);
  const createPaymentIntent = async () => {
    try {
      const response = await apiCall.post('/payment/create-payment-intent', {
        appointmentData,
        amount: consultationFee,
        currency: 'USD'
      });
      if (response.success) {
        setBookAppointment_clientSecret(response.clientSecret);
        setBookAppointment_paymentIntentId(response.paymentIntentId);
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (error) {
      toast.error('Failed to initialize payment');
    }
  };
  const handlePayment = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Payment form not loaded');
      return;
    }
    setIsLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(BookAppointment_clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });
      if (error) {
        toast.error(error.message || 'Payment failed');
        onPaymentError(error);
      } else if (paymentIntent.status === 'succeeded') {
        const confirmResponse = await apiCall.post('/payment/confirm-payment', {
          paymentIntentId: paymentIntent.id
        });

        if (confirmResponse.success) {
          toast.success('Payment successful! Appointment booked.');
          onPaymentSuccess(paymentIntent);
        } else {
          toast.error('Payment succeeded but booking failed');
          onPaymentError(new Error('Booking failed'));
        }
      }
    } catch (error) {
      toast.error('Payment processing failed');
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };
  return (
    <form onSubmit={handlePayment} className="BookAppointment_paymentForm" name="BookAppointment_paymentForm">
      <div className="BookAppointment_cardElementContainer" name="BookAppointment_cardElementContainer">
        <label htmlFor="card-element" name="BookAppointment_cardElementLabel">Card Details</label>
        <CardElement
          id="card-element"
          options={cardElementOptions}
          className="BookAppointment_cardElement"
          name="BookAppointment_cardElement"
        />
      </div>

      <div className="BookAppointment_paymentSummary" name="BookAppointment_paymentSummary">
        <div className="BookAppointment_summaryRow" name="BookAppointment_summaryRow_fee">
          <span>Consultation Fee:</span>
          <span>${consultationFee}</span>
        </div>
        <div className="BookAppointment_summaryRow BookAppointment_summaryRowTotal" name="BookAppointment_summaryRow_total">
          <span><strong>Total Amount:</strong></span>
          <span><strong>${consultationFee}</strong></span>
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || isLoading || !BookAppointment_clientSecret}
        className="BookAppointment_btnPay"
        name="BookAppointment_btnPay"
      >
        {isLoading ? 'Processing Payment...' : `Pay $${consultationFee} & Book Appointment`}
      </button>
    </form>
  );
};

const BookAppointment = ({
  modalOpen,
  setModalOpen,
  ele
}) => {
  const [BookAppointment_formDetails, setBookAppointment_formDetails] = useState({
    date: '',
    time: '',
    message: ''
  });
  const [BookAppointment_isLoading, setBookAppointment_isLoading] = useState(false);
  const [BookAppointment_showPayment, setBookAppointment_showPayment] = useState(false);
  const [BookAppointment_doctorAvailability, setBookAppointment_doctorAvailability] = useState([]);
  const [BookAppointment_availabilityStatus, setBookAppointment_availabilityStatus] = useState(null);
  const consultationFee = ele?.fees || 100;
  useEffect(() => {
    if (ele?._id && BookAppointment_formDetails.date) {
      fetchDoctorAvailability();
    }
  }, [ele?._id, BookAppointment_formDetails.date]);
  const fetchDoctorAvailability = async () => {
    try {
      const response = await apiCall.get(`/doctor/${ele._id}/availability?date=${BookAppointment_formDetails.date}`);
      
      if (response.success) {
        if (!response.available) {
          // Try to auto-suggest the next available day within 14 days
          const suggestion = await findNextAvailableDay(ele._id, BookAppointment_formDetails.date, 14);
          if (suggestion) {
            // Auto-move to next available day to avoid dead-end UX
            setBookAppointment_formDetails(prev => ({ ...prev, date: suggestion.date, time: '' }));
            setBookAppointment_doctorAvailability(suggestion.availableSlots.map(s => s.time));
            setBookAppointment_availabilityStatus({
              available: true,
              reason: `Auto-selected next available day: ${new Date(suggestion.date).toLocaleDateString()}`,
              shifts: suggestion.shifts
            });
            toast.success(`No slots on selected day. Showing availability for ${new Date(suggestion.date).toLocaleDateString()}.`);
            return;
          }
          // No availability found in the lookahead window
          setBookAppointment_doctorAvailability([]);
          setBookAppointment_availabilityStatus({
            available: false,
            reason: response.reason
          });
          return;
        }
        
        const availableSlots = response.availableSlots.map(slot => slot.time);
        setBookAppointment_doctorAvailability(availableSlots);
        setBookAppointment_availabilityStatus({
          available: true,
          reason: response.reason,
          shifts: response.shifts
        });
      } else {
        // No fake default slots: indicate unavailability clearly
        setBookAppointment_doctorAvailability([]);
        setBookAppointment_availabilityStatus({
          available: false,
          reason: 'No availability found for the selected date.'
        });
      }
    } catch (error) {
      // On error, show no availability instead of fake defaults
      setBookAppointment_doctorAvailability([]);
      setBookAppointment_availabilityStatus({
        available: false,
        reason: 'Unable to fetch availability. Please try another date.'
      });
    }
  };

  // Find next available day up to `daysAhead` days from `fromDate` (inclusive next day)
  const findNextAvailableDay = async (doctorId, fromDate, daysAhead = 7) => {
    try {
      const start = new Date(fromDate);
      for (let i = 1; i <= daysAhead; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const resp = await apiCall.get(`/doctor/${doctorId}/availability?date=${ymd}`);
        if (resp?.success && resp.available && Array.isArray(resp.availableSlots) && resp.availableSlots.length > 0) {
          return { date: ymd, availableSlots: resp.availableSlots, shifts: resp.shifts };
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };
  const inputChange = (e) => {
    const { name, value } = e.target;
    setBookAppointment_formDetails({
      ...BookAppointment_formDetails,
      [name]: value
    });
  };
  const validateForm = () => {
    if (!BookAppointment_formDetails.date || !BookAppointment_formDetails.time) {
      toast.error('Please select date and time');
      return false;
    }

    // Check if doctor is available for selected date/time
    if (BookAppointment_availabilityStatus && !BookAppointment_availabilityStatus.available) {
      toast.error('Doctor is not available on the selected date');
      return false;
    }

    const selectedDate = new Date(BookAppointment_formDetails.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Please select a future date');
      return false;
    }

    // Validate selected time is in available slots
    if (BookAppointment_doctorAvailability.length > 0 && 
        !BookAppointment_doctorAvailability.includes(BookAppointment_formDetails.time)) {
      toast.error('Selected time slot is no longer available');
      return false;
    }

    return true;
  };
  const proceedToPayment = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setBookAppointment_showPayment(true);
  };
  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      setModalOpen(false);
      setBookAppointment_formDetails({ date: '', time: '', message: '' });
      setBookAppointment_showPayment(false);
      if (window.location.pathname.includes('patient')) {
        window.location.reload();
      }
    } catch (error) {
    }
  };
  const handlePaymentError = (error) => {
  };
  const handleBackToForm = () => {
    setBookAppointment_showPayment(false);
  };
  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : undefined;
  const appointmentData = {
    doctorId: ele?._id,
    doctorname: `${ele?.firstname} ${ele?.lastname}`,
    date: BookAppointment_formDetails.date,
    time: BookAppointment_formDetails.time,
    symptoms: BookAppointment_formDetails.message || 'No additional message',
  };
  if (!modalOpen) return null;
  return ReactDOM.createPortal(
    <Elements stripe={stripePromise}>
      <div className="BookAppointment_modalOverlay" name="BookAppointment_modalOverlay">
        <div className="BookAppointment_modalContent" name="BookAppointment_modalContent">
          <div className="BookAppointment_modalHeader" name="BookAppointment_modalHeader">
            <h3 className="BookAppointment_modalTitle" name="BookAppointment_modalTitle">
              Book Appointment with Dr. {ele?.firstname} {ele?.lastname}
            </h3>
            <button
              className="BookAppointment_closeBtn"
              name="BookAppointment_closeBtn"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="4" x2="16" y2="16"/>
                <line x1="16" y1="4" x2="4" y2="16"/>
              </svg>
            </button>
          </div>
          {!BookAppointment_showPayment ? (
            <form onSubmit={proceedToPayment} className="BookAppointment_form" name="BookAppointment_form">
              <div className="BookAppointment_formGroup" name="BookAppointment_formGroup_date">
                <label htmlFor="date" name="BookAppointment_label_date">Select Date:</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={BookAppointment_formDetails.date}
                  onChange={inputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="BookAppointment_input"
                />
              </div>

              <div className="BookAppointment_formGroup" name="BookAppointment_formGroup_time">
                <label htmlFor="time" name="BookAppointment_label_time">Select Time:</label>
                {BookAppointment_availabilityStatus && !BookAppointment_availabilityStatus.available ? (
                  <div className="BookAppointment_unavailableMessage">
                    <p style={{color: '#dc3545', margin: '8px 0', fontSize: '14px'}}>
                      {BookAppointment_availabilityStatus.reason}
                    </p>
                    <select disabled className="BookAppointment_select" style={{opacity: 0.5}}>
                      <option>No time slots available</option>
                    </select>
                  </div>
                ) : (
                  <>
                    {BookAppointment_availabilityStatus?.reason && (
                      <p style={{color: '#6c757d', margin: '4px 0 8px 0', fontSize: '12px'}}>
                        {BookAppointment_availabilityStatus.reason}
                      </p>
                    )}
                    <select
                      id="time"
                      name="time"
                      value={BookAppointment_formDetails.time}
                      onChange={inputChange}
                      required
                      className="BookAppointment_select"
                    >
                      <option value="">Choose a time</option>
                      {BookAppointment_doctorAvailability.length > 0 ? (
                        BookAppointment_doctorAvailability.map((timeSlot) => (
                          <option key={timeSlot} value={timeSlot}>
                            {timeSlot}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No time slots available</option>
                      )}
                    </select>
                  </>
                )}
              </div>

              <div className="BookAppointment_formGroup" name="BookAppointment_formGroup_message">
                <label htmlFor="message" name="BookAppointment_label_message">Symptoms / Reason for Visit:</label>
                <textarea
                  id="message"
                  name="message"
                  value={BookAppointment_formDetails.message}
                  onChange={inputChange}
                  placeholder="Describe your symptoms or reason for visit..."
                  rows="4"
                  required
                  className="BookAppointment_textarea"
                />
              </div>
              
              <div className="BookAppointment_feeSection" name="BookAppointment_feeSection">
                <div className="BookAppointment_feeDisplay" name="BookAppointment_feeDisplay">
                  <h4 className="BookAppointment_feeTitle" name="BookAppointment_feeTitle">Consultation Fee</h4>
                  <div className="BookAppointment_feeAmount" name="BookAppointment_feeAmount">${consultationFee}</div>
                  <p className="BookAppointment_feeNote" name="BookAppointment_feeNote">Payment required to confirm appointment</p>
                </div>
              </div>

              <div className="BookAppointment_modalActions" name="BookAppointment_modalActions">
                <button
                  type="submit"
                  className="BookAppointment_btnContinue"
                  name="BookAppointment_btnContinue"
                  disabled={!BookAppointment_formDetails.date || !BookAppointment_formDetails.time || 
                           (BookAppointment_availabilityStatus && !BookAppointment_availabilityStatus.available)}
                >
                  {BookAppointment_availabilityStatus && !BookAppointment_availabilityStatus.available 
                    ? 'No Available Slots' 
                    : 'Continue to Payment'
                  }
                </button>
              </div>
            </form>
          ) : (
            <div className="BookAppointment_paymentSection" name="BookAppointment_paymentSection">
              <h4 className="BookAppointment_paymentTitle" name="BookAppointment_paymentTitle">Payment & Confirmation</h4>
              <div className="BookAppointment_appointmentSummary" name="BookAppointment_appointmentSummary">
                <div className="BookAppointment_summaryItem" name="BookAppointment_summaryItem_doctor">
                  <span className="BookAppointment_label" name="BookAppointment_label_doctor">Doctor:</span>
                  <span className="BookAppointment_value" name="BookAppointment_value_doctor">Dr. {ele?.firstname} {ele?.lastname}</span>
                </div>
                <div className="BookAppointment_summaryItem" name="BookAppointment_summaryItem_date">
                  <span className="BookAppointment_label" name="BookAppointment_label_date">Date:</span>
                  <span className="BookAppointment_value" name="BookAppointment_value_date">{new Date(BookAppointment_formDetails.date).toLocaleDateString()}</span>
                </div>
                <div className="BookAppointment_summaryItem" name="BookAppointment_summaryItem_time">
                  <span className="BookAppointment_label" name="BookAppointment_label_time">Time:</span>
                  <span className="BookAppointment_value" name="BookAppointment_value_time">{BookAppointment_formDetails.time}</span>
                </div>
                <div className="BookAppointment_summaryItem" name="BookAppointment_summaryItem_symptoms">
                  <span className="BookAppointment_label" name="BookAppointment_label_symptoms">Symptoms:</span>
                  <span className="BookAppointment_value" name="BookAppointment_value_symptoms">{BookAppointment_formDetails.message || 'No additional message'}</span>
                </div>
              </div>

              <BookAppointment_paymentForm
                consultationFee={consultationFee}
                appointmentData={appointmentData}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                isLoading={BookAppointment_isLoading}
                setIsLoading={setBookAppointment_isLoading}
              />

              <div className="BookAppointment_modalActions BookAppointment_paymentActions" name="BookAppointment_modalActions_payment">
                <button
                  type="button"
                  className="BookAppointment_btnBack"
                  name="BookAppointment_btnBack"
                  onClick={handleBackToForm}
                  disabled={BookAppointment_isLoading}
                >
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="12 4 6 10 12 16" />
                    </svg>
                  </span>
                  Back to Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Elements>,
    document.body
  );
};

export default BookAppointment;