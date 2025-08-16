// Frontend/src/components/FeedbackModal.js

import React, { useState } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ lecture, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    rating: 5,
    category: 'general',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'general', label: '🎯 General' },
    { value: 'difficulty', label: '📊 Difficulty Level' },
    { value: 'content', label: '📚 Content Quality' },
    { value: 'questions', label: '❓ Question Quality' },
    { value: 'interface', label: '🖥️ User Experience' },
    { value: 'technical', label: '⚙️ Technical Issues' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⭐ Rate Quiz: {lecture.lecture_title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Rating Section */}
          <div className="form-group">
            <label>How would you rate this quiz?</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= formData.rating ? 'active' : ''}`}
                  onClick={() => handleRatingClick(star)}
                >
                  ⭐
                </button>
              ))}
              <span className="rating-text">
                {formData.rating === 5 && '🎉 Excellent!'}
                {formData.rating === 4 && '👍 Very Good'}
                {formData.rating === 3 && '👌 Good'}
                {formData.rating === 2 && '😐 Fair'}
                {formData.rating === 1 && '👎 Poor'}
              </span>
            </div>
          </div>

          {/* Category Section */}
          <div className="form-group">
            <label>What aspect are you rating?</label>
            <div className="category-grid">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={`category-btn ${formData.category === category.value ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Section */}
          <div className="form-group">
            <label>Additional Comments (Optional)</label>
            <textarea
              placeholder="Share your thoughts about this quiz... What did you like? What could be improved?"
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className="comment-textarea"
              maxLength={500}
            />
            <small className="character-count">
              {formData.comment.length}/500 characters
            </small>
          </div>

          {/* Quiz Info Summary */}
          <div className="quiz-summary">
            <h4>Quiz Summary</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Questions:</span>
                <span className="value">{lecture.total_questions}</span>
              </div>
              <div className="summary-item">
                <span className="label">Difficulty:</span>
                <span className="value">{lecture.difficulty}</span>
              </div>
              <div className="summary-item">
                <span className="label">Your Progress:</span>
                <span className="value">{lecture.progress.percentage}% Complete</span>
              </div>
              {lecture.progress.final_score && (
                <div className="summary-item">
                  <span className="label">Your Score:</span>
                  <span className="value">{Math.round(lecture.progress.final_score)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Submitting...' : '✅ Submit Feedback'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;