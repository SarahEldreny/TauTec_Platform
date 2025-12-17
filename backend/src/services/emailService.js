// ============================================================================
// src/services/emailService.js - Email Sending Utility
// يعتمد على Nodemailer لإرسال الإيميلات (مثل التحقق، إعادة تعيين كلمة المرور)
// ============================================================================

const nodemailer = require('nodemailer');

// 1. إعداد الناقل (Transporter) باستخدام بيانات .env
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true لـ 465 (SSL)، false لبورت 587 (TLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * دالة لإرسال بريد التحقق من البريد الإلكتروني
 * @param {string} toEmail - البريد الإلكتروني للمستلم
 * @param {string} verificationLink - الرابط الكامل للتحقق
 * @param {string} name - اسم المستلم
 */
exports.sendVerificationEmail = async (toEmail, verificationLink, name) => {
    
    // إنشاء محتوى الإيميل
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'TauTec Platform <noreply@tautec.com>', // مرسل من .env
        to: toEmail,
        subject: '💡 تفعيل حسابك في منصة TauTec',
        html: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; background-color: #f4f4f4; padding: 20px;">
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd;">
                    <h2 style="color: #6366f1;">مرحباً ${name}،</h2>
                    <p style="font-size: 16px; color: #333;">شكراً لتسجيلك في منصة TauTec. لتفعيل حسابك والبدء في الاستفادة من الدورات والمشاريع، يرجى النقر على الرابط أدناه:</p>
                    
                    <a href="${verificationLink}" 
                       style="display: inline-block; padding: 10px 20px; margin: 20px 0; font-size: 16px; color: #ffffff; background-color: #6366f1; border-radius: 5px; text-decoration: none;">
                        تأكيد الحساب الآن
                    </a>
                    
                    <p style="font-size: 14px; color: #555;">إذا لم تكن أنت من طلب التسجيل، يمكنك تجاهل هذه الرسالة بأمان.</p>
                    <p style="font-size: 14px; color: #555;">مع تحيات فريق TauTec.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email verification sent successfully to: ${toEmail}`);
        return true;
    } catch (error) {
        // إذا فشل الإرسال، يُفضل تسجيله ولكن قد لا نرمي خطأ حاد
        console.error(`ERROR: Failed to send verification email to ${toEmail}.`, error);
        // يمكنك هنا اختيار Throw Error إذا كان فشل إرسال الإيميل هو فشل حاسم لعملية التسجيل.
        return false;
    }
};

// يمكن إضافة دوال أخرى: sendResetPasswordEmail, sendNotificationEmail, إلخ.