// Frontend/src/QuizListPage.js - FIXED VERSION

import React, { useState, useEffect } from 'react';
import QuizTaker from './components/QuizTaker';
import { ToastContainer, useToast } from './components/Toast';
import GenerateQuizModal from './components/GenerateQuizModal';
import './QuizListPage.css';

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    difficulty: 'all',
    lecture: ''
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // Toast notification system
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch quizzes from backend
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
      if (filters.lecture) params.append('lecture', filters.lecture);

      const url = `http://localhost:5000/quizzes${params.toString() ? '?' + params.toString() : ''}`;
      console.log('🔍 Fetching quizzes from:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Received quiz data:', data);

      // Handle the response format from backend
      if (data.quizzes) {
        setQuizzes(data.quizzes);
        
        // Extract available tags from all quizzes
        const tags = new Set();
        Object.values(data.quizzes).forEach(lecture => {
          if (lecture.topic_tags && Array.isArray(lecture.topic_tags)) {
            lecture.topic_tags.forEach(tag => tags.add(tag));
          }
        });
        setAvailableTags(Array.from(tags));
        
        console.log(`✅ Loaded ${data.total_lectures} lectures with ${data.total_questions} total questions`);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setQuizzes({});
      }
    } catch (err) {
      console.error('❌ Error fetching quizzes:', err);
      setError(`Failed to load quizzes: ${err.message}`);
      setQuizzes({});
    } finally {
      setLoading(false);
    }
  };

  // Load quizzes on component mount and when filters change
  useEffect(() => {
    fetchQuizzes();
  }, [filters.search, filters.difficulty, filters.lecture]);

  // Generate new quiz
  const handleGenerateQuiz = async (formData) => {
    try {
      setLoading(true);

      console.log('🎯 Generating quiz with data:', formData);

      // Prepare the request payload
      const payload = {
        summary: formData.summary.trim(),
        difficulty: formData.difficulty || 'Medium',
        lecture_title: formData.lecture_title.trim() || 'Generated Quiz',
        topic_tags: formData.topic_tags
          ? formData.topic_tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : []
      };

      console.log('📤 Sending payload:', payload);

      const response = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('📥 Generate quiz response:', data);

      if (response.ok) {
        setShowGenerateModal(false);
        addToast(`🎉 Quiz generated successfully! ${data.quiz_count} questions created for "${data.lecture_title}".`, 'success');
        
        // Refresh the quiz list to show the new quiz
        await fetchQuizzes();
      } else {
        console.error('❌ Generation failed:', data);
        addToast(`❌ Error: ${data.error || 'Failed to generate quiz'}`, 'error');
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      addToast('❌ Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle quiz completion
  const handleQuizComplete = async (result) => {
    console.log('🎯 Quiz completed with result:', result);
    
    addToast(
      result.isCorrect 
        ? `🎉 Correct! Completed in ${result.timeTaken}s`
        : '💡 Keep practicing! You\'ll get it next time.',
      result.isCorrect ? 'success' : 'info'
    );

    // Save quiz result to backend
    try {
      const response = await fetch('http://localhost:5000/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: result.quizId,
          is_correct: result.isCorrect,
          time_taken: result.timeTaken,
          selected_answer: result.selectedAnswer,
          correct_answer: result.correctAnswer
        })
      });

      if (response.ok) {
        console.log('💾 Quiz result saved successfully');
      } else {
        console.warn('⚠️ Failed to save quiz result');
      }
    } catch (err) {
      console.warn('⚠️ Error saving quiz result:', err);
    }

    // Return to quiz list and refresh to show updated progress
    setSelectedQuiz(null);
    await fetchQuizzes();
  };

  // Utility functions
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b'; 
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'Not timed';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter quizzes based on selected tags
  const getFilteredQuizzes = () => {
    if (selectedTags.length === 0) return quizzes;

    const filtered = {};
    Object.entries(quizzes).forEach(([lectureTitle, lectureData]) => {
      const hasMatchingTags = selectedTags.some(tag => 
        lectureData.topic_tags && lectureData.topic_tags.includes(tag)
      );
      if (hasMatchingTags) {
        filtered[lectureTitle] = lectureData;
      }
    });

    return filtered;
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // If a quiz is selected, show the quiz taker
  if (selectedQuiz) {
    return (
      <>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <QuizTaker
          quiz={selectedQuiz}
          onComplete={handleQuizComplete}
          onBack={() => setSelectedQuiz(null)}
        />
      </>
    );
  }

  const filteredQuizzes = getFilteredQuizzes();
  const hasQuizzes = Object.keys(filteredQuizzes).length > 0;

  return (
    <div className="quiz-list-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="quiz-list-header">
        <h1>🎯 Quiz Center</h1>
        <p>Test your knowledge with {Object.keys(quizzes).length} available lecture sets</p>
        <button 
          className="generate-quiz-btn" 
          onClick={() => setShowGenerateModal(true)}
          disabled={loading}
        >
          ⚡ Generate New Quiz
        </button>
      </div>

      {/* Filters */}
      <div className="quiz-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>🔍 Search Quizzes</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search by question content..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label>📊 Difficulty Level</label>
            <select
              className="filter-select"
              value={filters.difficulty}
              onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            >
              <option value="all">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>📚 Lecture Title</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Filter by lecture name..."
              value={filters.lecture}
              onChange={(e) => setFilters(prev => ({ ...prev, lecture: e.target.value }))}
            />
          </div>
        </div>

        {/* Tag Filters */}
        {availableTags.length > 0 && (
          <div className="filter-tags-section">
            <label>🏷️ Filter by Topics</label>
            <div className="tag-filters">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchQuizzes}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* Quiz Content */}
      {!loading && !error && (
        <div className="quiz-list-content">
          {!hasQuizzes ? (
            <div className="empty-state">
              <div className="empty-content">
                <h3>🎯 No Quizzes Found</h3>
                <p>
                  {Object.keys(quizzes).length === 0 
                    ? "No quizzes have been generated yet. Create your first quiz to get started!"
                    : "No quizzes match your current filters. Try adjusting your search criteria."
                  }
                </p>
                <button 
                  className="generate-quiz-btn"
                  onClick={() => setShowGenerateModal(true)}
                >
                  ⚡ Generate Your First Quiz
                </button>
              </div>
            </div>
          ) : (
            Object.entries(filteredQuizzes).map(([lectureTitle, lectureData]) => (
              <div key={lectureTitle} className="lecture-section">
                <div className="lecture-header">
                  <h2 className="lecture-title">{lectureTitle}</h2>
                  <div className="lecture-meta">
                    <span className="question-count">
                      📝 {lectureData.total_questions} questions
                    </span>
                    <span 
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(lectureData.difficulty) }}
                    >
                      {lectureData.difficulty}
                    </span>
                    <span className="progress-indicator">
                      📊 {lectureData.progress?.percentage || 0}% Complete
                    </span>
                  </div>
                  
                  {lectureData.topic_tags && lectureData.topic_tags.length > 0 && (
                    <div className="topic-tags">
                      {lectureData.topic_tags.map(tag => (
                        <span key={tag} className="topic-tag">
                          🏷️ {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="quiz-grid">
                  {lectureData.questions?.map((question, index) => (
                    <div key={question._id || index} className="quiz-card">
                      <div className="quiz-card-header">
                        <h3>Question {index + 1}</h3>
                        <span 
                          className={`completion-status ${question.is_completed ? 'completed' : 'pending'}`}
                        >
                          {question.is_completed ? '✅ Completed' : '⏳ Pending'}
                        </span>
                      </div>
                      
                      <div className="quiz-question-preview">
                        {question.question}
                      </div>
                      
                      <div className="quiz-card-meta">
                        <span className="option-count">
                          📋 {question.options?.length || 0} options
                        </span>
                        {question.completion_time && (
                          <span className="completion-time">
                            ⏱️ {formatTime(question.completion_time)}
                          </span>
                        )}
                      </div>
                      
                      <button
                        className="start-quiz-btn"
                        onClick={() => setSelectedQuiz({
                          id: question._id,
                          lectureTitle: lectureTitle,
                          question: question.question,
                          options: question.options,
                          answer: question.answer,
                          difficulty: question.difficulty
                        })}
                      >
                        {question.is_completed ? '🔄 Retake Quiz' : '▶️ Start Quiz'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Generate Quiz Modal */}
      {showGenerateModal && (
        <GenerateQuizModal
          onGenerate={handleGenerateQuiz}
          onClose={() => setShowGenerateModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default QuizListPage;