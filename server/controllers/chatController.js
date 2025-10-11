const { ChatRoom, Message, FileUpload } = require("../models/chatModel");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { info, error: logError, db, api } = require('../utils/logger');
const createChatRoom = async (req, res) => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';

  try {
    const { appointmentId } = req.body;
    const userId = req.locals;

    info('Creating chat room for appointment', {
      requestId,
      appointmentId,
      userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId')
      .populate('userId');
    db('findById', 'Appointment', { appointmentId }, appointment, { requestId });
    if (!appointment) {
      logError('Appointment not found for chat room creation', null, {
        requestId,
        appointmentId,
        userId
      });
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    const hasAccess = appointment.userId._id.toString() === userId ||
                     appointment.doctorId._id.toString() === userId;

    if (!hasAccess) {
      logError('Unauthorized access to appointment chat room', null, {
        requestId,
        appointmentId,
        userId,
        patientId: appointment.userId._id.toString(),
        doctorId: appointment.doctorId._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to appointment"
      });
    }
    let chatRoom = await ChatRoom.findOne({ appointmentId });
    db('findOne', 'ChatRoom', { appointmentId }, chatRoom, { requestId });

    if (!chatRoom) {
      info('Creating new chat room for appointment', {
        requestId,
        appointmentId,
        patientId: appointment.userId._id,
        doctorId: appointment.doctorId._id
      });
      chatRoom = new ChatRoom({
        appointmentId,
        patientId: appointment.userId._id,
        doctorId: appointment.doctorId._id
      });
      await chatRoom.save();
      db('save', 'ChatRoom', { appointmentId }, chatRoom, { requestId });
      info('Chat room created successfully', {
        requestId,
        chatRoomId: chatRoom._id,
        appointmentId,
        processingTime: `${Date.now() - startTime}ms`
      });
    } else {
      info('Using existing chat room for appointment', {
        requestId,
        chatRoomId: chatRoom._id,
        appointmentId,
        processingTime: `${Date.now() - startTime}ms`
      });
    }
    await chatRoom.populate('patientId', 'firstname lastname email');
    await chatRoom.populate('doctorId', 'firstname lastname email');
    res.json({
      success: true,
      chatRoom: {
        id: chatRoom._id,
        appointmentId: chatRoom.appointmentId,
        patient: chatRoom.patientId,
        doctor: chatRoom.doctorId,
        status: chatRoom.status,
        createdAt: chatRoom.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat room"
    });
  }
};

const createDirectChatRoom = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.locals;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Target user ID is required"
      });
    }
    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create chat room with yourself"
      });
    }
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);
    if (!currentUser || !targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    let chatRoom = await ChatRoom.findOne({
      $or: [
        { patientId: currentUserId, doctorId: targetUserId, isDirectChat: true },
        { patientId: targetUserId, doctorId: currentUserId, isDirectChat: true }
      ]
    });
    if (!chatRoom) {
      let patientId, doctorId;
      if (currentUser.role === 'Patient' && targetUser.role === 'Doctor') {
        patientId = currentUserId;
        doctorId = targetUserId;
      } else if (currentUser.role === 'Doctor' && targetUser.role === 'Patient') {
        patientId = targetUserId;
        doctorId = currentUserId;
      } else {
        patientId = currentUserId;
        doctorId = targetUserId;
      }
      const directChatId = new mongoose.Types.ObjectId();
      chatRoom = new ChatRoom({
        patientId,
        doctorId,
        appointmentId: directChatId,
        isDirectChat: true
      });
      try {
        await chatRoom.save();
      } catch (saveError) {
        if (saveError.code === 11000) {
          chatRoom = await ChatRoom.findOne({
            $or: [
              { patientId: currentUserId, doctorId: targetUserId, isDirectChat: true },
              { patientId: targetUserId, doctorId: currentUserId, isDirectChat: true }
            ]
          });
          if (!chatRoom) {
            throw saveError;
          }
        } else {
          throw saveError;
        }
      }
    }
    await chatRoom.populate('patientId', 'firstname lastname email pic role');
    await chatRoom.populate('doctorId', 'firstname lastname email pic role');
    res.json({
      success: true,
      chatRoom: {
        id: chatRoom._id,
        patient: chatRoom.patientId,
        doctor: chatRoom.doctorId,
        status: chatRoom.status,
        isDirectChat: chatRoom.isDirectChat,
        createdAt: chatRoom.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating direct chat room:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Chat room already exists between these users"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create chat room",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getAvailableUsers = async (req, res) => {
  try {
    const currentUserId = req.locals;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    let users = [];
    if (currentUser.role === 'Patient') {
      const doctorIds = await Appointment.distinct("doctorId", {
        userId: currentUserId,
        status: { $in: ["Confirmed", "Active", "Completed"] }
      });
      users = await User.find({
        _id: { $in: doctorIds },
        role: 'Doctor',
        status: 'Active'
      }).select('firstname lastname email pic role specialization');
    } else if (currentUser.role === 'Doctor') {
      const patientIds = await Appointment.distinct("userId", {
        doctorId: currentUserId,
        status: { $in: ["Confirmed", "Active", "Completed"] }
      });
      const patients = await User.find({
        _id: { $in: patientIds },
        role: 'Patient',
        status: 'Active'
      }).select('firstname lastname email pic role specialization');
      const doctors = await User.find({
        _id: { $ne: currentUserId },
        role: 'Doctor',
        status: 'Active'
      }).select('firstname lastname email pic role specialization');
      const admins = await User.find({
        role: 'Admin',
        status: 'Active'
      }).select('firstname lastname email pic role specialization');
      users = [...patients, ...doctors, ...admins];
    } else if (currentUser.role === 'Admin') {
      users = await User.find({
        role: 'Doctor',
        status: 'Active'
      }).select('firstname lastname email pic role specialization');
    }
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available users"
    });
  }
};

const getUserChatRooms = async (req, res) => {
  try {
    const userId = req.locals;
    const { status = 'active' } = req.query;

    const chatRooms = await ChatRoom.find({
      $or: [{ patientId: userId }, { doctorId: userId }],
      status
    })
    .populate('patientId', 'firstname lastname email pic role')
    .populate('doctorId', 'firstname lastname email pic role')
    .populate('appointmentId', 'date time status')
    .sort({ lastMessageAt: -1 });
    const chatRoomsWithLastMessage = await Promise.all(
      chatRooms.map(async (chatRoom) => {
        const lastMessage = await Message.findOne({ chatRoomId: chatRoom._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'firstname lastname');

        return {
          id: chatRoom._id,
          _id: chatRoom._id,
          appointmentId: chatRoom.appointmentId,
          patient: chatRoom.patientId,
          doctor: chatRoom.doctorId,
          status: chatRoom.status,
          isDirectChat: chatRoom.isDirectChat,
          lastMessageAt: chatRoom.lastMessageAt,
          unreadCountDoctor: chatRoom.unreadCountDoctor || 0,
          unreadCountPatient: chatRoom.unreadCountPatient || 0,
          unreadCount: userId === chatRoom.patientId.toString() 
            ? chatRoom.unreadCountPatient 
            : chatRoom.unreadCountDoctor,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            sender: lastMessage.senderId,
            createdAt: lastMessage.createdAt
          } : null,
          createdAt: chatRoom.createdAt
        };
      })
    );

    res.json({
      success: true,
      chatRooms: chatRoomsWithLastMessage
    });

  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat rooms"
    });
  }
  
};

