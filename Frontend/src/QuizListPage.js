// Frontend/src/QuizListPage.js
import React, { useState, useEffect, useCallback } from 'react';
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

  const [filters] = useState({
    search: '',
    lecture: '',
    difficulty: 'all',
    tags: []
  });

  const { toasts, addToast, removeToast } = useToast();

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await quizService.getQuizzes(filters);

      let quizzesArray = [];
      if (data.quizzes && Array.isArray(data.quizzes)) {
        quizzesArray = data.quizzes;
      } else if (Array.isArray(data)) {
        quizzesArray = data;
      }

      const processedQuizzes = quizzesArray
        .filter(quiz =>
          quiz &&
          quiz.question?.trim() &&
          Array.isArray(quiz.options) &&
          quiz.options.length > 0 &&
          quiz.answer?.trim()
        )
        .map(quiz => ({
          ...quiz,
          difficulty: quiz?.difficulty || 'Medium',
          topic_tags: Array.isArray(quiz?.topic_tags) ? quiz.topic_tags : [],
          time_taken: quiz?.time_taken || 0,
          lecture_title: quiz?.lecture_title || 'Untitled',
          id: quiz?._id || Math.random().toString(36)
        }));

      setQuizzes(processedQuizzes);
    } catch {
      setError('Failed to load quizzes. Please try again.');
      addToast('Failed to load quizzes', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const getFilteredQuizzes = () => {
    return quizzes.filter(quiz => {
      if (filters.difficulty !== 'all' && quiz.difficulty !== filters.difficulty) return false;
      if (filters.search && !quiz.question.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.lecture && quiz.lecture_title !== filters.lecture) return false;
      if (filters.tags.length > 0 && !filters.tags.some(tag => quiz.topic_tags.includes(tag))) return false;
      return true;
    });
  };

  const getGroupedQuizzes = () => {
    return getFilteredQuizzes().reduce((groups, quiz) => {
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

  const handleGenerateQuiz = async (formData) => {
    try {
      setLoading(true);

      const topicTagsArray = formData.topic_tags
        ? formData.topic_tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      const response = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: formData.summary,
          difficulty: formData.difficulty,
          lecture_title: formData.lecture_title,
          topic_tags: topicTagsArray
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowGenerateModal(false);
        await fetchQuizzes();
        alert(`Quiz generated successfully! ${data.quiz_count} questions created.`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch {
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
        <p>Test your knowledge with {quizzes.length} available quizzes</p>
        <button className="generate-quiz-btn" onClick={() => setShowGenerateModal(true)}>
          ⚡ Generate New Quiz
        </button>
      </div>

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
                  {lectureQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
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
                          {quiz.question.length > 100
                            ? quiz.question.substring(0, 100) + '...'
                            : quiz.question}
                        </h3>
                        <div className="quiz-metadata">
                          <div className="meta-item">
                            <span className="meta-icon">⏱️</span>
                            <span>{formatTime(quiz.time_taken)}</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-icon">📝</span>
                            <span>{quiz.options.length} options</span>
                          </div>
                        </div>
                        {quiz.topic_tags.length > 0 && (
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
