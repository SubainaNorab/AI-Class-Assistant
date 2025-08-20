// Frontend/src/components/LoginPage.js

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import './AuthPages.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  // Get the intended destination or default to dashboard
  const from = location.state?.from?.pathname || '/';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData);

      if (result.success) {
        addToast(`Welcome back, ${result.user.full_name}!`, 'success');
        navigate(from, { replace: true });
      } else {
        addToast(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      addToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Demo account quick login handlers
  const quickLogin = async (email, password) => {
    setLoading(true);
    const result = await login({ email, password });
    
    if (result.success) {
      addToast(`Logged in as ${result.user.full_name}!`, 'success');
      navigate(from, { replace: true });
    } else {
      addToast(result.error || 'Demo login failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🎓 Welcome Back</h1>
          <p>Sign in to continue your learning journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign up here
            </Link>
          </p>
        </div>

        {/* Demo Accounts Section - Using Person-2's test accounts */}
        <div className="demo-accounts">
          <h3>🧪 Demo Accounts (Person-2 Tests)</h3>
          <p className="demo-description">Quick login with test accounts created by Person-2</p>
          <div className="demo-grid">
            <div className="demo-account">
              <strong>Test User 1</strong>
              <p>Email: test1@example.com</p>
              <button 
                className="demo-login-btn"
                onClick={() => quickLogin('test1@example.com', 'password123')}
                disabled={loading}
              >
                Quick Login
              </button>
            </div>
            <div className="demo-account">
              <strong>Test User 2</strong>
              <p>Email: test2@example.com</p>
              <button 
                className="demo-login-btn"
                onClick={() => quickLogin('test2@example.com', 'password123')}
                disabled={loading}
              >
                Quick Login
              </button>
            </div>
          </div>
          <div className="demo-note">
            💡 If demo accounts don't work, create a new account or ask Person-2 to verify test data
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;