import React from 'react';
import './MessageBubble.css';

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
          <div className="messageBubble_text">
            {message.content}
          </div>
        );

      case 'image':
        return (
          <div className="messageBubble_image">
            <img
              src={message.fileAttachment.fileUrl}
              alt={message.fileAttachment.fileName}
              className="messageBubble_chatImage"
              onClick={() => window.open(message.fileAttachment.fileUrl, '_blank')}
            />
            <div className="messageBubble_fileInfo">
              <span className="messageBubble_fileName">{message.fileAttachment.fileName}</span>
              <span className="messageBubble_fileSize">{formatFileSize(message.fileAttachment.fileSize)}</span>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="messageBubble_file">
            <div className="messageBubble_filePreview">
              <span className="messageBubble_fileIcon">
                {getFileIcon(message.fileAttachment.fileType)}
              </span>
              <div className="messageBubble_fileDetails">
                <span className="messageBubble_fileName">{message.fileAttachment.fileName}</span>
                <span className="messageBubble_fileSize">{formatFileSize(message.fileAttachment.fileSize)}</span>
              </div>
              <button
                onClick={() => handleFileDownload(
                  message.fileAttachment.fileUrl,
                  message.fileAttachment.fileName
                )}
                className="messageBubble_downloadBtn"
                title="Download file"
              >
                ↓
              </button>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="messageBubble_system">
            <span className="messageBubble_systemIcon">i</span>
            {message.content}
          </div>
        );

      default:
        return (
          <div className="messageBubble_text">
            {message.content || 'Unsupported message type'}
          </div>
        );
    }
  };

  return (
    <div className={`messageBubble_container ${isOwn ? 'messageBubble_own' : 'messageBubble_other'} messageBubble_${message.messageType}`}>
      {!isOwn && (
        <div className="messageBubble_sender">
          <div className="messageBubble_senderAvatar">
            {safeSender.pic ? (
              <img src={safeSender.pic} alt={safeSender.firstname || 'User'} className="messageBubble_avatarImage" />
            ) : (
              <div className="messageBubble_avatarPlaceholder">
                {safeSender.firstname?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <span className="messageBubble_senderName">
            {message.senderRole === 'Doctor' ? 'Dr. ' : ''}
            {safeSender.firstname || 'Unknown'} {safeSender.lastname || 'User'}
          </span>
        </div>
      )}

      <div className="messageBubble_content">
        {renderMessageContent()}
        
        <div className="messageBubble_meta">
          <span className="messageBubble_time">{formatTime(message.createdAt)}</span>
          {isOwn && (
            <span className="messageBubble_status">
              {message.isRead ? 'Read' : 'Sent'}
            </span>
          )}
        </div>
      </div>

      {isOwn && (
        <div className="messageBubble_sender messageBubble_ownSender">
          <span className="messageBubble_senderName">You</span>
          <div className="messageBubble_senderAvatar">
            {safeSender.pic ? (
              <img src={safeSender.pic} alt="You" className="messageBubble_avatarImage" />
            ) : (
              <div className="messageBubble_avatarPlaceholder">
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
