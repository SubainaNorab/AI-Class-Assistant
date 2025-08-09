// Frontend/src/components/StatsPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./StatsPage.css";

const StatsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/stats");
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStarDisplay = (rating) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "#059669"; // green
    if (rating >= 3.5) return "#d97706"; // amber
    return "#dc2626"; // red
  };

  if (loading) {
    return (
      <div className="stats-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="error-container">
          <h2>📊 Statistics</h2>
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchStats} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="stats-container">
        <header className="stats-header">
          <h1>📊 Dashboard Statistics</h1>
          <button onClick={fetchStats} className="refresh-button">
            🔄 Refresh
          </button>
        </header>

        {/* Overview Cards */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Total Quizzes</h3>
              <p className="stat-number">{stats.total_quizzes}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>Total Flashcards</h3>
              <p className="stat-number">{stats.total_flashcards}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3>Average Rating</h3>
              <p 
                className="stat-number rating" 
                style={{ color: getRatingColor(stats.avg_rating) }}
              >
                {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : "No ratings"}
              </p>
              {stats.avg_rating > 0 && (
                <div className="star-display">
                  {getStarDisplay(Math.round(stats.avg_rating))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Feedback Section */}
        <div className="recent-feedback-section">
          <h2>Recent Feedback</h2>
          {stats.recent_feedback && stats.recent_feedback.length > 0 ? (
            <div className="feedback-list">
              {stats.recent_feedback.map((feedback, index) => (
                <div key={index} className="feedback-item">
                  <div className="feedback-header">
                    <span className="feedback-type">
                      {feedback.type === "quiz" ? "📝" : "🎯"} {feedback.type}
                    </span>
                    <span className="feedback-rating">
                      {getStarDisplay(feedback.rating)}
                    </span>
                    <span className="feedback-date">
                      {formatDate(feedback.created_at)}
                    </span>
                  </div>
                  {feedback.comment && (
                    <p className="feedback-comment">"{feedback.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-feedback">
              <p>No feedback received yet.</p>
              <small>Feedback will appear here once users start rating quizzes and flashcards.</small>
            </div>
          )}
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <h2>Summary</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <h4>Content Generated</h4>
              <p>
                {stats.total_quizzes + stats.total_flashcards} total items created
              </p>
            </div>
            <div className="summary-item">
              <h4>User Satisfaction</h4>
              <p>
                {stats.avg_rating > 0 
                  ? stats.avg_rating >= 4 
                    ? "High satisfaction" 
                    : stats.avg_rating >= 3 
                    ? "Good satisfaction" 
                    : "Needs improvement"
                  : "No ratings yet"
                }
              </p>
            </div>
            <div className="summary-item">
              <h4>Feedback Received</h4>
              <p>{stats.recent_feedback.length} recent feedback entries</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;