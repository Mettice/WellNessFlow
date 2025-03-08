import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setFormData({ ...formData, email: newEmail });
    
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address (e.g., example@domain.com)');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address (e.g., example@domain.com)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting registration with:', {
        email: formData.email,
        businessName: formData.businessName
      });
      
      const result = await register(
        formData.businessName,
        formData.email,
        formData.password
      );
      
      console.log('Registration successful, full result:', result);
      
      // After successful registration, redirect to onboarding if required
      if (result.requiresOnboarding) {
        console.log('Onboarding required, redirecting to /onboarding');
        localStorage.setItem('show_guided_tour', 'true');
        navigate('/onboarding');
      } else {
        console.log('No onboarding required, redirecting to /admin');
        navigate('/admin');
      }
    } catch (err: any) {
      console.error('Registration error details:', err.response?.data || err);
      setError(err.response?.data?.error || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-dark-300 p-8 rounded-xl">
        <div>
          <img className="mx-auto h-12 w-auto" src="/logo.png" alt="WellnessFlow" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Or{' '}
            <Link to="/login" className="font-medium text-[#5F9EAD] hover:text-[#4A7A8C]">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-20 text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="business-name" className="sr-only">
                Business Name
              </label>
              <input
                id="business-name"
                name="businessName"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 bg-dark-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9EAD] focus:border-transparent"
                placeholder="Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 bg-dark-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9EAD] focus:border-transparent"
                placeholder="Email address"
                value={formData.email}
                onChange={handleEmailChange}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-400">{emailError}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 bg-dark-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9EAD] focus:border-transparent"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 bg-dark-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5F9EAD] focus:border-transparent"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#5F9EAD] hover:bg-[#4A7A8C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5F9EAD] ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 