// ============================================================================
// src/services/studentService.js - Student Business Logic Layer
// ============================================================================

const CourseModel = require('../models/Course');
const EnrollmentModel = require('../models/Enrollment');
const NotificationModel = require('../models/Notification');
const ApiError = require('../middleware/errorHandler').ApiError;

// =======================================================
// 1. دوال التسجيل والتقدم
// =======================================================

/**
 * تسجيل الطالب في دورة معينة
 */
exports.enrollInCourse = async (studentId, courseId) => {
    // 1. التحقق من وجود الدورة وحالتها
    const course = await CourseModel.findById(courseId);
    if (!course || course.status !== 'published') {
        throw new ApiError(404, 'Course not found or not available for enrollment.');
    }

    // 2. التحقق من وجود تسجيل سابق
    const existingEnrollment = await EnrollmentModel.findByStudentAndCourse(studentId, courseId);
    if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
            throw new ApiError(400, 'Already actively enrolled in this course.');
        }
        // يمكن معالجة حالة إذا كانت الحالة 'cancelled' أو 'completed' هنا
    }
    
    // *هنا يمكن إضافة منطق الدفع إذا كانت الدورة مدفوعة*

    // 3. إنشاء التسجيل
    await EnrollmentModel.createEnrollment(studentId, courseId);
    
    // 4. إشعار المدرب والطالب
    await NotificationModel.create(
        studentId,
        'Enrollment Successful',
        `You have successfully enrolled in "${course.title}".`,
        'enrollment',
        `/courses/${courseId}`
    );
    await NotificationModel.create(
        course.instructor_id,
        'New Student Enrolled',
        `${studentId} enrolled in your course: "${course.title}".`,
        'enrollment',
        `/instructor/courses/${courseId}/students`
    );

    return course;
};

/**
 * جلب جميع الدورات المسجل بها الطالب
 */
exports.getEnrolledCourses = async (studentId) => {
    // يمكن هنا جلب الدورات وتفاصيل التقدم لكل دورة
    const enrolledCourses = await EnrollmentModel.getEnrolledCoursesByStudent(studentId);
    
    // جلب التقدم لكل دورة (عملية مكلفة، قد تحتاج لتحسين في الإنتاج)
    for (const course of enrolledCourses) {
        const progressData = await EnrollmentModel.getCourseProgress(studentId, course.id);
        course.progress = progressData.progress; // نسبة الإنجاز
    }
    
    return enrolledCourses;
};

/**
 * جلب تقدم الطالب في دورة معينة
 */
exports.getCourseProgress = async (studentId, courseId) => {
    // التحقق من أن الطالب مسجل في الدورة أولاً
    const enrollment = await EnrollmentModel.findByStudentAndCourse(studentId, courseId);
    if (!enrollment || enrollment.status !== 'active') {
        throw new ApiError(403, 'You are not actively enrolled in this course.');
    }
    
    // جلب بنية الدورة
    const structure = await CourseModel.getCourseStructure(courseId);
    
    // جلب التقدم العام
    const overallProgress = await EnrollmentModel.getCourseProgress(studentId, courseId);

    // *هنا يمكن إضافة منطق تتبع التقدم الفردي (Progress Tracking)*
    // 
    
    return {
        overallProgress,
        structure // البنية مع تفاصيل ما إذا كان كل درس مكتمل أم لا
    };
};

/**
 * تسجيل إكمال الطالب لدرس معين
 */
exports.completeLesson = async (studentId, lessonId, timeSpent) => {
    // 1. التحقق من أن الدرس موجود وينتمي لدورة مسجل بها الطالب
    const lessonDetails = await CourseModel.getLessonDetails(lessonId); // *افتراض: وجود دالة getLessonDetails في CourseModel*
    
    if (!lessonDetails) {
        throw new ApiError(404, 'Lesson not found.');
    }

    const enrollment = await EnrollmentModel.findByStudentAndCourse(studentId, lessonDetails.course_id);
    if (!enrollment || enrollment.status !== 'active') {
        // يمكن السماح إذا كان الدرس مجاني (lessonDetails.is_free)
        if (!lessonDetails.is_free) {
             throw new ApiError(403, 'Enrollment required to complete this lesson.');
        }
    }
    
    // 2. تسجيل الإكمال
    const isFirstCompletion = await EnrollmentModel.completeLesson(studentId, lessonId, timeSpent);
    
    if (isFirstCompletion) {
        // 3. إشعار عند إكمال درس لأول مرة (اختياري)
        // يمكن هنا أيضاً التحقق من إكمال الوحدة أو الدورة بأكملها
        await NotificationModel.create(
            studentId, 
            'Lesson Completed', 
            `You completed the lesson "${lessonDetails.title}".`, 
            'progress'
        );
        return 'Lesson completed successfully for the first time.';
    }
    
    return 'Lesson progress updated.';
};

// =======================================================
// 2. دوال الواجبات (Assignments) - (ملاحظة: نحتاج موديل Assignment/Submission لاحقًا)
// =======================================================

// *سنبقي هذا القسم فارغًا حالياً لأنه يتطلب موديل جديد (AssignmentModel/SubmissionModel)*
// ولكن في مرحلة لاحقة، سنضع هنا دوال مثل:
// exports.getStudentAssignments = async (studentId) => {...}
// exports.submitAssignment = async (studentId, assignmentId, filePath) => {...}