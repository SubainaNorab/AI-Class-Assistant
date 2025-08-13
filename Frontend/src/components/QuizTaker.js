// Frontend/src/components/QuizTaker.js
import React, { useState, useEffect } from 'react';
import './QuizTaker.css';

const QuizTaker = ({ quiz, onComplete, onBack }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  // Start timer when component mounts
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  // Update timer every second
  useEffect(() => {
    let interval = null;
    
    if (timerActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, startTime]);

  const handleAnswerSelect = (answer) => {
    if (!showResult) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer) {
      setTimerActive(false);
      const correct = selectedAnswer === quiz.answer;
      setIsCorrect(correct);
      setShowResult(true);
      
      // Call onComplete with result data
      if (onComplete) {
        onComplete({
          quizId: quiz.id,
          isCorrect: correct,
          timeTaken: elapsedTime,
          selectedAnswer,
          correctAnswer: quiz.answer
        });
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="quiz-taker-container">
      {/* Header with metadata */}
      <div className="quiz-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Quiz List
        </button>
        
        <div className="quiz-meta-header">
          <div
            className="difficulty-indicator"
            style={{ backgroundColor: getDifficultyColor(quiz.difficulty || 'Medium') }}
          >
            {quiz.difficulty || 'Medium'} Level
          </div>
          
          <div className="timer">
            ⏱️ {formatTime(elapsedTime)}
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="quiz-content">
        {/* Lecture Title */}
        {quiz.lecture_title && (
          <div className="lecture-info">
            📚 {quiz.lecture_title}
          </div>
        )}

        {/* Topic Tags */}
        {quiz.topic_tags && quiz.topic_tags.length > 0 && (
          <div className="topic-tags">
            {quiz.topic_tags.map((tag, index) => (
              <span key={index} className="topic-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Question */}
        <div className="question-section">
          <h2 className="question-text">{quiz.question}</h2>
        </div>

        {/* Options */}
        <div className="options-section">
          {quiz.options && quiz.options.map((option, index) => (
            <div
              key={index}
              className={`option-card ${
                selectedAnswer === option ? 'selected' : ''
              } ${
                showResult && option === quiz.answer ? 'correct' : ''
              } ${
                showResult && selectedAnswer === option && !isCorrect ? 'incorrect' : ''
              }`}
              onClick={() => handleAnswerSelect(option)}
            >
              <div className="option-letter">
                {String.fromCharCode(65 + index)}
              </div>
              <div className="option-text">{option}</div>
              {showResult && option === quiz.answer && (
                <span className="result-icon">✓</span>
              )}
              {showResult && selectedAnswer === option && !isCorrect && (
                <span className="result-icon">✗</span>
              )}
            </div>
          ))}
        </div>

        {/* Submit/Result Section */}
        <div className="action-section">
          {!showResult ? (
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          ) : (
            <div className="result-section">
              <div className={`result-message ${isCorrect ? 'correct' : 'incorrect'}`}>
                {isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
              </div>
              <div className="result-details">
                <p>Time taken: <strong>{formatTime(elapsedTime)}</strong></p>
                {!isCorrect && (
                  <p className="correct-answer">
                    Correct answer: <strong>{quiz.answer}</strong>
                  </p>
                )}
              </div>
              <button className="next-button" onClick={onBack}>
                Try Another Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizTaker;