import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import axios from 'axios';

interface PaymentFormProps {
  amount: number;
  spaId: string;
  appointmentId: string;
  serviceName: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Add error handling for missing key
if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  console.warn('Stripe publishable key not found in environment variables');
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({
  amount,
  spaId,
  appointmentId,
  serviceName,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Create PaymentIntent when component mounts
    const createPaymentIntent = async () => {
      try {
        const response = await axios.post('/api/payment/process', {
          amount,
          spa_id: spaId,
          appointment_id: appointmentId,
          service_name: serviceName,
        });
        setClientSecret(response.data.clientSecret);
      } catch (error) {
        onError('Failed to initialize payment');
      }
    };

    createPaymentIntent();
  }, [amount, spaId, appointmentId, serviceName]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/confirmation`,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (error) {
      onError('Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
        <p className="text-gray-600 mb-4">
          Amount to pay: ${amount.toFixed(2)}
        </p>
        {clientSecret && <PaymentElement />}
      </div>
      
      <button
        type="submit"
        disabled={isLoading || !stripe || !elements}
        className="w-full px-4 py-2 text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </div>
        ) : (
          'Pay Now'
        )}
      </button>
    </form>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm; 