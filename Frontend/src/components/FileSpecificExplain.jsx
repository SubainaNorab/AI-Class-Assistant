// Frontend/src/components/FileSpecificExplain.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './FileSpecificExplain.css';

const FileSpecificExplain = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    console.log('FileSpecificExplain mounted with fileId:', fileId);
    fetchExplanation();
  }, [fileId]);

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:5000/explain/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Explanation API response:', data);

      if (data.success) {
        setExplanation(data.explanation || '');
        setFileInfo({
          filename: data.filename || data.original_name || 'Unknown File',
          original_name: data.original_name,
          file_id: fileId
        });
      } else {
        setError(data.error || 'Failed to load explanation');
      }
    } catch (err) {
      console.error('Error fetching explanation:', err);
      setError(`Failed to fetch explanation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateExplanation = async () => {
    try {
      setRegenerating(true);
      
      const response = await fetch(`http://localhost:5000/generate-explanation/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExplanation(data.explanation || '');
          console.log('✅ Explanation regenerated successfully');
        } else {
          setError(data.error || 'Failed to regenerate explanation');
        }
      } else {
        setError('Failed to regenerate explanation');
      }
    } catch (err) {
      console.error('Error regenerating explanation:', err);
      setError('Error regenerating explanation');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyExplanation = () => {
    navigator.clipboard.writeText(explanation).then(() => {
      console.log('✅ Explanation copied to clipboard');
      // Show success message (you can add a toast here)
    }).catch(err => {
      console.error('Failed to copy explanation:', err);
    });
  };

  const handleDownloadExplanation = () => {
    const element = document.createElement('a');
    const file = new Blob([explanation], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${fileInfo?.original_name || 'explanation'}_explanation.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="file-explain-page">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading explanation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-explain-page">
        <div className="error-container">
          <div className="error-content">
            <div className="error-icon">❌</div>
            <h3>Error Loading Explanation</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button className="retry-btn" onClick={fetchExplanation}>
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

  if (!explanation || explanation.trim().length === 0) {
    return (
      <div className="file-explain-page">
        <div className="no-explanation-container">
          <div className="no-explanation-content">
            <div className="no-explanation-icon">💡</div>
            <h3>No Explanation Available</h3>
            <p>No explanation has been generated for this file yet.</p>
            <div className="no-explanation-actions">
              <button 
                className="generate-btn"
                onClick={handleRegenerateExplanation}
                disabled={regenerating}
              >
                {regenerating ? '⏳ Generating...' : '✨ Generate Explanation'}
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
    <div className="file-explain-page">
      {/* Header */}
      <div className="explain-header">
        <div className="header-controls">
          <button className="back-btn" onClick={handleGoBack}>
            ← Back to Dashboard
          </button>
          <div className="header-actions">
            <button 
              className="action-btn secondary"
              onClick={handleCopyExplanation}
            >
              📋 Copy
            </button>
            <button 
              className="action-btn primary"
              onClick={handleDownloadExplanation}
            >
              💾 Download
            </button>
            <button 
              className="action-btn regenerate"
              onClick={handleRegenerateExplanation}
              disabled={regenerating}
            >
              {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate'}
            </button>
          </div>
        </div>
        
        <div className="header-info">
          <h1>💡 AI Explanation</h1>
          <p>Detailed explanation for: <strong>{fileInfo?.original_name || 'Unknown File'}</strong></p>
        </div>
      </div>

      {/* Explanation Content */}
      <div className="explain-content">
        <div className="explanation-card">
          <div className="explanation-text">
            {explanation.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
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
            onClick={() => navigate(`/flashcards/${fileId}`)}
          >
            🎴 Study Flashcards
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

export default FileSpecificExplain;