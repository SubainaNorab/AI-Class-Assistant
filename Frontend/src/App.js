// Frontend/src/App.js - UPDATED WITH PROPER DYNAMIC ROUTES

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';

// Import components
import FileManagerDashboard from './components/FileManagerDashboard';
import FlashcardTestPage from './FlashcardTestPage';
import QuizListPage from './QuizListPage'; 
import StatsPage from './components/StatsPage';
import ExplainIdeasPage from './components/ExplainIdeasPage';
import SummaryPage from "./summarypage";

// ADDED: New components for file-specific pages
import FileSpecificFlashcards from './components/FileSpecificFlashcards';
import FileSpecificExplain from './components/FileSpecificExplain';

import './App.css';

// Enhanced Navigation Component with Authentication
const Navigation = () => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/">
            <h2>🎓 AI Class Assistant</h2>
          </Link>
        </div>
        
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              {/* Protected Navigation Links */}
              <Link
                to="/"
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                📚 Dashboard
              </Link>
              <Link
                to="/flashcards"
                className={`nav-link ${location.pathname === '/flashcards' ? 'active' : ''}`}
              >
                🎯 Flashcards
              </Link>
              <Link
                to="/quiz"
                className={`nav-link ${location.pathname === '/quiz' ? 'active' : ''}`}
              >
                📝 Quizzes
              </Link>
              <Link
                to="/explain"
                className={`nav-link ${location.pathname === '/explain' ? 'active' : ''}`}
              >
                🧠 Explain Ideas
              </Link>
              <Link
                to="/stats"
                className={`nav-link ${location.pathname === '/stats' ? 'active' : ''}`}
              >
                📊 Stats
              </Link>
              
              {/* User Menu */}
              <div className="user-menu">
                <div className="user-info">
                  <div className="user-avatar">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="user-name">{user?.full_name || 'User'}</span>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Public Navigation Links */}
              <Link
                to="/login"
                className="nav-link auth-link"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="nav-link auth-link signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navigation />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <LoginPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/signup" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <SignupPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected Routes */}
              {/* Dashboard as main landing page */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <FileManagerDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* ✅ UPDATED: File-specific summary page */}
              <Route 
                path="/summary/:fileId" 
                element={
                  <ProtectedRoute>
                    <SummaryPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* ✅ ADDED: File-specific flashcards page */}
              <Route 
                path="/flashcards/:fileId" 
                element={
                  <ProtectedRoute>
                    <FileSpecificFlashcards />
                  </ProtectedRoute>
                } 
              />
              
              {/* ✅ ADDED: File-specific explain page */}
              <Route 
                path="/explain/:fileId" 
                element={
                  <ProtectedRoute>
                    <FileSpecificExplain />
                  </ProtectedRoute>
                } 
              />
              
              {/* General pages (without file ID) */}
              <Route 
                path="/flashcards" 
                element={
                  <ProtectedRoute>
                    <FlashcardTestPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/quiz" 
                element={
                  <ProtectedRoute>
                    <QuizListPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/explain" 
                element={
                  <ProtectedRoute>
                    <ExplainIdeasPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/stats" 
                element={
                  <ProtectedRoute>
                    <StatsPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all route - redirect to dashboard */}
              <Route 
                path="*" 
                element={<Navigate to="/" replace />} 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;