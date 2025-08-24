import React, { useState, useCallback, useEffect } from 'react';

// Toast Hook - inline implementation
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
};

// Toast Container Component - inline implementation
const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ✖
          </button>
        </div>
      ))}
    </div>
  );
};

const FileUploadPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    sortBy: 'newest'
  });

  const { toasts, addToast, removeToast } = useToast();
  const API_BASE_URL = 'http://localhost:5000';

  // File type configurations matching your backend
  const FILE_CONFIGS = {
    audio: { 
      extensions: ['mp3', 'wav', 'aac', 'flac', 'm4a'],
      icon: '🎵',
      color: '#8b5cf6',
      bgColor: '#f3f4ff'
    },
    documents: { 
      extensions: ['txt', 'rtf', 'md'],
      icon: '📄',
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    pdfs: { 
      extensions: ['pdf'],
      icon: '📕',
      color: '#ef4444',
      bgColor: '#fef2f2'
    },
    presentations: { 
      extensions: ['ppt', 'pptx', 'odp'],
      icon: '📊',
      color: '#10b981',
      bgColor: '#f0fdf4'
    }
  };

  const getAllowedExtensions = () => {
    return Object.values(FILE_CONFIGS).flatMap(config => config.extensions);
  };

  const getFileConfig = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    for (const [category, config] of Object.entries(FILE_CONFIGS)) {
      if (config.extensions.includes(ext)) {
        return { ...config, category };
      }
    }
    return FILE_CONFIGS.documents; // Default fallback
  };

  const validateFile = (file) => {
    const allowedExtensions = getAllowedExtensions();
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (!ext || !allowedExtensions.includes(ext)) {
      throw new Error(`File type not allowed. Supported: ${allowedExtensions.join(', ')}`);
    }
    
    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File size must be less than 50MB');
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);

    try {
      console.log('📤 Starting upload for:', file.name);
      validateFile(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', 'demo-user'); // Replace with actual user ID

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📥 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Add to uploaded files list
      const fileData = {
        ...result,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        size: file.size,
        fileConfig: getFileConfig(file.name)
      };

      setUploadedFiles(prev => [fileData, ...prev]);
      addToast(`✅ File "${file.name}" uploaded successfully!`, 'success');
      
    } catch (err) {
      console.error('❌ Upload error:', err);
      addToast(`❌ Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleViewSummary = (fileData) => {
    console.log('👁️ Viewing summary for:', fileData.filename);
    setSelectedSummary(fileData);
    setShowSummaryModal(true);
  };

  const handleGenerateQuiz = async (fileData) => {
    if (!fileData.summary) {
      addToast('❌ No summary available for quiz generation', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 Generating quiz from file:', fileData.filename);

      const payload = {
        summary: fileData.summary,
        lecture_title: fileData.originalName?.replace(/\.[^/.]+$/, '') || fileData.filename,
        difficulty: 'Medium',
        topic_tags: [fileData.category],
        user_id: 'demo-user'
      };

      const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        addToast(`🎉 Quiz generated successfully! ${result.question_count} questions created.`, 'success');
      } else {
        addToast(`❌ Quiz generation failed: ${result.error}`, 'error');
      }
    } catch (err) {
      console.error('❌ Quiz generation error:', err);
      addToast('❌ Failed to generate quiz. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter uploaded files
  const filteredFiles = uploadedFiles.filter(file => {
    const matchesSearch = !filters.search || 
      file.originalName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      file.filename?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCategory = filters.category === 'all' || file.category === filters.category;
    
    return matchesSearch && matchesCategory;
  });

  // Sort filtered files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (filters.sortBy) {
      case 'newest':
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      case 'oldest':
        return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      case 'name':
        return (a.originalName || a.filename).localeCompare(b.originalName || b.filename);
      case 'size':
        return b.size - a.size;
      default:
        return 0;
    }
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="file-upload-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Header */}
      <div className="file-upload-header">
        <h1>📁 File Upload Center</h1>
        <p>Upload documents, PDFs, presentations, or audio files to generate summaries and quizzes</p>
      </div>

      {/* Supported File Types */}
      <div className="supported-types-section">
        <h3>📋 Supported File Types</h3>
        <div className="file-types-grid">
          {Object.entries(FILE_CONFIGS).map(([category, config]) => (
            <div key={category} className="file-type-card" style={{ backgroundColor: config.bgColor }}>
              <span className="file-type-icon" style={{ fontSize: '24px' }}>{config.icon}</span>
              <h4 style={{ color: config.color, textTransform: 'capitalize' }}>{category}</h4>
              <p className="file-extensions">
                {config.extensions.map(ext => `.${ext}`).join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="upload-section">
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            className="file-input"
            accept={getAllowedExtensions().map(ext => `.${ext}`).join(',')}
            onChange={handleFileSelect}
            disabled={uploading}
          />

          <div className="upload-content">
            {uploading ? (
              <>
                <div className="spinner"></div>
                <h3>📤 Uploading...</h3>
                <p>Please wait while we process your file</p>
              </>
            ) : (
              <>
                <div className="upload-icon">📁</div>
                <h3>Drop files here or click to browse</h3>
                <p>Maximum file size: 50MB</p>
                <p className="supported-formats">
                  Supported: {getAllowedExtensions().join(', ')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters for uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="file-filters">
          <div className="filters-row">
            <div className="filter-group">
              <label>🔍 Search Files</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Search by filename..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            <div className="filter-group">
              <label>📂 Category</label>
              <select
                className="filter-select"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="all">All Categories</option>
                {Object.keys(FILE_CONFIGS).map(category => (
                  <option key={category} value={category} style={{ textTransform: 'capitalize' }}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>📈 Sort By</label>
              <select
                className="filter-select"
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="size">File Size</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-section">
          <h3>📚 Uploaded Files ({sortedFiles.length})</h3>
          
          {sortedFiles.length === 0 ? (
            <div className="empty-state">
              <p>🔍 No files match your search criteria</p>
            </div>
          ) : (
            <div className="files-grid">
              {sortedFiles.map((file, index) => (
                <div key={`${file.filename}-${index}`} className="file-card">
                  <div className="file-card-header">
                    <div className="file-info">
                      <span 
                        className="file-icon" 
                        style={{ color: file.fileConfig.color }}
                      >
                        {file.fileConfig.icon}
                      </span>
                      <div className="file-details">
                        <h4 className="file-name" title={file.originalName || file.filename}>
                          {(file.originalName || file.filename).length > 30 
                            ? `${(file.originalName || file.filename).substring(0, 30)}...`
                            : (file.originalName || file.filename)
                          }
                        </h4>
                        <p className="file-meta">
                          {formatFileSize(file.size)} • {file.category}
                        </p>
                      </div>
                    </div>
                    <span 
                      className="category-badge"
                      style={{ 
                        backgroundColor: file.fileConfig.color,
                        color: 'white'
                      }}
                    >
                      {file.category}
                    </span>
                  </div>

                  <div className="file-status">
                    {file.summary ? (
                      <div className="processing-success">
                        <span className="status-badge success">✅ Processed</span>
                        <p className="summary-preview">
                          {file.summary.substring(0, 100)}...
                        </p>
                      </div>
                    ) : file.error ? (
                      <div className="processing-error">
                        <span className="status-badge error">❌ Failed</span>
                        <p className="error-message">{file.error}</p>
                      </div>
                    ) : (
                      <div className="processing-pending">
                        <span className="status-badge pending">⏳ Basic Upload</span>
                        <p>File uploaded successfully</p>
                      </div>
                    )}
                  </div>

                  <div className="file-actions">
                    {file.summary && (
                      <>
                        <button
                          className="action-btn view-summary-btn"
                          onClick={() => handleViewSummary(file)}
                          title="View full summary"
                        >
                          👁️ View Summary
                        </button>
                        <button
                          className="action-btn generate-quiz-btn"
                          onClick={() => handleGenerateQuiz(file)}
                          disabled={loading}
                          title="Generate quiz from this file"
                        >
                          🎯 Generate Quiz
                        </button>
                      </>
                    )}
                  </div>

                  <div className="file-footer">
                    <span className="upload-date">
                      📅 Uploaded: {formatDate(file.uploadedAt)}
                    </span>
                    {file.text_length && (
                      <span className="content-length">
                        📝 {file.text_length.toLocaleString()} characters
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && !uploading && (
        <div className="empty-state">
          <div className="empty-content">
            <h3>📁 No Files Uploaded Yet</h3>
            <p>Upload your first document, PDF, presentation, or audio file to get started!</p>
            <p>Files will be processed automatically and you can generate quizzes from them.</p>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && selectedSummary && (
        <div className="modal-overlay" onClick={() => {
          setShowSummaryModal(false);
          setSelectedSummary(null);
        }}>
          <div className="modal-content summary-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Summary View</h2>
              <button className="close-btn" onClick={() => {
                setShowSummaryModal(false);
                setSelectedSummary(null);
              }}>✖</button>
            </div>
            
            <div className="modal-body">
              <div className="file-info-header">
                <div className="file-details">
                  <h3>{selectedSummary.originalName || selectedSummary.filename}</h3>
                  <p className="file-meta">
                    {selectedSummary.fileConfig?.icon} {selectedSummary.category} • 
                    {selectedSummary.size ? ` ${(selectedSummary.size / 1024).toFixed(1)} KB` : ''} • 
                    Uploaded {new Date(selectedSummary.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedSummary.summary ? (
                <div className="summary-content">
                  <h4>📋 Generated Summary</h4>
                  <div className="summary-text">
                    {selectedSummary.summary}
                  </div>
                  
                  {selectedSummary.text_length && (
                    <div className="summary-stats">
                      <div className="stat-item">
                        <span className="stat-label">Original Length:</span>
                        <span className="stat-value">{selectedSummary.text_length.toLocaleString()} characters</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Summary Length:</span>
                        <span className="stat-value">{selectedSummary.summary.length.toLocaleString()} characters</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Compression:</span>
                        <span className="stat-value">
                          {((selectedSummary.summary.length / selectedSummary.text_length) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-summary">
                  <p>❌ No summary available for this file</p>
                  <p>This file type may not support automatic text extraction and summarization.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => {
                setShowSummaryModal(false);
                setSelectedSummary(null);
              }}>
                Close
              </button>
              {selectedSummary.summary && (
                <button 
                  className="generate-btn"
                  onClick={() => {
                    handleGenerateQuiz(selectedSummary);
                    setShowSummaryModal(false);
                    setSelectedSummary(null);
                  }}
                >
                  🎯 Generate Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadPage;