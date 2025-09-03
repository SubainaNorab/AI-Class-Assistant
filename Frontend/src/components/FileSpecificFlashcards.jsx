// Frontend/src/components/FileSpecificFlashcards.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlashcardViewer from './FlashcardViewer';
import './FileSpecificFlashcards.css';

const FileSpecificFlashcards = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    console.log('FileSpecificFlashcards mounted with fileId:', fileId);
    fetchFlashcards();
  }, [fileId]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:5000/flashcards/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Flashcards API response:', data);

      if (data.success) {
        setFlashcards(data.flashcards || []);
        setFileInfo({
          filename: data.filename || data.original_name || 'Unknown File',
          original_name: data.original_name,
          file_id: fileId
        });
      } else {
        setError(data.error || 'Failed to load flashcards');
      }
    } catch (err) {
      console.error('Error fetching flashcards:', err);
      setError(`Failed to fetch flashcards: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateFlashcards = async () => {
    try {
      setRegenerating(true);
      
      const response = await fetch(`http://localhost:5000/generate-flashcards/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFlashcards(data.flashcards || []);
          // Show success message (you can add a toast here)
          console.log('✅ Flashcards regenerated successfully');
        } else {
          setError(data.error || 'Failed to regenerate flashcards');
        }
      } else {
        setError('Failed to regenerate flashcards');
      }
    } catch (err) {
      console.error('Error regenerating flashcards:', err);
      setError('Error regenerating flashcards');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyFlashcards = () => {
    const flashcardText = flashcards.map((card, index) => 
      `Flashcard ${index + 1}:\nQ: ${card.question}\nA: ${card.answer}\n\n`
    ).join('');
    
    navigator.clipboard.writeText(flashcardText).then(() => {
      console.log('✅ Flashcards copied to clipboard');
      // Show success message (you can add a toast here)
    }).catch(err => {
      console.error('Failed to copy flashcards:', err);
    });
  };

  const handleDownloadFlashcards = () => {
    const flashcardText = flashcards.map((card, index) => 
      `Flashcard ${index + 1}:\nQuestion: ${card.question}\nAnswer: ${card.answer}\n\n`
    ).join('');
    
    const element = document.createElement('a');
    const file = new Blob([flashcardText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${fileInfo?.original_name || 'flashcards'}_flashcards.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="file-flashcards-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading flashcards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-flashcards-page">
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon">❌</div>
            <h3>Error Loading Flashcards</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button className="retry-btn" onClick={fetchFlashcards}>
                🔄 Retry
              </button>
              <button className="back-btn" onClick={handleGoBack}>
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="file-flashcards-page">
        <div className="no-flashcards-container">
          <div className="no-flashcards-content">
            <div className="no-flashcards-icon">🎴</div>
            <h3>No Flashcards Available</h3>
            <p>No flashcards have been generated for this file yet.</p>
            <div className="no-flashcards-actions">
              <button 
                className="generate-btn"
                onClick={handleRegenerateFlashcards}
                disabled={regenerating}
              >
                {regenerating ? '⏳ Generating...' : '✨ Generate Flashcards'}
              </button>
              <button className="back-btn" onClick={handleGoBack}>
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-flashcards-page">
      {/* Header */}
      <div className="flashcards-header">
        <div className="header-controls">
          <button className="back-btn" onClick={handleGoBack}>
            ← Back to Dashboard
          </button>
          <div className="header-actions">
            <button 
              className="action-btn secondary"
              onClick={handleCopyFlashcards}
            >
              📋 Copy
            </button>
            <button 
              className="action-btn primary"
              onClick={handleDownloadFlashcards}
            >
              💾 Download
            </button>
            <button 
              className="action-btn regenerate"
              onClick={handleRegenerateFlashcards}
              disabled={regenerating}
            >
              {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate'}
            </button>
          </div>
        </div>
        
        <div className="header-info">
          <h1>🎴 Flashcards</h1>
          <p>Study flashcards for: <strong>{fileInfo?.original_name || 'Unknown File'}</strong></p>
          <span className="flashcard-count">{flashcards.length} flashcards</span>
        </div>
      </div>

      {/* Flashcard Viewer */}
      <div className="flashcards-content">
        <FlashcardViewer flashcards={flashcards} />
      </div>

      {/* Navigation Suggestions */}
      <div className="navigation-suggestions">
        <h3>What's next?</h3>
        <div className="suggestion-buttons">
          <button 
            className="suggestion-btn"
            onClick={() => navigate(`/summary/${fileId}`)}
          >
            📄 View Summary
          </button>
          <button 
            className="suggestion-btn"
            onClick={() => navigate(`/explain/${fileId}`)}
          >
            💡 Get Explanation
          </button>
          <button 
            className="suggestion-btn"
            onClick={() => navigate('/quiz')}
          >
            📝 Take Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileSpecificFlashcards;