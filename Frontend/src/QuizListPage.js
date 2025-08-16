// Frontend/src/QuizListPage.js 

import React, { useState, useEffect } from 'react';
import QuizTaker from './components/QuizTaker';
import { ToastContainer, useToast } from './components/Toast';
import GenerateQuizModal from './components/GenerateQuizModal';
import FeedbackModal from './components/FeedbackModal';
import QuizStatsModal from './components/QuizStatsModal';
import './QuizListPage.css';

const QuizListPage = () => {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedLectureForFeedback, setSelectedLectureForFeedback] = useState(null);
  const [selectedLectureForStats, setSelectedLectureForStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    difficulty: 'all',
    tag: '',
    sortBy: 'newest'
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [availableDifficulties, setAvailableDifficulties] = useState(['Easy', 'Medium', 'Hard']);

  const { toasts, addToast, removeToast } = useToast();

  // Fetch lectures from backend
  const fetchLectures = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
      if (filters.tag) params.append('tag', filters.tag);

      const url = `http://localhost:5000/lectures${params.toString() ? '?' + params.toString() : ''}`;
      console.log('🔍 Fetching lectures from:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📚 Received lecture data:', data);

      if (data.lectures) {
        // Sort lectures based on selected criteria
        let sortedLectures = [...data.lectures];
        switch (filters.sortBy) {
          case 'newest':
            sortedLectures.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
          case 'oldest':
            sortedLectures.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
          case 'score_high':
            sortedLectures.sort((a, b) => (b.stats?.best_score || 0) - (a.stats?.best_score || 0));
            break;
          case 'score_low':
            sortedLectures.sort((a, b) => (a.stats?.best_score || 0) - (b.stats?.best_score || 0));
            break;
          case 'alphabetical':
            sortedLectures.sort((a, b) => a.lecture_title.localeCompare(b.lecture_title));
            break;
          default:
            break;
        }
        
        setLectures(sortedLectures);
        setAvailableTags(data.available_tags || []);
        setAvailableDifficulties(data.available_difficulties || ['Easy', 'Medium', 'Hard']);
        
        console.log(`✅ Loaded ${data.total_lectures} lectures`);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        setLectures([]);
      }
    } catch (err) {
      console.error('❌ Error fetching lectures:', err);
      setError(`Failed to load lectures: ${err.message}`);
      setLectures([]);
    } finally {
      setLoading(false);
    }
  };

  // Load lectures on component mount and when filters change
  useEffect(() => {
    fetchLectures();
  }, [filters]);

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
          : [],
        user_id: 'anonymous' // You can implement user authentication later
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
        addToast(`🎉 Quiz generated successfully! ${data.question_count} questions created for "${data.lecture_title}".`, 'success');
        
        // Refresh the lecture list to show the new quiz
        await fetchLectures();
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

  // Start a lecture quiz
  const handleStartQuiz = async (lecture) => {
    try {
      console.log('🎯 Starting quiz for lecture:', lecture.lecture_title);
      
      // Fetch the complete quiz data
      const response = await fetch(`http://localhost:5000/quiz/${lecture.quiz_id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load quiz');
      }
      
      const quizData = await response.json();
      console.log('📖 Loaded quiz data:', quizData);
      
      setSelectedQuiz(quizData);
      
    } catch (err) {
      console.error('❌ Error starting quiz:', err);
      addToast('❌ Failed to start quiz. Please try again.', 'error');
    }
  };

  // Handle quiz completion
  const handleQuizComplete = async (result) => {
    console.log('🎉 Quiz completed with result:', result);
    
    addToast(
      `🎉 Quiz completed! Final score: ${result.finalScore}% (${result.correctAnswers}/${result.totalQuestions})`,
      'success'
    );

    // Return to quiz list and refresh to show updated progress
    setSelectedQuiz(null);
    await fetchLectures();
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const response = await fetch('http://localhost:5000/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz',
          item_id: selectedLectureForFeedback.quiz_id,
          rating: feedbackData.rating,
          comment: feedbackData.comment,
          category: feedbackData.category,
          user_id: 'anonymous'
        })
      });

      if (response.ok) {
        const result = await response.json();
        addToast('✅ Feedback submitted successfully!', 'success');
        setShowFeedbackModal(false);
        setSelectedLectureForFeedback(null);
        
        // Refresh lectures to show updated ratings
        await fetchLectures();
      } else {
        addToast('❌ Failed to submit feedback', 'error');
      }
    } catch (err) {
      console.error('❌ Error submitting feedback:', err);
      addToast('❌ Network error while submitting feedback', 'error');
    }
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

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#3b82f6'; // Blue
    if (score >= 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
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

  const hasLectures = lectures.length > 0;

  return (
    <div className="quiz-list-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="quiz-list-header">
        <h1>🎯 Quiz Center</h1>
        <p>Master your knowledge with {lectures.length} available lecture quizzes</p>
        <div className="header-actions">
          <button 
            className="generate-quiz-btn" 
            onClick={() => setShowGenerateModal(true)}
            disabled={loading}
          >
            ⚡ Generate New Quiz
          </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="quiz-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>🔍 Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Search lectures or content..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div className="filter-group">
            <label>📊 Difficulty</label>
            <select
              className="filter-select"
              value={filters.difficulty}
              onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            >
              <option value="all">All Levels</option>
              {availableDifficulties.map(diff => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>🏷️ Topic</label>
            <select
              className="filter-select"
              value={filters.tag}
              onChange={(e) => setFilters(prev => ({ ...prev, tag: e.target.value }))}
            >
              <option value="">All Topics</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📈 Sort By</label>
            <select
              className="filter-select"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">A-Z</option>
              <option value="score_high">Highest Score</option>
              <option value="score_low">Lowest Score</option>
            </select>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="quick-filters">
          <button 
            className={`quick-filter-btn ${filters.difficulty === 'all' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, difficulty: 'all' }))}
          >
            All
          </button>
          <button 
            className={`quick-filter-btn ${filters.difficulty === 'Easy' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, difficulty: 'Easy' }))}
          >
            🟢 Easy
          </button>
          <button 
            className={`quick-filter-btn ${filters.difficulty === 'Medium' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, difficulty: 'Medium' }))}
          >
            🟡 Medium
          </button>
          <button 
            className={`quick-filter-btn ${filters.difficulty === 'Hard' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, difficulty: 'Hard' }))}
          >
            🔴 Hard
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading lectures...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchLectures}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* Lecture Content */}
      {!loading && !error && (
        <div className="quiz-list-content">
          {!hasLectures ? (
            <div className="empty-state">
              <div className="empty-content">
                <h3>🎯 No Lecture Quizzes Found</h3>
                <p>
                  {filters.search || filters.difficulty !== 'all' || filters.tag
                    ? "No quizzes match your current filters. Try adjusting your search criteria."
                    : "No lecture quizzes have been generated yet. Create your first quiz to get started!"
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
            <div className="lectures-grid">
              {lectures.map((lecture) => (
                <div key={lecture.quiz_id} className="lecture-card">
                  {/* Lecture Header */}
                  <div className="lecture-card-header">
                    <h2 className="lecture-title">{lecture.lecture_title}</h2>
                    <div className="lecture-actions">
                      <button
                        className="action-btn stats-btn"
                        onClick={() => {
                          setSelectedLectureForStats(lecture);
                          setShowStatsModal(true);
                        }}
                        title="View detailed statistics"
                      >
                        📊
                      </button>
                      <button
                        className="action-btn feedback-btn"
                        onClick={() => {
                          setSelectedLectureForFeedback(lecture);
                          setShowFeedbackModal(true);
                        }}
                        title="Rate this quiz"
                      >
                        ⭐
                      </button>
                    </div>
                  </div>

                  <div className="lecture-meta">
                    <span className="question-count">
                      📝 {lecture.total_questions} questions
                    </span>
                    <span 
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(lecture.difficulty) }}
                    >
                      {lecture.difficulty}
                    </span>
                    {lecture.stats?.attempts > 0 && (
                      <span className="attempts-badge">
                        🔄 {lecture.stats.attempts} attempts
                      </span>
                    )}
                  </div>

                  {/* Progress Section */}
                  <div className="progress-section">
                    <div className="progress-info">
                      <span>Progress: {lecture.progress.completed}/{lecture.progress.total} questions</span>
                      <span>{lecture.progress.percentage}% Complete</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${lecture.progress.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  {lecture.stats?.attempts > 0 && (
                    <div className="performance-stats">
                      <div className="stat-item">
                        <span className="stat-label">Best Score:</span>
                        <span 
                          className="stat-value score"
                          style={{ color: getScoreColor(lecture.stats.best_score) }}
                        >
                          {Math.round(lecture.stats.best_score)}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Average:</span>
                        <span className="stat-value">
                          {Math.round(lecture.stats.average_score)}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Time:</span>
                        <span className="stat-value">
                          {formatTime(lecture.stats.total_time)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Topic Tags */}
                  {lecture.topic_tags && lecture.topic_tags.length > 0 && (
                    <div className="topic-tags">
                      {lecture.topic_tags.map(tag => (
                        <span key={tag} className="topic-tag">
                          🏷️ {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quiz Status */}
                  <div className="quiz-status">
                    {lecture.progress.is_completed ? (
                      <div className="completed-status">
                        <span className="completion-badge">✅ Completed</span>
                        <span 
                          className="final-score"
                          style={{ color: getScoreColor(lecture.progress.final_score || 0) }}
                        >
                          Final Score: {lecture.progress.final_score ? Math.round(lecture.progress.final_score) : 'N/A'}%
                        </span>
                      </div>
                    ) : lecture.progress.completed > 0 ? (
                      <div className="in-progress-status">
                        <span className="progress-badge">🔄 In Progress</span>
                        <span className="current-question">
                          Continue from question {lecture.progress.current_question}
                        </span>
                      </div>
                    ) : (
                      <div className="not-started-status">
                        <span className="start-badge">⏳ Ready to Start</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    className={`quiz-action-btn ${lecture.progress.is_completed ? 'retake' : 'start'}`}
                    onClick={() => handleStartQuiz(lecture)}
                  >
                    {lecture.progress.is_completed 
                      ? '🔄 Retake Quiz' 
                      : lecture.progress.completed > 0 
                        ? '▶️ Continue Quiz'
                        : '🚀 Start Quiz'
                    }
                  </button>

                  {/* Footer */}
                  <div className="lecture-footer">
                    <span className="creation-date">
                      📅 Created: {new Date(lecture.created_at).toLocaleDateString()}
                    </span>
                    {lecture.progress.last_attempt && (
                      <span className="last-attempt">
                        🕒 Last attempt: {new Date(lecture.progress.last_attempt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showGenerateModal && (
        <GenerateQuizModal
          onGenerate={handleGenerateQuiz}
          onClose={() => setShowGenerateModal(false)}
          loading={loading}
          availableTags={availableTags}
        />
      )}

      {showFeedbackModal && selectedLectureForFeedback && (
        <FeedbackModal
          lecture={selectedLectureForFeedback}
          onSubmit={handleFeedbackSubmit}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedLectureForFeedback(null);
          }}
        />
      )}

      {showStatsModal && selectedLectureForStats && (
        <QuizStatsModal
          lecture={selectedLectureForStats}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedLectureForStats(null);
          }}
        />
      )}
    </div>
  );
};

export default QuizListPage;