// Frontend/src/FlashcardTestPage.js
import React, { useState } from "react";
import FlashcardViewer from './components/FlashcardViewer';
import FeedbackModal from './components/Feedbackmodel';
import { ToastContainer, useToast } from './components/Toast';
import "./FlashcardTestPage.css";

const FlashcardTestPage = () => {
  const [flashcards, setFlashcards] = useState([
    {
      id: "flashcard_1",
      question: "What is the capital of France?",
      answer: "Paris",
    },
    {
      id: "flashcard_2", 
      question: "What is the largest planet in our solar system?",
      answer: "Jupiter",
    },
    {
      id: "flashcard_3",
      question: "What is the smallest prime number?",
      answer: "2",
    },
  ]);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFlashcardId, setCurrentFlashcardId] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  const handleFeedbackSuccess = (message) => {
    addToast(message, "success");
  };

  const openFeedbackModal = () => {
    // Use the first flashcard ID or generate a session ID
    setCurrentFlashcardId("flashcard_session_" + Date.now());
    setShowFeedbackModal(true);
  };

  const generateQuizAndFlashcards = async () => {
    // Placeholder for actual quiz generation
    addToast("Quiz and flashcards generated successfully! 🎉", "success");
    
    // Auto-show feedback modal after generation
    setTimeout(() => {
      openFeedbackModal();
    }, 1000);
  };

  return (
    <div className="flashcard-test-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="page-header">
        <h1>🎯 Flashcard Practice</h1>
        <p>Test your knowledge with interactive flashcards</p>
      </div>

      <div className="flashcard-section">
        <div className="flashcard-container">
          <FlashcardViewer flashcards={flashcards} />
        </div>

        <div className="action-buttons">
          <button
            className="generate-button"
            onClick={generateQuizAndFlashcards}
          >
            ⚡ Generate New Content
          </button>
          
          <button
            className="feedback-button"
            onClick={openFeedbackModal}
          >
            ⭐ Give Feedback
          </button>
        </div>
      </div>

      <div className="instructions-section">
        <h3>📋 How to Use</h3>
        <div className="instructions-grid">
          <div className="instruction-item">
            <div className="instruction-icon">👆</div>
            <div className="instruction-text">
              <h4>Click to Flip</h4>
              <p>Click on any flashcard to reveal the answer</p>
            </div>
          </div>
          <div className="instruction-item">
            <div className="instruction-icon">🔄</div>
            <div className="instruction-text">
              <h4>Navigate Cards</h4>
              <p>Use the navigation buttons to move between cards</p>
            </div>
          </div>
          <div className="instruction-item">
            <div className="instruction-icon">⭐</div>
            <div className="instruction-text">
              <h4>Rate & Review</h4>
              <p>Provide feedback to help improve the content</p>
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        type="flashcard"
        itemId={currentFlashcardId}
        onSuccess={handleFeedbackSuccess}
      />
    </div>
  );
};

export default FlashcardTestPage;