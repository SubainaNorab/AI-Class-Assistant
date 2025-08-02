
import React, { useState } from "react";
import FlashcardViewer from './components/FlashcardViewer';
import FeedbackModal from './components/Feedbackmodel';  // Be consistent with file name


const FlashcardTestPage = () => {
  const [flashcards, setFlashcards] = useState([
    {
      question: "What is the capital of France?",
      answer: "Paris",
    },
    {
      question: "What is the largest planet in our solar system?",
      answer: "Jupiter",
    },
    {
      question: "What is the smallest prime number?",
      answer: "2",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [currentFlashcardId, setCurrentFlashcardId] = useState(null); // Dummy ID for now

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center" }}>Flashcard Practice</h1>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <FlashcardViewer flashcards={flashcards} />
      </div>

      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <h3>Instructions</h3>
        <ul style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
          <li>Click on the flashcard to reveal the answer.</li>
          <li>Practice each flashcard until you feel confident.</li>
        </ul>
      </div>

      {/* Feedback Button and Modal */}
      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <button
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={() => {
            setCurrentFlashcardId("dummy_flashcard_id"); // Replace with real ID if available
            setShowModal(true);
          }}
        >
          ⭐ Give Feedback on Flashcards
        </button>
      </div>

      <FeedbackModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        type="flashcard"
        itemId={currentFlashcardId}
      />
    </div>
  );
};

export default FlashcardTestPage;









// import React, { useEffect, useState } from "react";
// import axios from "axios";

// export default function StatsPage() {
//   const [stats, setStats] = useState(null);

//   useEffect(() => {
//     axios.get("http://localhost:5000/stats").then((res) => {
//       setStats(res.data);
//     });
//   }, []);

//   if (!stats) return <p>Loading stats...</p>;

//   return (
//     <div>
//       <h2>📊 Stats</h2>
//       <p>Total Quizzes: {stats.total_quizzes}</p>
//       <p>Total Flashcards: {stats.total_flashcards}</p>
//       <p>Average Rating: ⭐ {stats.avg_rating.toFixed(2)}</p>

//       <h3>Recent Feedback</h3>
//       <ul>
//         {stats.recent_feedback.map((fb, index) => (
//           <li key={index}>
//             [{fb.type}] ⭐ {fb.rating} – {fb.comment || "No comment"}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
