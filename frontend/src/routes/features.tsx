import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Content Features
import ContentDashboard from '../components/features/content/ContentDashboard';
import ContentGenerator from '../components/features/content/ContentGenerator';
import ContentScheduler from '../components/features/content/ContentScheduler';
import ContentAnalytics from '../components/features/content/ContentAnalytics';

// Chatbot Features
import ChatbotDashboard from '../components/features/chatbot/ChatbotDashboard';
import ChatbotIntegrations from '../components/features/chatbot/ChatbotIntegrations';

// Data Features
import DataDashboard from '../components/features/data/DataDashboard';

const FeatureRoutes = () => {
  return (
    <Routes>
      {/* Content Routes */}
      <Route path="content" element={<ContentDashboard />} />
      <Route path="content/generator" element={<ContentGenerator />} />
      <Route path="content/scheduler" element={<ContentScheduler />} />
      <Route path="content/analytics" element={<ContentAnalytics />} />
      
      {/* Chatbot Routes */}
      <Route path="chatbot" element={<ChatbotDashboard />} />
      <Route path="chatbot/integrations" element={<ChatbotIntegrations />} />
      
      {/* Data Routes */}
      <Route path="data" element={<DataDashboard />} />
    </Routes>
  );
};

export default FeatureRoutes; 