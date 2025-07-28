import React, { useState, useEffect } from 'react';
import './FlashcardViewer.css';

const FlashcardViewer = ({ content = "", userId = "default_user" }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [generationSource, setGenerationSource] = useState('');

  // Generate flashcards from content
  const generateFlashcards = async () => {
    if (!content.trim()) {
      setError("Please provide content to generate flashcards");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("🚀 Starting flashcard generation request...");

    try {
      const response = await fetch('http://localhost:5000/generate_flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          user_id: userId
        })
      });

      console.log("📡 Response status:", response.status);
      const data = await response.json();
      console.log("📊 Response data:", data);

      if (data.success) {
        setFlashcards(data.flashcards || []);
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowAll(false);
        setGenerationSource(data.source || 'unknown');
        
        // Handle AI status and error messages
        if (data.ai_status && !data.ai_status.ai_available) {
          const aiError = data.ai_status.ai_error || 'AI service unavailable';
          setError(`⚠️ ${aiError} - Using content-based generation instead.`);
        } else if (data.note && data.note.includes('OpenAI')) {
          // OpenAI worked successfully
          setError(null);
        } else if (data.note) {
          setError(`ℹ️ ${data.note}`);
        } else {
          setError(null);
        }
      } else {
        setError(`❌ ${data.error || 'Failed to generate flashcards'}`);
        
        if (data.ai_status) {
          const aiError = data.ai_status.ai_error || 'AI service unavailable';
          setError(`❌ ${data.error || 'Generation failed'} | AI Status: ${aiError}`);
        }
      }
    } catch (err) {
      console.error("Network error:", err);
      setError(`❌ Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load all existing flashcards
  const loadAllFlashcards = async () => {
    setLoading(true);
    setError(null);
    console.log("📚 Loading all flashcards...");

    try {
      const response = await fetch(`http://localhost:5000/flashcards?user_id=${userId}`);
      console.log("📡 Load response status:", response.status);
      const data = await response.json();
      console.log("📊 Load response data:", data);

      if (data.success) {
        if (data.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
          setCurrentIndex(0);
          setIsFlipped(false);
          setShowAll(true);
          setGenerationSource('database');
          setError(null);
        } else {
          setFlashcards([]);
          setError("📝 No flashcards found in database. Generate some first!");
        }
      } else {
        setError(`❌ ${data.error || 'Failed to load flashcards'}`);
      }
    } catch (err) {
      console.error("Network error:", err);
      setError(`❌ Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // Auto-generate flashcards when content changes
  useEffect(() => {
    if (content && content.trim().length > 10) {
      generateFlashcards();
    }
  }, [content]);

  const currentCard = flashcards[currentIndex];

  // Helper function to get source display
  const getSourceDisplay = () => {
    switch(generationSource) {
      case 'openai':
        return '🤖 OpenAI GPT-3.5';
      case 'content_analysis':
        return '🧠 Content Analysis';
      case 'database':
        return '💾 Database';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div className="flashcard-viewer">
      <div className="flashcard-controls">
        <h2>Flashcard Viewer</h2>
        
        <div className="control-buttons">
          <button 
            onClick={generateFlashcards} 
            disabled={loading || !content.trim()}
            className="btn-primary"
          >
            {loading ? 'Generating...' : 'Generate New Flashcards'}
          </button>
          
          <button 
            onClick={loadAllFlashcards} 
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Loading...' : 'Load All Flashcards'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {flashcards.length > 0 && (
          <div className="flashcard-info">
            <p>
              {showAll ? 'All Flashcards' : 'Generated from Content'} - 
              Card {currentIndex + 1} of {flashcards.length}
            </p>
            <div className="generation-source">
              <small>
                Source: {getSourceDisplay()}
              </small>
            </div>
          </div>
        )}
      </div>

      {flashcards.length > 0 && currentCard && (
        <div className="flashcard-container">
          <div 
            className={`flashcard ${isFlipped ? 'flipped' : ''}`}
            onClick={flipCard}
          >
            <div className="flashcard-inner">
              <div className="flashcard-front">
                <div className="card-header">
                  <span className="card-type">Question</span>
                  <span className="card-number">{currentIndex + 1}/{flashcards.length}</span>
                </div>
                <div className="card-content">
                  <p>{currentCard.question || 'No question available'}</p>
                </div>
                <div className="card-footer">
                  <small>Click to reveal answer</small>
                </div>
              </div>
              
              <div className="flashcard-back">
                <div className="card-header">
                  <span className="card-type">Answer</span>
                  <span className="card-number">{currentIndex + 1}/{flashcards.length}</span>
                </div>
                <div className="card-content">
                  <p>{currentCard.answer || 'No answer available'}</p>
                </div>
                <div className="card-footer">
                  <small>Click to see question</small>
                </div>
              </div>
            </div>
          </div>

          <div className="navigation-buttons">
            <button 
              onClick={prevCard} 
              disabled={currentIndex === 0}
              className="nav-btn"
            >
              ← Previous
            </button>
            
            <button 
              onClick={flipCard}
              className="flip-btn"
            >
              {isFlipped ? 'Show Question' : 'Show Answer'}
            </button>
            
            <button 
              onClick={nextCard} 
              disabled={currentIndex === flashcards.length - 1}
              className="nav-btn"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {flashcards.length === 0 && !loading && !error && (
        <div className="no-flashcards">
          <p>No flashcards available. Generate some from content or load existing ones.</p>
        </div>
      )}
    </div>
  );
};

export default FlashcardViewer;