const getChatMessages = async (req, res) => {
  const startTime = Date.now();
  const requestId = req.requestId || 'unknown';
  const { chatRoomId } = req.params;
  const userId = req.locals;
  const { page = 1, limit = 50 } = req.query;

  try {

    info('Fetching chat messages', {
      requestId,
      chatRoomId,
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const chatRoom = await ChatRoom.findById(chatRoomId)
      .populate('patientId', 'firstname lastname pic role')
      .populate('doctorId', 'firstname lastname pic role');

    db('findById', 'ChatRoom', { chatRoomId }, chatRoom, { requestId, populated: true });

    if (!chatRoom || !chatRoom.canUserAccess(userId)) {
      logError('Unauthorized access to chat room messages', null, {
        requestId,
        chatRoomId,
        userId,
        chatRoomExists: !!chatRoom,
        hasAccess: chatRoom ? chatRoom.canUserAccess(userId) : false
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to chat room"
      });
    }

    const messages = await Message.find({ chatRoomId })
      .populate('senderId', 'firstname lastname role pic')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({ chatRoomId });

    db('find', 'Message', { chatRoomId, page, limit }, { count: messages.length, total }, { requestId });

    const transformedMessages = messages.reverse().map(message => ({
      ...message.toObject(),
      sender: message.senderId
    }));

    const responseData = {
      success: true,
      messages: transformedMessages,
      chatRoom: {
        _id: chatRoom._id,
        id: chatRoom._id,
        appointmentId: chatRoom.appointmentId,
        patient: chatRoom.patientId,
        doctor: chatRoom.doctorId,
        status: chatRoom.status,
        isDirectChat: chatRoom.isDirectChat,
        createdAt: chatRoom.createdAt
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    };

    info('Chat messages fetched successfully', {
      requestId,
      chatRoomId,
      userId,
      messagesCount: messages.length,
      totalMessages: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      processingTime: `${Date.now() - startTime}ms`
    });

    res.json(responseData);

  } catch (error) {
    logError('Error fetching chat messages', error, {
      requestId,
      chatRoomId,
      userId,
      page,
      limit,
      processingTime: `${Date.now() - startTime}ms`
    });
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages"
    });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat-files';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Upload file to chat
const uploadChatFile = async (req, res) => {
  try {
    const { chatRoomId } = req.body;
    const userId = req.locals;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Validate chat room access
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom || !chatRoom.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to chat room"
      });
    }

  const fileUrl = `/api/chat/download/REPLACE_WITH_FILE_ID`;
    const isImage = req.file.mimetype.startsWith('image/');
    const fileUpload = new FileUpload({
      uploaderId: userId,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/chat-files/${req.file.filename}`,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      mimeType: req.file.mimetype,
      isImage
    });

    await fileUpload.save();
    const message = new Message({
      chatRoomId,
      senderId: userId,
      senderRole: req.userRole,
      messageType: isImage ? 'image' : 'file',
      fileAttachment: {
        fileName: req.file.originalname,
        fileUrl: '',
        fileSize: req.file.size,
        fileType: req.file.mimetype
      }
    });

  await message.save();
  fileUpload.messageId = message._id;
  await fileUpload.save();
  message.fileAttachment.fileUrl = `/uploads/chat-files/${req.file.filename}`;
  message.fileAttachment.downloadUrl = `/api/chat/download/${fileUpload._id}`;
  await message.save();

    await message.populate('senderId', 'firstname lastname role pic');

    res.json({
      success: true,
      message: {
        id: message._id,
        messageType: message.messageType,
        fileAttachment: message.fileAttachment,
        sender: message.senderId,
        senderRole: message.senderRole,
        createdAt: message.createdAt
      },
      fileUpload: {
        id: fileUpload._id,
        fileUrl: fileUpload.fileUrl,
        fileName: fileUpload.originalName,
        fileSize: fileUpload.fileSize
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file"
    });
  }
};

const downloadChatFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.locals;

    const fileUpload = await FileUpload.findById(fileId)
      .populate({
        path: 'messageId',
        populate: {
          path: 'chatRoomId'
        }
      });

    if (!fileUpload) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }
    const chatRoom = fileUpload.messageId.chatRoomId;
    if (!chatRoom.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to file"
      });
    }
    fileUpload.downloadCount += 1;
    await fileUpload.save();

    const filePath = path.join(__dirname, '..', fileUpload.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server"
      });
    }

    res.download(filePath, fileUpload.originalName);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: "Failed to download file"
    });
  }
};
const closeChatRoom = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const userId = req.locals;

    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom || !chatRoom.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to chat room"
      });
    }

    chatRoom.status = 'closed';
    await chatRoom.save();

    res.json({
      success: true,
      message: "Chat room closed successfully"
    });

  } catch (error) {
    console.error('Error closing chat room:', error);
    res.status(500).json({
      success: false,
      message: "Failed to close chat room"
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatRoomId, content, messageType = 'text' } = req.body;
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    const message = new Message({
      chatRoomId,
      senderId: userId,
      senderRole: user.role,
      content,
      messageType
    });

    await message.save();
    await message.populate('senderId', 'firstname lastname role pic');

    res.status(200).json({
      success: true,
      message: {
        _id: message._id,
        chatRoomId: message.chatRoomId,
        content: message.content,
        messageType: message.messageType,
        sender: message.senderId,
        senderRole: message.senderRole,
        createdAt: message.createdAt,
        isRead: message.isRead
      },
      info: "Message sent successfully"
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
};

module.exports = {
  createChatRoom,
  createDirectChatRoom,
  getAvailableUsers,
  getUserChatRooms,
  getChatMessages,
  sendMessage,
  uploadChatFile: [upload.single('file'), uploadChatFile],
  downloadChatFile,
  closeChatRoom
};
