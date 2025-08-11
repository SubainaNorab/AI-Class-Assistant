import React, { useEffect, useState, useContext } from 'react';
import api from '../Api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContext } from './ToastProvider';

export default function StatsPage() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const { addToast } = useContext(ToastContext);

  useEffect(() => {
    api.get('/progress/123') // replace with actual userId
      .then(res => {
        setData(res.data.performance);
        setSummary({
          quizzes: res.data.quizzes_generated,
          flashcards: res.data.flashcards_reviewed,
          correctRatio: res.data.correct_ratio
        });
        addToast('Statistics loaded successfully ✅', 'success');
      })
      .catch(err => {
        console.error(err);
        addToast('Failed to load statistics ❌', 'error');
      });
  }, [addToast]);

  return (
    <div className="container py-4">
      <h2>Progress</h2>
      {summary && (
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card p-3 shadow-sm">
              <h6>Quizzes Generated</h6>
              <strong>{summary.quizzes}</strong>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-sm">
              <h6>Flashcards Reviewed</h6>
              <strong>{summary.flashcards}</strong>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-sm">
              <h6>Correct Ratio</h6>
              <strong>{Math.round(summary.correctRatio * 100)}%</strong>
            </div>
          </div>
        </div>
      )}
      <div className="card p-3 shadow-sm">
        <h5>Performance Over Time</h5>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#007bff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
