import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../components/LandingPage';
import BlogList from '../components/blog/BlogList';
import BlogPost from '../components/blog/BlogPost';
import CaseStudies from '../components/case-studies/CaseStudies';
import IntegrationDocs from '../components/integrations/IntegrationDocs';
import IntegrationDetail from '../components/integrations/IntegrationDetail';

// Feature Routes
import FeatureRoutes from './features';
import CaseStudyDetail from '../components/case-studies/CaseStudyDetail';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Blog Routes */}
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        
        {/* Case Studies Routes */}
        <Route path="/case-studies" element={<CaseStudies />} />
        <Route path="/case-studies/:slug" element={<CaseStudyDetail />} />
        
        {/* Integration Documentation Routes */}
        <Route path="/integrations" element={<IntegrationDocs />} />
        <Route path="/integrations/:integration" element={<IntegrationDetail />} />

        {/* Feature Routes */}
        <Route path="/features/*" element={<FeatureRoutes />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes; 