import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  BookOpen,
  ListChecks,
  Brain,
  AlertCircle,
  Info,
  Download,
  Share2,
  ArrowLeft,
} from "lucide-react";

const SummaryPage = () => {
  const { fileId } = useParams();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        console.log("Fetching summary for file ID:", fileId);

        const res = await fetch(`http://localhost:5000/summary/${fileId}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch summary");
        }

        const file = data.file;

        setSummaryData({
          fileName: file.original_name,
          wordCount: file.content ? file.content.split(" ").length : 0,
          keyPoints: file.summary
            ? file.summary
                .split(". ")
                .filter((point) => point.trim().length > 0)
            : ["No key points available"],
          topics: file.topics || [],
          summary:
            file.summary ||
            (file.content
              ? `${file.content.substring(0, 200)}...`
              : "No summary available."),
          metadata: {
            author: file.uploaded_by || "Unknown",
            date: file.upload_date
              ? new Date(file.upload_date).toLocaleDateString()
              : "Unknown",
            category: file.category || "general",
            size: file.size ? `${Math.round(file.size / 1024)} KB` : "N/A",
          },
        });
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      fetchSummary();
    } else {
      setError("No file ID provided");
      setLoading(false);
    }
  }, [fileId]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>Analyzing document...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <AlertCircle size={32} color="red" />
          <p>{error}</p>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <AlertCircle size={32} color="red" />
          <p>No data available for this file</p>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "summary", label: "Summary", icon: FileText },
    { id: "keypoints", label: "Key Points", icon: ListChecks },
    { id: "topics", label: "Topics", icon: Brain },
    { id: "metadata", label: "Details", icon: Info },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>{summaryData.fileName}</h1>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.actionButton}>
            <Download size={18} /> Export
          </button>
          <button style={styles.actionButton}>
            <Share2 size={18} /> Share
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <BookOpen style={styles.statIcon} color="#2563eb" />
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{summaryData.wordCount}</div>
            <div style={styles.statLabel}>Words</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <ListChecks style={styles.statIcon} color="#16a34a" />
          <div style={styles.statContent}>
            <div style={styles.statNumber}>
              {summaryData.keyPoints.length}
            </div>
            <div style={styles.statLabel}>Key Points</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <Brain style={styles.statIcon} color="#9333ea" />
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{summaryData.topics.length}</div>
            <div style={styles.statLabel}>Topics</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} style={{ marginRight: 8 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "summary" && (
              <div style={styles.summaryContent}>
                <p>{summaryData.summary}</p>
              </div>
            )}
            {activeTab === "keypoints" && (
              <ul style={styles.list}>
                {summaryData.keyPoints.map((point, idx) => (
                  <li key={idx} style={styles.listItem}>
                    {point}
                  </li>
                ))}
              </ul>
            )}
            {activeTab === "topics" && (
              <div style={styles.topics}>
                {summaryData.topics.length > 0 ? (
                  summaryData.topics.map((topic, idx) => (
                    <span key={idx} style={styles.topicBadge}>
                      {topic}
                    </span>
                  ))
                ) : (
                  <p>No topics identified</p>
                )}
              </div>
            )}
            {activeTab === "metadata" && (
              <div style={styles.metadataTab}>
                {Object.entries(summaryData.metadata).map(([key, value]) => (
                  <div key={key} style={styles.metaRow}>
                    <strong style={styles.metaKey}>{key}: </strong>
                    <span style={styles.metaValue}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: "20px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif",
    color: "#1e293b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "white",
    cursor: "pointer",
  },
  headerActions: {
    display: "flex",
    gap: "12px",
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "white",
    cursor: "pointer",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  statIcon: {
    fontSize: "32px",
  },
  statContent: {
    display: "flex",
    flexDirection: "column",
  },
  statNumber: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: "14px",
    color: "#64748b",
  },
  tabs: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
  },
  tab: {
    padding: "8px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#2563eb",
    color: "white",
    borderColor: "#2563eb",
  },
  content: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    minHeight: "200px",
  },
  summaryContent: {
    lineHeight: 1.6,
  },
  list: {
    paddingLeft: "20px",
    lineHeight: 1.6,
  },
  listItem: {
    marginBottom: "8px",
  },
  topics: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  topicBadge: {
    padding: "6px 12px",
    backgroundColor: "#f1f5f9",
    borderRadius: "9999px",
    fontSize: "14px",
  },
  metadataTab: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  metaRow: {
    display: "flex",
    gap: "8px",
  },
  metaKey: {
    minWidth: "80px",
    textTransform: "capitalize",
  },
  metaValue: {
    color: "#64748b",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: "12px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    color: "#ef4444",
  },
};

export default SummaryPage;
