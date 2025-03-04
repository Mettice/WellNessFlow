import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';

interface OnboardingStep {
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Welcome to SpaBot",
    description: "Let's get your spa set up with AI-powered booking"
  },
  {
    title: "Customize Your Services",
    description: "Set up your service menu and pricing"
  },
  {
    title: "Calendar Integration",
    description: "Connect your booking calendar"
  }
];

const DEFAULT_SERVICES = [
  { 
    name: 'Swedish Massage', 
    duration: 60, 
    price: 85,
    description: 'Relaxing massage using long, flowing strokes',
    category: 'Massage'
  },
  { 
    name: 'Deep Tissue Massage', 
    duration: 60, 
    price: 95,
    description: 'Therapeutic massage targeting deep muscle layers',
    category: 'Massage'
  },
  { 
    name: 'Classic Facial', 
    duration: 60, 
    price: 75,
    description: 'Deep cleansing facial with steam and mask',
    category: 'Facial'
  }
];

interface BusinessHours {
  weekday: { open: string; close: string };
  weekend: { open: string; close: string };
}

interface Location {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  is_primary: boolean;
  business_hours: BusinessHours;
}

interface CalendarSettings {
  calendar_type: string;
  settings: {
    api_key?: string;
    business_hours: BusinessHours;
  };
}

const DEFAULT_LOCATION: Location = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  is_primary: true,
  business_hours: {
    weekday: { open: '09:00', close: '20:00' },
    weekend: { open: '10:00', close: '18:00' }
  }
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Allows formats: (123) 456-7890, 123-456-7890, 1234567890
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

