const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const chatController = require("../controllers/chatController");

// Create chat room for appointment
router.post("/create-room", auth, chatController.createChatRoom);

// Create direct chat room (no appointment required)
router.post("/create-direct-room", auth, chatController.createDirectChatRoom);

// Get all available users for chatting
router.get("/available-users", auth, chatController.getAvailableUsers);

// Get user's chat rooms
router.get("/rooms", auth, chatController.getUserChatRooms);

// Get messages for a chat room
router.get("/rooms/:chatRoomId/messages", auth, chatController.getChatMessages);

// Send message (fallback endpoint)
router.post("/send-message", auth, chatController.sendMessage);

// Upload file to chat
router.post("/upload-file", auth, chatController.uploadChatFile);

// Download chat file
router.get("/download/:fileId", auth, chatController.downloadChatFile);

// Close chat room
router.put("/rooms/:chatRoomId/close", auth, chatController.closeChatRoom);

module.exports = router;
