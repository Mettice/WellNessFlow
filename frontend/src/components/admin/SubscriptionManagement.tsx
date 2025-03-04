import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface Plan {
  id: number;
  name: string;
  monthly_price: number;
  features: {
    chatbot: boolean;
    appointments_per_month: number | 'unlimited';
    document_uploads: number | 'unlimited';
    analytics: string;
    custom_branding?: boolean;
    priority_support?: boolean;
    api_access?: boolean;
    white_label?: boolean;
    dedicated_support?: boolean;
  };
}

const PaymentForm: React.FC<{ plan: Plan; onSuccess: () => void }> = ({ plan, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/admin/subscription/confirm`,
        },
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <PaymentElement />
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={isLoading || !stripe || !elements}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : `Subscribe - $${plan.monthly_price}/month`}
      </button>
    </form>
  );
};

const SubscriptionManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/subscription/plans');
      setPlans(response.data.plans);
    } catch (err: any) {
      setError('Failed to load subscription plans');
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await axios.get('/api/subscription/current', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setCurrentPlan(response.data.plan);
    } catch (err) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = async (plan: Plan) => {
    setSelectedPlan(plan);
    try {
      const response = await axios.post('/api/subscription/create', {
        plan_id: plan.id,
        spa_id: localStorage.getItem('spa_id')
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setClientSecret(response.data.client_secret);
    } catch (err: any) {
      setError('Failed to initialize subscription');
    }
  };

  const renderFeature = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    return value;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Subscription Plans
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
          Choose the perfect plan for your spa
        </p>
      </div>

      {error && (
        <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="mt-12 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-x-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative p-8 bg-white border rounded-2xl shadow-sm flex flex-col ${
              currentPlan === plan.name ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-4 flex items-baseline text-gray-900">
                <span className="text-5xl font-extrabold tracking-tight">${plan.monthly_price}</span>
                <span className="ml-1 text-xl font-semibold">/month</span>
              </p>
              <ul className="mt-6 space-y-6">
                {Object.entries(plan.features).map(([feature, value]) => (
                  <li key={feature} className="flex">
                    <span className="text-primary-500 mr-3">✓</span>
                    <span className="text-gray-500">
                      {feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
                      {' '}
                      {renderFeature(value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {currentPlan !== plan.name ? (
              <button
                onClick={() => handlePlanSelect(plan)}
                className="mt-8 block w-full bg-primary-500 border border-transparent rounded-md py-3 px-6 text-center font-medium text-white hover:bg-primary-600"
              >
                Select Plan
              </button>
            ) : (
              <div className="mt-8 block w-full bg-gray-100 border border-transparent rounded-md py-3 px-6 text-center font-medium text-gray-600">
                Current Plan
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPlan && clientSecret && (
        <div className="mt-12 max-w-md mx-auto bg-white p-8 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Subscribe to {selectedPlan.name}
          </h3>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              plan={selectedPlan}
              onSuccess={() => {
                setSelectedPlan(null);
                fetchCurrentSubscription();
              }}
            />
          </Elements>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement; 