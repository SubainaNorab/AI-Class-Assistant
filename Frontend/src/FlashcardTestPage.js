import React, { useState } from 'react';
import FlashcardViewer from './FlashcardViewer';
import './FlashcardTestPage.css';

const FlashcardTestPage = () => {
  const [inputContent, setInputContent] = useState('');
  const [contentToProcess, setContentToProcess] = useState('');

  const sampleContent = `Machine Learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. There are three main types: supervised learning (using labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through trial and error). Popular algorithms include linear regression, decision trees, neural networks, and support vector machines. ML is widely used in applications like image recognition, natural language processing, recommendation systems, and autonomous vehicles.`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputContent.trim()) {
      setContentToProcess(inputContent.trim());
    }
  };

  const useSampleContent = () => {
    setInputContent(sampleContent);
  };

  const clearContent = () => {
    setInputContent('');
    setContentToProcess('');
  };

  return (
    <div className="flashcard-test-page">
      <div className="header">
        <h1>AI Class Assistant - Flashcard Generator</h1>
        <p>Enter content below to generate interactive flashcards for studying</p>
      </div>

      <div className="content-input-section">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="content-input">Enter your study content:</label>
            <textarea
              id="content-input"
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="Paste your lecture notes, textbook content, or any study material here..."
              rows={8}
              className="content-textarea"
            />
          </div>
          
          <div className="button-group">
            <button type="submit" className="submit-btn" disabled={!inputContent.trim()}>
              Generate Flashcards
            </button>
            <button type="button" onClick={useSampleContent} className="sample-btn">
              Use Sample Content
            </button>
            <button type="button" onClick={clearContent} className="clear-btn">
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="flashcard-section">
        <FlashcardViewer content={contentToProcess} userId="test_user" />
      </div>

      <div className="instructions">
        <h3>How to use:</h3>
        <ul>
          <li>📝 <strong>Enter Content:</strong> Paste your study material in the text area above</li>
          <li>🔄 <strong>Generate:</strong> Click "Generate Flashcards" to create study cards</li>
          <li>🖱️ <strong>Flip Cards:</strong> Click on any flashcard to flip between question and answer</li>
          <li>⬅️➡️ <strong>Navigate:</strong> Use Previous/Next buttons to browse through flashcards</li>
          <li>📚 <strong>Load All:</strong> Click "Load All Flashcards" to see previously generated cards</li>
        </ul>
      </div>
    </div>
  );
};

export default FlashcardTestPage;