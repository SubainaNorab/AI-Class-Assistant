import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import FlashcardTestPage from './FlashcardTestPage';
import StatsPage from './statepage';  // ✅ Make sure this is the correct path
import FeedbackModal from './components/Feedbackmodel';  // ✅ Confirm this too
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>AI Class Assistant – Flashcard Module</h1>
        <Routes>
          <Route path="/" element={<FlashcardTestPage />} />
          <Route path="/flashcard-stats" element={<StatsPage />} />
          <Route path="/feedback" element={<FeedbackModal />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
