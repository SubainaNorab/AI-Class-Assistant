// Frontend/src/components/QuizTaker.js 

import React, { useState, useEffect } from 'react';
import './QuizTaker.css';

const QuizTaker = ({ quiz, onComplete, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const progressPercentage = ((currentQuestionIndex) / totalQuestions) * 100;

  // Initialize quiz session
  useEffect(() => {
    const now = Date.now();
    setStartTime(now);
    setQuestionStartTime(now);
    
    // Start from the session's current question if resuming
    if (quiz.session && quiz.session.current_question > 1) {
      setCurrentQuestionIndex(quiz.session.current_question - 1);
    }
  }, [quiz]);

  // Reset question state when moving to next question
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (answer) => {
    if (!showResult && !isSubmitting) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || isSubmitting) return;

    setIsSubmitting(true);
    const questionTime = Math.floor((Date.now() - questionStartTime) / 1000);
    const correct = selectedAnswer === currentQuestion.answer;
    
    setIsCorrect(correct);
    setShowResult(true);

    try {
      // Submit answer to backend
      const response = await fetch(`http://localhost:5000/quiz/${quiz.quiz_id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.question_id,
          selected_answer: selectedAnswer,
          correct_answer: currentQuestion.answer,
          time_taken: questionTime,
          question_number: currentQuestion.question_number
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Answer submitted:', result);

        // Track this answer
        const answerRecord = {
          question_number: currentQuestion.question_number,
          question: currentQuestion.question,
          selected_answer: selectedAnswer,
          correct_answer: currentQuestion.answer,
          is_correct: correct,
          time_taken: questionTime
        };

        setAnswers(prev => [...prev, answerRecord]);

        // Check if quiz is completed
        if (result.quiz_completed) {
          setQuizCompleted(true);
          // Auto-advance to results after a delay
          setTimeout(() => {
            showFinalResults(answers.concat(answerRecord));
          }, 2000);
        } else {
          // Auto-advance to next question after showing result
          setTimeout(() => {
            moveToNextQuestion();
          }, 1500);
        }
      } else {
        console.error('❌ Failed to submit answer');
        // Still allow progression even if submission fails
        setTimeout(() => {
          if (currentQuestionIndex < totalQuestions - 1) {
            moveToNextQuestion();
          } else {
            showFinalResults(answers);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      // Continue with local tracking
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
          moveToNextQuestion();
        } else {
          showFinalResults(answers);
        }
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const showFinalResults = (finalAnswers) => {
    const correctCount = finalAnswers.filter(ans => ans.is_correct).length;
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = Math.round((correctCount / totalQuestions) * 100);

    const result = {
      quiz_id: quiz.quiz_id,
      lecture_title: quiz.lecture_title,
      totalQuestions: totalQuestions,
      correctAnswers: correctCount,
      finalScore: finalScore,
      totalTime: totalTime,
      answers: finalAnswers
    };

    onComplete(result);
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="quiz-taker-container">
      {/* Header with progress */}
      <div className="quiz-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Lectures
        </button>
        
        <div className="quiz-info">
          <h1 className="quiz-title">{quiz.lecture_title}</h1>
          <div className="quiz-meta">
            <span
              className="difficulty-indicator"
              style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}
            >
              {quiz.difficulty} Level
            </span>
            <span className="question-counter">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="quiz-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {Math.round(progressPercentage)}% Complete
        </div>
      </div>

      {/* Question Content */}
      <div className="quiz-content">
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

        {/* Current Question */}
        <div className="question-section">
          <div className="question-header">
            <span className="question-number">Q{currentQuestion.question_number}</span>
            <h2 className="question-text">{currentQuestion.question}</h2>
          </div>
        </div>

        {/* Answer Options */}
        <div className="options-section">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`option-card ${
                selectedAnswer === option ? 'selected' : ''
              } ${
                showResult && option === currentQuestion.answer ? 'correct' : ''
              } ${
                showResult && selectedAnswer === option && !isCorrect ? 'incorrect' : ''
              }`}
              onClick={() => handleAnswerSelect(option)}
            >
              <div className="option-letter">
                {String.fromCharCode(65 + index)}
              </div>
              <div className="option-text">{option}</div>
              {showResult && option === currentQuestion.answer && (
                <span className="result-icon correct-icon">✓</span>
              )}
              {showResult && selectedAnswer === option && !isCorrect && (
                <span className="result-icon incorrect-icon">✗</span>
              )}
            </div>
          ))}
        </div>

        {/* Action Section */}
        <div className="action-section">
          {!showResult ? (
            <button
              className="submit-button"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          ) : (
            <div className="result-section">
              <div className={`result-message ${isCorrect ? 'correct' : 'incorrect'}`}>
                {isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
              </div>
              
              {!isCorrect && (
                <div className="correct-answer-info">
                  Correct answer: <strong>{currentQuestion.answer}</strong>
                </div>
              )}

              <div className="progress-info">
                {quizCompleted ? (
                  <div className="completion-message">
                    🎉 Quiz completed! Calculating final results...
                  </div>
                ) : (
                  <div className="next-question-info">
                    Moving to next question... ({totalQuestions - currentQuestionIndex - 1} remaining)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="quiz-stats">
          <div className="stat">
            <span className="stat-label">Answered:</span>
            <span className="stat-value">{answers.length}/{totalQuestions}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Correct:</span>
            <span className="stat-value">
              {answers.filter(ans => ans.is_correct).length}/{answers.length || 1}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Accuracy:</span>
            <span className="stat-value">
              {answers.length > 0 
                ? Math.round((answers.filter(ans => ans.is_correct).length / answers.length) * 100)
                : 0
              }%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTaker;