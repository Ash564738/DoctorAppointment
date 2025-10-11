const jwt = require('jsonwebtoken');
const { ChatRoom, Message } = require('../models/chatModel');
const User = require('../models/userModel');
const { socketLogger } = require('../middleware/requestLogger');
const { info, error: logError, debug } = require('../utils/logger');
const activeUsers = new Map();
const authenticateSocket = async (socket, next) => {
  const startTime = Date.now();
  try {
    const token = socket.handshake.auth.token;
    const ip = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];
    debug('authentication_attempt', {
      socketId: socket.id,
      ip,
      userAgent,
      hasToken: !!token
    });
    if (!token) {
      logError('Socket authentication failed: No token provided', null, {
        socketId: socket.id,
        ip,
        userAgent
      });
      return next(new Error('Authentication error: No token provided'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      logError('Socket authentication failed: User not found', null, {
        socketId: socket.id,
        userId: decoded.userId,
        ip,
        userAgent
      });
      return next(new Error('Authentication error: User not found'));
    }
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.userName = `${user.firstname} ${user.lastname}`;
    socket.user = user;
    socket.connectedAt = Date.now();
    const authTime = Date.now() - startTime;
    info('Socket authentication successful', {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      userRole: socket.userRole,
      ip,
      authTime: `${authTime}ms`
    });
    next();
  } catch (error) {
    const authTime = Date.now() - startTime;
    logError('Socket authentication error', error, {
      socketId: socket.id,
      ip: socket.handshake.address,
      authTime: `${authTime}ms`,
      errorType: error.name
    });
    next(new Error('Authentication error: Invalid token'));
  }
};

const handleConnection = (io) => {
  return async (socket) => {
    const connectionTime = Date.now();
    info('User connected to socket', {
      socketId: socket.id,
      userId: socket.userId,
      userName: socket.userName,
      userRole: socket.userRole,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      name: socket.userName,
      lastSeen: new Date(),
      connectedAt: connectionTime
    });
    try {
      await updateUserOnlineStatus(socket.userId, true);
      await joinUserChatRooms(socket);

      info('User successfully joined chat rooms', {
        socketId: socket.id,
        userId: socket.userId,
        setupTime: `${Date.now() - connectionTime}ms`
      });
    } catch (error) {
      logError('Error during socket connection setup', error, {
        socketId: socket.id,
        userId: socket.userId,
        setupTime: `${Date.now() - connectionTime}ms`
      });
    }
    socket.on('join-chat', async (data) => {
      const startTime = Date.now();
      debug('join-chat', {
        socketId: socket.id,
        userId: socket.userId,
        data: data
      });
      try {
        const { appointmentId } = data;
        await handleJoinChat(socket, appointmentId);
        info('Successfully joined appointment chat', {
          socketId: socket.id,
          userId: socket.userId,
          appointmentId,
          processingTime: `${Date.now() - startTime}ms`
        });
      } catch (error) {
        logError('Failed to join appointment chat room', error, {
          socketId: socket.id,
          userId: socket.userId,
          appointmentId: data.appointmentId,
          processingTime: `${Date.now() - startTime}ms`
        });
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // Handle joining a direct chat room (by chatRoomId)
    socket.on('join-chat-room', async (data) => {
      const startTime = Date.now();
      debug('join-chat-room', {
        socketId: socket.id,
        userId: socket.userId,
        data: data
      });

      try {
        const { chatRoomId } = data;
        await handleJoinDirectChat(socket, chatRoomId);

        info('Successfully joined direct chat room', {
          socketId: socket.id,
          userId: socket.userId,
          chatRoomId,
          processingTime: `${Date.now() - startTime}ms`
        });
      } catch (error) {
        logError('Failed to join direct chat room', error, {
          socketId: socket.id,
          userId: socket.userId,
          chatRoomId: data.chatRoomId,
          processingTime: `${Date.now() - startTime}ms`
        });
        socket.emit('error', { message: 'Failed to join direct chat room' });
      }
    });

    // Handle sending messages
    socket.on('send-message', async (data) => {
      const startTime = Date.now();
      debug('send-message', {
        socketId: socket.id,
        userId: socket.userId,
        messageType: data.messageType,
        chatRoomId: data.chatRoomId,
        contentLength: data.content?.length
      });

      try {
        await handleSendMessage(socket, data, io);

        info(`Chat: message_sent in room ${data.chatRoomId}`, {
          userId: socket.userId,
          chatRoomId: data.chatRoomId,
          messageType: data.messageType,
          contentLength: data.content?.length,
          processingTime: `${Date.now() - startTime}ms`
        });
      } catch (error) {
        logError('Failed to send message', error, {
          socketId: socket.id,
          userId: socket.userId,
          chatRoomId: data.chatRoomId,
          messageType: data.messageType,
          processingTime: `${Date.now() - startTime}ms`
        });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', async (data) => {
      const { chatRoomId } = data;

      debug('typing-start', {
        socketId: socket.id,
        userId: socket.userId,
        chatRoomId
      });

      socket.to(`chat-${chatRoomId}`).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: true
      });
    });

    socket.on('typing-stop', async (data) => {
      const { chatRoomId } = data;

      debug('typing-stop', {
        socketId: socket.id,
        userId: socket.userId,
        chatRoomId
      });

      socket.to(`chat-${chatRoomId}`).emit('user-typing', {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: false
      });
    });

    // Handle marking messages as read
    socket.on('mark-messages-read', async (data) => {
      try {
        await handleMarkMessagesRead(socket, data, io);
      } catch (error) {
        console.error('❌ Error in mark-messages-read handler:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle file upload notification
    socket.on('file-uploaded', async (data) => {
      try {
        await handleFileUpload(socket, data, io);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process file upload' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      const disconnectTime = Date.now();
      const sessionDuration = socket.connectedAt ? disconnectTime - socket.connectedAt : 'unknown';

      info('User disconnected from socket', {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole,
        reason,
        sessionDuration: typeof sessionDuration === 'number' ? `${sessionDuration}ms` : sessionDuration,
        timestamp: new Date().toISOString()
      });

      try {
        // Remove from active users
        activeUsers.delete(socket.userId);

        // Update online status
        await updateUserOnlineStatus(socket.userId, false);

        info('User offline status updated successfully', {
          socketId: socket.id,
          userId: socket.userId
        });
      } catch (error) {
        logError('Error during user disconnect cleanup', error, {
          socketId: socket.id,
          userId: socket.userId,
          reason
        });
      }
      
      // Notify other users in chat rooms
      const userChatRooms = await ChatRoom.find({
        $or: [
          { patientId: socket.userId },
          { doctorId: socket.userId }
        ],
        status: 'active'
      });

      userChatRooms.forEach(chatRoom => {
        socket.to(`chat-${chatRoom._id}`).emit('user-offline', {
          userId: socket.userId,
          userName: socket.userName
        });
      });
    });
  };
};

// Join user to their active chat rooms
const joinUserChatRooms = async (socket) => {
  try {
    const chatRooms = await ChatRoom.find({
      $or: [
        { patientId: socket.userId },
        { doctorId: socket.userId }
      ],
      status: 'active'
    });

    for (const chatRoom of chatRooms) {
      socket.join(`chat-${chatRoom._id}`);
      
      // Notify other users in the room
      socket.to(`chat-${chatRoom._id}`).emit('user-online', {
        userId: socket.userId,
        userName: socket.userName,
        role: socket.userRole
      });
    }
  } catch (error) {
    console.error('Error joining chat rooms:', error);
  }
};

// Handle joining a specific chat room
const handleJoinChat = async (socket, appointmentId) => {
  const chatRoom = await ChatRoom.findOne({ appointmentId })
    .populate('patientId', 'firstname lastname')
    .populate('doctorId', 'firstname lastname');

  if (!chatRoom) {
    throw new Error('Chat room not found');
  }

  // Check if user has access to this chat room
  if (!chatRoom.canUserAccess(socket.userId)) {
    throw new Error('Unauthorized access to chat room');
  }

  // Join the room
  socket.join(`chat-${chatRoom._id}`);

  // Get recent messages with full sender info including avatar
  const messages = await Message.find({ chatRoomId: chatRoom._id })
    .populate('senderId', 'firstname lastname role pic')
    .sort({ createdAt: -1 })
    .limit(50);

  // Send chat room data and messages
  socket.emit('chat-joined', {
    chatRoom: {
      id: chatRoom._id,
      appointmentId: chatRoom.appointmentId,
      patient: chatRoom.patientId,
      doctor: chatRoom.doctorId,
      status: chatRoom.status
    },
    messages: messages.reverse()
  });

  // Notify other users
  socket.to(`chat-${chatRoom._id}`).emit('user-joined-chat', {
    userId: socket.userId,
    userName: socket.userName,
    role: socket.userRole
  });
};

// Handle joining a direct chat room by chatRoomId
const handleJoinDirectChat = async (socket, chatRoomId) => {
  const chatRoom = await ChatRoom.findById(chatRoomId)
    .populate('patientId', 'firstname lastname pic role')
    .populate('doctorId', 'firstname lastname pic role');

  if (!chatRoom) {
    throw new Error('Chat room not found');
  }

  // Check if user has access to this chat room
  if (!chatRoom.canUserAccess(socket.userId)) {
    throw new Error('Unauthorized access to chat room');
  }

  // Join the room
  socket.join(`chat-${chatRoom._id}`);

  // Get recent messages
  const messages = await Message.find({ chatRoomId: chatRoom._id })
    .populate('senderId', 'firstname lastname role pic')
    .sort({ createdAt: -1 })
    .limit(50);

  // Send chat room data and messages
  socket.emit('chat-joined', {
    chatRoom: {
      id: chatRoom._id,
      _id: chatRoom._id,
      appointmentId: chatRoom.appointmentId,
      patient: chatRoom.patientId,
      doctor: chatRoom.doctorId,
      status: chatRoom.status,
      isDirectChat: chatRoom.isDirectChat
    },
    messages: messages.reverse()
  });

  // Notify other users
  socket.to(`chat-${chatRoom._id}`).emit('user-joined-chat', {
    userId: socket.userId,
    userName: socket.userName,
    role: socket.userRole
  });
};

// Handle sending messages
const handleSendMessage = async (socket, data, io) => {
  const { chatRoomId, content, messageType = 'text', replyTo } = data;

  // Validate chat room access
  const chatRoom = await ChatRoom.findById(chatRoomId);
  if (!chatRoom || !chatRoom.canUserAccess(socket.userId)) {
    throw new Error('Unauthorized access to chat room');
  }

  // Create message
  const message = new Message({
    chatRoomId,
    senderId: socket.userId,
    senderRole: socket.userRole,
    content,
    messageType,
    replyTo: replyTo || undefined
  });

  await message.save();
  await message.populate('senderId', 'firstname lastname role pic');
  if (replyTo) {
    await message.populate('replyTo');
  }
  chatRoom.lastMessageAt = new Date();
  
  // Increment unread count for the recipient (not the sender)
  // Determine if sender is patient or doctor in this chat room
  const isSenderPatient = chatRoom.patientId.toString() === socket.userId;
  const isSenderDoctor = chatRoom.doctorId.toString() === socket.userId;
  
  if (isSenderPatient) {
    // Patient sent message → increment Doctor's unread count
    chatRoom.unreadCountDoctor += 1;
  } else if (isSenderDoctor) {
    // Doctor sent message → increment Patient's unread count
    chatRoom.unreadCountPatient += 1;
  } else {
    // Sender is neither patient nor doctor in this room (shouldn't happen, but log it)
    console.warn(`⚠️ Message sender ${socket.userId} (${socket.userRole}) is not a participant in chatRoom ${chatRoomId}`);
  }
  
  await chatRoom.save();
  io.to(`chat-${chatRoomId}`).emit('new-message', {
    message: {
      _id: message._id,
      id: message._id,
      content: message.content,
      messageType: message.messageType,
      sender: message.senderId,
      senderRole: message.senderRole,
      createdAt: message.createdAt,
      replyTo: message.replyTo,
      isRead: message.isRead,
      readAt: message.readAt
    },
    chatRoomId
  });

  // Send push notification to offline users
  await sendMessageNotification(chatRoom, message, socket.userId);
};

// Handle marking messages as read
const handleMarkMessagesRead = async (socket, data, io) => {
  const { chatRoomId } = data;

  try {
    // Find the chat room to determine user's position
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return;
    }

    // Determine if user is patient or doctor in this specific chat room
    const isPatientInRoom = chatRoom.patientId.toString() === socket.userId;
    const isDoctorInRoom = chatRoom.doctorId.toString() === socket.userId;

    if (!isPatientInRoom && !isDoctorInRoom) {
      return;
    }

    // Update messages as read
    await Message.updateMany(
      {
        chatRoomId,
        senderId: { $ne: socket.userId },
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Update chat room unread counts based on user's position in the room
    const updateField = isPatientInRoom 
      ? { unreadCountPatient: 0 }
      : { unreadCountDoctor: 0 };

    await ChatRoom.findByIdAndUpdate(chatRoomId, updateField);

    // Notify other users that messages were read
    socket.to(`chat-${chatRoomId}`).emit('messages-read', {
      readBy: socket.userId,
      readByName: socket.userName,
      readAt: new Date()
    });
    
    socket.emit('messages-read', {
      readBy: socket.userId,
      readByName: socket.userName,
      readAt: new Date(),
      chatRoomId: chatRoomId
    });

  } catch (error) {
    logError('Error marking messages as read', error, {
      socketId: socket.id,
      userId: socket.userId,
      chatRoomId
    });
    throw error;
  }
};

// Handle file upload
const handleFileUpload = async (socket, data, io) => {
  const { chatRoomId, fileName, fileUrl, fileSize, fileType } = data;

  // Create file message
  const message = new Message({
    chatRoomId,
    senderId: socket.userId,
    senderRole: socket.userRole,
    messageType: fileType.startsWith('image/') ? 'image' : 'file',
    fileAttachment: {
      fileName,
      fileUrl,
      fileSize,
      fileType
    }
  });

  await message.save();
  await message.populate('senderId', 'firstname lastname role pic');

  // Emit file message
  io.to(`chat-${chatRoomId}`).emit('new-message', {
    message: {
      id: message._id,
      messageType: message.messageType,
      fileAttachment: message.fileAttachment,
      sender: message.senderId,
      senderRole: message.senderRole,
      createdAt: message.createdAt
    },
    chatRoomId
  });
};

// Update user online status
const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    const updateFields = {};
    
    // Find chat rooms where user is participant
    const chatRooms = await ChatRoom.find({
      $or: [{ patientId: userId }, { doctorId: userId }]
    });

    for (const chatRoom of chatRooms) {
      if (chatRoom.patientId.toString() === userId) {
        updateFields.isPatientOnline = isOnline;
      } else if (chatRoom.doctorId.toString() === userId) {
        updateFields.isDoctorOnline = isOnline;
      }

      await ChatRoom.findByIdAndUpdate(chatRoom._id, updateFields);
    }
  } catch (error) {
    console.error('Error updating online status:', error);
  }
};
const sendMessageNotification = async (chatRoom, message, senderId) => {
  try {    const recipientId = chatRoom.patientId.toString() === senderId 
      ? chatRoom.doctorId 
      : chatRoom.patientId;
    if (!activeUsers.has(recipientId.toString())) {
      // Recipient is offline - notification handling would go here
    }
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

module.exports = {
  authenticateSocket,
  handleConnection,
  activeUsers
};

