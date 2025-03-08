import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import {
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface PlatformMetrics {
  total_spas: number;
  active_spas: number;
  total_bookings: number;
  total_revenue: number;
  last_updated: string;
}

interface Spa {
  id: string;
  spa_id: string;
  name: string;
  email: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  last_active: string;
}

export const PlatformDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [spas, setSpas] = useState<Spa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpa, setSelectedSpa] = useState<string | null>(null);
  const [spaDetails, setSpaDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchSpas();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Get the token directly from localStorage to ensure it's the latest
      const token = localStorage.getItem('token');
      
      const response = await axios({
        method: 'get',
        url: '/api/admin/platform/metrics',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load metrics');
    }
  };

  const fetchSpas = async () => {
    try {
      // Get the token directly from localStorage to ensure it's the latest
      const token = localStorage.getItem('token');
      
      const response = await axios({
        method: 'get',
        url: '/api/admin/platform/spas',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setSpas(response.data);
    } catch (err: any) {
      console.error('Error fetching spas:', err);
      setError('Failed to load spas');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaDetails = async (spaId: string) => {
    try {
      // Get the token directly from localStorage to ensure it's the latest
      const token = localStorage.getItem('token');
      
      const response = await axios({
        method: 'get',
        url: `/api/admin/platform/spa/${spaId}`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setSpaDetails(response.data);
      setSelectedSpa(spaId);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to fetch spa details',
        type: 'error'
      });
    }
  };

  const handleSuspendSpa = async (spaId: string) => {
    if (!window.confirm('Are you sure you want to suspend this spa?')) {
      return;
    }

    try {
      // Get the token directly from localStorage to ensure it's the latest
      const token = localStorage.getItem('token');
      
      await axios({
        method: 'post',
        url: `/api/admin/platform/spa/${spaId}/suspend`,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      showToast({
        title: 'Success',
        description: 'Spa suspended successfully',
        type: 'success'
      });
      fetchSpas(); // Refresh the list
    } catch (err) {
      setError('Failed to suspend spa');
      console.error('Error suspending spa:', err);
      showToast({
        title: 'Error',
        description: 'Failed to suspend spa',
        type: 'error'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-8 dark:text-white">Platform Dashboard</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spas</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.total_spas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Spas</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.active_spas || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{metrics?.total_bookings || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {metrics?.total_revenue ? formatCurrency(metrics.total_revenue) : '$0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registered Spas Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Registered Spas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {spas.map((spa) => (
                <tr key={spa.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{spa.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{spa.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">{spa.subscription_plan}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      spa.subscription_status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {spa.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(spa.last_active).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => fetchSpaDetails(spa.spa_id)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleSuspendSpa(spa.spa_id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Suspend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spa Details Modal */}
      {selectedSpa && spaDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-xl font-semibold">{spaDetails.name} Details</h3>
              <button
                onClick={() => setSelectedSpa(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Business Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Business Name</p>
                  <p>{spaDetails.profile?.business_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p>{spaDetails.profile?.address || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p>{spaDetails.profile?.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Onboarding Status</p>
                  <p>{spaDetails.profile?.onboarding_completed ? 'Completed' : 'Incomplete'}</p>
                </div>
              </div>

              <h4 className="font-semibold mt-4 mb-2">Users</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {spaDetails.users.map((user: any) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 