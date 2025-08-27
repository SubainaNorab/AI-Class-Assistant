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

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`http://localhost:5000/summary/${fileId}`);
        const data = await res.json();
        console.log("Summary response:", data);

        if (data.success) {
          setSummary(data.summary || "No summary available");
          setOriginalName(data.original_name || "Untitled Document");
          setFileInfo({
            filename: data.filename,
            file_id: data.file_id,
            contentLength: data.content ? data.content.length : 0
          });
        } else {
          setError(data.error || "Failed to load summary");
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError("Failed to fetch summary. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      fetchSummary();
    }
  }, [fileId]);

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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h3 style={styles.errorTitle}>Error Loading Summary</h3>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryButton} onClick={() => window.location.reload()}>
            Try Again
          </button>
          <button style={styles.backButton} onClick={handleGoBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleGoBack}>
          ← Back to Files
        </button>
        <button style={styles.downloadBtn} onClick={handleDownloadSummary}>
          ↓ Download Summary
        </button>
      </div>

      {/* Document Info */}
      <div style={styles.documentInfo}>
        <div style={styles.documentIcon}>
          📄
        </div>
        <div>
          <h1 style={styles.documentTitle}>{originalName}</h1>
          <div style={styles.documentMeta}>
            <span style={styles.metaItem}>
              🕒 Processed just now
            </span>
            {fileInfo && fileInfo.contentLength > 0 && (
              <span style={styles.metaItem}>
                {Math.round(fileInfo.contentLength / 1000)}k characters
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div style={styles.summarySection}>
        <h2 style={styles.sectionTitle}>Document Summary</h2>
        <div style={styles.summaryCard}>
          {summary ? (
            <p style={styles.summaryText}>{summary}</p>
          ) : (
            <div style={styles.noSummary}>
              <p>No summary available for this document.</p>
              <p>This might be due to the document format or processing error.</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actionsSection}>
        <h3 style={styles.actionsTitle}>What would you like to do next?</h3>
        <div style={styles.actionButtons}>
          <button 
            style={{ ...styles.actionBtn, backgroundColor: "#16a34a" }}
            onClick={() => navigate(`/flashcards/${fileId}`)}
          >
            Generate Flashcards
          </button>
          <button 
            style={{ ...styles.actionBtn, backgroundColor: "#9333ea" }}
            onClick={() => navigate(`/explain/${fileId}`)}
          >
            Get Explanation
          </button>
          <button 
            style={{ ...styles.actionBtn, backgroundColor: "#dc2626" }}
            onClick={() => {
              // Generate quiz functionality
              console.log("Generate quiz for file:", fileId);
            }}
          >
            Create Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  downloadBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "white",
  },
  documentInfo: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "32px",
    padding: "20px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  documentIcon: {
    backgroundColor: "#dbeafe",
    padding: "12px",
    borderRadius: "10px",
  },
  documentTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1f2937",
    margin: "0 0 8px 0",
  },
  documentMeta: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "14px",
    color: "#6b7280",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  summarySection: {
    marginBottom: "40px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "16px",
  },
  summaryCard: {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },
  summaryText: {
    lineHeight: "1.8",
    fontSize: "16px",
    color: "#374151",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  noSummary: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "16px",
  },
  actionsSection: {
    marginTop: "40px",
  },
  actionsTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "16px",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    minWidth: "160px",
    padding: "12px 20px",
    borderRadius: "8px",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "18px",
    color: "#6b7280",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  errorTitle: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: "8px",
  },
  errorText: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "24px",
    maxWidth: "400px",
  },
  retryButton: {
    padding: "12px 24px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
    marginRight: "12px",
  },
  backButton: {
    padding: "12px 24px",
    backgroundColor: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
  },
};

export default SummaryPage;