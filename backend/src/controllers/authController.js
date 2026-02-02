// ============================================================================
// src/controllers/authController.js - Refactored to use AuthService
// ============================================================================

// استبدال الاستدعاءات المباشرة (query, queryOne, bcrypt, crypto) بخدمة المصادقة
const authService = require('../services/authService');
const { ApiError } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken'); // نحافظ عليها لدالة توليد الرمز فقط

// =======================================================
// 1. دالة مساعدة: توليد رمز JWT
// =======================================================

/**
 * ملاحظة: هذه الدالة تم نقلها الآن إلى authService لتوحيد منطق إنشاء الرمز.
 * سنقوم بإزالتها من المتحكم، ولكن لكي لا يحدث كسر في أجزاء قديمة في المتحكم لم يتبق منها في الـ snippet، سنبقيها مع التعديل على استخدامها داخل المتحكم
 * (في الواقع العملي، يجب أن تكون هذه الدالة في Service أو Util)
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// =======================================================
// 2. دوال المصادقة
// =======================================================

// تسجيل مستخدم جديد
exports.register = async (req, res) => {
    try {
        // تم نقل جميع منطق التحقق والـ Hashing والـ DB إلى الـ Service
        const { user, token } = await authService.register(req.body);

        res.status(201).json({
            success: true,
            message: 'Registration successful. Verification email sent.',
            data: { user, token }
        });
    } catch (error) {
        // إذا كان الخطأ من نوع ApiError، سيتم التقاطه بواسطة الـ errorHandler
        // إذا لم يكن كذلك، سيتم رمي الخطأ إلى الـ next()
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to register user'
        });
    }
};

// تسجيل دخول المستخدم
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // تم نقل جميع منطق التحقق والمقارنة والـ DB إلى الـ Service
        const { user, token } = await authService.login(email, password);

        res.json({
            success: true,
            message: 'Login successful',
            data: { user, token }
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Login failed'
        });
    }
};

// التحقق من البريد الإلكتروني
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        await authService.verifyEmail(token);

        res.json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to verify email'
        });
    }
};

// =======================================================
// 3. دوال الملف الشخصي
// =======================================================

// جلب الملف الشخصي
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id; // يتم جلب الـ ID من التوكن (JWT) عبر الـ Middleware

        const userProfile = await authService.getProfile(userId);

        res.json({
            success: true,
            data: userProfile
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch profile'
        });
    }
};

// تحديث الملف الشخصي
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        // نمرر البيانات مباشرة إلى الـ Service
        const updatedProfile = await authService.updateProfile(userId, req.body);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedProfile
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update profile'
        });
    }
};

// تسجيل الخروج (يظل بسيطًا لأنه يعتمد على مسح الرمز من طرف العميل)
exports.logout = (req, res) => {
    // في حالة JWT، تسجيل الخروج هو ببساطة إخبار العميل بمسح الرمز المخزن
    res.json({
        success: true,
        message: 'Logged out successfully (Please delete the client-side token).'
    });
};

// تغيير كلمة المرور
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        await authService.changePassword(userId, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to change password'
        });
    }
};

// تسجيل الخروج من جميع الأجهزة
exports.logoutAllDevices = async (req, res) => {
    try {
        const userId = req.user.id;

        await authService.logoutAllDevices(userId);

        res.json({
            success: true,
            message: 'Logged out from all devices successfully. Please log in again.'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to logout from all devices'
        });
    }
};