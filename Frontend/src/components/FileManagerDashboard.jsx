// Frontend/src/components/FileManagerDashboard.jsx - COMPLETE FIXED VERSION

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './FileManagerDashboard.css';

const FileManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Toast notification system
  const [toasts, setToasts] = useState([]);
  
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Fetch user files - FIXED VERSION
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      console.log('📁 Fetching files for user:', user?.email || 'unknown');
      
      // Get token from localStorage - try different keys
      const token = localStorage.getItem('authToken') || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('access_token');

      if (!user || !user.id) {
        console.error('❌ No user ID available');
        setFiles([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/uploads?user_id=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📄 Raw API response:', data);
        
        // Handle different response formats
        let fileList = [];
        if (data.uploads) {
          fileList = data.uploads;
        } else if (data.files) {
          fileList = data.files;
        } else if (Array.isArray(data)) {
          fileList = data;
        }
        
        console.log('📋 Processed files:', fileList);
        setFiles(fileList || []);
        
        if (fileList.length === 0) {
          console.log('📂 No files found');
        }
      } else {
        const errorData = await response.text();
        console.error('❌ API Error:', response.status, errorData);
        setFiles([]);
        
        if (response.status === 400) {
          addToast('Error: Invalid request parameters', 'error');
        } else if (response.status === 401) {
          addToast('Error: Please log in again', 'error');
        } else {
          addToast(`Error: Failed to load files (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('🔥 Network error:', error);
      setFiles([]);
      addToast('Network error: Please check your connection', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (uploadedFiles) => {
    const fileArray = Array.from(uploadedFiles);
    if (fileArray.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    fileArray.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('user_id', user.id);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        addToast(`Successfully uploaded ${fileArray.length} file(s)`, 'success');
        fetchFiles(); // Refresh the file list
      } else {
        const error = await response.json();
        addToast(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      addToast('Upload error: Please try again', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Navigation handlers - FIXED
  const handleNavigateToSummary = async (file) => {
    console.log('🎯 Navigating to summary for file:', file);
    
    const fileId = file._id || file.id;
    if (!fileId) {
      addToast('Error: No file ID found', 'error');
      return;
    }

    setProcessingFiles(prev => new Set([...prev, fileId]));
    
    try {
      navigate(`/summary/${fileId}`);
      addToast('Navigating to summary...', 'success');
    } catch (error) {
      console.error('Navigation error:', error);
      addToast('Navigation error', 'error');
    } finally {
      setTimeout(() => {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 1000);
    }
  };

  const handleNavigateToFlashcards = async (file) => {
    console.log('🎴 Navigating to flashcards for file:', file);
    
    const fileId = file._id || file.id;
    if (!fileId) {
      addToast('Error: No file ID found', 'error');
      return;
    }

    setProcessingFiles(prev => new Set([...prev, fileId]));
    
    try {
      navigate(`/flashcards/${fileId}`);
      addToast('Navigating to flashcards...', 'success');
    } catch (error) {
      console.error('Navigation error:', error);
      addToast('Navigation error', 'error');
    } finally {
      setTimeout(() => {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 1000);
    }
  };

  const handleNavigateToExplain = async (file) => {
    console.log('💡 Navigating to explain for file:', file);
    
    const fileId = file._id || file.id;
    if (!fileId) {
      addToast('Error: No file ID found', 'error');
      return;
    }

    setProcessingFiles(prev => new Set([...prev, fileId]));
    
    try {
      navigate(`/explain/${fileId}`);
      addToast('Navigating to explanation...', 'success');
    } catch (error) {
      console.error('Navigation error:', error);
      addToast('Navigation error', 'error');
    } finally {
      setTimeout(() => {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 1000);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.filename?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || file.category === filterType;
    return matchesSearch && matchesFilter;
  });

  const getFileIcon = (file) => {
    const category = file.category || 'documents';
    const icons = {
      'pdfs': '📄',
      'documents': '📝',
      'presentations': '📊',
      'audio': '🎵'
    };
    return icons[category] || '📄';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-manager-dashboard">
      <div className="dashboard-container">
        
        {/* Toast Notifications */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}`}
              style={{
                backgroundColor: toast.type === 'error' ? '#fee2e2' : 
                               toast.type === 'success' ? '#dcfce7' : '#fef3c7',
                color: toast.type === 'error' ? '#dc2626' :
                       toast.type === 'success' ? '#16a34a' : '#d97706'
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
        
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>📚 Study Materials Dashboard</h1>
            <p>Upload, analyze, and study your documents with AI-powered tools</p>
          </div>
        </div>

        {/* Upload Area */}
        <div className={`upload-section ${dragActive ? 'drag-active' : ''}`}
             onDragEnter={handleDragEnter}
             onDragLeave={handleDragLeave}
             onDragOver={handleDragOver}
             onDrop={handleDrop}>
          
          <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
            <div className="upload-content">
              <div className="upload-icon">
                {uploading ? <div className="spinner small"></div> : '📤'}
              </div>
              <h3>{uploading ? 'Uploading...' : 'Upload Documents'}</h3>
              <p>{uploading ? 'Please wait...' : 'Drag and drop your files here, or click to browse'}</p>
              <p className="upload-hint">Supports PDF, DOCX, TXT, and more</p>
            </div>
          </div>
          
          <input
            type="file"
            id="fileInput"
            multiple
            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={uploading}
          />
        </div>

        {/* File Controls */}
        <div className="file-controls">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Files</option>
              <option value="pdfs">PDFs</option>
              <option value="documents">Documents</option>
              <option value="presentations">Presentations</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          
          <div className="file-stats">
            {filteredFiles.length} of {files.length} files
          </div>
        </div>

        {/* Files Grid */}
        {filteredFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">📂</div>
              <h3>No files found</h3>
              <p>Upload some documents to get started with AI-powered studying!</p>
            </div>
          </div>
        ) : (
          <div className="files-grid">
            {filteredFiles.map((file) => {
              const fileId = file._id || file.id;
              const isProcessing = processingFiles.has(fileId);
              
              return (
                <div key={fileId} className="file-card">
                  <div className="file-header">
                    <div className="file-icon">
                      {getFileIcon(file)}
                    </div>
                    <div className="file-info">
                      <h3>{file.original_name || file.filename || 'Untitled'}</h3>
                      <p className="file-meta">
                        {file.category || 'Unknown'} • {formatFileSize(file.size)}
                      </p>
                      <p className="file-date">
                        {file.upload_date ? new Date(file.upload_date).toLocaleDateString() : 'Recently uploaded'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="file-actions">
                    <button
                      className="action-btn primary"
                      onClick={() => handleNavigateToSummary(file)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '⏳' : '📄'} Summarize
                    </button>
                    <button
                      className="action-btn secondary"
                      onClick={() => handleNavigateToFlashcards(file)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '⏳' : '🎴'} Flashcards
                    </button>
                    <button
                      className="action-btn accent"
                      onClick={() => handleNavigateToExplain(file)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? '⏳' : '💡'} Explain
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManagerDashboard;