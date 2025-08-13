// Frontend/src/components/QuizSelection.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './QuizSelection.css';

const QuizSelection = ({ onQuizSelect }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    search: '',
    lecture: '',
    tags: []
  });
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch quizzes from backend
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/quiz');
      
      // Process the quiz data
      const processedQuizzes = response.data.map(quiz => ({
        ...quiz,
        difficulty: quiz.difficulty || 'Medium',
        topic_tags: quiz.topic_tags || [],
        time_taken: quiz.time_taken || 0,
        id: quiz._id || Math.random().toString(36)
      }));
      
      setQuizzes(processedQuizzes);
      
      // Extract unique tags for filter
      const allTags = new Set();
      processedQuizzes.forEach(quiz => {
        quiz.topic_tags.forEach(tag => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags));
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load quizzes');
      setLoading(false);
      console.error('Error fetching quizzes:', err);
    }
  };

  // Filter quizzes based on current filters
  const filteredQuizzes = quizzes.filter(quiz => {
    // Filter by difficulty
    if (filters.difficulty !== 'all' && quiz.difficulty !== filters.difficulty) {
      return false;
    }
    
    // Filter by search text
    if (filters.search && !quiz.question.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Filter by lecture
    if (filters.lecture && !quiz.lecture_title.toLowerCase().includes(filters.lecture.toLowerCase())) {
      return false;
    }
    
    // Filter by tags
    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => quiz.topic_tags.includes(tag));
      if (!hasTag) return false;
    }
    
    return true;
  });

  // Group quizzes by lecture for better organization
  const groupedQuizzes = filteredQuizzes.reduce((groups, quiz) => {
    const lecture = quiz.lecture_title || 'Uncategorized';
    if (!groups[lecture]) {
      groups[lecture] = [];
    }
    groups[lecture].push(quiz);
    return groups;
  }, {});

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
    if (!seconds) return 'Not timed';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="quiz-selection-loading">
        <div className="spinner"></div>
        <p>Loading quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-selection-error">
        <p>❌ {error}</p>
        <button onClick={fetchQuizzes}>Retry</button>
      </div>
    );
  }

  return (
    <div className="quiz-selection-container">
      {/* Header Section */}
      <div className="quiz-selection-header">
        <h2>📚 Select a Quiz</h2>
        <p>Choose from {quizzes.length} available quizzes</p>
      </div>

      {/* Filters Section */}
      <div className="quiz-filters">
        {/* Search Bar */}
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
          <input
            type="text"
            placeholder="Filter by lecture..."
            value={filters.lecture}
            onChange={(e) => setFilters({...filters, lecture: e.target.value})}
            className="filter-input"
          />
        </div>

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <div className="filter-group filter-tags">
            <label>🏷️ Tags</label>
            <div className="tag-list">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter ${filters.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quiz List */}
      <div className="quiz-list">
        {Object.keys(groupedQuizzes).length === 0 ? (
          <div className="no-quizzes">
            <p>No quizzes found matching your filters</p>
          </div>
        ) : (
          Object.entries(groupedQuizzes).map(([lecture, lectureQuizzes]) => (
            <div key={lecture} className="lecture-group">
              <h3 className="lecture-title">{lecture}</h3>
              <div className="quiz-grid">
                {lectureQuizzes.map((quiz, index) => (
                  <div
                    key={quiz.id || index}
                    className="quiz-card"
                    onClick={() => onQuizSelect(quiz)}
                  >
                    {/* Difficulty Badge */}
                    <div
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}
                    >
                      {quiz.difficulty}
                    </div>

                    {/* Quiz Question */}
                    <div className="quiz-question">
                      {quiz.question}
                    </div>

                    {/* Quiz Metadata */}
                    <div className="quiz-metadata">
                      {/* Time Taken */}
                      <div className="meta-item">
                        <span className="meta-icon">⏱️</span>
                        <span>{formatTime(quiz.time_taken)}</span>
                      </div>

                      {/* Topic Tags */}
                      {quiz.topic_tags.length > 0 && (
                        <div className="meta-tags">
                          {quiz.topic_tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="quiz-tag">{tag}</span>
                          ))}
                          {quiz.topic_tags.length > 3 && (
                            <span className="quiz-tag">+{quiz.topic_tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options Preview */}
                    <div className="options-preview">
                      {quiz.options && quiz.options.length} options
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuizSelection;