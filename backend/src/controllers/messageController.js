const { query, queryOne } = require('../config/database');

// Send message
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, messageText } = req.body;
        const sender_id = req.user.id;

        if (!receiverId || !messageText) {
            return res.status(400).json({
                success: false,
                message: 'Receiver and message text are required'
            });
        }

        // Check if receiver exists
        const receiver = await queryOne(
            'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
            [receiverId]
        );

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found or inactive'
            });
        }

        // Get or create conversation
        let conversation = await queryOne(
            `SELECT id FROM conversations 
             WHERE (participant_1 = ? AND participant_2 = ?) 
                OR (participant_1 = ? AND participant_2 = ?)`,
            [sender_id, receiverId, receiverId, sender_id]
        );

        if (!conversation) {
            const result = await query(
                'INSERT INTO conversations (participant_1, participant_2) VALUES (?, ?)',
                [sender_id, receiverId]
            );
            conversation = { id: result.insertId };
        }

        // Insert message
        await query(
            `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text)
             VALUES (?, ?, ?, ?)`,
            [conversation.id, sender_id, receiverId, messageText]
        );

        // Update conversation timestamp
        await query(
            'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
            [conversation.id]
        );

        // Create notification for receiver
        await query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [
                receiverId,
                'New Message',
                `You have a new message from ${req.user.first_name} ${req.user.last_name}`,
                'message',
                `/messages/${conversation.id}`
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { conversationId: conversation.id }
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

// Get all conversations for current user
exports.getConversations = async (req, res) => {
    try {
        const user_id = req.user.id;

        const conversations = await query(
            `SELECT c.id, c.last_message_at,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.id
                        ELSE u1.id
                    END as other_user_id,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.first_name
                        ELSE u1.first_name
                    END as other_first_name,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.last_name
                        ELSE u1.last_name
                    END as other_last_name,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.profile_picture
                        ELSE u1.profile_picture
                    END as other_profile_picture,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.role
                        ELSE u1.role
                    END as other_role,
                    (SELECT message_text FROM messages 
                     WHERE conversation_id = c.id 
                     ORDER BY sent_at DESC LIMIT 1) as last_message,
                    (SELECT COUNT(*) FROM messages 
                     WHERE conversation_id = c.id 
                     AND receiver_id = ? AND is_read = FALSE) as unread_count
             FROM conversations c
             JOIN users u1 ON c.participant_1 = u1.id
             JOIN users u2 ON c.participant_2 = u2.id
             WHERE c.participant_1 = ? OR c.participant_2 = ?
             ORDER BY c.last_message_at DESC`,
            [user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id]
        );

        res.json({
            success: true,
            count: conversations.length,
            data: conversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
            error: error.message
        });
    }
};

// Get messages in a conversation
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const user_id = req.user.id;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Verify user is part of conversation
        const conversation = await queryOne(
            'SELECT id FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)',
            [conversationId, user_id, user_id]
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found or access denied'
            });
        }

        // Get messages
        const messages = await query(
            `SELECT m.*, 
                    u.first_name as sender_first_name, 
                    u.last_name as sender_last_name,
                    u.profile_picture as sender_profile_picture
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = ?
             ORDER BY m.sent_at DESC
             LIMIT ? OFFSET ?`,
            [conversationId, parseInt(limit), offset]
        );

        // Mark messages as read
        await query(
            'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND receiver_id = ? AND is_read = FALSE',
            [conversationId, user_id]
        );

        res.json({
            success: true,
            count: messages.length,
            data: messages.reverse() // Reverse to show oldest first
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const user_id = req.user.id;

        await query(
            'UPDATE messages SET is_read = TRUE WHERE id = ? AND receiver_id = ?',
            [messageId, user_id]
        );

        res.json({
            success: true,
            message: 'Message marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read',
            error: error.message
        });
    }
};

// Delete message
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const user_id = req.user.id;

        // Only sender can delete
        const message = await queryOne(
            'SELECT id FROM messages WHERE id = ? AND sender_id = ?',
            [messageId, user_id]
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or you are not authorized to delete it'
            });
        }

        await query('DELETE FROM messages WHERE id = ?', [messageId]);

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message',
            error: error.message
        });
    }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await queryOne(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
            [user_id]
        );

        res.json({
            success: true,
            data: { unreadCount: result.count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error.message
        });
    }
};

// Search conversations
exports.searchConversations = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { search } = req.query;

        const conversations = await query(
            `SELECT c.id, c.last_message_at,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.id
                        ELSE u1.id
                    END as other_user_id,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.first_name
                        ELSE u1.first_name
                    END as other_first_name,
                    CASE 
                        WHEN c.participant_1 = ? THEN u2.last_name
                        ELSE u1.last_name
                    END as other_last_name
             FROM conversations c
             JOIN users u1 ON c.participant_1 = u1.id
             JOIN users u2 ON c.participant_2 = u2.id
             WHERE (c.participant_1 = ? OR c.participant_2 = ?)
             AND (u1.first_name LIKE ? OR u1.last_name LIKE ? 
                  OR u2.first_name LIKE ? OR u2.last_name LIKE ?)
             ORDER BY c.last_message_at DESC`,
            [user_id, user_id, user_id, user_id, user_id, 
             `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        );

        res.json({
            success: true,
            count: conversations.length,
            data: conversations
        });
    } catch (error) {
        console.error('Search conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search conversations',
            error: error.message
        });
    }
};