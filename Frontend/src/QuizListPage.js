// Frontend/src/QuizListPage.js
import React, { useState, useEffect } from 'react';
import QuizTaker from './components/QuizTaker';
import { ToastContainer, useToast } from './components/Toast';
import quizService from './services/quizService'; // Import the service
import './QuizListPage.css';

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    lecture: '',
    difficulty: 'all',
    tags: []
  });
  
  const [availableTags, setAvailableTags] = useState([]);
  const [availableLectures, setAvailableLectures] = useState([]);
  const { toasts, addToast, removeToast } = useToast();

  // Fetch quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the quiz service to fetch data
      const data = await quizService.getQuizzes(filters);
      
      // Process quiz data with new fields
      const processedQuizzes = (data.quizzes || data).map(quiz => ({
        ...quiz,
        difficulty: quiz.difficulty || 'Medium',
        topic_tags: quiz.topic_tags || [],
        time_taken: quiz.time_taken || 0,
        id: quiz._id || Math.random().toString(36)
      }));
      
      setQuizzes(processedQuizzes);
      
      // Extract unique tags and lectures for filters
      const allTags = new Set();
      const allLectures = new Set();
      
      processedQuizzes.forEach(quiz => {
        if (quiz.topic_tags) {
          quiz.topic_tags.forEach(tag => allTags.add(tag));
        }
        if (quiz.lecture_title) {
          allLectures.add(quiz.lecture_title);
        }
      });
      
      setAvailableTags(Array.from(allTags));
      setAvailableLectures(Array.from(allLectures));
      
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes. Please try again.');
      addToast('Failed to load quizzes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter quizzes based on current filters
  const getFilteredQuizzes = () => {
    return quizzes.filter(quiz => {
      // Filter by difficulty
      if (filters.difficulty !== 'all' && quiz.difficulty !== filters.difficulty) {
        return false;
      }
      
      // Filter by search text (searches in question)
      if (filters.search && !quiz.question.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Filter by lecture
      if (filters.lecture && quiz.lecture_title !== filters.lecture) {
        return false;
      }
      
      // Filter by tags
      if (filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => 
          quiz.topic_tags && quiz.topic_tags.includes(tag)
        );
        if (!hasTag) return false;
      }
      
      return true;
    });
  };

  // Group quizzes by lecture
  const getGroupedQuizzes = () => {
    const filtered = getFilteredQuizzes();
    return filtered.reduce((groups, quiz) => {
      const lecture = quiz.lecture_title || 'Uncategorized';
      if (!groups[lecture]) {
        groups[lecture] = [];
      }
      groups[lecture].push(quiz);
      return groups;
    }, {});
  };

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
  };

  const handleQuizComplete = async (result) => {
    addToast(
      result.isCorrect 
        ? `🎉 Correct! Completed in ${result.timeTaken}s` 
        : '💡 Keep practicing! You\'ll get it next time.',
      result.isCorrect ? 'success' : 'info'
    );
    
    // Save result using quiz service
    await quizService.saveQuizResult(result);
    
    // Return to quiz list
    setSelectedQuiz(null);
    
    // Refresh quiz list to get updated data
    fetchQuizzes();
  };

  const handleTagToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
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
    if (!seconds || seconds === 0) return 'Not timed';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate new quiz using quiz service
  const handleGenerateQuiz = async (formData) => {
    try {
      setLoading(true);
      
      // Prepare data for quiz generation
      const quizData = {
        summary: formData.summary,
        lecture_title: formData.lecture_title,
        difficulty: formData.difficulty,
        topic_tags: formData.topic_tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      // Use quiz service to generate quiz
      await quizService.generateQuiz(quizData);
      
      addToast('Quiz generated successfully!', 'success');
      setShowGenerateModal(false);
      fetchQuizzes(); // Refresh the list
    } catch (error) {
      console.error('Error generating quiz:', error);
      addToast('Failed to generate quiz', 'error');
    } finally {
      setLoading(false);
    }
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

  // Main quiz list view
  return (
    <div className="quiz-list-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="quiz-list-header">
        <h1>🎯 Quiz Center</h1>
        <p>Test your knowledge with {quizzes.length} available quizzes</p>
        <button 
          className="generate-quiz-btn"
          onClick={() => setShowGenerateModal(true)}
        >
          ⚡ Generate New Quiz
        </button>
      </div>

      {/* Filters Section */}
      <div className="quiz-filters">
        <div className="filters-row">
          {/* Search */}
          <div className="filter-group">
            <label>🔍 Search</label>
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="filter-input"
            />
          </div>

          {/* Difficulty Filter */}
          <div className="filter-group">
            <label>📊 Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Lecture Filter */}
          <div className="filter-group">
            <label>📖 Lecture</label>
            <select
              value={filters.lecture}
              onChange={(e) => setFilters({...filters, lecture: e.target.value})}
              className="filter-select"
            >
              <option value="">All Lectures</option>
              {availableLectures.map(lecture => (
                <option key={lecture} value={lecture}>{lecture}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <div className="filter-tags-section">
            <label>🏷️ Filter by Tags:</label>
            <div className="tag-filters">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${filters.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
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
      {error && !loading && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchQuizzes}>Retry</button>
        </div>
      )}

      {/* Quiz List */}
      {!loading && !error && (
        <div className="quiz-list-content">
          {Object.keys(getGroupedQuizzes()).length === 0 ? (
            <div className="no-quizzes">
              <h3>No quizzes found</h3>
              <p>Try adjusting your filters or generate a new quiz</p>
            </div>
          ) : (
            Object.entries(getGroupedQuizzes()).map(([lecture, lectureQuizzes]) => (
              <div key={lecture} className="lecture-section">
                <h2 className="lecture-title">📚 {lecture}</h2>
                <div className="quiz-grid">
                  {lectureQuizzes.map((quiz, index) => (
                    <div
                      key={quiz.id || index}
                      className="quiz-card"
                      onClick={() => handleQuizSelect(quiz)}
                    >
                      {/* Difficulty Badge */}
                      <div 
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}
                      >
                        {quiz.difficulty}
                      </div>

                      {/* Quiz Content */}
                      <div className="quiz-card-content">
                        <h3 className="quiz-question">
                          {quiz.question.length > 100 
                            ? quiz.question.substring(0, 100) + '...' 
                            : quiz.question}
                        </h3>

                        {/* Quiz Metadata */}
                        <div className="quiz-metadata">
                          <div className="meta-item">
                            <span className="meta-icon">⏱️</span>
                            <span>{formatTime(quiz.time_taken)}</span>
                          </div>
                          
                          {quiz.options && (
                            <div className="meta-item">
                              <span className="meta-icon">📝</span>
                              <span>{quiz.options.length} options</span>
                            </div>
                          )}
                        </div>

                        {/* Topic Tags */}
                        {quiz.topic_tags && quiz.topic_tags.length > 0 && (
                          <div className="quiz-tags">
                            {quiz.topic_tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="quiz-tag">{tag}</span>
                            ))}
                            {quiz.topic_tags.length > 3 && (
                              <span className="quiz-tag more">+{quiz.topic_tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
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
        />
      )}
    </div>
  );
};

// Generate Quiz Modal Component
const GenerateQuizModal = ({ onGenerate, onClose }) => {
  const [formData, setFormData] = useState({
    summary: '',
    lecture_title: '',
    difficulty: 'Medium',
    topic_tags: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Generate New Quiz</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Summary Text *</label>
            <textarea
              placeholder="Enter the text to generate quiz from..."
              value={formData.summary}
              onChange={(e) => setFormData({...formData, summary: e.target.value})}
              required
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>Lecture Title *</label>
            <input
              type="text"
              placeholder="e.g., Machine Learning Basics"
              value={formData.lecture_title}
              onChange={(e) => setFormData({...formData, lecture_title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Difficulty Level</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="form-group">
            <label>Topic Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g., AI, Neural Networks, Deep Learning"
              value={formData.topic_tags}
              onChange={(e) => setFormData({...formData, topic_tags: e.target.value})}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="submit-btn">Generate Quiz</button>
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizListPage;