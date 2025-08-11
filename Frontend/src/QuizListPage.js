import React, { useEffect, useState } from 'react';
import api from '../api';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function QuizListPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [lecture, setLecture] = useState('');

  useEffect(() => {
    api.get('/quiz', { params: { search, lecture } })
      .then(res => setItems(res.data.quizzes))
      .catch(err => console.error(err));
  }, [search, lecture]);

  return (
    <div className="container py-4">
      <h2>Quiz List</h2>
      <div className="row mb-3">
        <div className="col-md-6">
          <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="col-md-6">
          <select className="form-select" value={lecture} onChange={e => setLecture(e.target.value)}>
            <option value="">All Lectures</option>
            <option value="ML">Machine Learning</option>
            <option value="AI">Artificial Intelligence</option>
          </select>
        </div>
      </div>
      {items.map((q, i) => (
        <div key={i} className="card mb-2">
          <div className="card-body">
            <h6>{q.lecture}</h6>
            <p>{q.question}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
