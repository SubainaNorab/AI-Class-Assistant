// Frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import FlashcardTestPage from './FlashcardTestPage';
import QuizListPage from './QuizListPage'; 
import StatsPage from './components/StatsPage';
import './App.css';

// Navigation Component
const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>🎓 AI Class Assistant</h2>
        </div>
        <div className="nav-links">
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
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<FlashcardTestPage />} />
            <Route path="/quiz" element={<QuizListPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>&copy; 2025 AI Class Assistant. Built with ❤️ for better learning.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;