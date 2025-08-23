import React, { useState } from 'react';
import './FileUpload.css';

const FileUpload = ({ chatRoomId, onUpload, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📄';
    if (fileType.includes('text')) return '📄';
    return '📎';
  };

  const handleUpload = async () => {
    if (!selectedFile || !onUpload) return;

    setUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('chatRoomId', chatRoomId);

      // Call upload handler
      await onUpload({
        fileName: selectedFile.name,
        fileUrl: URL.createObjectURL(selectedFile), // Temporary URL for preview
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        formData: formData
      });

      // Reset state
      setSelectedFile(null);
      if (onClose) onClose();
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="fileUpload_modal">
      <div className="fileUpload_overlay" onClick={onClose}>
        <div className="fileUpload_container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="fileUpload_header">
            <h3 className="fileUpload_title">Upload File</h3>
            <button 
              onClick={onClose} 
              className="fileUpload_closeBtn"
              disabled={uploading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="fileUpload_content">
            {!selectedFile ? (
              <div 
                className={`fileUpload_dropZone ${dragOver ? 'fileUpload_dragOver' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('fileUpload_input').click()}
              >
                <div className="fileUpload_dropContent">
                  <div className="fileUpload_uploadIcon">
                    📁
                  </div>
                  <h4 className="fileUpload_dropTitle">Drop files here or click to browse</h4>
                  <p className="fileUpload_dropText">
                    Supports images, PDFs, documents and text files up to 10MB
                  </p>
                </div>
                <input
                  id="fileUpload_input"
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx,.txt,.rtf"
                />
              </div>
            ) : (
              <div className="fileUpload_preview">
                {selectedFile.type.startsWith('image/') ? (
                  <div className="fileUpload_imagePreview">
                    <img 
                      src={URL.createObjectURL(selectedFile)} 
                      alt={selectedFile.name}
                      className="fileUpload_previewImage"
                    />
                  </div>
                ) : (
                  <div className="fileUpload_fileInfo">
                    <span className="fileUpload_fileIconLarge">
                      {getFileIcon(selectedFile.type)}
                    </span>
                    <div className="fileUpload_fileDetails">
                      <h4 className="fileUpload_fileName">{selectedFile.name}</h4>
                      <p className="fileUpload_fileSize">{formatFileSize(selectedFile.size)}</p>
                      <p className="fileUpload_fileType">{selectedFile.type || 'Unknown type'}</p>
                    </div>
                  </div>
                )}
                
                <div className="fileUpload_actions">
                  <button 
                    onClick={handleRemoveFile}
                    className="fileUpload_removeBtn"
                    disabled={uploading}
                  >
                    Remove File
                  </button>
                  <button 
                    onClick={() => document.getElementById('fileUpload_input').click()}
                    className="fileUpload_changeBtn"
                    disabled={uploading}
                  >
                    Change File
                  </button>
                  <input
                    id="fileUpload_input"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.txt,.rtf"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fileUpload_footer">
            <button 
              onClick={onClose}
              className="fileUpload_cancelBtn"
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              className="fileUpload_uploadBtn"
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <span className="fileUpload_spinner"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Upload File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
