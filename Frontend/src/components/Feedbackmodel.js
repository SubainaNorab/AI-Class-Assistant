// Frontend/src/components/Feedbackmodel.js
import React, { useState } from "react";
import axios from "axios";
import "./FeedbackModal.css";

const FeedbackModal = ({ visible, onClose, type, itemId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post("http://localhost:5000/feedback", {
        type,
        item_id: itemId,
        rating,
        comment,
      });
      
      // Call success callback to show toast
      if (onSuccess) {
        onSuccess("Feedback submitted successfully! ⭐");
      }
      
      // Reset form and close modal
      setRating(0);
      setComment("");
      setHoveredStar(0);
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarClick = (starValue) => {
    setRating(starValue);
  };

  const handleStarHover = (starValue) => {
    setHoveredStar(starValue);
  };

  const handleStarLeave = () => {
    setHoveredStar(0);
  };

  if (!visible) return null;

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h3>Rate this {type}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="feedback-modal-body">
          <div className="star-rating-container">
            <p>How would you rate this {type}?</p>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${
                    star <= (hoveredStar || rating) ? "active" : ""
                  }`}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={handleStarLeave}
                >
                  ★
                </span>
              ))}
            </div>
            {rating > 0 && (
              <p className="rating-text">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>
          
          <div className="comment-section">
            <label htmlFor="feedback-comment">
              Additional comments (optional):
            </label>
            <textarea
              id="feedback-comment"
              placeholder="Tell us what you think..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <small>{comment.length}/500 characters</small>
          </div>
        </div>
        
        <div className="feedback-modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="submit-button"
            onClick={submitFeedback}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;