const validateZipCode = (zipCode: string): boolean => {
  // Allows formats: 12345, 12345-6789
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(-1); // Start at welcome screen
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [basicInfo, setBasicInfo] = useState({
    spa_name: '',
    owner_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [locations, setLocations] = useState<Location[]>([DEFAULT_LOCATION]);
  const [services, setServices] = useState(DEFAULT_SERVICES);

  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    calendar_type: 'none',
    settings: {
      business_hours: {
        weekday: { open: '09:00', close: '17:00' },
        weekend: { open: '10:00', close: '16:00' }
      }
    }
  });

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateBasicInfo = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!validateEmail(basicInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!validatePhone(basicInfo.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (basicInfo.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    
    if (basicInfo.password !== basicInfo.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateLocations = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    locations.forEach((location, index) => {
      if (!validatePhone(location.phone)) {
        errors[`location_${index}_phone`] = 'Please enter a valid phone number';
      }
      
      if (!validateEmail(location.email)) {
        errors[`location_${index}_email`] = 'Please enter a valid email address';
      }
      
      if (!validateZipCode(location.zip_code)) {
        errors[`location_${index}_zip`] = 'Please enter a valid ZIP code';
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBasicInfo() || !validateLocations()) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/onboard/start', {
        ...basicInfo,
        locations
      });
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('spa_id', response.data.spa_id);

      // Complete the basic info step
      await axios.post('/api/onboarding/complete-step', {
        step: 0 // Basic info is step 0
      }, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });

      setCurrentStep(1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Setup services
      await axios.post('/api/onboard/setup-services', {
        spa_id: localStorage.getItem('spa_id'),
        services
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });

      // Complete the services step
      await axios.post('/api/onboarding/complete-step', {
        step: 1 // Services is step 1
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });

      setCurrentStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set up services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Setup calendar
      await axios.post('/api/onboard/setup-calendar', {
        spa_id: localStorage.getItem('spa_id'),
        ...calendarSettings
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });

      // Complete the calendar step
      await axios.post('/api/onboarding/complete-step', {
        step: 2 // Calendar is step 2
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      
      // Set flag for guided tour
      localStorage.setItem('show_guided_tour', 'true');
      
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set up calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = (index: number, field: string, value: any) => {
    const newLocations = [...locations];
    if (field === 'is_primary' && value === true) {
      // Ensure only one primary location
      newLocations.forEach((loc, i) => {
        if (i !== index) {
          loc.is_primary = false;
        }
      });
    }
    
    // Format phone numbers as they're typed
    if (field === 'phone') {
      value = formatPhone(value);
    }
    
    // Clear field-specific error when user makes changes
    if (fieldErrors[`location_${index}_${field}`]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`location_${index}_${field}`];
        return newErrors;
      });
    }
    
    // Handle nested fields (business_hours)
    const fieldParts = field.split('.');
    let target: any = newLocations[index];
    
    for (let i = 0; i < fieldParts.length - 1; i++) {
      target = target[fieldParts[i]];
    }
    
    target[fieldParts[fieldParts.length - 1]] = value;
    setLocations(newLocations);
  };

  const addLocation = () => {
    setLocations([...locations, { ...DEFAULT_LOCATION, is_primary: false }]);
  };

  const removeLocation = (index: number) => {
    if (locations.length === 1) {
      setError('You must have at least one location');
      return;
    }
    const newLocations = locations.filter((_, i) => i !== index);
    // Ensure there's always a primary location
    if (locations[index].is_primary && newLocations.length > 0) {
      newLocations[0].is_primary = true;
    }
    setLocations(newLocations);
  };

  const renderWelcomeScreen = () => (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Welcome to SpaBot</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">AI-Powered Booking</h3>
          <p className="text-gray-600">24/7 automated booking assistant that understands your services</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Smart Calendar</h3>
          <p className="text-gray-600">Intelligent scheduling that optimizes your availability</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Client Management</h3>
          <p className="text-gray-600">Keep track of client preferences and booking history</p>
        </div>
      </div>
      <button
        onClick={() => setCurrentStep(0)}
        className="px-8 py-3 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
      >
        Get Started
      </button>
    </div>
  );

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
              ${index <= currentStep 
                ? 'border-primary-500 bg-primary-500 text-white'
                : 'border-gray-300 text-gray-300'
              }`}
              title={step.title}
            >
              {index < currentStep ? (
                <CheckCircleIcon className="w-6 h-6" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-24 h-1 mx-2 
                ${index < currentStep ? 'bg-primary-500' : 'bg-gray-300'}`
              } />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {STEPS.map((step, index) => (
          <div key={index} className="w-24 text-center">
            <p className={`text-sm ${index <= currentStep ? 'text-primary-500' : 'text-gray-500'}`}>
              {step.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLocationForm = () => (
    <div className="space-y-6">
      {locations.map((location, index) => (
        <div key={index} className="bg-white p-6 rounded-lg shadow relative">
          {locations.length > 1 && (
            <button
              type="button"
              onClick={() => removeLocation(index)}
              className="absolute top-4 right-4 text-red-500 hover:text-red-700"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location Name</label>
              <input
                type="text"
                required
                value={location.name}
                onChange={(e) => handleLocationChange(index, 'name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Main Location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                required
                value={location.address}
                onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                required
                value={location.city}
                onChange={(e) => handleLocationChange(index, 'city', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                required
                value={location.state}
                onChange={(e) => handleLocationChange(index, 'state', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
              <input
                type="text"
                required
                value={location.zip_code}
                onChange={(e) => handleLocationChange(index, 'zip_code', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                required
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                  fieldErrors[`location_${index}_phone`] ? 'border-red-300' : 'border-gray-300'
                }`}
                value={location.phone}
                onChange={(e) => handleLocationChange(index, 'phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={location.email}
                onChange={(e) => handleLocationChange(index, 'email', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={location.is_primary}
                onChange={(e) => handleLocationChange(index, 'is_primary', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Primary Location
              </label>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Business Hours</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Weekdays</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500">Open</label>
                    <input
                      type="time"
                      value={location.business_hours.weekday.open}
                      onChange={(e) => handleLocationChange(index, 'business_hours.weekday.open', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Close</label>
                    <input
                      type="time"
                      value={location.business_hours.weekday.close}
                      onChange={(e) => handleLocationChange(index, 'business_hours.weekday.close', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Weekends</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500">Open</label>
                    <input
                      type="time"
                      value={location.business_hours.weekend.open}
                      onChange={(e) => handleLocationChange(index, 'business_hours.weekend.open', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500">Close</label>
                    <input
                      type="time"
                      value={location.business_hours.weekend.close}
                      onChange={(e) => handleLocationChange(index, 'business_hours.weekend.close', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={addLocation}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Add Another Location
      </button>
    </div>
  );

  const renderStep = () => {
    if (currentStep === -1) return renderWelcomeScreen();

    return (
      <>
        {renderProgressBar()}
        {currentStep === 0 && (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="spaName" className="block text-sm font-medium text-gray-700">
                    Spa Name
                  </label>
                  <input
                    type="text"
                    id="spaName"
                    name="spaName"
                    value={basicInfo.spa_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, spa_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  {renderFieldError('spa_name')}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={basicInfo.owner_name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, owner_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={basicInfo.email}
                    onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                      fieldErrors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={basicInfo.phone}
                    onChange={(e) => {
                      const formattedPhone = formatPhone(e.target.value);
                      setBasicInfo({ ...basicInfo, phone: formattedPhone });
                      if (fieldErrors.phone) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.phone;
                          return newErrors;
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={basicInfo.password}
                    onChange={(e) => setBasicInfo({ ...basicInfo, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={basicInfo.confirmPassword}
                    onChange={(e) => setBasicInfo({ ...basicInfo, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
              {renderLocationForm()}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isLoading ? 'Creating Account...' : 'Continue'}
            </button>
          </form>
        )}

        {currentStep === 1 && (
          <form onSubmit={handleServicesSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service, index) => (
                <div key={index} className="p-4 border rounded-md bg-white shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Name</label>
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].name = e.target.value;
                          setServices(newServices);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Duration (min)</label>
                        <input
                          type="number"
                          value={service.duration}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].duration = parseInt(e.target.value);
                            setServices(newServices);
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].price = parseInt(e.target.value);
                            setServices(newServices);
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].description = e.target.value;
                          setServices(newServices);
                        }}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        value={service.category}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].category = e.target.value;
                          setServices(newServices);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="Massage">Massage</option>
                        <option value="Facial">Facial</option>
                        <option value="Body Treatment">Body Treatment</option>
                        <option value="Nail Care">Nail Care</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setServices([...services, { 
                  name: '', 
                  duration: 60, 
                  price: 0,
                  description: '',
                  category: 'Massage'
                }])}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Add Service
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600"
              >
                {isLoading ? 'Saving Services...' : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <form onSubmit={handleCalendarSubmit} className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Calendar Integration</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calendar System
                </label>
                <select
                    value={calendarSettings.calendar_type}
                    onChange={(e) => setCalendarSettings({
                        ...calendarSettings,
                        calendar_type: e.target.value
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                    <option value="none">No Integration (Use Our System)</option>
                    <option value="acuity">Acuity Scheduling</option>
                    <option value="calendly">Calendly</option>
                    <option value="google_calendar">Google Calendar</option>
                    <option value="mindbody">MINDBODY</option>
                </select>
              </div>

              {calendarSettings.calendar_type !== 'none' && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                    </label>
                    <input
                        type="password"
                        value={calendarSettings.settings.api_key || ''}
                        onChange={(e) => setCalendarSettings({
                            ...calendarSettings,
                            settings: {
                                ...calendarSettings.settings,
                                api_key: e.target.value
                            }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Enter your API key"
                    />
                </div>
              )}

              <h4 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Weekdays</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500">Open</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekday.open}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekday: {
                                ...calendarSettings.settings.business_hours.weekday,
                                open: e.target.value
                              }
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Close</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekday.close}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekday: {
                                ...calendarSettings.settings.business_hours.weekday,
                                close: e.target.value
                              }
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Weekends</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500">Open</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekend.open}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekend: {
                                ...calendarSettings.settings.business_hours.weekend,
                                open: e.target.value
                              }
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500">Close</label>
                      <input
                        type="time"
                        value={calendarSettings.settings.business_hours.weekend.close}
                        onChange={(e) => setCalendarSettings({
                          ...calendarSettings,
                          settings: {
                            ...calendarSettings.settings,
                            business_hours: {
                              ...calendarSettings.settings.business_hours,
                              weekend: {
                                ...calendarSettings.settings.business_hours.weekend,
                                close: e.target.value
                              }
                            }
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600"
            >
              {isLoading ? 'Finishing Setup...' : 'Complete Setup'}
            </button>
          </form>
        )}
      </>
    );
  };

  const renderFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      return (
        <p className="mt-1 text-sm text-red-600">
          {fieldErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        {renderStep()}
      </div>
    </div>
  );
};

export default OnboardingFlow; 