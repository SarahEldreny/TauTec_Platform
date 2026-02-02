// ============================================================================
// src/models/Message.js - Messaging Data Access Layer
// يتعامل مع جداول conversations, messages
// ============================================================================

const { query, queryOne } = require('../config/database');

// =======================================================
// 1. دوال المحادثات (Conversations)
// =======================================================

/**
 * جلب أو إنشاء محادثة بين مستخدمين
 * @returns {number} - مُعرف المحادثة (conversationId)
 */
exports.getOrCreateConversation = async (user1Id, user2Id) => {
    // حاول البحث عن محادثة موجودة (بأي ترتيب للمشاركين)
    let conversation = await queryOne(
        `SELECT id FROM conversations 
         WHERE (participant_1 = ? AND participant_2 = ?) 
            OR (participant_1 = ? AND participant_2 = ?)`,
        [user1Id, user2Id, user2Id, user1Id]
    );

    if (conversation) {
        return conversation.id;
    }

    // إذا لم توجد، قم بإنشاء محادثة جديدة
    const result = await query(
        'INSERT INTO conversations (participant_1, participant_2) VALUES (?, ?)',
        [user1Id, user2Id]
    );
    return result.insertId;
};

/**
 * جلب جميع محادثات المستخدم مع تفاصيل الطرف الآخر
 */
exports.findUserConversations = async (userId, search = '') => {
    // استخدم الاستعلام المعقد هنا
    let sql = `
        SELECT c.id, c.last_message_at,
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
               u2.profile_picture AS other_profile_picture,
               (SELECT COUNT(id) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = FALSE) AS unread_count
        FROM conversations c
        JOIN users u1 ON c.participant_1 = u1.id
        JOIN users u2 ON c.participant_2 = u2.id
        WHERE (c.participant_1 = ? OR c.participant_2 = ?)
    `;
    const params = [userId, userId, userId, userId, userId, userId];

    if (search) {
        // فلترة بالاسم الأول أو الأخير للطرف الآخر (تتطلب 4 مُعطيات إضافية)
        sql += ` AND (
            (c.participant_1 = ? AND (u2.first_name LIKE ? OR u2.last_name LIKE ?)) 
            OR 
            (c.participant_2 = ? AND (u1.first_name LIKE ? OR u1.last_name LIKE ?))
        )`;
        params.push(userId, `%${search}%`, `%${search}%`, userId, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY c.last_message_at DESC';

    // نلاحظ أن الكنترولر الأصلي يستخدم بحث أبسط، يمكننا تعديله لاحقاً ليتوافق مع هذا الاستعلام الأمثل
    return await query(sql, params);
};


// =======================================================
// 2. دوال الرسائل (Messages)
// =======================================================

/**
 * إرسال رسالة جديدة
 */
exports.createMessage = async (conversationId, senderId, receiverId, messageText) => {
    const sql = 'INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text) VALUES (?, ?, ?, ?)';
    const result = await query(sql, [conversationId, senderId, receiverId, messageText]);

    // تحديث وقت آخر رسالة في المحادثة
    await query('UPDATE conversations SET last_message_at = NOW() WHERE id = ?', [conversationId]);
    
    return result.insertId;
};

/**
 * جلب جميع رسائل محادثة
 */
exports.getMessagesByConversation = async (conversationId) => {
    const sql = `
        SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.sent_at ASC
    `;
    return await query(sql, [conversationId]);
};

/**
 * وسم رسالة كمقروءة
 */
exports.markAsRead = async (messageId, userId) => {
    // التأكد من أن الرسالة تخص المستخدم (هو المستقبل)
    const sql = 'UPDATE messages SET is_read = TRUE WHERE id = ? AND receiver_id = ? AND is_read = FALSE';
    const result = await query(sql, [messageId, userId]);
    return result.affectedRows > 0;
};

/**
 * جلب عدد الرسائل غير المقروءة للمستخدم
 */
exports.getUnreadCount = async (userId) => {
    const result = await queryOne('SELECT COUNT(id) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE', [userId]);
    return result ? result.count : 0;
};