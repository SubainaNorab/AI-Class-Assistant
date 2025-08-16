// src/FlashcardStatsPage.jsx
import React, { useEffect, useState } from 'react';
import './FlashcardStatsPage.css';

const FlashcardStatsPage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/flashcard-stats') // Adjust if backend port is different
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error('Error fetching stats:', err));
  }, []);

  return (
    <div className="flashcard-stats-page">
      <h1>📊 Flashcard Statistics</h1>
      {stats ? (
        <div className="stats-table">
          <table>
            <thead>
              <tr>
                <th>Content Hash</th>
                <th>Questions</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((item) => (
                <tr key={item.content_hash}>
                  <td>{item.content_hash.slice(0, 8)}...</td>
                  <td>{item.question_count}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Loading statistics...</p>
      )}
    </div>
  );
};

export default FlashcardStatsPage;