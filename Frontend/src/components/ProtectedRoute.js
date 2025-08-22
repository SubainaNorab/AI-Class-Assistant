// Frontend/src/components/ProtectedRoute.js 

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If user is authenticated but trying to access login/signup pages
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Component for login required message (Person-1 task requirement)
export const LoginRequired = () => {
  return (
    <div className="login-required">
      <div className="login-required-card">
        <div className="login-required-icon">🔒</div>
        <h2>Login Required</h2>
        <p>You need to be logged in to access this feature.</p>
        <div className="login-required-actions">
          <a href="/login" className="btn btn-primary">
            Sign In
          </a>
          <a href="/signup" className="btn btn-secondary">
            Create Account
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;