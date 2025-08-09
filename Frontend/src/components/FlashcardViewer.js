// Frontend/src/components/FlashcardViewer.js - Enhanced Version
import React, { useState, useEffect } from 'react';
import './FlashcardViewer.css';

const FlashcardViewer = ({ flashcards = [], content, userId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [displayCards, setDisplayCards] = useState([]);

  useEffect(() => {
    // Use provided flashcards or initialize with default
    if (flashcards && flashcards.length > 0) {
      setDisplayCards(flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
    } else if (content) {
      // Fallback: if content is provided but no flashcards, show placeholder
      setDisplayCards([{
        question: "Content is being processed...",
        answer: "Please wait while we generate flashcards from your content."
      }]);
    }
  }, [flashcards, content]);

  const nextCard = () => {
    if (displayCards.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % displayCards.length);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (displayCards.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + displayCards.length) % displayCards.length);
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const goToCard = (index) => {
    setCurrentIndex(index);
    setIsFlipped(false);
  };

  if (!displayCards || displayCards.length === 0) {
    return (
      <div className="flashcard-viewer">
        <div className="no-flashcards">
          <div className="no-content-icon">🎯</div>
          <h3>No flashcards available</h3>
          <p>Upload a document or enter text to generate flashcards</p>
        </div>
      </div>
    );
  }

  const currentCard = displayCards[currentIndex];

  return (
    <div className="flashcard-viewer">
      {/* Card Counter */}
      <div className="card-counter">
        <span>{currentIndex + 1} of {displayCards.length}</span>
      </div>

      {/* Main Flashcard */}
      <div className="flashcard-container">
        <div 
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={flipCard}
        >
          <div className="flashcard-front">
            <div className="card-label">Question</div>
            <div className="card-content">
              {currentCard.question}
            </div>
            <div className="flip-hint">
              👆 Click to reveal answer
            </div>
          </div>
          <div className="flashcard-back">
            <div className="card-label">Answer</div>
            <div className="card-content">
              {currentCard.answer}
            </div>
            <div className="flip-hint">
              👆 Click to see question
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="navigation-controls">
        <button 
          className="nav-button prev" 
          onClick={prevCard}
          disabled={displayCards.length <= 1}
        >
          ← Previous
        </button>
        
        <button 
          className="flip-button" 
          onClick={flipCard}
        >
          {isFlipped ? '🔄 Show Question' : '🔄 Show Answer'}
        </button>
        
        <button 
          className="nav-button next" 
          onClick={nextCard}
          disabled={displayCards.length <= 1}
        >
          Next →
        </button>
      </div>

      {/* Card Indicators */}
      {displayCards.length > 1 && (
        <div className="card-indicators">
          {displayCards.map((_, index) => (
            <div
              key={index}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToCard(index)}
            >
              {index + 1}
            </div>
          ))}
        </div>
      )}

      {/* Lecture Information */}
      {currentCard.lecture_title && (
        <div className="lecture-info">
          <small>From: {currentCard.lecture_title}</small>
        </div>
      )}

      {/* Study Progress */}
      <div className="study-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((currentIndex + 1) / displayCards.length) * 100}%` 
            }}
          ></div>
        </div>
        <small>Study Progress: {Math.round(((currentIndex + 1) / displayCards.length) * 100)}%</small>
      </div>
    </div>
  );
};

export default FlashcardViewer;