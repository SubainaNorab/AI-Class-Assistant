// Frontend/src/components/ExplainIdeasPage.jsx - Updated for your backend structure

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import './ExplainIdeasPage.css';

const ExplainIdeasPage = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [explanations, setExplanations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  const { user } = useAuth();
  const { addToast } = useToast();

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Auto-load explanations when file is selected
  useEffect(() => {
    if (selectedFile) {
      fetchExistingExplanations(selectedFile._id);
    }
  }, [selectedFile]);

  // Fetch files from your existing backend structure
  const fetchFiles = async () => {
    try {
      setFilesLoading(true);
      console.log('Fetching files for user:', user.id);
      
      // First try the /uploads endpoint
      const response = await fetch(`http://localhost:5000/uploads?user_id=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Files fetched from /uploads:', result);
        
        const fileList = result.uploads || result.files || [];
        console.log('Processed file list:', fileList);
        setFiles(fileList);
        
        // Auto-select first file if available
        if (fileList.length > 0 && !selectedFile) {
          console.log('Auto-selecting first file:', fileList[0]);
          setSelectedFile(fileList[0]);
        }
      } else {
        console.log('Uploads endpoint not available, using fallback');
        // If /uploads doesn't exist, fall back to direct database query via debug
        const debugResponse = await fetch('http://localhost:5000/debug/files');
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log('Debug data received:', debugData);
          
          const fileList = debugData.files?.map(file => ({
            _id: file._id,
            original_name: `Document ${file._id.slice(-8)}`, // Generate a readable name
            filename: `doc_${file._id.slice(-8)}.txt`,
            category: 'documents',
            size: file.content?.length || 0,
            uploaded_at: file.createdAt,
            content: file.content,
            text: file.text,
            summary: file.summary
          })) || [];
          
          console.log('Processed fallback file list:', fileList);
          setFiles(fileList);
          if (fileList.length > 0 && !selectedFile) {
            console.log('Auto-selecting first file (fallback):', fileList[0]);
            setSelectedFile(fileList[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      addToast('Error loading files', 'error');
    } finally {
      setFilesLoading(false);
    }
  };

  // Handle file upload using your existing backend
  const handleFileUpload = async (fileList) => {
    const filesToUpload = Array.from(fileList);
    
    for (const file of filesToUpload) {
      if (!isValidFile(file)) continue;
      
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', user.id);

        addToast(`📤 Uploading ${file.name}...`, 'info');

        const response = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();

        if (response.ok && result.success) {
          addToast(`✅ ${file.name} uploaded successfully!`, 'success');
          // Refresh file list to show the new file
          await fetchFiles();
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
      'text/plain',
      'text/rtf'
    ];

    if (file.size > maxSize) {
      addToast(`❌ File "${file.name}" is too large. Maximum size is 10 MB.`, 'error');
      return false;
    }

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|docx|txt|rtf)$/)) {
      addToast(`❌ File type not supported for "${file.name}". Please upload PDF, DOCX, or TXT files.`, 'error');
      return false;
    }

    return true;
  };

  const fetchExistingExplanations = async (fileId) => {
    try {
      const response = await fetch(`http://localhost:5000/explanations/${fileId}?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExplanations(data.explanations || []);
      } else {
        setExplanations([]);
      }
    } catch (error) {
      console.error('Error fetching existing explanations:', error);
      setExplanations([]);
    }
  };

  const handleExplainDifficultParts = async () => {
    if (!selectedFile) {
      addToast('Please select a file first', 'warning');
      return;
    }

    // Check if file has content to analyze
    if (!selectedFile.content && !selectedFile.text && !selectedFile.summary) {
      addToast('This file has no content to analyze. Please upload a text-based file.', 'warning');
      return;
    }

    try {
      setLoading(true);
      addToast('🔍 Analyzing difficult parts...', 'info');

      const response = await fetch('http://localhost:5000/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileId: selectedFile._id,
          userId: user.id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setExplanations(data.explanations || []);
        addToast(`✅ Found ${data.explanations?.length || 0} complex parts to explain!`, 'success');
      } else {
        addToast(data.error || 'Failed to analyze content', 'error');
      }
    } catch (error) {
      console.error('Error explaining content:', error);
      addToast('Error analyzing content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExplanation = (index) => {
    const newExpanded = new Set(expandedExplanations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedExplanations(newExpanded);
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
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return '#ef4444';
    if (score >= 0.6) return '#f59e0b';
    return '#3b82f6';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Very Complex';
    if (score >= 0.6) return 'Complex';
    return 'Moderate';
  };

  const filteredExplanations = explanations.filter(exp =>
    exp.difficult_part?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.explanation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (filesLoading) {
    return (
      <div className="explain-ideas-page">
        <div className="explain-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your files...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="explain-ideas-page">
      <div className="explain-container">
        
        {/* Header */}
        <div className="explain-header">
          <div className="header-content">
            <h1>🧠 Explain Complex Ideas</h1>
            <p>AI-powered explanations for difficult concepts in your study materials</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className={`upload-section ${dragActive ? 'drag-active' : ''}`}
             onDragEnter={handleDragEnter}
             onDragLeave={handleDragLeave}
             onDragOver={handleDragOver}
             onDrop={handleDrop}>
          
          <div className="upload-area" onClick={() => document.getElementById('explainFileInput').click()}>
            <div className="upload-content">
              <div className="upload-icon">
                {uploading ? <div className="spinner small"></div> : '📤'}
              </div>
              <h3>{uploading ? 'Uploading...' : 'Upload New Study Material'}</h3>
              <p>Drag and drop files here or click to browse</p>
              <div className="supported-formats">
                <span>Supported: PDF, DOCX, TXT files</span>
              </div>
            </div>
          </div>

          <input
            id="explainFileInput"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.rtf"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>

        {/* File Selection */}
        <div className="file-selection-section">
          <h2>📚 Select Study Material to Analyze</h2>
          {files.length === 0 ? (
            <div className="no-files-state">
              <div className="no-files-content">
                <div className="no-files-icon">📁</div>
                <h3>No Study Materials Found</h3>
                <p>Upload some PDFs, DOCX, or TXT files to get started with AI explanations.</p>
              </div>
            </div>
          ) : (
            <div className="files-grid">
              {files.map((file) => (
                <div
                  key={file._id}
                  className={`file-card ${selectedFile?._id === file._id ? 'selected' : ''}`}
                  onClick={() => {
                    console.log('File clicked:', file);
                    setSelectedFile(file);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="file-icon">
                    📄
                  </div>
                  <div className="file-details">
                    <h3>{file.original_name}</h3>
                    <p className="file-meta">
                      {file.category?.toUpperCase() || 'DOCUMENT'} • {formatFileSize(file.size)}
                    </p>
                    <p className="file-date">
                      {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'Unknown date'}
                    </p>
                    {/* Debug info - remove after fixing */}
                    <p className="debug-info" style={{ fontSize: '0.7rem', color: '#999' }}>
                      ID: {file._id} | Content: {file.content ? file.content.length + ' chars' : 'No content'}
                    </p>
                  </div>
                  {selectedFile?._id === file._id && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Section */}
        {selectedFile && (
          <div className="action-section">
            <div className="action-content">
              <div className="action-info">
                <h3>Ready to Analyze: {selectedFile.original_name}</h3>
                <p>Our AI will identify complex concepts and provide simplified explanations with examples.</p>
                {selectedFile.content && (
                  <p className="content-preview">
                    Content preview: {selectedFile.content.substring(0, 100)}...
                  </p>
                )}
                {/* Debug info - remove after fixing */}
                <div className="debug-info" style={{ 
                  background: '#f0f0f0', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  fontSize: '0.8rem',
                  marginTop: '8px'
                }}>
                  <strong>Debug Info:</strong><br />
                  File ID: {selectedFile._id}<br />
                  Has Content: {selectedFile.content ? 'Yes (' + selectedFile.content.length + ' chars)' : 'No'}<br />
                  Has Text: {selectedFile.text ? 'Yes (' + selectedFile.text.length + ' chars)' : 'No'}<br />
                  Has Summary: {selectedFile.summary ? 'Yes (' + selectedFile.summary.length + ' chars)' : 'No'}
                </div>
              </div>
              <button
                className="explain-btn"
                onClick={() => {
                  console.log('Explain button clicked for file:', selectedFile);
                  handleExplainDifficultParts();
                }}
                disabled={loading || (!selectedFile.content && !selectedFile.text && !selectedFile.summary)}
              >
                {loading ? (
                  <>
                    <div className="spinner small"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    🔍 Find & Explain Difficult Parts
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Explanations Section */}
        {explanations.length > 0 && (
          <div className="explanations-section">
            <div className="explanations-header">
              <h2>💡 Complex Parts Explained</h2>
              <div className="explanations-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search explanations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="search-icon">🔍</span>
                </div>
                <div className="explanations-count">
                  {filteredExplanations.length} of {explanations.length} explanations
                </div>
              </div>
            </div>

            <div className="explanations-list">
              {filteredExplanations.map((explanation, index) => (
                <div key={index} className="explanation-card">
                  <div className="explanation-header" onClick={() => toggleExplanation(index)}>
                    <div className="difficult-part">
                      <div className="complexity-indicator">
                        <span 
                          className="complexity-score"
                          style={{ backgroundColor: getScoreColor(explanation.score) }}
                        >
                          {getScoreLabel(explanation.score)}
                        </span>
                        <div className="reasons">
                          {explanation.reasons?.slice(0, 2).map((reason, i) => (
                            <span key={i} className="reason-tag">{reason}</span>
                          ))}
                        </div>
                      </div>
                      <p className="difficult-text">
                        "{explanation.difficult_part}"
                      </p>
                    </div>
                    <button className="expand-btn">
                      {expandedExplanations.has(index) ? '▼' : '▶'}
                    </button>
                  </div>

                  {expandedExplanations.has(index) && (
                    <div className="explanation-content">
                      <div className="explanation-text">
                        {explanation.explanation.split('\n').map((line, i) => (
                          <div key={i} className="explanation-line">
                            {line.startsWith('- Core idea:') && (
                              <div className="core-idea">
                                <strong>🎯 Core Idea</strong>
                                <p>{line.replace('- Core idea:', '').trim()}</p>
                              </div>
                            )}
                            {line.startsWith('- Simple explanation') && (
                              <div className="simple-explanation">
                                <strong>📝 Simple Explanation</strong>
                                <p>{line.replace(/- Simple explanation[^:]*:/, '').trim()}</p>
                              </div>
                            )}
                            {line.startsWith('- Example:') && (
                              <div className="example">
                                <strong>💡 Example</strong>
                                <p>{line.replace('- Example:', '').trim()}</p>
                              </div>
                            )}
                            {line.startsWith('- Analogy') && (
                              <div className="analogy">
                                <strong>🔗 Analogy</strong>
                                <p>{line.replace(/- Analogy[^:]*:/, '').trim()}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredExplanations.length === 0 && searchTerm && (
              <div className="no-results">
                <p>No explanations match your search for "{searchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no explanations yet */}
        {selectedFile && explanations.length === 0 && !loading && (
          <div className="empty-explanations">
            <div className="empty-content">
              <div className="empty-icon">🤔</div>
              <h3>No Explanations Yet</h3>
              <p>Click "Find & Explain Difficult Parts" to analyze complex concepts in your selected file.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplainIdeasPage;