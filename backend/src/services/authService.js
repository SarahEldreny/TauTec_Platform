// ============================================================================
// src/services/authService.js - Authentication & Profile Business Logic
// ============================================================================

const UserModel = require('../models/User'); // سنفترض وجود هذا الموديل
const NotificationModel = require('../models/Notification'); // لإنشاء إشعارات عند التسجيل أو التحديث
const ApiError = require('../middleware/errorHandler').ApiError;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// =======================================================
// 1. دوال مساعدة (Utils)
// =======================================================

/**
 * إنشاء رمز (Token) لتسجيل الدخول
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// =======================================================
// 2. دوال المصادقة (Auth)
// =======================================================

/**
 * تسجيل مستخدم جديد
 */
exports.register = async (userData) => {
    const { email, password, role, first_name, last_name } = userData;

    // 1. التحقق من الحقول الإلزامية
    if (!email || !password || !role || !first_name || !last_name) {
        throw new ApiError(400, 'Please provide all required fields.');
    }

    // 2. التحقق من وجود المستخدم
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
        throw new ApiError(409, 'Email already registered.');
    }

    // 3. تشفير كلمة المرور وتوليد رمز التحقق
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // 4. إنشاء المستخدم في قاعدة البيانات
    const userId = await UserModel.create({
        ...userData,
        password: hashedPassword,
        verification_token: verificationToken,
        is_active: true // لتسهيل الاختبار، سنعتبره مفعّلاً بشكل افتراضي
    });

    // 5. إرسال إشعار للمستخدم الجديد (افتراض إرسال إيميل تحقق)
    // *يجب هنا استدعاء دالة إرسال الإيميل الحقيقية، لكن سنعتمد على الإشعارات كنموذج*
    await NotificationModel.create(
        userId,
        'Welcome to TauTec!',
        `Your account has been successfully created. Please verify your email using the link: ${process.env.FRONTEND_URL}/verify-email/${verificationToken}`,
        'account'
    );
    
    // 6. إرجاع بيانات المستخدم والرمز
    const user = await UserModel.findById(userId);

    return {
        user: user,
        token: generateToken(userId, role)
    };
};

/**
 * تسجيل دخول المستخدم
 */
exports.login = async (email, password) => {
    // 1. جلب المستخدم
    const user = await UserModel.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new ApiError(401, 'Invalid credentials.');
    }

    // 2. التحقق من حالة التفعيل
    if (!user.is_active) {
        throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }

    // 3. تحديث آخر تسجيل دخول
    await UserModel.updateLastLogin(user.id);
    
    // 4. إرجاع بيانات المستخدم والرمز
    const token = generateToken(user.id, user.role);

    return {
        user: {
             id: user.id, email: user.email, role: user.role, 
             first_name: user.first_name, last_name: user.last_name 
        },
        token: token
    };
};

/**
 * التحقق من البريد الإلكتروني باستخدام الرمز
 */
exports.verifyEmail = async (token) => {
    const user = await UserModel.findByVerificationToken(token);

    if (!user) {
        throw new ApiError(400, 'Invalid or expired verification token.');
    }

    if (user.is_verified) {
        throw new ApiError(400, 'Email is already verified.');
    }

    // تفعيل المستخدم ومسح الرمز
    await UserModel.verifyUser(user.id);

    return true;
};

// =======================================================
// 3. دوال إدارة الملف الشخصي (Profile)
// =======================================================

/**
 * جلب الملف الشخصي للمستخدم
 */
exports.getProfile = async (userId) => {
    const user = await UserModel.findById(userId);

    if (!user) {
        // بالعادة هذا الخطأ لا يجب أن يحدث إذا كان الـ Middleware يعمل بشكل صحيح
        throw new ApiError(404, 'User profile not found.');
    }

    // إزالة كلمة المرور والرموز الحساسة قبل الإرجاع
    delete user.password;
    delete user.verification_token;
    delete user.reset_password_token;
    delete user.reset_password_expire;
    
    return user;
};

/**
 * تحديث الملف الشخصي للمستخدم
 */
exports.updateProfile = async (userId, profileData) => {
    const user = await UserModel.findById(userId);

    if (!user) {
        throw new ApiError(404, 'User profile not found.');
    }
    
    // يمكن إضافة منطق التحقق من البيانات هنا
    
    await UserModel.update(userId, profileData);

    // إرجاع البيانات الجديدة
    return await this.getProfile(userId);
};