import React from 'react';
import '../styles/chat.css';

const MessageBubble = ({ message, isOwn }) => {
  // Safety check for message data
  if (!message) {
    return null;
  }

  // Ensure sender object exists with fallback values
  const safeSender = message.sender || {
    firstname: 'Unknown',
    lastname: 'User',
    pic: null
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleFileDownload = async (fileUrl, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const renderMessageContent = () => {
    switch (message.messageType) {
      case 'text':
        return (
          <div className="message-text">
            {message.content}
          </div>
        );

      case 'image':
        return (
          <div className="message-image">
            <img
              src={message.fileAttachment.fileUrl}
              alt={message.fileAttachment.fileName}
              className="chat-image"
              onClick={() => window.open(message.fileAttachment.fileUrl, '_blank')}
            />
            <div className="file-info">
              <span className="file-name">{message.fileAttachment.fileName}</span>
              <span className="file-size">{formatFileSize(message.fileAttachment.fileSize)}</span>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="message-file">
            <div className="file-preview">
              <span className="file-icon">
                {getFileIcon(message.fileAttachment.fileType)}
              </span>
              <div className="file-details">
                <span className="file-name">{message.fileAttachment.fileName}</span>
                <span className="file-size">{formatFileSize(message.fileAttachment.fileSize)}</span>
              </div>
              <button
                onClick={() => handleFileDownload(
                  message.fileAttachment.fileUrl,
                  message.fileAttachment.fileName
                )}
                className="download-btn"
                title="Download file"
              >
                ↓
              </button>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="message-system">
            <span className="system-icon">i</span>
            {message.content}
          </div>
        );

      default:
        return (
          <div className="message-text">
            {message.content || 'Unsupported message type'}
          </div>
        );
    }
  };

  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'} ${message.messageType}`}>
      {!isOwn && (
        <div className="message-sender">
          <div className="sender-avatar">
            {safeSender.pic ? (
              <img src={safeSender.pic} alt={safeSender.firstname || 'User'} />
            ) : (
              <div className="avatar-placeholder">
                {safeSender.firstname?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <span className="sender-name">
            {message.senderRole === 'Doctor' ? 'Dr. ' : ''}
            {safeSender.firstname || 'Unknown'} {safeSender.lastname || 'User'}
          </span>
        </div>
      )}

      <div className="message-content">
        {renderMessageContent()}
        
        <div className="message-meta">
          <span className="message-time">{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span className="message-status">
              {message.isRead ? 'Read' : 'Sent'}
            </span>
          )}
        </div>
      </div>

      {isOwn && (
        <div className="message-sender own-sender">
          <span className="sender-name">You</span>
          <div className="sender-avatar">
            {safeSender.pic ? (
              <img src={safeSender.pic} alt="You" />
            ) : (
              <div className="avatar-placeholder">
                {safeSender.firstname?.[0]?.toUpperCase() || 'Y'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
