import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';
import { FaUserMd, FaUser } from 'react-icons/fa';
import ChatInterface from './ChatInterface';
import logger from '../../../utils/logger';
import './ChatButton.css';

// Configure axios with the correct base URL structure
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL + '/api' || 'http://localhost:5015/api'
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
  const [currentUser, setCurrentUser] = useState(null);
  const [userToken, setUserToken] = useState(localStorage.getItem("token") || "");
  const [apiRetryCount, setApiRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const MAX_API_RETRIES = 3;
  const MIN_FETCH_INTERVAL = 2000; // 2 seconds minimum between fetches

  // Helper function to safely render user names
  const safeUserName = (user, includeTitle = false) => {
    if (!user || typeof user !== 'object') return 'Unknown User';
    const firstName = user.firstname || '';
    const lastName = user.lastname || '';
    const title = includeTitle && user.role === 'Doctor' ? 'Dr. ' : '';
    return `${title}${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  // Helper function to safely render message content
  const safeMessageContent = (message) => {
    if (!message) return 'No messages yet';
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message.content) return message.content;
    return 'No messages yet';
  };

  // Helper function to filter users by search term
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

  // Create unified user list with chat history and online status
  const getUnifiedUserList = () => {
    const userMap = new Map();
    const currentUserId = user?.userId; // JWT contains userId, not _id

    // Add users from chat rooms (these have chat history)
    chatRooms.forEach(room => {
      let otherUser = null;

      if (room.doctor && room.doctor._id === currentUserId) {
        otherUser = room.patient;
      } else if (room.patient && room.patient._id === currentUserId) {
        otherUser = room.doctor;
      } else {
        return; // Current user is not part of this chat room
      }

      if (otherUser && otherUser._id !== currentUserId) {
        // Calculate unread count based on user's position in this specific chat room
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

    // Add all available users (some may not have chat history)
    availableUsers.forEach(availableUser => {
      if (availableUser._id !== currentUserId) {
        if (userMap.has(availableUser._id)) {
          // Update existing entry with full user data
          const existing = userMap.get(availableUser._id);
          userMap.set(availableUser._id, { ...existing, ...availableUser });
        } else {
          // Add new user without chat history
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

  // Get user from token like Navbar does - memoized to prevent infinite re-renders
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

  useEffect(() => {
    if (isOpen && !isMinimized && user?.userId) {
      fetchChatRooms();
      fetchAvailableUsers();
    }
  }, [isOpen, isMinimized, user?.userId]); // Only depend on userId, not the entire user object

  const fetchChatRooms = async () => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      console.log('Skipping fetchChatRooms due to rate limiting');
      return;
    }

    try {
      setLoading(true);
      setLastFetchTime(now);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token available for fetchChatRooms');
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

        // Calculate total unread count based on user's position in each chat room
        const totalUnread = normalizedRooms.reduce((total, room) => {
          // Determine if current user is the doctor or patient in this specific chat room
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

    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      return;
    }
    setLastFetchTime(now);

    try {
      const token = localStorage.getItem('token');

      // Fetch all users instead of just available/online users
      const response = await axiosInstance.get('/user/getallusers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Handle different response structures
      let users = [];
      if (Array.isArray(response.data)) {
        users = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        users = response.data.users;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else {
        console.error('Unexpected API response structure:', response.data);
        return;
      }

      // Filter out current user and format the data
      const currentUserId = user?.userId; // JWT contains userId, not _id
      
      const filteredUsers = users
        .filter(u => u._id !== currentUserId)
        .map(u => ({
          _id: u._id,
          firstname: u.firstname,
          lastname: u.lastname,
          email: u.email,
          role: u.role,
          specialization: u.specialization,
          pic: u.pic,
          isOnline: false // We'll assume offline for now, can be enhanced later
        }));

      setAvailableUsers(filteredUsers);
      setApiRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error fetching all users:', error);
      
      // Only try fallback if we haven't exceeded retry limit
      if (apiRetryCount < MAX_API_RETRIES) {
        try {
          const token = localStorage.getItem('token');
          const response = await axiosInstance.get('/chat/available-users', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (response.data.success) {
            setAvailableUsers(response.data.users);
            setApiRetryCount(0); // Reset on success
          }
        } catch (fallbackError) {
          console.error('Fallback API also failed:', fallbackError);
          setApiRetryCount(prev => prev + 1);
        }
      } else {
        // Max retry limit reached, stop trying
      }
    }
  };

  const startDirectChat = async (targetUserId) => {
    try {
      const token = localStorage.getItem('token');

      // Find the target user for better feedback
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
          id: apiRoom._id || apiRoom.id, // Keep both for compatibility
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

        // Refresh chat rooms to include the new one
        fetchChatRooms();
      }
    } catch (error) {
      console.error('Error creating direct chat:', error);

      // Provide user-friendly error message
      const targetUser = availableUsers.find(u => u._id === targetUserId);
      const userName = targetUser ?
        `${targetUser.role === 'Doctor' ? 'Dr. ' : ''}${targetUser.firstname} ${targetUser.lastname}` :
        'this user';

      // Handle specific error cases
      if (error.response?.status === 500) {
        // Server error - provide helpful message and try fallback
        // Try to find existing chat room as fallback
        fetchChatRooms().then(rooms => {
          const existingRoom = rooms?.find(room =>
            (room.patient._id === targetUserId || room.doctor._id === targetUserId) &&
            room.isDirectChat
          );

          if (existingRoom) {
            setSelectedChatRoom(existingRoom);
            setShowUserList(false);
          } else {
            // Enable fallback mode for offline chatting
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
          console.log(`Unable to start chat with ${userName}. Please try again later.`);
        });
      } else if (error.response?.status === 400) {
        // Bad request - might be duplicate chat
        fetchChatRooms(); // Refresh to show existing chats
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

  // Helper function to update unread count for a specific room
  const updateUnreadCountForRoom = (chatRoomId, newUnreadCount) => {
    setChatRooms(prevRooms => 
      prevRooms.map(room => {
        if (room._id === chatRoomId) {
          const updatedRoom = { ...room };
          // Update the appropriate unread count based on user's position in this room
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

    // Recalculate total unread count
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
    // Ensure chat room has proper ID structure
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
    
    // Immediately update unread count by removing this room's unread count
    updateUnreadCountForRoom(normalizedChatRoom._id, 0);
    
    // Refresh the chat rooms data after a delay to get server updates
    setTimeout(() => {
      fetchChatRooms();
    }, 2000);
  };

  const backToRoomList = () => {
    setSelectedChatRoom(null);
    setFallbackMode(false);
    setFallbackChatUser(null);
    fetchChatRooms(); // Refresh the list
  };

  // Don't show chat button if user is not logged in or is on login/register pages
  if (!user) {
    return null;
  }

  // Don't show on certain pages
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