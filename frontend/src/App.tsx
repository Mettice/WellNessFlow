import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import { PlatformDashboard } from './components/admin/PlatformDashboard';
import { SpaDashboard } from './components/admin/SpaDashboard';
import Dashboard from './components/admin/Dashboard';
import Settings from './components/admin/Settings';
import OnboardingFlow from './components/admin/OnboardingFlow';
import { Navigation } from './components/common/Navigation';
import LandingPage from './components/LandingPage';

interface User {
  role: string;
}

interface ProtectedRouteProps {
  children: React.ReactNode | ((props: { user: User }) => React.ReactNode);
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect based on user role
    if (user.role === 'super_admin') {
      return <Navigate to="/admin/platform" replace />;
    } else if (user.role === 'spa_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/staff/dashboard" replace />;
    }
  }

  return <>{typeof children === 'function' ? children({ user }) : children}</>;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Hide navigation on public pages
  const showNavigation = !['/login', '/register', '/'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {showNavigation && <Navigation />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/admin/platform"
          element={
            <ProtectedRoute requiredRole="super_admin">
              <PlatformDashboard />
            </ProtectedRoute>
          }
        />

        {/* Main Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="spa_admin">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Staff Dashboard */}
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute requiredRole="staff">
              <SpaDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings theme="dark" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          }
        />

        {/* Catch all - Redirect to landing for non-authenticated users, or appropriate dashboard for authenticated users */}
        <Route
          path="*"
          element={
            user ? (
              <Navigate
                to={
                  user.role === 'super_admin'
                    ? '/admin/platform'
                    : user.role === 'spa_admin'
                    ? '/admin/dashboard'
                    : '/staff/dashboard'
                }
                replace
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
