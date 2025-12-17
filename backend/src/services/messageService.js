// ============================================================================
// src/services/messageService.js - Messaging Business Logic Layer
// ============================================================================

const MessageModel = require('../models/Message');
const UserModel = require('../models/User'); 
const NotificationModel = require('../models/Notification'); 
const ApiError = require('../middleware/errorHandler').ApiError;

// =======================================================
// 1. دوال الإرسال والاستقبال
// =======================================================

/**
 * إرسال رسالة جديدة
 */
exports.sendMessage = async (senderId, receiverId, messageText) => {
    // 1. التحقق من وجود المستلم
    const receiver = await UserModel.findById(receiverId);

    if (!receiver || !receiver.is_active) {
        throw new ApiError(404, 'Receiver not found or inactive.');
    }
    
    if (senderId === receiverId) {
        throw new ApiError(400, 'Cannot send a message to yourself.');
    }

    // 2. جلب أو إنشاء محادثة
    const conversationId = await MessageModel.getOrCreateConversation(senderId, receiverId);

    // 3. إرسال الرسالة
    const messageId = await MessageModel.createMessage(conversationId, senderId, receiverId, messageText);

    // 4. إنشاء إشعار للمستلم
    await NotificationModel.create(
        receiverId,
        'New Message',
        `You received a new message.`, // يمكن تخصيصها باسم المرسل
        'message',
        `/messages/${conversationId}`
    );

    return messageId;
};

/**
 * جلب جميع محادثات المستخدم
 */
exports.getUserConversations = async (userId, search) => {
    return await MessageModel.findUserConversations(userId, search);
};

/**
 * جلب رسائل محادثة معينة ووسمها كمقروءة للمستخدم
 */
exports.getConversationMessages = async (conversationId, userId) => {
    // *افتراض: وجود دالة getConversationById في MessageModel لجلب تفاصيل المحادثة*
    const conversation = await MessageModel.getConversationById(conversationId); 
    
    if (!conversation) {
        throw new ApiError(404, 'Conversation not found.');
    }
    
    if (conversation.participant_1 !== userId && conversation.participant_2 !== userId) {
        throw new ApiError(403, 'Access denied to this conversation.');
    }

    // 1. جلب الرسائل
    const messages = await MessageModel.getMessagesByConversation(conversationId);
    
    // 2. وسم جميع الرسائل التي أرسلها الطرف الآخر كـ "مقروءة"
    for (const message of messages) {
        if (message.receiver_id === userId && !message.is_read) {
            await MessageModel.markAsRead(message.id, userId);
        }
    }
    
    return messages;
};

// =======================================================
// 2. دوال الإحصائيات
// =======================================================

/**
 * جلب عدد الرسائل غير المقروءة للمستخدم
 */
exports.getUnreadCount = async (userId) => {
    return await MessageModel.getUnreadCount(userId);
};