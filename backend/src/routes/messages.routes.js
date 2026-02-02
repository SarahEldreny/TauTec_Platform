const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Conversations
router.get('/conversations', messageController.getConversations);
router.get('/conversations/search', messageController.searchConversations);
router.get('/users/search', messageController.searchUsers);

// Messages
router.post('/send', messageController.sendMessage);
router.get('/conversations/:conversationId', messageController.getMessages);
router.patch('/messages/:messageId/read', messageController.markAsRead);
router.delete('/messages/:messageId', messageController.deleteMessage);

// Unread count
router.get('/unread-count', messageController.getUnreadCount);

module.exports = router;
