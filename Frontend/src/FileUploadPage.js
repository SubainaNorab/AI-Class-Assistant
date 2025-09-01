import React, { useState, useRef, useEffect } from "react";
import { Upload, File, X, Loader2, AlertCircle, CheckCircle } from "lucide-react";

// Mock navigate for demonstration - replace with your actual useNavigate hook
const mockNavigate = (path) => {
  console.log(`🚀 Navigation triggered to: ${path}`);
  // In your real app: navigate(path);
};

const FileUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const [toasts, setToasts] = useState([]);

  // Mock data similar to what you're getting
  useEffect(() => {
    // Simulate the data structure you're receiving
    setUploads([
      {
        _id: "68ab06070c918d1753bce35e",
        original_name: "Quiz Management Update.pdf",
        filename: "quiz_management_update.pdf", 
        category: "general",
        size: 1024000,
        upload_date: new Date().toISOString(),
        user_id: "68ab06070c918d1753bce35e"
      },
      {
        _id: "68ab06070c918d1753bce35f",
        original_name: "Another Document.docx",
        filename: "another_document.docx",
        category: "academic", 
        size: 2048000,
        upload_date: new Date(Date.now() - 86400000).toISOString(),
        user_id: "68ab06070c918d1753bce35e"
      }
    ]);
  }, []);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    setTimeout(() => {
      addToast(`Uploaded ${files.length} files successfully!`, "success");
      setFiles([]);
      setLoading(false);
    }, 2000);
  };

  // Enhanced navigation function with comprehensive debugging
  const handleNavigateToSummary = async (upload) => {
    console.log("🔍 === NAVIGATION DEBUG START ===");
    console.log("📄 Full upload object:", JSON.stringify(upload, null, 2));
    
    // Check all possible ID fields
    const idFields = ['_id', 'id', 'file_id', 'fileId', 'document_id'];
    let fileId = null;
    let usedField = null;
    
    for (const field of idFields) {
      if (upload[field]) {
        fileId = upload[field];
        usedField = field;
        console.log(`✅ Found ID in field '${field}':`, fileId);
        break;
      }
    }
    
    if (!fileId) {
      console.error("❌ No valid file ID found!");
      console.log("Available fields:", Object.keys(upload));
      addToast("Error: No file ID found", "error");
      return;
    }

    // Validate ID format
    if (typeof fileId !== 'string' || fileId.length < 10) {
      console.error("❌ Invalid file ID format:", fileId, "Length:", fileId.length);
      addToast("Error: Invalid file ID format", "error");
      return;
    }

    console.log(`🎯 Using field '${usedField}' with value:`, fileId);
    
    const targetPath = `/summary/${fileId}`;
    console.log("🚀 Target path:", targetPath);
    
    // Add loading state
    addToast("Navigating to summary...", "info");
    
    try {
      // Method 1: Router navigation (preferred)
      console.log("🔄 Attempting router navigation...");
      mockNavigate(targetPath);
      
      // If you're using React Router, uncomment this:
      // navigate(targetPath);
      
      console.log("✅ Router navigation initiated");
      
    } catch (routerError) {
      console.error("❌ Router navigation failed:", routerError);
      
      // Method 2: Direct URL change (fallback)
      try {
        console.log("🔄 Attempting direct URL navigation...");
        
        // Check if we're in browser environment
        if (typeof window !== 'undefined') {
          window.location.href = targetPath;
          console.log("✅ Direct navigation initiated");
        } else {
          console.error("❌ Window object not available");
        }
        
      } catch (directError) {
        console.error("❌ Direct navigation also failed:", directError);
        addToast("Navigation failed completely", "error");
      }
    }
    
    console.log("🔍 === NAVIGATION DEBUG END ===");
  };

  // Test function to verify your routing setup
  const testNavigation = () => {
    console.log("🧪 Testing navigation with mock ID...");
    const mockUpload = {
      _id: "test123456789",
      original_name: "Test Document.pdf"
    };
    handleNavigateToSummary(mockUpload);
  };

  // Check if summary data is being fetched (debugging the console logs you showed)
  const checkSummaryFetch = async (fileId) => {
    console.log("🔍 Testing summary fetch for ID:", fileId);
    
    try {
      const response = await fetch(`http://localhost:5000/summary/${fileId}`);
      console.log("📡 Summary fetch response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📄 Summary data:", data);
        
        if (data.summary) {
          console.log("✅ Summary content preview:", data.summary.substring(0, 100) + "...");
        }
      } else {
        console.error("❌ Summary fetch failed with status:", response.status);
      }
    } catch (error) {
      console.error("❌ Summary fetch error:", error);
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast notifications */}
      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              backgroundColor: toast.type === "error" ? "#fee2e2" : 
                             toast.type === "success" ? "#dcfce7" : "#fef3c7",
              color: toast.type === "error" ? "#dc2626" :
                     toast.type === "success" ? "#16a34a" : "#d97706"
            }}
          >
            {toast.type === "error" && <AlertCircle size={16} />}
            {toast.type === "success" && <CheckCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      <h1 style={styles.title}>Upload Documents - Debug Version</h1>

      {/* Debug Panel */}
      <div style={styles.debugPanel}>
        <h3 style={styles.debugTitle}>🔧 Navigation Debug Tools</h3>
        <div style={styles.debugButtons}>
          <button style={styles.debugBtn} onClick={testNavigation}>
            Test Navigation
          </button>
          <button 
            style={styles.debugBtn} 
            onClick={() => checkSummaryFetch("68ab06070c918d1753bce35e")}
          >
            Test Summary Fetch
          </button>
          <button 
            style={styles.debugBtn} 
            onClick={() => console.log("Current uploads:", uploads)}
          >
            Log Uploads
          </button>
        </div>
        <div style={styles.debugInfo}>
          <p><strong>Expected behavior:</strong> Click "Summarize" → Navigate to /summary/[fileId]</p>
          <p><strong>Check console:</strong> Look for navigation debug logs</p>
          <p><strong>Router issue?:</strong> Verify your route setup in App.js or main router</p>
        </div>
      </div>

      {/* File Upload Section */}
      <div
        style={styles.dropzone}
        onClick={() => fileInputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload size={32} color="#2563eb" />
        <p>Drag and drop files here, or click to select</p>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div style={styles.fileList}>
          <h3>Selected Files:</h3>
          {files.map((file, index) => (
            <div key={index} style={styles.fileItem}>
              <File size={20} />
              <span style={styles.fileName}>{file.name}</span>
              <button
                style={styles.removeButton}
                onClick={() => removeFile(index)}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        style={{
          ...styles.uploadButton,
          backgroundColor: files.length === 0 ? "#cbd5e1" : "#2563eb",
          cursor: files.length === 0 ? "not-allowed" : "pointer",
        }}
        onClick={handleUpload}
        disabled={loading || files.length === 0}
      >
        {loading ? <Loader2 size={20} /> : "Upload"}
      </button>

      {/* Uploaded files */}
      <h2 style={styles.subTitle}>Your Uploads ({uploads.length} files)</h2>
      <div style={styles.uploadList}>
        {uploads.length === 0 ? (
          <p>No uploads yet.</p>
        ) : (
          uploads.map((upload, index) => (
            <div key={upload._id || index} style={styles.uploadCard}>
              <div style={styles.uploadInfo}>
                <h3 style={styles.uploadName}>{upload.original_name}</h3>
                <div style={styles.uploadMeta}>
                  <p>📁 {upload.category} • {Math.round(upload.size / 1024)} KB</p>
                  <p>📅 {new Date(upload.upload_date).toLocaleDateString()}</p>
                  <p>🆔 {upload._id}</p>
                  <p>👤 User: {upload.user_id}</p>
                </div>
              </div>
              
              <div style={styles.actionButtons}>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#2563eb" }}
                  onClick={() => {
                    console.log(`🎯 Summarize clicked for: ${upload.original_name}`);
                    handleNavigateToSummary(upload);
                  }}
                >
                  📄 Summarize
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#16a34a" }}
                  onClick={() => {
                    const fileId = upload._id || upload.id;
                    console.log(`🎴 Flashcards clicked for ID: ${fileId}`);
                    mockNavigate(`/flashcards/${fileId}`);
                  }}
                >
                  🎴 Flashcards
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#9333ea" }}
                  onClick={() => {
                    const fileId = upload._id || upload.id;
                    console.log(`💡 Explain clicked for ID: ${fileId}`);
                    mockNavigate(`/explain/${fileId}`);
                  }}
                >
                  💡 Explain
                </button>
              </div>
            </div>
          ))
        )}
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
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#1f2937",
  },
  debugPanel: {
    backgroundColor: "#f0f9ff",
    border: "2px solid #0ea5e9",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "30px",
  },
  debugTitle: {
    color: "#0c4a6e",
    marginBottom: "16px",
    fontSize: "18px",
  },
  debugButtons: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  debugBtn: {
    padding: "8px 16px",
    backgroundColor: "#0ea5e9",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  debugInfo: {
    backgroundColor: "#e0f7fa",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "14px",
    lineHeight: "1.6",
  },
  dropzone: {
    border: "2px dashed #2563eb",
    borderRadius: "12px",
    padding: "40px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: "20px",
    transition: "border-color 0.3s",
  },
  fileList: {
    marginBottom: "20px",
    backgroundColor: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    padding: "8px",
    backgroundColor: "white",
    borderRadius: "6px",
  },
  fileName: {
    flex: 1,
    fontSize: "14px",
  },
  removeButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#ef4444",
    padding: "4px",
    borderRadius: "4px",
  },
  uploadButton: {
    width: "100%",
    padding: "16px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "600",
    border: "none",
    marginBottom: "30px",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  subTitle: {
    fontSize: "22px",
    fontWeight: "600",
    marginBottom: "20px",
    color: "#374151",
  },
  uploadList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "20px",
  },
  uploadCard: {
    padding: "20px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    backgroundColor: "white",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  uploadInfo: {
    marginBottom: "16px",
  },
  uploadName: {
    fontWeight: "600",
    fontSize: "16px",
    marginBottom: "8px",
    color: "#1f2937",
  },
  uploadMeta: {
    fontSize: "13px",
    color: "#6b7280",
    lineHeight: "1.4",
  },
  actionButtons: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
  },
  actionBtn: {
    padding: "10px 12px",
    borderRadius: "6px",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "13px",
    transition: "opacity 0.2s, transform 0.1s",
    textAlign: "center",
  },
  toastContainer: {
    position: "fixed",
    top: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    zIndex: 9999,
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "8px",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    minWidth: "250px",
  },
};

export default FileUploadPage;