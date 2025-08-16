// Frontend/src/components/GenerateQuizModal.js
import React, { useState } from 'react';
import './GenerateQuizModal.css';

const GenerateQuizModal = ({ onGenerate, onClose, loading }) => {
  const [formData, setFormData] = useState({
    summary: '',
    lecture_title: '',
    difficulty: 'Medium',
    topic_tags: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary text is required';
    } else if (formData.summary.trim().length < 50) {
      newErrors.summary = 'Summary should be at least 50 characters long';
    }
    
    if (!formData.lecture_title.trim()) {
      newErrors.lecture_title = 'Lecture title is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onGenerate(formData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Generate New Quiz</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>📄 Summary Text *</label>
            <textarea
              placeholder="Enter the text content to generate quiz questions from... (minimum 50 characters)"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              required
              rows={6}
              className={errors.summary ? 'error' : ''}
            />
            {errors.summary && <span className="error-text">{errors.summary}</span>}
            <small className="char-counter">
              {formData.summary.length} characters
            </small>
          </div>
          
          <div className="form-group">
            <label>📚 Lecture Title *</label>
            <input
              type="text"
              placeholder="e.g., Machine Learning Basics, Introduction to React"
              value={formData.lecture_title}
              onChange={(e) => handleInputChange('lecture_title', e.target.value)}
              required
              className={errors.lecture_title ? 'error' : ''}
            />
            {errors.lecture_title && <span className="error-text">{errors.lecture_title}</span>}
          </div>
          
          <div className="form-group">
            <label>📊 Difficulty Level</label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
            >
              <option value="Easy">🟢 Easy</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Hard">🔴 Hard</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>🏷️ Topic Tags (comma separated)</label>
            <input
              type="text"
              placeholder="e.g., AI, Neural Networks, Deep Learning, Programming"
              value={formData.topic_tags}
              onChange={(e) => handleInputChange('topic_tags', e.target.value)}
            />
            <small>Tags help organize and filter your quizzes later</small>
          </div>
          
          <div className="modal-actions">
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              {loading ? '⏳ Generating...' : '⚡ Generate Quiz'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateQuizModal;