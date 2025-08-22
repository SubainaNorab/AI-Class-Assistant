import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';

// Import your existing components (keeping original functionality)
import FlashcardTestPage from './FlashcardTestPage';
import QuizListPage from './QuizListPage'; 
import StatsPage from './components/StatsPage';
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
              {/* Protected Navigation Links - Person-1 Task */}
              <Link
                to="/"
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
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
                to="/stats"
                className={`nav-link ${location.pathname === '/stats' ? 'active' : ''}`}
              >
                📊 Statistics
              </Link>
              
              {/* User Menu - Shows authenticated user info */}
              <div className="user-menu">
                <div className="user-info">
                  <span className="user-avatar">
                    {user?.full_name?.charAt(0)?.toUpperCase() || '👤'}
                  </span>
                  <span className="user-name">
                    {user?.full_name || 'User'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="logout-btn"
                  title="Logout"
                >
                  🚪 Logout
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Public Navigation Links */}
              <Link to="/login" className="nav-link auth-link">
                🔐 Login
              </Link>
              <Link to="/signup" className="nav-link auth-link signup">
                🚀 Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Main App Content Component
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading AI Class Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navigation />
      <main className="main-content">
        <Routes>
          {/* Public Routes - Login/Signup */}
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
          
          {/* Protected Routes - Person-1 Task: Ensure these check JWT */}
          <Route 
            path="/" 
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
            path="/stats" 
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      <footer className="app-footer">
        <p>&copy; 2025 AI Class Assistant. Built with ❤️ for better learning.</p>
      </footer>
    </div>
  );
}

// Root App Component with AuthProvider
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;