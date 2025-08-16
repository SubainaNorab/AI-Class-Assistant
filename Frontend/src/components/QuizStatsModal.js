// Frontend/src/components/QuizStatsModal.js

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './QuizStatsModal.css';

const QuizStatsModal = ({ lecture, onClose }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchQuizFeedback();
  }, [lecture.quiz_id]);

  const fetchQuizFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/feedback/${lecture.quiz_id}?type=quiz`);
      
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#3b82f6';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Mock performance data - in real app this would come from backend
  const performanceData = [
    { attempt: 1, score: 60, time: 180 },
    { attempt: 2, score: 75, time: 165 },
    { attempt: 3, score: 85, time: 150 },
    { attempt: 4, score: 90, time: 140 },
  ].slice(0, lecture.stats?.attempts || 1);

  const difficultyData = [
    { name: 'Easy', value: 30, color: '#10b981' },
    { name: 'Medium', value: 50, color: '#f59e0b' },
    { name: 'Hard', value: 20, color: '#ef4444' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Quiz Statistics: {lecture.lecture_title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📈 Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            🎯 Performance
          </button>
          <button 
            className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            ⭐ Feedback ({feedback.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Key Metrics */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">🎯</div>
                  <div className="metric-details">
                    <h4>Best Score</h4>
                    <div 
                      className="metric-value"
                      style={{ color: getScoreColor(lecture.stats?.best_score || 0) }}
                    >
                      {Math.round(lecture.stats?.best_score || 0)}%
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">📊</div>
                  <div className="metric-details">
                    <h4>Average Score</h4>
                    <div className="metric-value">
                      {Math.round(lecture.stats?.average_score || 0)}%
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">🔄</div>
                  <div className="metric-details">
                    <h4>Attempts</h4>
                    <div className="metric-value">
                      {lecture.stats?.attempts || 0}
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-details">
                    <h4>Total Time</h4>
                    <div className="metric-value">
                      {formatTime(lecture.stats?.total_time || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Details */}
              <div className="quiz-details">
                <h3>Quiz Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">📚 Title:</span>
                    <span className="detail-value">{lecture.lecture_title}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">❓ Questions:</span>
                    <span className="detail-value">{lecture.total_questions}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📊 Difficulty:</span>
                    <span 
                      className="detail-value difficulty-badge"
                      style={{ 
                        backgroundColor: getDifficultyColor(lecture.difficulty),
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.85rem'
                      }}
                    >
                      {lecture.difficulty}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📅 Created:</span>
                    <span className="detail-value">
                      {new Date(lecture.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">🏷️ Topics:</span>
                    <span className="detail-value">
                      {lecture.topic_tags && lecture.topic_tags.length > 0 
                        ? lecture.topic_tags.join(', ')
                        : 'No topics specified'
                      }
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">📈 Progress:</span>
                    <span className="detail-value">
                      {lecture.progress.percentage}% Complete 
                      ({lecture.progress.completed}/{lecture.progress.total})
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="progress-section">
                <h3>Completion Progress</h3>
                <div className="progress-bar-large">
                  <div 
                    className="progress-fill-large"
                    style={{ width: `${lecture.progress.percentage}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  {lecture.progress.percentage}% Complete
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="performance-tab">
              {lecture.stats?.attempts > 0 ? (
                <>
                  {/* Performance Chart */}
                  <div className="chart-section">
                    <h3>Score Progression</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="attempt" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'score' ? `${value}%` : `${value}s`,
                            name === 'score' ? 'Score' : 'Time'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Performance Analysis */}
                  <div className="performance-analysis">
                    <h3>Performance Analysis</h3>
                    <div className="analysis-grid">
                      <div className="analysis-item">
                        <div className="analysis-icon">📈</div>
                        <div className="analysis-content">
                          <h4>Improvement Trend</h4>
                          <p>
                            {lecture.stats.best_score > lecture.stats.average_score 
                              ? "📈 Scores are improving over time!"
                              : "📊 Consistent performance maintained"
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="analysis-item">
                        <div className="analysis-icon">⏱️</div>
                        <div className="analysis-content">
                          <h4>Time Efficiency</h4>
                          <p>
                            Average time per question: {' '}
                            {Math.round((lecture.stats.total_time || 0) / (lecture.total_questions * (lecture.stats.attempts || 1)))}s
                          </p>
                        </div>
                      </div>

                      <div className="analysis-item">
                        <div className="analysis-icon">🎯</div>
                        <div className="analysis-content">
                          <h4>Mastery Level</h4>
                          <p>
                            {lecture.stats.best_score >= 90 ? "🌟 Expert level achieved!"
                              : lecture.stats.best_score >= 80 ? "🎯 Advanced understanding"
                              : lecture.stats.best_score >= 70 ? "📚 Good comprehension"
                              : "📖 Keep practicing for improvement"
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-data">
                  <div className="no-data-icon">📊</div>
                  <h3>No Performance Data Yet</h3>
                  <p>Complete this quiz to see your performance analytics!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="feedback-tab">
              {!loading && feedback.length === 0 ? (
                <div className="no-data">
                  <div className="no-data-icon">⭐</div>
                  <h3>No Feedback Yet</h3>
                  <p>Be the first to rate and review this quiz!</p>
                </div>
              ) : (
                <>
                  {/* Feedback Summary */}
                  <div className="feedback-summary">
                    <h3>Community Feedback</h3>
                    <div className="feedback-stats">
                      <div className="feedback-stat">
                        <span className="stat-number">{feedback.length}</span>
                        <span className="stat-label">Reviews</span>
                      </div>
                      <div className="feedback-stat">
                        <span className="stat-number">
                          {feedback.length > 0 
                            ? (feedback.reduce((sum, fb) => sum + fb.rating, 0) / feedback.length).toFixed(1)
                            : '0.0'
                          }
                        </span>
                        <span className="stat-label">Average Rating</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Feedback */}
                  <div className="feedback-list">
                    {feedback.map((fb, index) => (
                      <div key={index} className="feedback-item">
                        <div className="feedback-header">
                          <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span 
                                key={star}
                                className={`star ${star <= fb.rating ? 'filled' : ''}`}
                              >
                                ⭐
                              </span>
                            ))}
                          </div>
                          <span className="feedback-date">
                            {new Date(fb.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        {fb.comment && (
                          <p className="feedback-comment">{fb.comment}</p>
                        )}
                        <div className="feedback-category">
                          Category: {fb.category || 'General'}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizStatsModal;