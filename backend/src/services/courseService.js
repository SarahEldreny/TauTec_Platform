// ============================================================================
// src/services/courseService.js - Course Management Business Logic
// ============================================================================

// سنفترض أن هذه الموديلات موجودة وتغلف الاستعلامات المباشرة
const CourseModel = require('../models/Course'); 
const ModuleModel = require('../models/Module'); 
const LessonModel = require('../models/Lesson'); 
const NotificationModel = require('../models/Notification'); // لإنشاء الإشعارات
const ApiError = require('../middleware/errorHandler').ApiError;

// =======================================================
// 1. دوال عامة (Public Course Browsing)
// =======================================================

/**
 * جلب جميع الدورات المنشورة مع خيارات التصفية والبحث
 */
exports.getAllCourses = async (filters) => {
    // يمكن هنا تضمين منطق إضافي للتحقق من الفلاتر
    
    // يتم تمرير مهمة جلب البيانات المجمعة إلى الموديل
    const courses = await CourseModel.findAllPublished(filters);
    
    // يمكن هنا إجراء معالجة إضافية للبيانات قبل الإرجاع (مثل حساب تقييم متوسط)
    
    return courses;
};

/**
 * جلب تفاصيل دورة واحدة (مع وحداتها ودروسها)
 */
exports.getCourseById = async (courseId, userId = null) => {
    if (!courseId) {
        throw new ApiError(400, 'Course ID is required.');
    }
    
    // يتم جلب جميع تفاصيل الدورة والوحدات والدروس في استعلام مجمّع واحد أو عدة استعلامات منظمة داخل الموديل
    const course = await CourseModel.findDetailsById(courseId);

    if (!course || course.status !== 'published') {
        throw new ApiError(404, 'Course not found or not published.');
    }
    
    // يمكن إضافة منطق للتحقق مما إذا كان المستخدم مسجلاً في الدورة
    if (userId) {
        // const isEnrolled = await EnrollmentModel.checkEnrollment(userId, courseId);
        // course.is_enrolled = isEnrolled;
    }

    return course;
};

// =======================================================
// 2. دوال المدربين (Instructor Course Management)
// =======================================================

/**
 * جلب جميع دورات المدرب
 */
exports.getInstructorCourses = async (instructorId) => {
    if (!instructorId) {
        throw new ApiError(400, 'Instructor ID is required.');
    }

    const courses = await CourseModel.findInstructorCourses(instructorId);
    return courses;
};

/**
 * إنشاء دورة جديدة
 */
exports.createCourse = async (courseData, instructorId) => {
    const { title, description, category, difficulty } = courseData;

    // 1. التحقق من البيانات الأساسية
    if (!title || !description || !category || !difficulty) {
        throw new ApiError(400, 'Title, description, category, and difficulty are required.');
    }
    
    // 2. إنشاء الدورة
    const newCourseId = await CourseModel.create({
        ...courseData,
        instructor_id: instructorId,
        status: 'draft' // تبدأ كمسودة
    });

    // 3. إشعار للمدرب
    await NotificationModel.create(
        instructorId,
        'Course Draft Created',
        `Your course "${title}" has been created successfully as a draft.`,
        'course',
        `/instructor/courses/${newCourseId}`
    );
    
    return { courseId: newCourseId, title };
};

/**
 * تحديث دورة
 */
exports.updateCourse = async (courseId, instructorId, updateData) => {
    // 1. التحقق من ملكية الدورة
    const course = await CourseModel.findById(courseId);

    if (!course || course.instructor_id !== instructorId) {
        throw new ApiError(403, 'You do not have permission to update this course.');
    }
    
    // 2. تحديث الدورة
    await CourseModel.update(courseId, updateData);
    
    // 3. إرجاع الدورة المحدثة
    const updatedCourse = await CourseModel.findById(courseId);
    
    return updatedCourse;
};

/**
 * حذف دورة
 */
exports.deleteCourse = async (courseId, instructorId) => {
    // 1. التحقق من ملكية الدورة
    const course = await CourseModel.findById(courseId);

    if (!course || course.instructor_id !== instructorId) {
        throw new ApiError(403, 'You do not have permission to delete this course.');
    }
    
    // 2. التحقق من التسجيلات (إذا كانت هناك تسجيلات، قد لا نسمح بالحذف)
    // const enrollmentCount = await EnrollmentModel.countByCourse(courseId);
    // if (enrollmentCount > 0) {
    //     throw new ApiError(400, 'Cannot delete course with active enrollments. Consider unpublishing instead.');
    // }

    // 3. الحذف (سلسلة الحذف يجب أن تكون متضمنة في الموديل: الدروس -> الوحدات -> الدورة)
    await CourseModel.delete(courseId);
    
    return true;
};

/**
 * نشر دورة
 */
exports.publishCourse = async (courseId, instructorId) => {
    // 1. التحقق من ملكية الدورة
    const course = await CourseModel.findById(courseId);

    if (!course || course.instructor_id !== instructorId) {
        throw new ApiError(403, 'You do not have permission to publish this course.');
    }
    
    // 2. التحقق من اكتمال المحتوى (على الأقل وحدة واحدة ودرس واحد)
    // const contentCheck = await CourseModel.checkContentCompleteness(courseId);
    // if (!contentCheck.is_complete) {
    //     throw new ApiError(400, 'Course must have at least one module and one lesson before publishing.');
    // }

    // 3. النشر
    await CourseModel.publish(courseId);

    // 4. إشعار المدرب
    await NotificationModel.create(
        instructorId,
        'Course Published',
        `Your course "${course.title}" is now live and available to students!`,
        'course',
        `/courses/${courseId}`
    );
    
    return { title: course.title };
};

// =======================================================
// 3. دوال إدارة المحتوى (Modules & Lessons)
// =======================================================

/**
 * إضافة وحدة جديدة لدورة
 */
exports.addModule = async (courseId, instructorId, moduleData) => {
    const { title, order_index } = moduleData;

    // 1. التحقق من ملكية الدورة ووجودها
    const course = await CourseModel.findById(courseId);

    if (!course || course.instructor_id !== instructorId) {
        throw new ApiError(403, 'Unauthorized to add a module to this course.');
    }
    if (!title || order_index === undefined) {
        throw new ApiError(400, 'Title and order index are required for the module.');
    }
    
    // 2. إضافة الوحدة
    const newModuleId = await ModuleModel.create({
        course_id: courseId,
        title,
        order_index
    });
    
    return { moduleId: newModuleId };
};

/**
 * إضافة درس جديد لوحدة
 */
exports.addLesson = async (moduleId, instructorId, lessonData) => {
    const { title, lesson_type, duration, order_index, video_url } = lessonData;

    // 1. التحقق من وجود الوحدة والملكية (عبر الوحدة ثم الدورة)
    const module = await ModuleModel.findById(moduleId);

    if (!module) {
        throw new ApiError(404, 'Module not found.');
    }
    
    const course = await CourseModel.findById(module.course_id);

    if (course.instructor_id !== instructorId) {
        throw new ApiError(403, 'Unauthorized to add a lesson to this module.');
    }

    if (!title || !lesson_type || order_index === undefined) {
        throw new ApiError(400, 'Title, type, and order index are required for the lesson.');
    }
    
    // 2. إضافة الدرس
    const newLessonId = await LessonModel.create({
        module_id: moduleId,
        ...lessonData
    });
    
    return { lessonId: newLessonId };
};