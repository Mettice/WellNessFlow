import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { ErrorBoundary } from 'react-error-boundary';
import Settings from './Settings';
import CalendarIntegration from './CalendarIntegration';
import WidgetGenerator from './WidgetGenerator';
import StaffManagement from './StaffManagement';
import { useNavigate } from 'react-router-dom';

// Define types
interface NavItem {
  name: string;
  icon: React.ComponentType<any>;
  current: boolean;
}

interface BotMetrics {
  totalConversations: number;
  successfulBookings: number;
  averageResponseTime: string;
  conversionRate: number;
  popularServices: Array<{
    service: string;
    count: number;
  }>;
  peakHours: Array<{
    hour: string;
    bookings: number;
  }>;
}

interface Document {
  id: string;
  name: string;
  doc_type: string;
  uploaded_at: string;
  processed: boolean;
}

interface DailyMetrics {
  total_appointments: number;
  completed_appointments: number;
  revenue_today: number;
  upcoming_appointments: number;
}

const defaultNavigation: NavItem[] = [
  { name: 'Overview', icon: () => <span>📊</span>, current: true },
  { name: 'Documents', icon: () => <span>📄</span>, current: false },
  { name: 'Content', icon: () => <span>📝</span>, current: false },
  { name: 'Calendar', icon: () => <span>📅</span>, current: false },
  { name: 'Staff', icon: () => <span>👥</span>, current: false },
  { name: 'Widget', icon: () => <span>🔧</span>, current: false },
  { name: 'Settings', icon: () => <span>⚙️</span>, current: false },
];

const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => (
  <div role="alert" className="p-4 bg-red-100 text-red-700 rounded-md">
    <p>Something went wrong:</p>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md">Try again</button>
  </div>
);

