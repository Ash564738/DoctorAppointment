import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import '../styles/chat.css';

const FileUpload = ({ chatRoomId, onUpload, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = {
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'text/plain': 'Text File'
  };

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file) => {
    if (!allowedTypes[file.type]) {
      toast.error('File type not supported. Please upload images or documents only.');
      return false;
    }

    if (file.size > maxFileSize) {
      toast.error('File size too large. Maximum size is 10MB.');
      return false;
    }

    return true;
  };

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('chatRoomId', chatRoomId);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/chat/upload-file',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('File uploaded successfully!');
        onUpload(response.data.fileUpload);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return 'IMG';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('doc')) return 'DOC';
    if (fileType.includes('text')) return 'TXT';
    return 'FILE';
  };

  return (
    <div className="file-upload-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="file-upload-container" onClick={(e) => e.stopPropagation()}>
          <div className="upload-header">
            <h3>Upload File</h3>
            <button onClick={onClose} className="file-upload-close-btn">×</button>
          </div>

          <div className="upload-content">
            {!selectedFile ? (
              <div
                className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="drop-zone-content">
                  <div className="upload-icon">+</div>
                  <h4>Drop your file here or click to browse</h4>
                  <p>Supported formats: Images, PDF, Word documents, Text files</p>
                  <p>Maximum size: 10MB</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="file-preview">
                <div className="file-info">
                  <div className="file-icon-large">
                    {getFileIcon(selectedFile.type)}
                  </div>
                  <div className="file-details">
                    <h4>{selectedFile.name}</h4>
                    <p>{formatFileSize(selectedFile.size)}</p>
                    <p>{allowedTypes[selectedFile.type] || 'Unknown type'}</p>
                  </div>
                </div>

                {selectedFile.type.startsWith('image/') && (
                  <div className="image-preview">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="preview-image"
                    />
                  </div>
                )}

                <div className="file-actions">
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="remove-file-btn"
                    disabled={uploading}
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="change-file-btn"
                    disabled={uploading}
                  >
                    Change File
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="upload-footer">
            <button
              onClick={onClose}
              className="cancel-btn"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={uploadFile}
              className="upload-btn"
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner"></span>
                  Uploading...
                </>
              ) : (
                'Upload File'
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
