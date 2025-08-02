import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FlashcardViewer = ({ content, userId }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (content) {
      setLoading(true);
      axios.post('http://localhost:5000/generate-quiz', {
        summary: content,
        lecture_title: "Generated Flashcards"
      })
      .then(res => {
        setFlashcards(res.data.flashcards || []);
        setLoading(false);
        setCurrent(0);
      })
      .catch(err => {
        console.error('Error fetching flashcards:', err);
        setLoading(false);
      });
    }
  }, [content]);

  if (loading) return <div>Loading flashcards...</div>;
  if (flashcards.length === 0) return <div>No flashcards to show.</div>;

  const { question, answer } = flashcards[current];

  return (
    <div className="flashcard-viewer">
      <div className="card">
        <p><strong>Q:</strong> {question}</p>
        <p><strong>A:</strong> {answer}</p>
      </div>
      <div className="navigation">
        <button onClick={() => setCurrent((current - 1 + flashcards.length) % flashcards.length)}>Previous</button>
        <button onClick={() => setCurrent((current + 1) % flashcards.length)}>Next</button>
      </div>
    </div>
  );
};

export default FlashcardViewer;
