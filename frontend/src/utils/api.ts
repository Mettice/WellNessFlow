import axios from 'axios';

// Configure axios for the environment
axios.defaults.withCredentials = true;

// Add request interceptor for authentication
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

    // Set Content-Type header only if it's not FormData
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error details
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Handle 401 errors by redirecting to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } 
    // Handle 500 errors
    else if (error.response?.status === 500) {
      console.error('Server Error:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export default axios;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor
axios.interceptors.request.use((config) => {
  // Initialize headers if undefined
  config.headers = config.headers || {};

  // Add auth token if available
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
      headers: config.headers,
      env: 'development'
    });
  }

  return config;
});

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors by redirecting to login
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