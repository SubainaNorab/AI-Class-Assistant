// Frontend/src/summarypage.js - UPDATED WITH ENHANCED FUNCTIONALITY

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const SummaryPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  // Add debug logging
  useEffect(() => {
    console.log("SummaryPage mounted with fileId:", fileId);
    console.log("Current URL:", window.location.href);
  }, [fileId]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        console.log("Fetching summary for fileId:", fileId);
        const res = await fetch(`http://localhost:5000/summary/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        // Check if response is OK
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Summary API response:", data);

        if (data.success) {
          setSummary(data.summary || "No summary available");
          setOriginalName(data.original_name || data.filename || "Untitled Document");
          setFileInfo({
            filename: data.filename,
            file_id: data.file_id || fileId,
            contentLength: data.content ? data.content.length : 0
          });
        } else {
          setError(data.error || "Failed to load summary");
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError(`Failed to fetch summary: ${err.message}. Please check your connection and try again.`);
      } finally {
        setLoading(false);
      }
    };

    if (fileId && fileId !== "undefined") {
      fetchSummary();
    } else {
      setError("Invalid file ID");
      setLoading(false);
    }
  }, [fileId]);

  // ADDED: Regenerate summary function
  const handleRegenerateSummary = async () => {
    try {
      setRegenerating(true);
      
      const response = await fetch(`http://localhost:5000/generate-summary/${fileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSummary(data.summary || '');
          console.log('✅ Summary regenerated successfully');
        } else {
          setError(data.error || 'Failed to regenerate summary');
        }
      } else {
        setError('Failed to regenerate summary');
      }
    } catch (err) {
      console.error('Error regenerating summary:', err);
      setError('Error regenerating summary');
    } finally {
      setRegenerating(false);
    }
  };

  // ADDED: Copy summary function
  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary).then(() => {
      console.log('✅ Summary copied to clipboard');
      // You can add a toast notification here
    }).catch(err => {
      console.error('Failed to copy summary:', err);
    });
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const handleDownloadSummary = () => {
    const element = document.createElement("a");
    const file = new Blob([summary], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${originalName}_summary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Add CSS animation for spinner
  const spinnerStyle = {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={spinnerStyle}></div>
          <p>Loading summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorContent}>
            <div style={styles.errorIcon}>❌</div>
            <h3>Error Loading Summary</h3>
            <p>{error}</p>
            <div style={styles.errorActions}>
              <button 
                style={styles.retryBtn} 
                onClick={() => window.location.reload()}
              >
                🔄 Retry
              </button>
              <button style={styles.backBtn} onClick={handleGoBack}>
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerControls}>
          <button style={styles.backBtn} onClick={handleGoBack}>
            ← Back to Dashboard
          </button>
          <div style={styles.headerActions}>
            <button 
              style={{ ...styles.actionBtn, backgroundColor: "#10b981" }}
              onClick={handleCopySummary}
            >
              📋 Copy
            </button>
            <button 
              style={{ ...styles.actionBtn, backgroundColor: "#3b82f6" }}
              onClick={handleDownloadSummary}
            >
              💾 Download
            </button>
            <button 
              style={{ 
                ...styles.actionBtn, 
                backgroundColor: regenerating ? "#9ca3af" : "#f59e0b" 
              }}
              onClick={handleRegenerateSummary}
              disabled={regenerating}
            >
              {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate'}
            </button>
          </div>
        </div>
        
        <div style={styles.headerInfo}>
          <h1 style={styles.title}>📄 Document Summary</h1>
          <p style={styles.subtitle}>Summary for: <strong>{originalName}</strong></p>
        </div>
      </div>

      {/* Summary Content */}
      <div style={styles.summarySection}>
        <div style={styles.summaryCard}>
          {summary ? (
            <div style={styles.summaryContent}>
              {summary.split('\n').map((paragraph, index) => (
                <p key={index} style={styles.summaryParagraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div style={styles.noSummary}>
              <p>No summary available for this document.</p>
              <p>This might be due to the document format or processing error.</p>
              <button 
                style={styles.generateBtn}
                onClick={handleRegenerateSummary}
                disabled={regenerating}
              >
                {regenerating ? '⏳ Generating...' : '✨ Generate Summary'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions Section */}
      <div style={styles.actionsSection}>
        <h3 style={styles.actionsTitle}>What would you like to do next?</h3>
        <div style={styles.actionButtons}>
          <button 
            style={{ ...styles.actionBtn, backgroundColor: "#16a34a" }}
            onClick={() => navigate(`/flashcards/${fileId}`)}
          >
            🎴 Generate Flashcards
          </button>
          <button 
            style={{ ...styles.actionBtn, backgroundColor: "#9333ea" }}
            onClick={() => navigate(`/explain/${fileId}`)}
          >
            💡 Get Explanation
          </button>
          <button 
            style={{ ...styles.actionBtn, backgroundColor: "#dc2626" }}
            onClick={() => navigate('/quiz')}
          >
            📝 Create Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  
  // UPDATED: Enhanced header styles
  header: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    padding: "24px 32px",
    marginBottom: "32px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  
  headerControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  
  headerActions: {
    display: "flex",
    gap: "12px",
  },
  
  headerInfo: {
    textAlign: "center",
    color: "white",
  },
  
  title: {
    margin: "0 0 8px 0",
    fontSize: "2.5rem",
    fontWeight: "700",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    color: "white",
  },
  
  subtitle: {
    margin: "0",
    fontSize: "1.1rem",
    opacity: "0.9",
    color: "white",
  },

  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.3s ease",
  },

  // UPDATED: Enhanced summary section
  summarySection: {
    marginBottom: "32px",
  },

  summaryCard: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },

  summaryContent: {
    color: "#1f2937",
    fontSize: "1.1rem",
    lineHeight: "1.7",
  },

  summaryParagraph: {
    margin: "0 0 16px 0",
  },

  noSummary: {
    textAlign: "center",
    color: "#6b7280",
    padding: "40px 20px",
  },

  generateBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "20px",
  },

  // Actions section
  actionsSection: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    padding: "24px 32px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },

  actionsTitle: {
    color: "#1f2937",
    margin: "0 0 16px 0",
    fontSize: "1.25rem",
    fontWeight: "700",
    textAlign: "center",
  },

  actionButtons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.3s ease",
    fontSize: "0.95rem",
  },

  // Loading and error states
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    color: "white",
  },

  errorContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "60vh",
  },

  errorContent: {
    textAlign: "center",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(20px)",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },

  errorIcon: {
    fontSize: "4rem",
    marginBottom: "20px",
  },

  errorActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginTop: "20px",
  },

  retryBtn: {
    padding: "12px 24px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default SummaryPage;