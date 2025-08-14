// Frontend/src/QuizListPage.js
import React, { useState, useEffect } from 'react';
import QuizTaker from './components/QuizTaker';
import { ToastContainer, useToast } from './components/Toast';
import quizService from './services/quizService';
import './QuizListPage.css';

const QuizListPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    lecture: '',
    difficulty: 'all',
    tags: []
  });

  const [availableTags, setAvailableTags] = useState([]);
  const [availableLectures, setAvailableLectures] = useState([]);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Fetching quizzes with filters:', filters);
    
    const data = await quizService.getQuizzes(filters);
    console.log('Raw API response:', data);

    // Handle different response formats
    let quizzesArray = [];
    if (data.quizzes && Array.isArray(data.quizzes)) {
      quizzesArray = data.quizzes;
    } else if (Array.isArray(data)) {
      quizzesArray = data;
    } else {
      console.warn('Unexpected data format:', data);
      quizzesArray = [];
    }

    console.log(`Processing ${quizzesArray.length} quizzes`);

    // Process and validate quizzes
    const processedQuizzes = quizzesArray
      .filter(quiz => {
        // Filter out invalid quizzes
        const isValid = quiz && 
          quiz.question && 
          quiz.question.trim() !== '' &&
          Array.isArray(quiz.options) && 
          quiz.options.length > 0 &&
          quiz.answer && 
          quiz.answer.trim() !== '';
        
        if (!isValid) {
          console.warn('Filtering out invalid quiz:', quiz);
        }
        
        return isValid;
      })
      .map(quiz => ({
        ...quiz,
        difficulty: quiz?.difficulty || 'Medium',
        topic_tags: Array.isArray(quiz?.topic_tags) ? quiz.topic_tags : [],
        time_taken: quiz?.time_taken || 0,
        question: quiz?.question?.trim() || '',
        options: Array.isArray(quiz?.options) ? quiz.options : [],
        answer: quiz?.answer?.trim() || '',
        lecture_title: quiz?.lecture_title || 'Untitled',
        id: quiz?._id || Math.random().toString(36)
      }));

    console.log(`Final processed quizzes: ${processedQuizzes.length}`);
    console.log('Sample quiz:', processedQuizzes[0]);

    setQuizzes(processedQuizzes);

    // Extract unique values for filters
    const allTags = new Set();
    const allLectures = new Set();

    processedQuizzes.forEach(quiz => {
      if (Array.isArray(quiz.topic_tags)) {
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

  const getFilteredQuizzes = () => {
    return quizzes.filter(quiz => {
      if (filters.difficulty !== 'all' && quiz.difficulty !== filters.difficulty) {
        return false;
      }
      if (filters.search && !quiz.question?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.lecture && quiz.lecture_title !== filters.lecture) {
        return false;
      }
      if (filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => quiz.topic_tags.includes(tag));
        if (!hasTag) return false;
      }
      return true;
    });
  };

  const getGroupedQuizzes = () => {
    const filtered = getFilteredQuizzes();
    return filtered.reduce((groups, quiz) => {
      const lecture = quiz.lecture_title || 'Uncategorized';
      if (!groups[lecture]) groups[lecture] = [];
      groups[lecture].push(quiz);
      return groups;
    }, {});
  };

  const handleQuizSelect = (quiz) => setSelectedQuiz(quiz);

  const handleQuizComplete = async (result) => {
    addToast(
      result.isCorrect
        ? `🎉 Correct! Completed in ${result.timeTaken}s`
        : '💡 Keep practicing! You\'ll get it next time.',
      result.isCorrect ? 'success' : 'info'
    );
    await quizService.saveQuizResult(result);
    setSelectedQuiz(null);
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
    switch (difficulty) {
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

const handleGenerateQuiz = async (formData) => {
  try {
    setLoading(true);
    
    const response = await fetch('http://localhost:5000/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `Generate quiz for ${formData.lecture_title}`,
        difficulty: formData.difficulty,
        lecture_title: formData.lecture_title,
        topic_tags: formData.topic_tags
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      setShowGenerateModal(false);
      
      // Refresh the quiz list
      await fetchQuizzes();
      
      // Show success message
      alert(`Quiz generated successfully! ${data.quiz_count} questions created.`);
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    alert('Failed to generate quiz');
  } finally {
    setLoading(false);
  }
};

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

  return (
    <div className="quiz-list-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="quiz-list-header">
        <h1>🎯 Quiz Center</h1>
        <p>Test your knowledge with {quizzes?.length || 0} available quizzes</p>
        <button
          className="generate-quiz-btn"
          onClick={() => setShowGenerateModal(true)}
        >
          ⚡ Generate New Quiz
        </button>
      </div>

      {/* Filters */}
      <div className="quiz-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>🔍 Search</label>
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>📊 Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="filter-group">
            <label>📖 Lecture</label>
            <select
              value={filters.lecture}
              onChange={(e) => setFilters({ ...filters, lecture: e.target.value })}
              className="filter-select"
            >
              <option value="">All Lectures</option>
              {availableLectures.map(lecture => (
                <option key={lecture} value={lecture}>{lecture}</option>
              ))}
            </select>
          </div>
        </div>

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

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchQuizzes}>Retry</button>
        </div>
      )}

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
                      <div
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}
                      >
                        {quiz.difficulty}
                      </div>
                      <div className="quiz-card-content">
                        <h3 className="quiz-question">
                          {quiz.question?.length > 100
                            ? quiz.question.substring(0, 100) + '...'
                            : quiz.question || 'No question text'}
                        </h3>
                        <div className="quiz-metadata">
                          <div className="meta-item">
                            <span className="meta-icon">⏱️</span>
                            <span>{formatTime(quiz.time_taken)}</span>
                          </div>
                          {quiz.options?.length > 0 && (
                            <div className="meta-item">
                              <span className="meta-icon">📝</span>
                              <span>{quiz.options.length} options</span>
                            </div>
                          )}
                        </div>
                        {quiz.topic_tags?.length > 0 && (
                          <div className="quiz-tags">
                            {quiz.topic_tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="quiz-tag">{tag}</span>
                            ))}
                            {quiz.topic_tags.length > 3 && (
                              <span className="quiz-tag more">
                                +{quiz.topic_tags.length - 3}
                              </span>
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

      {showGenerateModal && (
        <GenerateQuizModal
          onGenerate={handleGenerateQuiz}
          onClose={() => setShowGenerateModal(false)}
        />
      )}
    </div>
  );
};

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
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, lecture_title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Difficulty Level</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, topic_tags: e.target.value })}
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
