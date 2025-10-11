import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { FaUserMd, FaUser } from 'react-icons/fa';
import ChatInterface from './ChatInterface';
import logger from '../../../utils/logger';
import './ChatButton.css';

// Configure axios with a robust base URL (mirrors helper/apiCall.js)
const rawServer = process.env.REACT_APP_SERVER_URL || 'http://localhost:5015';
const SERVER_ROOT = rawServer.replace(/\/$/, '');
const axiosInstance = axios.create({
  baseURL: SERVER_ROOT + '/api'
});

const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackChatUser, setFallbackChatUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userToken, setUserToken] = useState(localStorage.getItem("token") || "");
  const [apiRetryCount, setApiRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const MAX_API_RETRIES = 3;
  const MIN_FETCH_INTERVAL = 2000;

  const safeUserName = (user, includeTitle = false) => {
    if (!user || typeof user !== 'object') return 'Unknown User';
    const firstName = user.firstname || '';
    const lastName = user.lastname || '';
    const title = includeTitle && user.role === 'Doctor' ? 'Dr. ' : '';
    return `${title}${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  const safeMessageContent = (message) => {
    if (!message) return 'No messages yet';
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message.content) return message.content;
    return 'No messages yet';
  };

  const filterUsersBySearch = (users, searchTerm) => {
    if (!searchTerm) return users;
    const searchLower = searchTerm.toLowerCase();
    return users.filter(user =>
      user.firstname.toLowerCase().includes(searchLower) ||
      user.lastname.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower) ||
      (user.specialization && user.specialization.toLowerCase().includes(searchLower))
    );
  };

  const getUnifiedUserList = () => {
    const userMap = new Map();
    const currentUserId = user?.userId;

    chatRooms.forEach(room => {
      let otherUser = null;

      if (room.doctor && room.doctor._id === currentUserId) {
        otherUser = room.patient;
      } else if (room.patient && room.patient._id === currentUserId) {
        otherUser = room.doctor;
      } else {
        return; 
      }

      if (otherUser && otherUser._id !== currentUserId) {
        const isUserDoctor = room.doctor && room.doctor._id === currentUserId;
        const isUserPatient = room.patient && room.patient._id === currentUserId;
        
        let unreadCount = 0;
        if (isUserDoctor) {
          unreadCount = room.unreadCountDoctor || 0;
        } else if (isUserPatient) {
          unreadCount = room.unreadCountPatient || 0;
        }
          
        userMap.set(otherUser._id, {
          ...otherUser,
          hasChat: true,
          chatRoom: room,
          lastMessage: room.lastMessage,
          lastMessageAt: room.lastMessageAt,
          unreadCount: unreadCount
        });
      }
    });

    availableUsers.forEach(availableUser => {
      if (availableUser._id !== currentUserId) {
        if (userMap.has(availableUser._id)) {
          const existing = userMap.get(availableUser._id);
          userMap.set(availableUser._id, { ...existing, ...availableUser });
        } else {
          userMap.set(availableUser._id, {
            ...availableUser,
            hasChat: false,
            lastMessage: null,
            lastMessageAt: null,
            unreadCount: 0
          });
        }
      }
    });

    const userList = Array.from(userMap.values());
    
    return userList;
  };

  const user = useMemo(() => {
    const token = userToken;
    if (!token) return null;
    
    try {
      const decoded = jwtDecode(token);
      return decoded;
    } catch (error) {
      console.error('FloatingChatButton - Error decoding token:', error);
      // Clear invalid token
      localStorage.removeItem("token");
      setUserToken("");
      return null;
    }
  }, [userToken]);

  // Add effect to handle token changes (login/logout)
  useEffect(() => {
    const checkTokenChange = () => {
      const currentToken = localStorage.getItem("token") || "";
      if (currentToken !== userToken) {
        setUserToken(currentToken);
        // Reset all states when token changes
        setIsOpen(false);
        setSelectedChatRoom(null);
        setChatRooms([]);
        setUnreadCount(0);
      }
    };

    const interval = setInterval(checkTokenChange, 1000); // Check every second
    window.addEventListener('storage', checkTokenChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkTokenChange);
    };
  }, [userToken]);

  // Fetch chat rooms and available users on mount (to get unread count for badge)
  useEffect(() => {
    if (user?.userId) {
      fetchChatRooms();
      fetchAvailableUsers();
    }
  }, [user?.userId]);

  // Refresh data when chat window is opened
  useEffect(() => {
    if (isOpen && !isMinimized && user?.userId) {
      fetchChatRooms();
      fetchAvailableUsers();
    }
  }, [isOpen, isMinimized]); // Removed user?.userId dependency to avoid duplicate calls

  const fetchChatRooms = async () => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      return;
    }

    try {
      setLoading(true);
      setLastFetchTime(now);
      
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await axiosInstance.get('/chat/rooms', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Normalize chat rooms data to ensure consistent ID fields
        const normalizedRooms = response.data.chatRooms.map(room => ({
          ...room,
          _id: room._id || room.id,
          id: room._id || room.id
        }));
        
        setChatRooms(normalizedRooms);

        const totalUnread = normalizedRooms.reduce((total, room) => {
          const isUserDoctor = room.doctor && room.doctor._id === user?.userId;
          const isUserPatient = room.patient && room.patient._id === user?.userId;
          
          let unreadCount = 0;
          if (isUserDoctor) {
            unreadCount = room.unreadCountDoctor || 0;
          } else if (isUserPatient) {
            unreadCount = room.unreadCountPatient || 0;
          }
          
          return total + unreadCount;
        }, 0);
        
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!user) return;

    const now = Date.now();
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      return;
    }
    setLastFetchTime(now);

    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get('/chat/available-users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success && Array.isArray(response.data.users)) {
        setAvailableUsers(response.data.users);
        setApiRetryCount(0);
      } else {
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
      setAvailableUsers([]);
    }
  };

  const startDirectChat = async (targetUserId) => {
    try {
      const token = localStorage.getItem('token');

      const targetUser = availableUsers.find(u => u._id === targetUserId);
      const userName = targetUser ?
        `${targetUser.role === 'Doctor' ? 'Dr. ' : ''}${targetUser.firstname} ${targetUser.lastname}` :
        'this user';

      const response = await axiosInstance.post('/chat/create-direct-room',
        { targetUserId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const apiRoom = response.data.chatRoom;
        const normalizedChatRoom = {
          _id: apiRoom._id || apiRoom.id,
          id: apiRoom._id || apiRoom.id,
          doctor: apiRoom.doctor,
          patient: apiRoom.patient,
          isDirectChat: apiRoom.isDirectChat,
          appointmentId: apiRoom.appointmentId,
          status: apiRoom.status,
          createdAt: apiRoom.createdAt
        };

        logger.info('Direct chat room created successfully', {
          chatRoomId: normalizedChatRoom._id,
          hasDoctor: !!normalizedChatRoom.doctor,
          hasPatient: !!normalizedChatRoom.patient,
          doctorName: normalizedChatRoom.doctor ?
            `${normalizedChatRoom.doctor.firstname} ${normalizedChatRoom.doctor.lastname}` : 'N/A',
          patientName: normalizedChatRoom.patient ?
            `${normalizedChatRoom.patient.firstname} ${normalizedChatRoom.patient.lastname}` : 'N/A'
        });

        setSelectedChatRoom(normalizedChatRoom);
        setShowUserList(false);
        fetchChatRooms();
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);
      const targetUser = availableUsers.find(u => u._id === targetUserId);
      const userName = targetUser ?
        `${targetUser.role === 'Doctor' ? 'Dr. ' : ''}${targetUser.firstname} ${targetUser.lastname}` :
        'this user';

      if (error.response?.status === 500) {
        fetchChatRooms().then(rooms => {
          const existingRoom = rooms?.find(room =>
            (room.patient._id === targetUserId || room.doctor._id === targetUserId) &&
            room.isDirectChat
          );

          if (existingRoom) {
            setSelectedChatRoom(existingRoom);
            setShowUserList(false);
          } else {
            setFallbackMode(true);
            setFallbackChatUser(targetUser);
            setSelectedChatRoom({
              _id: `fallback-${targetUserId}`,
              id: `fallback-${targetUserId}`,
              patient: user?.role === 'Patient' ? user : targetUser,
              doctor: user?.role === 'Doctor' ? user : targetUser,
              isDirectChat: true,
              isFallback: true
            });
            setShowUserList(false);
          }
        }).catch(fallbackError => {
          console.error('Fallback also failed:', fallbackError);
        });
      } else if (error.response?.status === 400) {
        fetchChatRooms();
      } else {
        toast.error(`Unable to start chat with ${userName}. Please try again later.`);
      }
    }
  };

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setSelectedChatRoom(null);
  };

  const updateUnreadCountForRoom = (chatRoomId, newUnreadCount) => {
    setChatRooms(prevRooms => 
      prevRooms.map(room => {
        if (room._id === chatRoomId) {
          const updatedRoom = { ...room };
          const isUserDoctor = room.doctor && room.doctor._id === user?.userId;
          const isUserPatient = room.patient && room.patient._id === user?.userId;
          if (isUserDoctor) {
            updatedRoom.unreadCountDoctor = newUnreadCount;
          } else if (isUserPatient) {
            updatedRoom.unreadCountPatient = newUnreadCount;
          }
          
          return updatedRoom;
        }
        return room;
      })
    );

    setUnreadCount(prevCount => {
      const currentRoom = chatRooms.find(room => room._id === chatRoomId);
      if (!currentRoom) return prevCount;
      
      const isUserDoctor = currentRoom.doctor && currentRoom.doctor._id === user?.userId;
      const isUserPatient = currentRoom.patient && currentRoom.patient._id === user?.userId;
      
      let oldUnreadCount = 0;
      if (isUserDoctor) {
        oldUnreadCount = currentRoom.unreadCountDoctor || 0;
      } else if (isUserPatient) {
        oldUnreadCount = currentRoom.unreadCountPatient || 0;
      }
      
      return Math.max(0, prevCount - oldUnreadCount + newUnreadCount);
    });
  };

  const openChatRoom = (chatRoom) => {
    const normalizedChatRoom = {
      ...chatRoom,
      _id: chatRoom._id || chatRoom.id,
      id: chatRoom._id || chatRoom.id
    };
    
    logger.info('Opening existing chat room', {
      chatRoomId: normalizedChatRoom._id,
      isDirectChat: normalizedChatRoom.isDirectChat,
      hasDoctor: !!normalizedChatRoom.doctor,
      hasPatient: !!normalizedChatRoom.patient
    });
    
    setSelectedChatRoom(normalizedChatRoom);
    updateUnreadCountForRoom(normalizedChatRoom._id, 0);
    
    setTimeout(() => {
      fetchChatRooms();
    }, 2000);
  };

  const backToRoomList = () => {
    setSelectedChatRoom(null);
    setFallbackMode(false);
    setFallbackChatUser(null);
    fetchChatRooms();
  };

  if (!user) {
    return null;
  }

  const currentPath = window.location.pathname;
  const excludedPaths = ['/login', '/register'];
  if (excludedPaths.includes(currentPath)) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div
        className={`chatButton_floatingButton ${isOpen && !isMinimized ? 'chatButton_hidden' : ''}`}
        onClick={toggleChat}
      >
        <div className="chatButton_icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="white"/>
            <path d="M7 9H17V11H7V9ZM7 12H15V14H7V12Z" fill="white"/>
          </svg>
        </div>
        {unreadCount > 0 && (
          <div className="chatButton_unreadBadge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className={`chatButton_window ${isMinimized ? 'chatButton_minimized' : ''}`}>
          <div className="chatButton_header">
            <div className="chatButton_title">
              <span>
                {selectedChatRoom ?
                  `Chat with ${user?.role === 'Doctor' ?
                    safeUserName(selectedChatRoom.patient) :
                    safeUserName(selectedChatRoom.doctor, true)
                  }` :
                  'Your Chats'
                }
              </span>
              <div className="chatButton_onlineIndicator"></div>
            </div>
            <div className="chatButton_controls">
              {selectedChatRoom && (
                <button className="chatButton_backBtn" onClick={backToRoomList} title="Back to chat list">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <button className="chatButton_minimizeBtn" onClick={minimizeChat} title="Minimize">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button className="chatButton_closeBtn" onClick={closeChat} title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="chatButton_content">
              {selectedChatRoom ? (
                selectedChatRoom.isFallback ? (
                  <div className="chatButton_fallbackChat">
                    <div className="chatButton_fallbackHeader">
                      <h4>Chat with {safeUserName(fallbackChatUser)}</h4>
                      <p className="chatButton_fallbackMessage">
                        Chat system temporarily unavailable. Your messages will be delivered when the system is restored.
                      </p>
                    </div>
                    <div className="chatButton_fallbackMessages">
                      <div>
                        <p>💬 Chat will be available once the server is restored.</p>
                        <p className="chatButton_fallbackNote">
                          Please try again in a few moments or contact support if the issue persists.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ChatInterface
                    key={selectedChatRoom._id || selectedChatRoom.id}
                    appointmentId={selectedChatRoom.isDirectChat ? null : selectedChatRoom.appointmentId}
                    chatRoomId={selectedChatRoom.isDirectChat ? selectedChatRoom._id : null}
                    onClose={backToRoomList}
                    isFloating={true}
                    initialChatRoom={selectedChatRoom}
                    onMessagesRead={fetchChatRooms}
                  />
                )
              ) : showUserList ? (
                <div className="chatButton_roomsList">
                  <div className="chatButton_roomsHeader">
                    <button
                      className="chatButton_backBtn"
                      onClick={() => setShowUserList(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <div>
                      <h4 className="chatButton_roomsTitle">
                        All Users ({filterUsersBySearch(availableUsers, userSearchTerm).length}{userSearchTerm ? ` of ${availableUsers.length}` : ''})
                      </h4>
                      <p className="chatButton_roomsSubtitle">Click any user to start chatting (works offline too!)</p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="chatButton_searchContainer">
                    <input
                      type="text"
                      placeholder="Search users by name, role, or email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="chatButton_searchInput"
                    />
                    {userSearchTerm && (
                      <button
                        onClick={() => setUserSearchTerm('')}
                        className="chatButton_clearSearchBtn"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="chatButton_rooms">
                    {filterUsersBySearch(availableUsers, userSearchTerm)
                      .map((availableUser) => (
                      <div
                        key={availableUser._id}
                        className={`chatButton_roomItem chatButton_availableUser ${availableUser.role.toLowerCase()}-user`}
                        onClick={() => startDirectChat(availableUser._id)}
                        title={`Start chat with ${availableUser.role === 'Doctor' ? 'Dr. ' : ''}${availableUser.firstname} ${availableUser.lastname}`}
                      >
                        <div className="chatButton_roomAvatar">
                          {availableUser.pic ? (
                            <img
                              src={availableUser.pic}
                              alt={availableUser.firstname}
                              className="chatButton_avatarImage"
                            />
                          ) : (
                            <span className="chatButton_avatarText">
                              {availableUser.firstname.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className={`chatButton_userRoleBadge ${availableUser.role.toLowerCase()}`}>
                            {availableUser.role === 'Doctor' ? <FaUserMd /> : <FaUser />}
                          </div>
                        </div>
                        <div className="chatButton_roomInfo">
                          <div className="chatButton_roomName">
                            {safeUserName(availableUser, true)}
                          </div>
                          <div className="chatButton_roomLastMessage">
                            <span className="chatButton_userRole">{availableUser.role || 'User'}</span>
                            {availableUser.specialization && (
                              <span className="chatButton_userSpecialization"> • {availableUser.specialization}</span>
                            )}
                            <div className="chatButton_userEmail">{availableUser.email || 'No email'}</div>
                          </div>
                        </div>
                        <div className="chatButton_startChatIcon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 12h8M12 8v8"/>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chatButton_roomsList">
                  {loading ? (
                    <div className="chatButton_loadingSpinner">Loading chats...</div>
                  ) : (
                    <>
                      {/* Search Bar */}
                      <div className="chatButton_searchContainer">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="chatButton_searchInput"
                        />
                      </div>

                      {/* Unified User List */}
                      <div className="chatButton_unifiedUserList">
                        {filterUsersBySearch(getUnifiedUserList(), userSearchTerm).map((userItem) => {
                          const isOnline = onlineUsers.has(userItem._id);

                          return (
                            <div
                              key={userItem._id}
                              className="chatButton_userItem"
                              onClick={() => userItem.hasChat ? openChatRoom(userItem.chatRoom) : startDirectChat(userItem._id)}
                            >
                              <div className="chatButton_userAvatar">
                                <div className="chatButton_avatarCircle">
                                  {userItem.pic ? (
                                    <img 
                                      src={userItem.pic} 
                                      alt={safeUserName(userItem)} 
                                      className="chatButton_avatarImage"
                                    />
                                  ) : (
                                    <span className="chatButton_avatarText">
                                      {userItem.role === 'Doctor' ? 'Dr' : userItem.firstname?.[0] || 'U'}
                                    </span>
                                  )}
                                </div>
                                {isOnline && <div className="chatButton_onlineIndicator"></div>}
                              </div>
                              <div className="chatButton_userInfo">
                                <div className="chatButton_userName">
                                  {safeUserName(userItem, true)}
                                </div>
                                <div className="chatButton_userLastMessage">
                                  {userItem.hasChat && userItem.lastMessage ?
                                    safeMessageContent(userItem.lastMessage) :
                                    `${userItem.role} • Click to start chat`
                                  }
                                </div>
                              </div>
                              <div className="chatButton_userMeta">
                                {userItem.unreadCount > 0 && (
                                  <div className="chatButton_unreadBadge" title={`${userItem.unreadCount} unread messages`}>
                                    {userItem.unreadCount}
                                  </div>
                                )}
                                {userItem.lastMessageAt && (
                                  <div className="chatButton_lastMessageTime">
                                    {new Date(userItem.lastMessageAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>


                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChatButton;