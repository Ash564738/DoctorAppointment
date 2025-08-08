const mongoose = require("mongoose");

// Chat Room Schema
const chatRoomSchema = mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Appointment",
      required: false, // Not required for direct chats
      default: undefined // Use undefined instead of null for direct chats
    },
    isDirectChat: {
      type: Boolean,
      default: false,
      index: true
    },
    patientId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'archived'],
      default: 'active',
      index: true
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    isPatientOnline: {
      type: Boolean,
      default: false
    },
    isDoctorOnline: {
      type: Boolean,
      default: false
    },
    unreadCountPatient: {
      type: Number,
      default: 0
    },
    unreadCountDoctor: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Message Schema
const messageSchema = mongoose.Schema(
  {
    chatRoomId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "ChatRoom",
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    senderRole: {
      type: String,
      required: true,
      enum: ['Patient', 'Doctor', 'Admin']
    },
    messageType: {
      type: String,
      required: true,
      enum: ['text', 'file', 'image', 'system'],
      default: 'text'
    },
    content: {
      type: String,
      required: function() {
        return this.messageType === 'text' || this.messageType === 'system';
      },
      maxLength: [2000, 'Message too long']
    },
    fileAttachment: {
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      fileType: String,
      thumbnailUrl: String // For images
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    replyTo: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Message"
    }
  },
  {
    timestamps: true
  }
);

// File Upload Schema
const fileUploadSchema = mongoose.Schema(
  {
    messageId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Message",
      required: true
    },
    uploaderId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    isImage: {
      type: Boolean,
      default: false
    },
    thumbnailUrl: {
      type: String
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better performance
chatRoomSchema.index({ patientId: 1, status: 1 });
chatRoomSchema.index({ doctorId: 1, status: 1 });
chatRoomSchema.index({ appointmentId: 1 });
chatRoomSchema.index({ isDirectChat: 1 });

messageSchema.index({ chatRoomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ chatRoomId: 1, isRead: 1 });

fileUploadSchema.index({ messageId: 1 });
fileUploadSchema.index({ uploaderId: 1 });

// Virtual for participant count
chatRoomSchema.virtual('participantCount').get(function() {
  return 2; // Always doctor and patient
});

// Method to mark messages as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to check if user can access chat room
chatRoomSchema.methods.canUserAccess = function(userId) {
  // Handle both populated and non-populated cases
  // After population, patientId and doctorId become objects with _id
  // Before population, they are ObjectIds
  const patientId = this.patientId?._id ? this.patientId._id.toString() : 
                   this.patientId ? this.patientId.toString() : null;
  const doctorId = this.doctorId?._id ? this.doctorId._id.toString() : 
                  this.doctorId ? this.doctorId.toString() : null;
  
  // Allow access if user is patient or doctor in this chat room
  const hasAccess = patientId === userId.toString() || 
                   doctorId === userId.toString();
  
  return hasAccess;
};

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
const Message = mongoose.model("Message", messageSchema);
const FileUpload = mongoose.model("FileUpload", fileUploadSchema);

module.exports = {
  ChatRoom,
  Message,
  FileUpload
};
