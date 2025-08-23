// Frontend/src/components/FileManagerDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import DebugHelper from './DebugHelper';
import './FileManagerDashboard.css';

const FileManagerDashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showDebug, setShowDebug] = useState(false);

  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  // Fetch files from the backend
  const fetchFiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching files for user:', user.id);
      
      const response = await fetch(`http://localhost:5000/uploads?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Files data received:', data);
        
        // Handle different response formats from your backend
        const fileList = data.uploads || data.files || data || [];
        console.log('Processed file list:', fileList);
        
        setFiles(fileList);
        
        if (fileList.length === 0) {
          console.log('No files found for user');
        }
      } else if (response.status === 404) {
        // Endpoint doesn't exist yet
        console.error('Upload endpoint not found (404)');
        setFiles([]);
        addToast('Upload endpoint needs to be added to backend', 'error');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load files:', errorData);
        addToast(`Failed to load files: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
      addToast('Network error loading files', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (fileList) => {
    const files = Array.from(fileList);
    
    for (const file of files) {
      if (!isValidFile(file)) continue;
      
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', user.id);

        const response = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();

        if (response.ok) {
          addToast(`✅ ${file.name} uploaded successfully!`, 'success');
          fetchFiles(); // Refresh file list
        } else {
          addToast(`❌ Upload failed: ${result.error || 'Unknown error'}`, 'error');
        }
      } catch (error) {
        console.error('Upload error:', error);
        addToast(`❌ Failed to upload ${file.name}`, 'error');
      }
    }
    setUploading(false);
  };

  // File validation
  const isValidFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/rtf',
      'text/markdown',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav'
    ];

    if (file.size > maxSize) {
      addToast(`❌ File "${file.name}" is too large. Maximum size is 10 MB.`, 'error');
      return false;
    }

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|docx|pptx|txt|rtf|md|mp3|wav)$/)) {
      addToast(`❌ File type not supported for "${file.name}". Please upload PDF, DOCX, PPTX, TXT, MP3, or WAV files.`, 'error');
      return false;
    }

    return true;
  };

  // File action handlers
  const handleGenerateSummary = async (file) => {
    if (!file.content && !file.text && !file.summary) {
      addToast('This file needs to be processed first', 'warning');
      return;
    }

    try {
      setProcessingFiles(prev => new Set([...prev, file._id || file.id]));
      
      const response = await fetch('http://localhost:5000/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text: file.content || file.text || file.summary,
          user_id: user.id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        addToast('✅ Summary generated successfully!', 'success');
        // You could show the summary in a modal or navigate to a summary page
        console.log('Summary:', result.summary);
      } else {
        addToast(result.error || 'Failed to generate summary', 'error');
      }
    } catch (error) {
      addToast('Error generating summary', 'error');
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file._id || file.id);
        return newSet;
      });
    }
  };

  const handleGenerateFlashcards = async (file) => {
    try {
      setProcessingFiles(prev => new Set([...prev, file._id || file.id]));
      
      const response = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          summary: file.content || file.text || file.summary || 'No content available',
          lecture_title: file.original_name || file.filename || 'Generated from file',
          difficulty: 'Medium',
          topic_tags: [file.category || 'general'],
          user_id: user.id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        addToast('✅ Quiz and flashcards generated successfully!', 'success');
        // Navigate to flashcards or show success message
      } else {
        addToast(result.error || 'Failed to generate flashcards', 'error');
      }
    } catch (error) {
      addToast('Error generating flashcards', 'error');
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file._id || file.id);
        return newSet;
      });
    }
  };

  const handleExplainIdeas = async (file) => {
    try {
      setProcessingFiles(prev => new Set([...prev, file._id || file.id]));
      
      const response = await fetch('http://localhost:5000/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileId: file._id || file.id,
          userId: user.id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        addToast('✅ Complex ideas explained successfully!', 'success');
        // Navigate to explain ideas page or show results
        window.location.href = '/explain';
      } else {
        addToast(result.error || 'Failed to explain ideas', 'error');
      }
    } catch (error) {
      addToast('Error explaining ideas', 'error');
    } finally {
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file._id || file.id);
        return newSet;
      });
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
        
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>📚 Study Materials Dashboard</h1>
            <p>Upload, analyze, and study your documents with AI-powered tools</p>
          </div>
          
          {/* Temporary Debug Button */}
          <button 
            onClick={() => setShowDebug(true)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🔍 Debug
          </button>
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
              <h3>{uploading ? 'Uploading...' : 'Upload Study Materials'}</h3>
              <p>Drag and drop files here or click to browse</p>
              <div className="supported-formats">
                <span>Supported: PDF, DOCX, PPTX, TXT, MP3, WAV</span>
              </div>
            </div>
          </div>

          <input
            id="fileInput"
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.txt,.rtf,.md,.mp3,.wav"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>

        {/* File Controls */}
        {files.length > 0 && (
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
                <option value="all">All Types</option>
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
        )}

        {/* Files Grid */}
        {filteredFiles.length > 0 ? (
          <div className="files-grid">
            {filteredFiles.map((file, index) => (
              <div key={file._id || file.id || index} className="file-card">
                <div className="file-header">
                  <div className="file-icon">
                    {getFileIcon(file)}
                  </div>
                  <div className="file-info">
                    <h3>{file.original_name || file.filename || 'Unknown file'}</h3>
                    <p className="file-meta">
                      {file.category?.toUpperCase() || 'FILE'} • {formatFileSize(file.size || file.file_size)}
                    </p>
                    <p className="file-date">
                      {file.uploaded_at || file.upload_timestamp ? 
                        new Date(file.uploaded_at || file.upload_timestamp).toLocaleDateString() :
                        'Unknown date'
                      }
                    </p>
                  </div>
                </div>

                <div className="file-actions">
                  <button
                    className="action-btn primary"
                    onClick={() => handleGenerateSummary(file)}
                    disabled={processingFiles.has(file._id || file.id)}
                  >
                    {processingFiles.has(file._id || file.id) ? (
                      <><div className="spinner tiny"></div> Processing...</>
                    ) : (
                      <>📝 Summarize</>
                    )}
                  </button>

                  <button
                    className="action-btn secondary"
                    onClick={() => handleGenerateFlashcards(file)}
                    disabled={processingFiles.has(file._id || file.id)}
                  >
                    {processingFiles.has(file._id || file.id) ? (
                      <><div className="spinner tiny"></div> Processing...</>
                    ) : (
                      <>🎯 Flashcards</>
                    )}
                  </button>

                  <button
                    className="action-btn accent"
                    onClick={() => handleExplainIdeas(file)}
                    disabled={processingFiles.has(file._id || file.id)}
                  >
                    {processingFiles.has(file._id || file.id) ? (
                      <><div className="spinner tiny"></div> Processing...</>
                    ) : (
                      <>🧠 Explain</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">📂</div>
              <h3>No Files Yet</h3>
              <p>Upload your first study material to get started with AI-powered learning tools!</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">🔍</div>
              <h3>No Files Match Your Search</h3>
              <p>Try adjusting your search terms or filter settings.</p>
            </div>
          </div>
        )}

      </div>
      
      {/* Debug Helper Modal */}
      {showDebug && (
        <DebugHelper onClose={() => setShowDebug(false)} />
      )}
    </div>
  );
};

export default FileManagerDashboard;