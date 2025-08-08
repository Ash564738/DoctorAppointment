import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { toast } from 'react-hot-toast';
import MessageBubble from './MessageBubble';
import FileUpload from './FileUpload';
import logger from '../utils/logger';
import '../styles/chat.css';

// Configure axios with the correct base URL structure
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL + '/api' || 'http://localhost:5015/api'
});

const ChatInterface = ({ appointmentId, chatRoomId, onClose, initialChatRoom, isFloating, onMessagesRead }) => {

  const [socket, setSocket] = useState(null);
  const [chatRoom, setChatRoom] = useState(initialChatRoom || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Define markMessagesAsRead function early to avoid hoisting issues
  const markMessagesAsRead = async (socketInstance, chatRoomId) => {
    if (!chatRoomId || !socketInstance || !socketInstance.connected) {
      return;
    }

    socketInstance.emit('mark-messages-read', { chatRoomId });
    
    // Don't call onMessagesRead here to prevent infinite loops
    // The unread count will be updated when the socket receives 'messages-read' event
  };
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (!isInitialized) {
      initializeChat();
      setIsInitialized(true);
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []); // Remove dependencies to prevent multiple initializations

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle initialChatRoom prop changes
  useEffect(() => {
    if (initialChatRoom && (!chatRoom || chatRoom._id !== initialChatRoom._id)) {
      logger.debug('Setting initial chat room', {
        initialChatRoomId: initialChatRoom._id,
        currentChatRoomId: chatRoom?._id
      });
      
      setChatRoom(initialChatRoom);
      
      // Reset messages when switching chats
      setMessages([]);

      // Load messages for the initial chat room
      if (initialChatRoom._id) {
        const token = localStorage.getItem('token');
        loadMessagesViaHTTP(initialChatRoom._id, token);
        
        // Join the chat room if socket is connected
        if (socket && socket.connected) {
          socket.emit('join-chat-room', { chatRoomId: initialChatRoom._id });
          
          setTimeout(() => {
            markMessagesAsRead(socket, initialChatRoom._id);
          }, 1000);
        }
      }
    }
  }, [initialChatRoom, chatRoom]);

  // Mark messages as read when chat room changes (inside useEffect to prevent infinite loops)
  useEffect(() => {
    if (chatRoomId && socket && socket.connected) {
      markMessagesAsRead(socket, chatRoomId);
    }
  }, [chatRoomId, socket?.connected]); // Only trigger when chatRoomId or socket connection changes

  const loadMessagesViaHTTP = async (chatRoomId, token) => {
    try {
      const response = await axiosInstance.get(`/chat/rooms/${chatRoomId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const messages = response.data.messages || [];
        
        setMessages(messages);

        // Also set chat room details if available
        if (response.data.chatRoom) {
          const apiRoom = response.data.chatRoom;
          const chatRoomData = {
            _id: apiRoom._id || apiRoom.id,
            id: apiRoom._id || apiRoom.id,
            doctor: apiRoom.doctor,
            patient: apiRoom.patient,
            isDirectChat: apiRoom.isDirectChat,
            appointmentId: apiRoom.appointmentId,
            status: apiRoom.status,
            createdAt: apiRoom.createdAt
          };
          setChatRoom(chatRoomData);
        }
      }
    } catch (error) {
      console.error('HTTP message loading failed:', error.response?.status, error.message);
      // Don't set empty messages on error - keep existing state
    }
  };

  const initializeChat = async () => {
    try {
      const token = localStorage.getItem('token');

      if (chatRoomId) {
        // Direct chat - try to load messages via HTTP first
        await loadMessagesViaHTTP(chatRoomId, token);
        connectSocket(token);
        setLoading(false);
      } else if (appointmentId) {
        // Appointment-based chat - create or get chat room
        const response = await axiosInstance.post(
          '/chat/create-room',
          { appointmentId },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          const apiRoom = response.data.chatRoom;
          setChatRoom({
            _id: apiRoom._id || apiRoom.id, // Ensure _id is defined
            id: apiRoom._id || apiRoom.id, // Keep both for compatibility
            doctor: apiRoom.doctor,
            patient: apiRoom.patient,
            isDirectChat: apiRoom.isDirectChat,
            appointmentId: apiRoom.appointmentId,
            status: apiRoom.status,
            createdAt: apiRoom.createdAt
          });
          connectSocket(token);
        }

        setLoading(false);
      } else if (initialChatRoom) {
        // We have initial chat room data - load messages and connect socket
        await loadMessagesViaHTTP(initialChatRoom._id, token);
        connectSocket(token);
        setLoading(false);
      } else {
        throw new Error('No chat room information provided');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      logger.error('Error initializing chat', error);
      toast.error('Failed to initialize chat. Please try again.');
      setLoading(false);

      if (initialChatRoom) {
        setChatRoom(initialChatRoom);
      }
    }
  };

  const connectSocket = (token) => {
    const socketUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5015';

    const newSocket = io(socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setLoading(false);

      // Join the chat room
      if (chatRoomId) {
        // Direct chat - join by chat room ID
        newSocket.emit('join-chat-room', { chatRoomId });
      } else if (appointmentId) {
        // Appointment-based chat - join by appointment ID
        newSocket.emit('join-chat', { appointmentId });
      } else if (chatRoom && chatRoom._id) {
        // Join by current chat room
        newSocket.emit('join-chat-room', { chatRoomId: chatRoom._id });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('chat-joined', (data) => {
      setChatRoom(data.chatRoom);

      // Only update messages if we don't already have them loaded via HTTP
      const socketMessages = Array.isArray(data.messages) ? data.messages : [];
      
      setMessages(prevMessages => {
        // Only use socket messages if we don't have any messages yet
        if (prevMessages.length === 0 && socketMessages.length > 0) {
          return socketMessages;
        }
        
        // If we already have messages, keep them (HTTP loaded messages take priority)
        return prevMessages;
      });
    });

    // Add a timeout to show the chat interface even if socket events don't work
    setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    newSocket.on('new-message', (data) => {
      if (data.message && typeof data.message === 'object') {
        const newMessage = data.message;

        setMessages(prev => {
          if (!Array.isArray(prev)) return [newMessage];

          // Check if this message already exists (prevent duplicates)
          const existingMessage = prev.find(msg => {
            // Check by ID first (most reliable)
            if (msg._id && newMessage._id && msg._id === newMessage._id) {
              return true;
            }
            
            // Check for temp message with same content from same sender
            if (msg.isTemp && msg.content === newMessage.content) {
              // Compare sender IDs more safely
              const msgSenderId = msg.sender?._id || msg.sender?.id;
              const newMsgSenderId = newMessage.sender?._id || newMessage.sender?.id;
              
              if (msgSenderId && newMsgSenderId && msgSenderId === newMsgSenderId) {
                return true;
              }
            }
            
            return false;
          });

          if (existingMessage) {
            // Replace the existing/temp message
            return prev.map(msg => {
              const msgSenderId = msg.sender?._id || msg.sender?.id;
              const newMsgSenderId = newMessage.sender?._id || newMessage.sender?.id;
              
              if ((msg._id === newMessage._id) ||
                  (msg.isTemp && msg.content === newMessage.content && msgSenderId === newMsgSenderId)) {
                return { ...newMessage, isTemp: false };
              }
              return msg;
            });
          }

          // Add the new message if no duplicate found
          return [...prev, newMessage];
        });
      }

      // Mark messages as read if chat is open
      if (document.hasFocus()) {
        markMessagesAsRead(newSocket, data.chatRoomId);
      }
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return [...prev.filter(u => u.userId !== data.userId), data];
        } else {
          return prev.filter(u => u.userId !== data.userId);
        }
      });
    });

    newSocket.on('user-online', () => {
      // Reduce noise - disabled online notifications
    });

    newSocket.on('user-offline', () => {
      // Reduce noise - disabled offline notifications
    });

    newSocket.on('messages-read', () => {
      // Messages marked as read - refresh chat rooms immediately
      if (onMessagesRead) {
        onMessagesRead();
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message);
    });

    setSocket(newSocket);
  };

  // Get current user from JWT token and chatRoom data - reusable function
  const getCurrentUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const decoded = jwt_decode(token);
      
      // Try to get full user profile from chatRoom data
      let currentUserProfile = null;
      
      if (chatRoom) {
        // Check if current user is the doctor or patient in the chat room
        if (chatRoom.doctor && chatRoom.doctor._id === decoded.userId) {
          currentUserProfile = chatRoom.doctor;
        } else if (chatRoom.patient && chatRoom.patient._id === decoded.userId) {
          currentUserProfile = chatRoom.patient;
        }
      }
      
      // Return user object with full profile data if available
      return {
        _id: decoded.userId,
        userId: decoded.userId,
        role: decoded.role,
        firstname: currentUserProfile?.firstname || 'You',
        lastname: currentUserProfile?.lastname || '',
        pic: currentUserProfile?.pic || null // Include avatar data
      };
    } catch (error) {
      console.error('Error decoding token for user data:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      logger.debug('Attempted to send empty message');
      return;
    }

    const messageContent = newMessage.trim();
    const startTime = Date.now();

    logger.chat('send_message_attempt', chatRoom?._id, {
      messageLength: messageContent.length,
      messageType: 'text',
      hasSocket: !!socket,
      hasChatRoom: !!chatRoom
    });

    const tempMessage = {
      _id: 'temp-' + Date.now(),
      content: messageContent,
      messageType: 'text',
      createdAt: new Date(),
      sender: getCurrentUser(),
      isTemp: true
    };

    // Add message to UI immediately
    setMessages(prev => {
      return [...prev, tempMessage];
    });
    setNewMessage('');

    try {
      // Try to send via socket first
      if (socket && chatRoom) {
        logger.socket('send-message', {
          chatRoomId: chatRoom._id,
          contentLength: messageContent.length
        }, 'emit');

        socket.emit('send-message', {
          chatRoomId: chatRoom._id,
          content: messageContent,
          messageType: 'text'
        });
      } else {
        // Fallback: send via HTTP API
        const token = localStorage.getItem('token');
        await axiosInstance.post('/chat/send-message', {
          chatRoomId: chatRoom?._id || chatRoomId,
          content: messageContent,
          messageType: 'text'
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      // For HTTP, the message will be received via socket or page refresh
      if (socket && chatRoom) {
        // Don't update temp flag here - let the new-message handler deal with it
        // This prevents the temp message from being marked as permanent before
        // the server responds with the actual message
      }

      logger.chat('send_message_success', chatRoom?._id, {
        messageLength: messageContent.length,
        sendTime: `${Date.now() - startTime}ms`,
        method: socket && chatRoom ? 'socket' : 'http'
      });

    } catch (error) {
      logger.error('Error sending message', error, {
        chatRoomId: chatRoom?._id,
        messageLength: messageContent.length,
        sendTime: `${Date.now() - startTime}ms`,
        hasSocket: !!socket,
        hasChatRoom: !!chatRoom
      });

      // Mark message as failed but keep it in the UI
      setMessages(prev => prev.map(msg =>
        msg._id === tempMessage._id ? { ...msg, failed: true } : msg
      ));

      toast.error('Failed to send message. Please try again.');
    }

    stopTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      handleTyping();
    }
  };

  const handleTyping = () => {
    if (!socket || !chatRoom) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing-start', { chatRoomId: chatRoom._id });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    if (isTyping && socket && chatRoom) {
      setIsTyping(false);
      socket.emit('typing-stop', { chatRoomId: chatRoom._id });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleFileUpload = (fileData) => {
    if (!socket || !chatRoom) return;

    socket.emit('file-uploaded', {
      chatRoomId: chatRoom._id,
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType
    });

    setShowFileUpload(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="spinner-large"></div>
        <p>Connecting to chat...</p>
      </div>
    );
  }

  // Only show error if we don't have chatRoom AND we're not loading AND we don't have any way to get chat data
  if (!chatRoom && !loading && !chatRoomId && !appointmentId && !initialChatRoom) {
    logger.warn("No chat room data available", {
      chatRoom,
      chatRoomId,
      appointmentId,
      hasInitialChatRoom: !!initialChatRoom,
      loading
    });
    return (
      <div className="chat-error">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h3>Chat Unavailable</h3>
        <p>Unable to load chat room. Please try again later.</p>
        <button onClick={onClose} className="close-chat-btn">
          Close
        </button>
      </div>
    );
  }

  // Check if we have incomplete chat room data (missing user info)
  // Only show loading if we have a chatRoom ID but no user data at all
  if (chatRoom && !loading && chatRoom._id && !chatRoom.doctor && !chatRoom.patient && !chatRoom.isDirectChat) {
    logger.debug('Chat room missing user data, showing loading state', {
      chatRoomId: chatRoom._id,
      hasDoctor: !!chatRoom.doctor,
      hasPatient: !!chatRoom.patient,
      isDirectChat: chatRoom.isDirectChat
    });

    return (
      <div className="chat-loading">
        <div className="spinner-large"></div>
        <p>Loading chat details...</p>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {/* Chat Header - Only show when not in floating mode */}
      {!isFloating && (
        <div className="chat-header">
        <div className="chat-info">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="currentColor"/>
              <path d="M7 9H17V11H7V9ZM7 12H15V14H7V12Z" fill="currentColor"/>
            </svg>
            Chat with {chatRoom?.doctor && chatRoom?.doctor?.firstname ?
              `Dr. ${chatRoom?.doctor?.firstname} ${chatRoom?.doctor?.lastname}` :
              chatRoom?.patient && chatRoom?.patient?.firstname ?
              `${chatRoom?.patient?.firstname} ${chatRoom?.patient?.lastname}` :
              'Unknown User'
            }
          </h3>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px'}}>
                <circle cx="12" cy="12" r="10" fill={isConnected ? '#10b981' : '#ef4444'}/>
              </svg>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="close-chat-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      )}

      {/* Messages Container */}
      <div className="messages-container">
        {!Array.isArray(messages) || messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="#9ca3af"/>
                <path d="M7 9H17V11H7V9ZM7 12H15V14H7V12Z" fill="#9ca3af"/>
              </svg>
            </div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            // Safety check for message structure
            if (!message || typeof message !== 'object') {
              console.warn('Invalid message object:', message);
              return null;
            }

            // Get current user from JWT token like the rest of the app
            let currentUserId = null;
            try {
              const token = localStorage.getItem('token');
              if (token) {
                const decoded = jwt_decode(token);
                currentUserId = decoded.userId;
              }
            } catch (error) {
              console.error('Error parsing token for user ID:', error);
            }

            return (
              <MessageBubble
                key={message.id || message._id}
                message={message}
                isOwn={message.sender && currentUserId && message.sender._id === currentUserId}
              />
            );
          })
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="typing-indicators">
            {typingUsers.map(user => (
              <div key={user.userId} className="typing-indicator">
                <span className="typing-user">{user.userName}</span>
                <span className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <div className="message-input-wrapper">
          <button
            onClick={() => setShowFileUpload(true)}
            className="file-upload-btn"
            title="Upload file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59722 21.9983 8.005 21.9983C6.41278 21.9983 4.88583 21.3658 3.76 20.24C2.63417 19.1142 2.00166 17.5872 2.00166 15.995C2.00166 14.4028 2.63417 12.8758 3.76 11.75L12.33 3.18C13.0806 2.42944 14.0985 2.00551 15.16 2.00551C16.2215 2.00551 17.2394 2.42944 17.99 3.18C18.7406 3.93056 19.1645 4.94849 19.1645 6.01C19.1645 7.07151 18.7406 8.08944 17.99 8.84L10.07 16.76C9.69447 17.1355 9.18578 17.3467 8.655 17.3467C8.12422 17.3467 7.61553 17.1355 7.24 16.76C6.86447 16.3845 6.65328 15.8758 6.65328 15.345C6.65328 14.8142 6.86447 14.3055 7.24 13.93L14.71 6.46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <textarea
            ref={messageInputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send)"
            className="message-input"
            rows="1"
            disabled={!isConnected}
          />

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="send-btn"
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUpload
          chatRoomId={chatRoom._id}
          onUpload={handleFileUpload}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
