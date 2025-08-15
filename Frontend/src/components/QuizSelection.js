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

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/quiz');

      // Ensure we always have an array
      const rawData = Array.isArray(response.data)
        ? response.data
        : (response.data?.quizzes || []);

      if (!Array.isArray(rawData)) {
        throw new Error('Invalid quiz data format from server');
      }

      const processedQuizzes = rawData.map(quiz => ({
        ...quiz,
        difficulty: quiz.difficulty || 'Medium',
        topic_tags: quiz.topic_tags || [],
        time_taken: quiz.time_taken || 0,
        id: quiz._id || Math.random().toString(36),
        question: quiz.question || quiz.title || 'Untitled Quiz',
        lecture_title: quiz.lecture_title || 'Uncategorized'
      }));

      setQuizzes(processedQuizzes);

      const allTags = new Set();
      processedQuizzes.forEach(quiz => {
        quiz.topic_tags.forEach(tag => allTags.add(tag));
      });
      setAvailableTags(Array.from(allTags));

      setError(null);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    if (filters.difficulty !== 'all' && quiz.difficulty !== filters.difficulty) return false;
    if (filters.search && !quiz.question.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.lecture && !quiz.lecture_title.toLowerCase().includes(filters.lecture.toLowerCase())) return false;
    if (filters.tags.length > 0 && !filters.tags.some(tag => quiz.topic_tags.includes(tag))) return false;
    return true;
  });

  const groupedQuizzes = filteredQuizzes.reduce((groups, quiz) => {
    const lecture = quiz.lecture_title || 'Uncategorized';
    if (!groups[lecture]) groups[lecture] = [];
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
      <div className="quiz-selection-header">
        <h2>📚 Select a Quiz</h2>
        <p>Choose from {quizzes.length} available quizzes</p>
      </div>

      <div className="quiz-filters">
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
          <input
            type="text"
            placeholder="Filter by lecture..."
            value={filters.lecture}
            onChange={(e) => setFilters({ ...filters, lecture: e.target.value })}
            className="filter-input"
          />
        </div>

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
                    <div
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(quiz.difficulty) }}
                    >
                      {quiz.difficulty}
                    </div>

                    <div className="quiz-question">
                      {quiz.question}
                    </div>

                    <div className="quiz-metadata">
                      <div className="meta-item">
                        <span className="meta-icon">⏱️</span>
                        <span>{formatTime(quiz.time_taken)}</span>
                      </div>

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
