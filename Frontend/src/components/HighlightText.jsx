// Frontend/src/components/HighlightText.jsx
// Optional Enhancement: Highlight difficult parts in text with pop-up explanations

import React, { useState } from 'react';
import './HighlightText.css';

const HighlightText = ({ text, explanations = [], onExplainClick }) => {
  const [hoveredExplanation, setHoveredExplanation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Function to find overlapping text segments
  const findOverlaps = (text, explanations) => {
    if (!explanations || explanations.length === 0) return [{ text, isHighlighted: false }];

    const segments = [];
    let lastIndex = 0;

    // Sort explanations by position in text
    const sortedExplanations = explanations
      .map(exp => ({
        ...exp,
        startIndex: text.toLowerCase().indexOf(exp.difficult_part.toLowerCase()),
        endIndex: text.toLowerCase().indexOf(exp.difficult_part.toLowerCase()) + exp.difficult_part.length
      }))
      .filter(exp => exp.startIndex !== -1)
      .sort((a, b) => a.startIndex - b.startIndex);

    sortedExplanations.forEach((explanation, index) => {
      const { startIndex, endIndex, difficult_part } = explanation;

      // Add text before highlight
      if (startIndex > lastIndex) {
        segments.push({
          text: text.slice(lastIndex, startIndex),
          isHighlighted: false
        });
      }

      // Add highlighted text
      segments.push({
        text: difficult_part,
        isHighlighted: true,
        explanation,
        score: explanation.score
      });

      lastIndex = endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        text: text.slice(lastIndex),
        isHighlighted: false
      });
    }

    return segments;
  };

  const handleMouseEnter = (explanation, event) => {
    const rect = event.target.getBoundingClientRect();
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredExplanation(explanation);
  };

  const handleMouseLeave = () => {
    setHoveredExplanation(null);
  };

  const getHighlightClass = (score) => {
    if (score >= 0.8) return 'highlight-very-complex';
    if (score >= 0.6) return 'highlight-complex';
    return 'highlight-moderate';
  };

  const segments = findOverlaps(text, explanations);

  return (
    <div className="highlight-text-container">
      <div className="highlighted-content">
        {segments.map((segment, index) => (
          segment.isHighlighted ? (
            <span
              key={index}
              className={`highlighted-text ${getHighlightClass(segment.score)}`}
              onMouseEnter={(e) => handleMouseEnter(segment.explanation, e)}
              onMouseLeave={handleMouseLeave}
              onClick={() => onExplainClick && onExplainClick(segment.explanation)}
              title="Click for detailed explanation"
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        ))}
      </div>

      {/* Explanation Popup */}
      {hoveredExplanation && (
        <div 
          className="explanation-popup"
          style={{
            left: popupPosition.x,
            top: popupPosition.y,
          }}
        >
          <div className="popup-content">
            <div className="popup-header">
              <span className="complexity-badge" style={{
                backgroundColor: hoveredExplanation.score >= 0.8 ? '#ef4444' : 
                               hoveredExplanation.score >= 0.6 ? '#f59e0b' : '#3b82f6'
              }}>
                {hoveredExplanation.score >= 0.8 ? 'Very Complex' : 
                 hoveredExplanation.score >= 0.6 ? 'Complex' : 'Moderate'}
              </span>
            </div>
            <div className="popup-body">
              <p className="popup-text">"{hoveredExplanation.difficult_part}"</p>
              {hoveredExplanation.reasons && (
                <div className="popup-reasons">
                  {hoveredExplanation.reasons.slice(0, 2).map((reason, i) => (
                    <span key={i} className="reason-tag">{reason}</span>
                  ))}
                </div>
              )}
              <p className="popup-hint">Click for full explanation</p>
            </div>
          </div>
          <div className="popup-arrow"></div>
        </div>
      )}
    </div>
  );
};

export default HighlightText;