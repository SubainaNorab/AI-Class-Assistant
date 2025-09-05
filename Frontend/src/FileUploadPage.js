import React, { useState, useRef, useEffect } from "react";
import { Upload, File, X, Loader2, AlertCircle, CheckCircle } from "lucide-react";

const FileUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const [toasts, setToasts] = useState([]);

  // Get user ID from localStorage or use a default
  const getUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user._id || user.userId || 'anonymous';
      }
    } catch (e) {
      console.error('Error getting user ID:', e);
    }
    return 'test_user_123'; // Using the same ID that worked in Postman
  };

  // Fetch uploaded files
  const fetchUploads = async () => {
    try {
      const userId = getUserId();
      console.log('📡 Fetching uploads for user:', userId);
      
      const response = await fetch(`http://localhost:5000/uploads?user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Uploads response:', data);
      
      if (data.success) {
        setUploads(data.files || data.uploads || []);
        console.log('✅ Loaded', data.files?.length || 0, 'files');
      } else {
        console.error('❌ Failed to fetch uploads:', data.error);
        addToast('Failed to load uploads: ' + data.error, 'error');
      }
    } catch (err) {
      console.error('❌ Error fetching uploads:', err);
      addToast('Error loading uploads: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    fetchUploads();
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
    console.log('📁 Files selected:', newFiles.map(f => f.name));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('📁 Files dropped:', droppedFiles.map(f => f.name));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // FIXED: Proper file upload function
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    setError(null);
    console.log('🚀 Starting upload of', files.length, 'files');

    try {
      // Upload each file sequentially
      for (const file of files) {
        await uploadSingleFile(file);
      }
      
      addToast(`Uploaded ${files.length} files successfully!`, "success");
      setFiles([]);
      fetchUploads(); // Refresh the uploads list
      
    } catch (err) {
      console.error('❌ Upload process failed:', err);
      setError(err.message);
      addToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Proper single file upload with better error handling
  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', getUserId());

    console.log('📤 Uploading file:', file.name, 'Size:', file.size, 'bytes');
    console.log('👤 User ID:', getUserId());

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it automatically
      });

      console.log('📡 Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Upload response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Upload failed on server');
      }

      console.log('✅ Upload successful for:', file.name);
      return data;
      
    } catch (error) {
      console.error('❌ Upload error for', file.name, ':', error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
  };

  const handleNavigateToSummary = (upload) => {
    const fileId = upload._id || upload.id || upload.file_id;
    if (!fileId) {
      addToast("Error: No file ID found", "error");
      return;
    }
    
    console.log('🧭 Navigating to summary for file ID:', fileId);
    window.location.href = `/summary/${fileId}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    dropzone: {
      border: "2px dashed #2563eb",
      borderRadius: "12px",
      padding: "40px",
      textAlign: "center",
      cursor: "pointer",
      marginBottom: "20px",
      transition: "border-color 0.3s",
      backgroundColor: "#f8f9fa",
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
      border: "1px solid #e5e7eb",
    },
    fileName: {
      flex: 1,
      fontSize: "14px",
      fontWeight: "500",
    },
    removeButton: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "#ef4444",
      padding: "4px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
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
      backgroundColor: "#2563eb",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    uploadButtonDisabled: {
      backgroundColor: "#cbd5e1",
      cursor: "not-allowed",
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
      textAlign: "center",
      transition: "opacity 0.2s",
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

      <h1 style={styles.title}>Upload Documents</h1>

      {/* File Upload Section */}
      <div
        style={styles.dropzone}
        onClick={() => fileInputRef.current?.click()}
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
          <h3>Selected Files ({files.length}):</h3>
          {files.map((file, index) => (
            <div key={index} style={styles.fileItem}>
              <File size={20} color="#4b5563" />
              <span style={styles.fileName}>{file.name}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                {formatFileSize(file.size)}
              </span>
              <button
                style={styles.removeButton}
                onClick={() => removeFile(index)}
                title="Remove file"
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
          ...(files.length === 0 || loading ? styles.uploadButtonDisabled : {})
        }}
        onClick={handleUpload}
        disabled={loading || files.length === 0}
      >
        {loading ? (
          <>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            Uploading...
          </>
        ) : (
          `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
        )}
      </button>

      {/* Uploaded files */}
      <h2 style={styles.subTitle}>Your Uploads ({uploads.length} files)</h2>
      <div style={styles.uploadList}>
        {uploads.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
            No files uploaded yet. Select files above to get started.
          </p>
        ) : (
          uploads.map((upload, index) => (
            <div key={upload._id || index} style={styles.uploadCard}>
              <div style={styles.uploadInfo}>
                <h3 style={styles.uploadName}>{upload.original_name}</h3>
                <div style={styles.uploadMeta}>
                  <p>📁 {upload.category || 'document'} • {formatFileSize(upload.size)}</p>
                  <p>📅 {new Date(upload.upload_date).toLocaleDateString()}</p>
                  {upload.has_summary && (
                    <p style={{ color: '#16a34a', fontWeight: '500' }}>✅ Has summary</p>
                  )}
                </div>
              </div>
              
              <div style={styles.actionButtons}>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#2563eb" }}
                  onClick={() => handleNavigateToSummary(upload)}
                  disabled={!upload.has_summary}
                >
                  📄 Summarize
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#16a34a" }}
                  onClick={() => {
                    const fileId = upload._id || upload.id;
                    window.location.href = `/flashcards/${fileId}`;
                  }}
                >
                  🎴 Flashcards
                </button>
                <button
                  style={{ ...styles.actionBtn, backgroundColor: "#9333ea" }}
                  onClick={() => {
                    const fileId = upload._id || upload.id;
                    window.location.href = `/explain/${fileId}`;
                  }}
                >
                  💡 Explain
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FileUploadPage;