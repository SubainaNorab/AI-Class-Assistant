import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, File, X, Loader2 } from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

const FileUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // toast state
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Fetch previously uploaded files
  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/uploads?user_id=anonymous`);
      const data = await response.json();
      
      if (data.success) {
        setUploads(data.uploads);
        console.log("Fetched uploads:", data.uploads);
      } else {
        setError("Failed to load uploads");
        addToast("Failed to load uploads", "error");
      }
    } catch (err) {
      console.error("Error fetching uploads:", err);
      setError("Error loading uploads");
      addToast("Error loading uploads", "error");
    }
  };

  // Handle file selection
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

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("user_id", "anonymous");
    formData.append("category", "general");

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        addToast(`✅ Uploaded ${data.uploaded.length || 1} files successfully!`, "success");
        setFiles([]);
        fetchUploads(); // Refresh the uploads list
      } else {
        addToast(`❌ ${data.error || "Upload failed"}`, "error");
      }
    } catch (err) {
      console.error(err);
      addToast("❌ Upload failed due to server error", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Toasts */}
      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              backgroundColor:
                toast.type === "error"
                  ? "#fecaca"
                  : toast.type === "success"
                  ? "#bbf7d0"
                  : "#fef9c3",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <h1 style={styles.title}>Upload Documents</h1>

      {/* Dropzone */}
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
        {loading ? <Loader2 size={20} className="animate-spin" /> : "Upload"}
      </button>

      {/* Uploaded files */}
      <h2 style={styles.subTitle}>Your Uploads</h2>
      <div style={styles.uploadList}>
        {uploads.length === 0 ? (
          <p>No uploads yet.</p>
        ) : (
          uploads.map((upload) => (
            <div key={upload._id} style={styles.uploadCard}>
              <div>
                <h3 style={styles.uploadName}>{upload.original_name}</h3>
                <p style={styles.uploadMeta}>
                  {upload.category} · {Math.round(upload.size / 1024)} KB
                </p>
                <p style={styles.uploadMeta}>
                  {new Date(upload.upload_date || upload.uploaded_at || upload.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={styles.actionButtons}>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#2563eb" }}
                  onClick={() => navigate(`/summary/${upload._id}`)}
                >
                  Summarize
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#16a34a" }}
                  onClick={() => navigate(`/flashcards/${upload._id}`)}
                >
                  Flashcards
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#9333ea" }}
                  onClick={() => navigate(`/explain/${upload._id}`)}
                >
                  Explain
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
    maxWidth: "1000px",
    margin: "0 auto",
    fontFamily: "'Inter', sans-serif",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  subTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginTop: "40px",
    marginBottom: "10px",
  },
  dropzone: {
    border: "2px dashed #2563eb",
    borderRadius: "12px",
    padding: "40px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: "20px",
  },
  fileList: {
    marginBottom: "20px",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  fileName: {
    flex: 1,
  },
  removeButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#ef4444",
  },
  uploadButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "600",
    border: "none",
    marginBottom: "20px",
  },
  uploadList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  uploadCard: {
    padding: "16px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background: "white",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  uploadName: {
    fontWeight: "600",
  },
  uploadMeta: {
    fontSize: "14px",
    color: "#64748b",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  actionBtn: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
  },
  toastContainer: {
    position: "fixed",
    top: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    zIndex: "9999",
  },
  toast: {
    padding: "12px 16px",
    borderRadius: "8px",
    fontWeight: "500",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },
};

export default FileUploadPage;