/// <reference types="vite/client" />

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Add default headers and credentials
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor
axios.interceptors.request.use((config) => {
  // Add spa-id header if available
  const spaId = localStorage.getItem('spa-id');
  if (spaId) {
    config.headers = config.headers || {};
    config.headers['spa-id'] = spaId;
  }

  // Handle API URL prefix and full URL construction
  if (!config.url?.startsWith('http')) {
    // If URL doesn't start with /api, add it
    if (!config.url?.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }
    
    // In production or if API_BASE_URL is set, prepend the full URL
    config.url = `${API_BASE_URL}${config.url}`;
  }

  console.log('Request Config:', {
    url: config.url,
    method: config.method,
    baseURL: API_BASE_URL,
    headers: config.headers,
    env: import.meta.env.PROD ? 'production' : 'development'
  });

  return config;
});

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers,
      env: import.meta.env.PROD ? 'production' : 'development'
    });
    return Promise.reject(error);
  }
);

export const api = {
  content: {
    generate: async (type: 'text' | 'image' | 'video', prompt: string, options: any) => {
      const response = await axios.post(`/content/generate/${type}`, {
        type,
        prompt,
        options
      });
      return response.data;
    },

    getHistory: async () => {
      const response = await axios.get('/content/history');
      return response.data;
    },

    schedule: {
      create: async (data: {
        title: string;
        content_type: 'blog' | 'social' | 'email' | 'video';
        platform: 'blog' | 'facebook' | 'instagram' | 'email';
        content: string;
        metadata?: Record<string, any>;
        scheduled_for: string;
      }) => {
        const response = await axios.post('/content/schedule', data);
        return response.data;
      },

      getAll: async (filters?: {
        status?: 'scheduled' | 'published' | 'draft';
        platform?: 'blog' | 'facebook' | 'instagram' | 'email';
        date?: string;
      }) => {
        const response = await axios.get('/content/schedule', {
          params: filters
        });
        return response.data;
      },

      update: async (id: string, data: Partial<{
        title: string;
        scheduled_for: string;
        status: 'scheduled' | 'published' | 'draft';
        content: string;
        metadata: Record<string, any>;
      }>) => {
        const response = await axios.patch(`/content/schedule/${id}`, data);
        return response.data;
      },

      delete: async (id: string) => {
        await axios.delete(`/content/schedule/${id}`);
      }
    }
  }
}; 