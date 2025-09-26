const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const chatController = require("../controllers/chatController");

router.post("/create-room", auth, chatController.createChatRoom);
router.post("/create-direct-room", auth, chatController.createDirectChatRoom);
router.get("/available-users", auth, chatController.getAvailableUsers);
router.get("/rooms", auth, chatController.getUserChatRooms);
router.get("/rooms/:chatRoomId/messages", auth, chatController.getChatMessages);
router.post("/send-message", auth, chatController.sendMessage);
router.post("/upload-file", auth, chatController.uploadChatFile);
router.get("/download/:fileId", auth, chatController.downloadChatFile);
router.put("/rooms/:chatRoomId/close", auth, chatController.closeChatRoom);

module.exports = router;
