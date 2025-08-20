// Frontend/src/components/SignupPage.js 

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import './AuthPages.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const { signup } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check password strength (matching Person-2's validation)
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    // Match Person-2's password validation logic
    if (password.length < 8) {
      setPasswordStrength('weak');
    } else if (
      password.length >= 8 && 
      /[A-Z]/.test(password) && 
      /[a-z]/.test(password) && 
      /\d/.test(password)
    ) {
      setPasswordStrength('strong');
    } else {
      setPasswordStrength('medium');
    }
  };

  const validateForm = () => {
    const { email, password, confirmPassword, full_name } = formData;

    // Email validation (matching Person-2's regex)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      addToast('Please enter a valid email address', 'error');
      return false;
    }

    // Password validation (matching Person-2's requirements)
    if (password.length < 8) {
      addToast('Password must be at least 8 characters long', 'error');
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      addToast('Password must contain at least one uppercase letter', 'error');
      return false;
    }

    if (!/[a-z]/.test(password)) {
      addToast('Password must contain at least one lowercase letter', 'error');
      return false;
    }

    if (!/\d/.test(password)) {
      addToast('Password must contain at least one number', 'error');
      return false;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return false;
    }

    if (!full_name.trim()) {
      addToast('Full name is required', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;
      const result = await signup(signupData);

      if (result.success) {
        addToast(`Welcome to AI Class Assistant, ${result.user.full_name}!`, 'success');
        navigate('/'); // Redirect to dashboard
      } else {
        addToast(result.error || 'Signup failed', 'error');
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

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'strong': return '#2ed573';
      default: return '#ddd';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card signup-card">
        <div className="auth-header">
          <h1>🚀 Join AI Class Assistant</h1>
          <p>Create your account and start learning smarter</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="full_name">Full Name *</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
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
            <label htmlFor="password">Password *</label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                required
                disabled={loading}
                minLength={8}
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
            {formData.password && (
              <div className="password-strength">
                <div 
                  className="strength-bar"
                  style={{ 
                    backgroundColor: getPasswordStrengthColor(),
                    width: passwordStrength === 'weak' ? '33%' : 
                           passwordStrength === 'medium' ? '66%' : '100%'
                  }}
                ></div>
                <span className="strength-text">
                  Password strength: {passwordStrength}
                </span>
              </div>
            )}
            <div className="password-requirements">
              <small>
                Password must be at least 8 characters with uppercase, lowercase, and number
              </small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="api-integration-note">
          <p>✅ <strong>Backend Integration:</strong> This form integrates with Person-2's authentication API</p>
          <ul>
            <li>POST /users/signup → Creates user with hashed password</li>
            <li>Automatic login after successful signup</li>
            <li>Matches Person-2's validation requirements</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;