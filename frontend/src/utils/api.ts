import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Add spa-id header to all requests
axios.interceptors.request.use((config) => {
  // In a real app, get this from auth context or local storage
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
  }
}; 