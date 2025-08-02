import React, { useState } from "react";
import axios from "axios";

export default function FeedbackModal({ visible, onClose, type, itemId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const submitFeedback = async () => {
    await axios.post("http://localhost:5000/feedback", {
      type,
      item_id: itemId,
      rating,
      comment,
    });
    alert("✅ Feedback submitted!");
    onClose();
  };

  if (!visible) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid #aaa", padding: "20px" }}>
      <h3>Rate this {type}</h3>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ cursor: "pointer", fontSize: "24px", color: star <= rating ? "gold" : "gray" }}
          onClick={() => setRating(star)}
        >
          ★
        </span>
      ))}
      <br />
      <textarea
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ width: "100%", marginTop: "10px" }}
      />
      <br />
      <button onClick={submitFeedback}>Submit</button>
    </div>
  );
}
