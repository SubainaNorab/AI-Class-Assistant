// Frontend/src/components/StatsPage.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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
      const response = await fetch('http://localhost:5000/progress');
      
      if (response.ok) {
        const data = await response.json();
        setStatsData(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stats-page loading">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page error">
        <p>Error: {error}</p>
        <button onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>📊 Learning Progress</h1>
        <p>Track your quiz and flashcard performance</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Quizzes</h3>
          <div className="stat-value">{statsData?.total_quizzes || 0}</div>
        </div>
        
        <div className="stat-card">
          <h3>Total Flashcards</h3>
          <div className="stat-value">{statsData?.total_flashcards || 0}</div>
        </div>
      </div>

      <div className="chart-section">
        <h2>Activity Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={statsData?.performance_data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="quizzes" stroke="#3b82f6" strokeWidth={3} />
            <Line type="monotone" dataKey="flashcards" stroke="#10b981" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {statsData?.difficulty_breakdown && statsData.difficulty_breakdown.length > 0 && (
        <div className="chart-section">
          <h2>Quiz Difficulty Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statsData.difficulty_breakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="_id"
              >
                {statsData.difficulty_breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StatsPage;