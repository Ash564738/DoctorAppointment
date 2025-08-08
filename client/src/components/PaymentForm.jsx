import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import '../styles/payment.css';

// Demo mode detection - temporarily force to false for testing
const isDemoMode = false; // !process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY.includes('demo');

// Initialize Stripe with fallback for testing
const stripePublishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo_key_for_testing';
const stripePromise = isDemoMode ? null : loadStripe(stripePublishableKey);

// Demo Payment Component for testing
const DemoPaymentForm = ({ appointmentData, amount, onPaymentSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoPayment = async () => {
    setIsLoading(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful payment confirmation
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/payment/confirm-payment',
        {
          paymentIntentId: `pi_demo_${Date.now()}`,
          demoMode: true
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('🎉 Demo Payment Successful! Appointment confirmed.');
      onPaymentSuccess?.(response.data);

    } catch (error) {
      console.error('Demo payment error:', error);
      toast.error('Demo payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="demo-payment-container">
      <div className="demo-notice">
        <h3>🎭 Demo Payment Mode</h3>
        <p>This is a demonstration. No real payment will be processed.</p>
      </div>

      <div className="payment-summary">
        <h4>Payment Summary</h4>
        <div className="amount-display">
          <span>Consultation Fee: </span>
          <strong>${amount}</strong>
        </div>
      </div>

      <button
        onClick={handleDemoPayment}
        disabled={isLoading}
        className="demo-pay-button"
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isLoading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginTop: '20px'
        }}
      >
        {isLoading ? '⏳ Processing Demo Payment...' : `💳 Pay $${amount} (Demo)`}
      </button>

      <button
        onClick={onCancel}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: 'transparent',
          color: '#666',
          border: '1px solid #ddd',
          borderRadius: '5px',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Cancel
      </button>
    </div>
  );
};

const PaymentForm = ({ appointmentData, amount, onPaymentSuccess, onCancel }) => {
  // Always call hooks at the top level - React Hooks rules
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);

  const createPaymentIntent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/payment/create-payment-intent',
        {
          appointmentData,
          amount,
          currency: 'USD'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setClientSecret(response.data.clientSecret);
        setPaymentDetails({
          paymentId: response.data.paymentId,
          amount: response.data.amount,
          platformFee: response.data.platformFee,
          doctorEarnings: response.data.doctorEarnings
        });
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast.error('Failed to initialize payment');
    }
  };

  useEffect(() => {
    if (!isDemoMode && appointmentData) {
      createPaymentIntent();
    }
  }, [appointmentData, amount]);

  // Use demo payment form if in demo mode (after hooks)
  if (isDemoMode) {
    return <DemoPaymentForm
      appointmentData={appointmentData}
      amount={amount}
      onPaymentSuccess={onPaymentSuccess}
      onCancel={onCancel}
    />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        console.error('Payment failed:', error);
        toast.error(error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        const token = localStorage.getItem('token');
        const response = await axios.post(
          '/payment/confirm-payment',
          {
            paymentIntentId: paymentIntent.id
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          toast.success('Payment successful! Your appointment is confirmed.');
          onPaymentSuccess(response.data.payment);
        } else {
          toast.error('Payment confirmation failed');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    }

    setIsProcessing(false);
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
  };

  return (
    <div className="payment-form-container">
      <div className="payment-header">
        <h3>💳 Payment Details</h3>
        <button className="payment-close-btn" onClick={onCancel}>×</button>
      </div>

      {paymentDetails && (
        <div className="payment-summary">
          <div className="amount-breakdown">
            <div className="breakdown-item">
              <span>Consultation Fee:</span>
              <span>${paymentDetails.amount}</span>
            </div>
            <div className="breakdown-item platform-fee">
              <span>Platform Fee:</span>
              <span>${paymentDetails.platformFee}</span>
            </div>
            <div className="breakdown-item total">
              <span>Total Amount:</span>
              <span>${paymentDetails.amount}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="card-element-container">
          <label htmlFor="card-element">
            Credit or Debit Card
          </label>
          <CardElement
            id="card-element"
            options={cardElementOptions}
            className="card-element"
          />
        </div>

        <div className="payment-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || isProcessing}
            className="pay-btn"
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              `Pay $${paymentDetails?.amount || amount}`
            )}
          </button>
        </div>
      </form>

      <div className="payment-security">
        <div className="security-badges">
          <span className="security-badge">🔒 SSL Secured</span>
          <span className="security-badge">💳 Stripe Protected</span>
        </div>
        <p className="security-text">
          Your payment information is encrypted and secure. We never store your card details.
        </p>
      </div>
    </div>
  );
};

// Wrapper component with Stripe Elements provider
const PaymentFormWrapper = ({ appointmentData, amount, onPaymentSuccess, onCancel }) => {
  // If Stripe is not configured, show configuration message
  if (!stripePromise) {
    return (
      <div className="payment-container">
        <div className="payment-header">
          <h2>⚙️ Payment Configuration Required</h2>
          <button onClick={onCancel} className="payment-close-btn">×</button>
        </div>
        <div className="payment-content">
          <div className="config-message">
            <div className="config-icon">🔧</div>
            <h3>Stripe Configuration Needed</h3>
            <p>To enable payments, please:</p>
            <ol>
              <li>Sign up for a Stripe account at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">stripe.com</a></li>
              <li>Get your publishable key from the Stripe dashboard</li>
              <li>Add it to your .env file as REACT_APP_STRIPE_PUBLISHABLE_KEY</li>
              <li>Restart the application</li>
            </ol>
            <p><strong>For testing:</strong> Use test keys that start with "pk_test_"</p>
          </div>
          <div className="config-actions">
            <button onClick={onCancel} className="btn-secondary">
              Close
            </button>
            <button
              onClick={() => window.open('https://stripe.com', '_blank')}
              className="btn-primary"
            >
              Get Stripe Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        appointmentData={appointmentData}
        amount={amount}
        onPaymentSuccess={onPaymentSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};

export default PaymentFormWrapper;
