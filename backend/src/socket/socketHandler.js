// ============================================================================
// src/socket/socketHandler.js - Socket.IO Real-Time Handler
// نظام الرسائل الفورية باستخدام Socket.IO
// ============================================================================

const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');

// Store online users: { oduserId: socketId }
const onlineUsers = new Map();
// Store typing status: { oduserId: { odconversationId, timestamp } }
const typingUsers = new Map();

/**
 * Initialize Socket.IO with authentication and event handlers
 * @param {Server} io - Socket.IO server instance
 */
function initializeSocket(io) {
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id;
            const user = await queryOne(
                'SELECT id, first_name, last_name, role FROM users WHERE id = ? AND is_active = TRUE',
                [userId]
            );

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket auth error:', error.message);
            next(new Error('Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        const userId = socket.user.id;
        console.log(`🔌 User connected: ${socket.user.first_name} (ID: ${userId})`);

        // Add to online users
        onlineUsers.set(userId, socket.id);

        // Broadcast online status
        socket.broadcast.emit('user_online', {
            userId,
            name: `${socket.user.first_name} ${socket.user.last_name}`,
            online: true
        });

        // Send current online users to newly connected user
        socket.emit('online_users', Array.from(onlineUsers.keys()));

        // =============================================
        // JOIN CONVERSATION
        // =============================================
        socket.on('join_conversation', async (conversationId) => {
            try {
                // Verify user is part of conversation
                const conversation = await queryOne(
                    'SELECT id FROM conversations WHERE id = ? AND (participant_1 = ? OR participant_2 = ?)',
                    [conversationId, userId, userId]
                );

                if (conversation) {
                    socket.join(`conversation_${conversationId}`);
                    console.log(`👥 User ${userId} joined conversation ${conversationId}`);
                }
            } catch (error) {
                console.error('Join conversation error:', error);
            }
        });

        // =============================================
        // SEND MESSAGE (Real-Time)
        // =============================================
        socket.on('send_message', async (data) => {
            try {
                const { receiverId, messageText, conversationId } = data;

                if (!receiverId || !messageText) {
                    return socket.emit('error', { message: 'Missing required fields' });
                }

                // Get or create conversation
                let convId = conversationId;
                if (!convId) {
                    let conv = await queryOne(
                        `SELECT id FROM conversations 
                         WHERE (participant_1 = ? AND participant_2 = ?) 
                            OR (participant_1 = ? AND participant_2 = ?)`,
                        [userId, receiverId, receiverId, userId]
                    );

                    if (!conv) {
                        const result = await query(
                            'INSERT INTO conversations (participant_1, participant_2) VALUES (?, ?)',
                            [userId, receiverId]
                        );
                        convId = result.insertId;
                    } else {
                        convId = conv.id;
                    }
                }

                // Insert message
                const result = await query(
                    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text)
                     VALUES (?, ?, ?, ?)`,
                    [convId, userId, receiverId, messageText]
                );

                // Update conversation timestamp
                await query(
                    'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
                    [convId]
                );

                // Create message object
                const message = {
                    id: result.insertId,
                    conversation_id: convId,
                    sender_id: userId,
                    receiver_id: receiverId,
                    message_text: messageText,
                    sent_at: new Date().toISOString(),
                    is_read: false,
                    sender_first_name: socket.user.first_name,
                    sender_last_name: socket.user.last_name
                };

                // Send to conversation room
                io.to(`conversation_${convId}`).emit('new_message', message);

                // If receiver is online but not in conversation room, send notification
                const receiverSocketId = onlineUsers.get(parseInt(receiverId));
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('message_notification', {
                        conversationId: convId,
                        senderId: userId,
                        senderName: `${socket.user.first_name} ${socket.user.last_name}`,
                        preview: messageText.substring(0, 50)
                    });
                }

                // Confirm to sender
                socket.emit('message_sent', {
                    success: true,
                    messageId: result.insertId,
                    conversationId: convId
                });

                console.log(`📨 Message sent: ${userId} -> ${receiverId}`);
            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // =============================================
        // TYPING INDICATOR
        // =============================================
        socket.on('typing_start', (data) => {
            const { conversationId, receiverId } = data;
            typingUsers.set(userId, { conversationId, timestamp: Date.now() });

            // Broadcast to conversation
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                userId,
                name: socket.user.first_name,
                conversationId,
                isTyping: true
            });

            // Also send directly to receiver if online
            const receiverSocketId = onlineUsers.get(parseInt(receiverId));
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', {
                    userId,
                    name: socket.user.first_name,
                    conversationId,
                    isTyping: true
                });
            }
        });

        socket.on('typing_stop', (data) => {
            const { conversationId, receiverId } = data;
            typingUsers.delete(userId);

            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                userId,
                name: socket.user.first_name,
                conversationId,
                isTyping: false
            });

            const receiverSocketId = onlineUsers.get(parseInt(receiverId));
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('user_typing', {
                    userId,
                    conversationId,
                    isTyping: false
                });
            }
        });

        // =============================================
        // READ RECEIPTS
        // =============================================
        socket.on('mark_read', async (data) => {
            try {
                const { conversationId, senderId } = data;

                // Update messages as read
                await query(
                    'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id = ? AND receiver_id = ?',
                    [conversationId, senderId, userId]
                );

                // Notify sender
                const senderSocketId = onlineUsers.get(parseInt(senderId));
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messages_read', {
                        conversationId,
                        readBy: userId
                    });
                }

                console.log(`✅ Messages marked read: conversation ${conversationId}`);
            } catch (error) {
                console.error('Mark read error:', error);
            }
        });

        // =============================================
        // GET ONLINE STATUS
        // =============================================
        socket.on('check_online', (userIds) => {
            const onlineStatus = {};
            userIds.forEach(id => {
                onlineStatus[id] = onlineUsers.has(parseInt(id));
            });
            socket.emit('online_status', onlineStatus);
        });

        // =============================================
        // DISCONNECT
        // =============================================
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.user.first_name} (ID: ${userId})`);

            onlineUsers.delete(userId);
            typingUsers.delete(userId);

            // Broadcast offline status
            socket.broadcast.emit('user_offline', {
                userId,
                online: false
            });
        });
    });

    // Cleanup stale typing indicators every 5 seconds
    setInterval(() => {
        const now = Date.now();
        for (const [userId, data] of typingUsers.entries()) {
            if (now - data.timestamp > 5000) {
                typingUsers.delete(userId);
            }
        }
    }, 5000);

    console.log('🔌 Socket.IO initialized');
}

module.exports = { initializeSocket, onlineUsers };
