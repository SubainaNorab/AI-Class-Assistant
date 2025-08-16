import React, { useState, useEffect } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ lecture, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    category: 'general',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidLecture, setIsValidLecture] = useState(false);

  // Validate lecture prop on mount and changes
  useEffect(() => {
    const valid = lecture && typeof lecture === 'object' && 
                 lecture.quiz_id && lecture.lecture_title;
    setIsValidLecture(valid);
    
    if (!valid) {
      console.error('Invalid lecture prop:', lecture);
    }
  }, [lecture]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        quizId: lecture?.quiz_id || 'unknown',
        lectureTitle: lecture?.lecture_title || 'Unknown Quiz'
      });
      onClose();
    } catch (err) {
      console.error('Feedback submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isValidLecture) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content feedback-modal error-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>⚠️ Quiz Information Unavailable</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>We couldn't retrieve complete information about this quiz.</p>
            <p>You can still provide general feedback:</p>
            
            <div className="simple-feedback-form">
              <div className="rating-section">
                <p>How was your experience?</p>
                <div className="simple-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star ${star <= formData.rating ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                      disabled={isSubmitting}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || formData.rating === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = [
    { value: 'general', label: '🎯 General', description: 'Overall experience and suggestions' },
    { value: 'content', label: '📚 Content Quality', description: 'How relevant and accurate are the questions?' },
    { value: 'difficulty', label: '📊 Difficulty Level', description: 'Is the difficulty appropriate?' },
    { value: 'clarity', label: '💡 Question Clarity', description: 'Are questions clear and well-written?' },
    { value: 'technical', label: '⚙️ Technical Issues', description: 'Any bugs or technical problems?' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⭐ Rate Quiz: {lecture.lecture_title}</h2>
          <button 
            className="close-btn" 
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close feedback modal"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>How would you rate this quiz? <span className="required">*</span></label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= formData.rating ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                  disabled={isSubmitting}
                  aria-label={`Rate ${star} star`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>What aspect are you rating?</label>
            <div className="category-list">
              {categories.map((category) => (
                <label 
                  key={category.value} 
                  className={`category-option ${formData.category === category.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={category.value}
                    checked={formData.category === category.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    disabled={isSubmitting}
                  />
                  <div className="category-content">
                    <div className="category-label">{category.label}</div>
                    <div className="category-description">{category.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Additional Comments (Optional)</label>
            <textarea
              placeholder="Share your thoughts about this quiz..."
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className="comment-textarea"
              maxLength={500}
              disabled={isSubmitting}
              aria-label="Feedback comments"
            />
            <small className="character-count">
              {formData.comment.length}/500 characters
            </small>
          </div>

          <div className="modal-actions">
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={isSubmitting || formData.rating === 0}
              aria-label="Submit feedback"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                '✅ Submit Feedback'
              )}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Cancel feedback"
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