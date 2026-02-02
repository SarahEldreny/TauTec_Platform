const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(verifyToken);

// Get notifications
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);

// Mark as read
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

// Delete
router.delete('/:notificationId', notificationController.deleteNotification);
router.delete('/read/all', notificationController.deleteAllRead);

// Preferences
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

module.exports = router;