const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [navigation, setNavigation] = useState(defaultNavigation);
  const [botMetrics, setBotMetrics] = useState<BotMetrics>({
    totalConversations: 0,
    successfulBookings: 0,
    averageResponseTime: '0s',
    conversionRate: 0,
    popularServices: [],
    peakHours: []
  });
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics>({
    total_appointments: 0,
    completed_appointments: 0,
    revenue_today: 0,
    upcoming_appointments: 0
  });
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    verifyTokenOnMount();
    fetchBotMetrics();
    fetchDocuments();
    fetchDailyMetrics();
  }, []);

  // Verify token on component mount
  const verifyTokenOnMount = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found on Dashboard mount');
      // Don't redirect automatically - just log the error
      return;
    }
    
    // Verify token format
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        // Don't redirect
        return;
      }
      
      // Decode token to check expiration
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('Dashboard: Token payload:', payload);
      
      // Check for token expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        console.log(`Token expires: ${expDate.toLocaleString()}, Current time: ${now.toLocaleString()}`);
        
        if (expDate < now) {
          console.warn('Token expired, but NOT auto-redirecting to login');
          return;
        }
      }
      
      // Verify token has required claims
      if (!payload.user_id || !payload.role) {
        console.error('Token missing required claims');
        // Don't redirect
        return;
      }
      
      // Ensure token is in Authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Dashboard: Authorization header has been set');
      
    } catch (e) {
      console.error('Error verifying token:', e);
      // Don't redirect
    }
  };

  const fetchBotMetrics = async () => {
    try {
      console.log('Fetching bot metrics...');
      setLoadingMetrics(true);
      
      // Check if token exists and is set in headers before making the request
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token available for API request');
        setBotMetrics({
          totalConversations: 0,
          successfulBookings: 0,
          averageResponseTime: '0s',
          conversionRate: 0,
          popularServices: [],
          peakHours: []
        });
        setLoadingMetrics(false);
        return;
      }
      
      // Ensure Authorization header is set
      if (!axios.defaults.headers.common['Authorization']) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Setting Authorization header:', axios.defaults.headers.common['Authorization']);
      }
      
      // Get the JWT payload to extract spa_id
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT payload:', payload);
        
        // Check for spa_id in sub claim
        if (payload.sub) {
          console.log('Found spa_id in sub claim:', payload.sub);
          
          // Set X-Spa-ID header explicitly
          axios.defaults.headers.common['X-Spa-ID'] = payload.sub;
          console.log('Set X-Spa-ID header:', axios.defaults.headers.common['X-Spa-ID']);
        } else {
          console.warn('No spa_id found in JWT sub claim');
        }
      } catch (e) {
        console.error('Error parsing JWT token:', e);
      }
      
      // Make the API request
      console.log('Making bot metrics API request with headers:', axios.defaults.headers.common);
      const response = await axios.get('/api/admin/bot-metrics');
      console.log('Bot metrics response:', response);
      
      // Check if we got a valid response with data
      if (response.data && typeof response.data === 'object') {
        console.log('Received valid bot metrics data:', response.data);
        setBotMetrics(response.data);
      } else {
        // Handle empty response by setting default values
        console.warn('Empty response received for bot metrics');
        setBotMetrics({
          totalConversations: 0,
          successfulBookings: 0,
          averageResponseTime: '0s',
          conversionRate: 0,
          popularServices: [],
          peakHours: []
        });
      }
    } catch (error: any) {
      console.error('Error fetching bot metrics:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        console.error('Error data:', error.response.data);
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Set default values instead of showing error for new users
      setBotMetrics({
        totalConversations: 0,
        successfulBookings: 0,
        averageResponseTime: '0s',
        conversionRate: 0,
        popularServices: [],
        peakHours: []
      });
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    
    // Get the spa_id from localStorage
    const spa_id = localStorage.getItem('spa_id');
    if (!spa_id) {
      console.error('No spa_id found in localStorage');
      setDocuments([]);
      setLoadingDocs(false);
      return;
    }
    
    console.log(`Fetching documents with spa_id: ${spa_id}`);
    
    try {
      // Use the spa_id directly from localStorage, let the interceptor handle adding it to URL
      // Remove explicit spa_id in URL to avoid duplication
      const response = await axios.get('/api/documents');
      
      if (response.data && Array.isArray(response.data)) {
        setDocuments(response.data);
      } else {
        console.warn('Invalid response format for documents:', response.data);
        setDocuments([]);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      
      if (error.response) {
        console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data) {
          console.error('Error data:', error.response.data);
        }
      }
      
      setDocuments([]);
      
      // Only show toast for errors other than 404
      if (error.response && error.response.status !== 404) {
        showToast({ 
          title: 'Failed to fetch documents',
          type: 'error'
        });
      }
    }
    
    setLoadingDocs(false);
  };

  const fetchDailyMetrics = async () => {
    try {
      setLoadingMetrics(true);
      
      // Get spa_id from localStorage
      const spa_id = localStorage.getItem('spa_id');
      if (!spa_id) {
        console.error('No spa_id available for API request');
        setDailyMetrics({
          total_appointments: 0,
          completed_appointments: 0,
          revenue_today: 0,
          upcoming_appointments: 0
        });
        setTodayAppointments([]);
        setLoadingMetrics(false);
        return;
      }
      
      // Let the interceptor handle adding spa_id to the URL
      const metricsResponse = await axios.get('/api/admin/metrics/daily');
      
      const defaultMetrics = {
        total_appointments: 0,
        completed_appointments: 0,
        revenue_today: 0,
        upcoming_appointments: 0
      };
      
      // If we get valid data, use it
      if (metricsResponse.data) {
        setDailyMetrics(metricsResponse.data);
      } else {
        setDailyMetrics(defaultMetrics);
      }
      
      // Let the interceptor handle adding spa_id to the URL
      const appointmentsResponse = await axios.get('/api/admin/appointments/today');
      
      // If we get valid appointment data, use it
      if (appointmentsResponse.data && Array.isArray(appointmentsResponse.data)) {
        setTodayAppointments(appointmentsResponse.data);
      } else {
        setTodayAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      
      // Set default data on error
      setDailyMetrics({
        total_appointments: 0,
        completed_appointments: 0,
        revenue_today: 0,
        upcoming_appointments: 0
      });
      setTodayAppointments([]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setUploadProgress(0);

    try {
      await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const progress = Math.min(
            90,
            Math.round((progressEvent.loaded * 90) / progressEvent.total)
          );
          setUploadProgress(progress);
        },
      });
      
      setUploadProgress(95);
      
      // Wait for 2 seconds to allow backend processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Fetch updated document list
      await fetchDocuments();
      
      showToast({ 
        title: 'Document uploaded and processed successfully',
        type: 'success'
      });
      
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      showToast({ 
        title: error.response?.data?.error || 'Failed to upload document',
        type: 'error'
      });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await axios.delete(`/api/documents/${docId}`);
      showToast({ 
        title: 'Document deleted successfully',
        type: 'success'
      });
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      showToast({ 
        title: 'Failed to delete document',
        type: 'error'
      });
    }
  };

  const handleNavClick = (name: string) => {
    setNavigation(
      navigation.map(item => ({
        ...item,
        current: item.name === name,
      }))
    );
  };

  const renderOverviewSection = () => (
    <div data-tour="dashboard-overview" className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Dashboard Overview
        </h1>
      </div>

      {/* Daily Metrics */}
      <div className={`mt-6 p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
        <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Today's Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
            <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {dailyMetrics.total_appointments}
            </h3>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Appointments
            </p>
          </div>
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
            <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {dailyMetrics.completed_appointments}
            </h3>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Completed Today
            </p>
          </div>
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
            <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(dailyMetrics.revenue_today)}
            </h3>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Today's Revenue
            </p>
          </div>
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
            <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {dailyMetrics.upcoming_appointments}
            </h3>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Upcoming
            </p>
          </div>
        </div>
      </div>

      {/* Bot Metrics */}
      <div className={`mt-6 p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
        <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Bot Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-4">Loading metrics...</div>
          ) : (
            <>
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {botMetrics.totalConversations}
                </h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Conversations
                </p>
              </div>
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {botMetrics.successfulBookings}
                </h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Successful Bookings
                </p>
              </div>
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {botMetrics.conversionRate}%
                </h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Conversion Rate
                </p>
              </div>
              <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
                <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {botMetrics.averageResponseTime}
                </h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Average Response Time
                </p>
              </div>
            </>
          )}
        </div>

        {/* Popular Services and Peak Hours */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Popular Services */}
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Popular Services
              </h3>
              <div className="space-y-3">
                {botMetrics.popularServices.length > 0 ? (
                  botMetrics.popularServices.map((service, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {service.service}
                      </span>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {service.count} bookings
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No service data available yet
                  </p>
                )}
              </div>
            </div>

            {/* Peak Hours */}
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Peak Hours
              </h3>
              <div className="space-y-3">
                {botMetrics.peakHours.length > 0 ? (
                  botMetrics.peakHours.map((hour, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {`${hour.hour}:00 - ${hour.hour}:59`}
                      </span>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {hour.bookings} bookings
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    No peak hour data available yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Appointments */}
      <div className={`mt-6 p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
        <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Today's Appointments
        </h2>
        {todayAppointments.length === 0 ? (
          <p className={`text-center py-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No appointments scheduled for today
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {todayAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {appointment.client_name}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {appointment.service}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {appointment.time}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                      {appointment.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderDocumentsSection = () => (
    <div data-tour="documents" className="py-6">
      <div className="space-y-6">
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Knowledge Base
            </h2>
            <label className={`inline-flex items-center px-4 py-2 rounded-md cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              theme === 'dark' ? 'bg-dark-200 text-white hover:bg-dark-100' : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}>
              {uploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading ({uploadProgress}%)
                </span>
              ) : (
                <>
                  <span>📤</span>
                  <span className="ml-2">Upload Document</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.txt,.doc,.docx"
                disabled={uploading}
              />
            </label>
          </div>

          <div className="space-y-4">
            {loadingDocs ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
              </div>
            ) : documents.length === 0 ? (
              <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="text-4xl">📄</span>
                <p className="text-lg font-medium mt-4">Enhance your chatbot with knowledge</p>
                <p className="text-sm mt-2 mb-4">Upload documents to train your chatbot with specific information about your services.</p>
                <p className="text-sm">Supported formats: PDF, Word, and Text files</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex justify-between items-center p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-dark-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="text-xl mr-3">
                        {doc.doc_type === 'pdf' ? '📕' :
                         doc.doc_type === 'doc' || doc.doc_type === 'docx' ? '📘' :
                         doc.doc_type === 'txt' ? '📝' : '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {doc.name}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                          {doc.processed && ' • Processed'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className={`ml-4 p-2 rounded-md ${
                        theme === 'dark'
                          ? 'text-red-400 hover:bg-red-400/10'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const getCurrentSection = () => {
    const currentNav = navigation.find(item => item.current);
    switch (currentNav?.name) {
      case 'Overview':
        return renderOverviewSection();
      case 'Documents':
        return renderDocumentsSection();
      case 'Content':
        return <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <h1 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Content Management
            </h1>
            <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Redirecting to content dashboard...
            </p>
          </div>
        </div>;
      case 'Calendar':
        return <CalendarIntegration />;
      case 'Staff':
        return <StaffManagement />;
      case 'Widget':
        return <WidgetGenerator theme={theme} spaId="default" />;
      case 'Settings':
        return <Settings />;
      default:
        return renderOverviewSection();
    }
  };

  // Effect to handle navigation to content dashboard
  useEffect(() => {
    const currentNav = navigation.find(item => item.current);
    if (currentNav?.name === 'Content') {
      navigate('/admin/content');
    }
  }, [navigation, navigate]);

  // Debug function to check token format
  const debugToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('DEBUG: No token found in localStorage');
      return;
    }
    
    console.log('DEBUG: Raw token:', token);
    
    // Verify token is in correct JWT format
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('DEBUG: Invalid JWT format - should have 3 parts separated by dots');
        return;
      }
      
      // Log each part
      console.log('DEBUG: Token header:', tokenParts[0]);
      console.log('DEBUG: Token payload (encoded):', tokenParts[1]);
      console.log('DEBUG: Token signature:', tokenParts[2]);
      
      // Decode payload
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('DEBUG: Decoded payload:', payload);
        
        // Check for critical JWT claims
        console.log('DEBUG: Token subject:', payload.sub);
        console.log('DEBUG: Token issued at:', new Date(payload.iat * 1000).toLocaleString());
        console.log('DEBUG: Token expiration:', new Date(payload.exp * 1000).toLocaleString());
        console.log('DEBUG: Token role:', payload.role);
        console.log('DEBUG: Token user_id:', payload.user_id);
        
        // Check if token has expired
        const now = new Date();
        const expiry = new Date(payload.exp * 1000);
        if (expiry < now) {
          console.error(`DEBUG: TOKEN EXPIRED! Expired at ${expiry.toLocaleString()}, current time is ${now.toLocaleString()}`);
        } else {
          console.log(`DEBUG: Token is valid. Expires at ${expiry.toLocaleString()}, current time is ${now.toLocaleString()}`);
        }
      } catch (e) {
        console.error('DEBUG: Error decoding payload:', e);
      }
    } catch (e) {
      console.error('DEBUG: Error parsing token:', e);
    }
    
    // Check current Authorization header
    console.log('DEBUG: Current Authorization header:', axios.defaults.headers.common['Authorization']);
  };
  
  // Call debug function on mount
  useEffect(() => {
    debugToken();
  }, []);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-100'}`}>
      <div className="flex">
        {/* Sidebar */}
        <div className={`w-64 fixed inset-y-0 left-0 ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'} shadow-lg`}>
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.name)}
                    className={`${
                      item.current
                        ? `${theme === 'dark' ? 'bg-dark-200 text-white' : 'bg-gray-100 text-gray-900'}`
                        : `${theme === 'dark' ? 'text-gray-300 hover:bg-dark-200' : 'text-gray-600 hover:bg-gray-50'}`
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
                  >
                    <item.icon
                      className={`${
                        item.current
                          ? 'text-gray-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                    />
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="pl-64 flex-1">
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <ErrorBoundary
                  FallbackComponent={ErrorFallback}
                  onReset={() => {
                    setError(null);
                  }}
                >
                  {getCurrentSection()}
                </ErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;