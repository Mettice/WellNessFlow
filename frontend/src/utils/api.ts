import axios from 'axios';

// Configure axios defaults
const API_BASE_URL = '/api';  // Use relative path for development

// Set default base URL and credentials
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Single request interceptor
axios.interceptors.request.use(
  (config) => {
    // Initialize headers if undefined
    config.headers = config.headers || {};
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add spa-id header if available
    const spaId = localStorage.getItem('spa-id');
    if (spaId) {
      config.headers['spa-id'] = spaId;
    }

    // Log request details in development
    if (import.meta.env.DEV) {
      console.log('Request Config:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Single response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers
    });
    return Promise.reject(error);
  }
);

export default axios;

export const api = {
  content: {
    generate: async (type: 'text' | 'image' | 'video', prompt: string, options: any) => {
      const response = await axios.post(`/api/content/generate/${type}`, {
        type,
        prompt,
        options
      });
      return response.data;
    },

    getHistory: async () => {
      const response = await axios.get('/api/content/history');
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
        const response = await axios.post('/api/content/schedule', data);
        return response.data;
      },

      getAll: async (filters?: {
        status?: 'scheduled' | 'published' | 'draft';
        platform?: 'blog' | 'facebook' | 'instagram' | 'email';
        date?: string;
      }) => {
        const response = await axios.get('/api/content/schedule', {
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
        const response = await axios.patch(`/api/content/schedule/${id}`, data);
        return response.data;
      },

      delete: async (id: string) => {
        await axios.delete(`/api/content/schedule/${id}`);
      }
    }
  }
};