import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Add spa-id header to all requests
axios.interceptors.request.use((config) => {
  // In a real app, get this from auth context or local storage
  const spaId = localStorage.getItem('spa-id');
  if (spaId) {
    config.headers['spa-id'] = spaId;
  }
  return config;
});

// Create a configured axios instance with the base URL
export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

// Add the same interceptor to the apiClient
apiClient.interceptors.request.use((config) => {
  const spaId = localStorage.getItem('spa-id');
  if (spaId) {
    config.headers['spa-id'] = spaId;
  }
  return config;
});

export const api = {
  content: {
    generate: async (type: 'text' | 'image' | 'video', prompt: string, options: any) => {
      const response = await axios.post(`${API_BASE_URL}/content/generate/${type}`, {
        type,
        prompt,
        options
      });
      return response.data;
    },

    getHistory: async () => {
      const response = await axios.get(`${API_BASE_URL}/content/history`);
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
        const response = await axios.post(`${API_BASE_URL}/content/schedule`, data);
        return response.data;
      },

      getAll: async (filters?: {
        status?: 'scheduled' | 'published' | 'draft';
        platform?: 'blog' | 'facebook' | 'instagram' | 'email';
        date?: string;
      }) => {
        const response = await axios.get(`${API_BASE_URL}/content/schedule`, {
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
        const response = await axios.patch(`${API_BASE_URL}/content/schedule/${id}`, data);
        return response.data;
      },

      delete: async (id: string) => {
        await axios.delete(`${API_BASE_URL}/content/schedule/${id}`);
      }
    }
  },
  
  integrations: {
    // Get all available platforms
    getPlatforms: async () => {
      const response = await axios.get(`${API_BASE_URL}/integrations/platforms`);
      return response.data;
    },
    
    // Get all connected integrations
    getIntegrations: async () => {
      const response = await axios.get(`${API_BASE_URL}/integrations`);
      return response.data;
    },
    
    // Connect to a platform
    connect: async (platformId: string, credentials: Record<string, any>) => {
      const response = await axios.post(`${API_BASE_URL}/integrations/${platformId}/connect`, credentials);
      return response.data;
    },
    
    // Disconnect from a platform
    disconnect: async (integrationId: string) => {
      const response = await axios.delete(`${API_BASE_URL}/integrations/${integrationId}`);
      return response.data;
    },
    
    // Test a connection
    testConnection: async (integrationId: string) => {
      const response = await axios.post(`${API_BASE_URL}/integrations/${integrationId}/test`);
      return response.data;
    },
    
    // Get integration status
    getStatus: async (integrationId: string) => {
      const response = await axios.get(`${API_BASE_URL}/integrations/${integrationId}/status`);
      return response.data;
    }
  }
}; 