// Frontend/src/components/StatsPage.js 

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import './StatsPage.css';

const StatsPage = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching statistics...');
      
      const response = await fetch('http://localhost:5000/progress');
      
      if (response.ok) {
        const data = await response.json();
        console.log('📈 Received stats data:', data);
        setStatsData(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stats-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="error-state">
          <p>❌ Error: {error}</p>
          <button onClick={fetchStats} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="stats-page">
      <div className="stats-container">
        {/* Header */}
        <div className="stats-header">
          <div>
            <h1>📊 Learning Progress Dashboard</h1>
            <p>Track your quiz performance and learning analytics</p>
          </div>
          <button onClick={fetchStats} className="refresh-button">
            🔄 Refresh Data
          </button>
        </div>

        {/* Overview Cards */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-details">
              <h3>Total Quizzes</h3>
              <div className="stat-value">{statsData?.total_quizzes || 0}</div>
              <div className="stat-change">
                {statsData?.completed_quizzes || 0} completed
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-details">
              <h3>Completion Rate</h3>
              <div className="stat-value">{statsData?.completion_percentage || 0}%</div>
              <div className="stat-change">
                Overall progress
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-details">
              <h3>Accuracy</h3>
              <div className="stat-value">{statsData?.accuracy_percentage || 0}%</div>
              <div className="stat-change">
                Correct answers
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <h3>Average Score</h3>
              <div className="stat-value">{statsData?.average_score || 0}%</div>
              <div className="stat-change">
                Quiz average
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">❓</div>
            <div className="stat-details">
              <h3>Questions Answered</h3>
              <div className="stat-value">{statsData?.total_questions_answered || 0}</div>
              <div className="stat-change">
                Total attempts
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-container">
          {/* Activity Chart */}
          {statsData?.performance_data && statsData.performance_data.length > 0 && (
            <div className="chart-section">
              <h2>📈 Daily Activity (Last 7 Days)</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={statsData.performance_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                    labelFormatter={(value) => `Date: ${value}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="questions_answered" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Questions Answered"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="quizzes" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Quizzes Created"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="flashcards" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    name="Flashcards Created"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="charts-row">
            {/* Difficulty Distribution */}
            {statsData?.difficulty_breakdown && statsData.difficulty_breakdown.length > 0 && (
              <div className="chart-section half-width">
                <h2>📊 Quiz Difficulty Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statsData.difficulty_breakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({_id, percent}) => `${_id} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {statsData.difficulty_breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Sessions */}
            {statsData?.recent_sessions && statsData.recent_sessions.length > 0 && (
              <div className="chart-section half-width">
                <h2>🏆 Recent Quiz Scores</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsData.recent_sessions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="lecture_title" 
                      stroke="#6b7280"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      labelFormatter={(value) => `Lecture: ${value}`}
                      formatter={(value) => [`${value}%`, 'Score']}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {statsData?.recent_sessions && statsData.recent_sessions.length > 0 && (
          <div className="recent-activity">
            <h2>🕒 Recent Quiz Sessions</h2>
            <div className="activity-list">
              {statsData.recent_sessions.map((session, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-info">
                    <h4>{session.lecture_title}</h4>
                    <p>{session.questions_completed} questions completed</p>
                  </div>
                  <div className="activity-score">
                    <span className={`score-badge ${getScoreClass(session.score)}`}>
                      {Math.round(session.score)}%
                    </span>
                    <span className="activity-date">
                      {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!statsData?.performance_data || statsData.performance_data.length === 0) && (
          <div className="empty-stats">
            <div className="empty-content">
              <h3>📊 No Statistics Available</h3>
              <p>Start taking quizzes to see your progress and analytics here!</p>
              <a href="/quiz" className="start-learning-btn">
                🚀 Start Learning
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get score class for styling
const getScoreClass = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'average';
  return 'needs-improvement';
};

export default StatsPage;