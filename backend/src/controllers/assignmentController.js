// ============================================================================
// src/controllers/assignmentController.js - Assignment Controller
// التحكم في عمليات الواجبات
// ============================================================================

const AssignmentModel = require('../models/Assignment');
const SubmissionModel = require('../models/Submission');
const { ApiError } = require('../middleware/errorHandler');

/**
 * إنشاء واجب جديد
 */
exports.createAssignment = async (req, res, next) => {
    try {
        const { course_id, title, description, due_date, max_score } = req.body;
        const instructorId = req.user.id;

        // التحقق من البيانات المطلوبة
        if (!course_id || !title || !description || !due_date || !max_score) {
            return next(new ApiError(400, 'جميع الحقول مطلوبة'));
        }

        // إنشاء الواجب
        const assignmentId = await AssignmentModel.create({
            course_id,
            title,
            description,
            due_date,
            max_score,
            created_by: instructorId
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الواجب بنجاح',
            assignmentId
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على واجبات دورة معينة
 */
exports.getAssignmentsByCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        if (!courseId) {
            return next(new ApiError(400, 'معرف الدورة مطلوب'));
        }

        const assignments = await AssignmentModel.findByCourseId(courseId);

        res.status(200).json({
            success: true,
            data: assignments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على واجبات المدرس
 */
exports.getInstructorAssignments = async (req, res, next) => {
    try {
        const instructorId = req.user.id;

        const assignments = await AssignmentModel.findByInstructorId(instructorId);

        res.status(200).json({
            success: true,
            data: assignments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على تفاصيل واجب معين
 */
exports.getAssignmentDetails = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        const assignment = await AssignmentModel.findById(assignmentId);

        if (!assignment) {
            return next(new ApiError(404, 'الواجب غير موجود'));
        }

        const stats = await AssignmentModel.getStats(assignmentId);

        res.status(200).json({
            success: true,
            data: { ...assignment, stats }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * تحديث واجب
 */
exports.updateAssignment = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const { title, description, due_date, max_score } = req.body;
        const instructorId = req.user.id;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        // التحقق من أن المدرس هو منشئ الواجب
        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment || assignment.created_by !== instructorId) {
            return next(new ApiError(403, 'ليس لديك صلاحية لتعديل هذا الواجب'));
        }

        await AssignmentModel.update(assignmentId, {
            title,
            description,
            due_date,
            max_score
        });

        res.status(200).json({
            success: true,
            message: 'تم تحديث الواجب بنجاح'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * حذف واجب
 */
exports.deleteAssignment = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const instructorId = req.user.id;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        // التحقق من أن المدرس هو منشئ الواجب
        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment || assignment.created_by !== instructorId) {
            return next(new ApiError(403, 'ليس لديك صلاحية لحذف هذا الواجب'));
        }

        await AssignmentModel.delete(assignmentId);

        res.status(200).json({
            success: true,
            message: 'تم حذف الواجب بنجاح'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * تقديم واجب (student submission)
 */
exports.submitAssignment = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const studentId = req.user.id;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        if (!req.file) {
            return next(new ApiError(400, 'يجب رفع ملف'));
        }

        // التحقق من وجود الواجب
        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment) {
            return next(new ApiError(404, 'الواجب غير موجود'));
        }

        // التحقق من تاريخ الاستحقاق
        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        const isLate = now > dueDate;

        // إنشاء التسليم
        const submissionId = await SubmissionModel.create({
            assignment_id: assignmentId,
            student_id: studentId,
            file_path: req.file.filename
        });

        res.status(201).json({
            success: true,
            message: isLate ? 'تم تقديم الواجب بتأخير' : 'تم تقديم الواجب بنجاح',
            submissionId,
            isLate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على تسليمات واجب معين
 */
exports.getSubmissions = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const instructorId = req.user.id;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        // التحقق من أن المدرس لديه صلاحية عرض التسليمات
        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment || assignment.created_by !== instructorId) {
            return next(new ApiError(403, 'ليس لديك صلاحية لعرض هذه التسليمات'));
        }

        const submissions = await SubmissionModel.findByAssignmentId(assignmentId);

        res.status(200).json({
            success: true,
            data: submissions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على التسليمات التي لم يتم تقييمها
 */
exports.getUngradedSubmissions = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const instructorId = req.user.id;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        // التحقق من الصلاحيات
        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment || assignment.created_by !== instructorId) {
            return next(new ApiError(403, 'ليس لديك صلاحية'));
        }

        const submissions = await SubmissionModel.findUngraded(assignmentId);

        res.status(200).json({
            success: true,
            data: submissions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * تقييم تسليم
 */
exports.gradeSubmission = async (req, res, next) => {
    try {
        const { submissionId } = req.params;
        const { score, feedback } = req.body;
        const instructorId = req.user.id;

        if (!submissionId) {
            return next(new ApiError(400, 'معرف التسليم مطلوب'));
        }

        if (score === undefined || feedback === undefined) {
            return next(new ApiError(400, 'الدرجة والملاحظات مطلوبة'));
        }

        // التحقق من صحة الدرجة
        if (score < 0 || isNaN(score)) {
            return next(new ApiError(400, 'الدرجة يجب أن تكون موجبة'));
        }

        // التحقق من وجود التسليم والتحقق من الصلاحيات
        const submission = await SubmissionModel.findById(submissionId);
        if (!submission) {
            return next(new ApiError(404, 'التسليم غير موجود'));
        }

        if (submission.created_by !== instructorId) {
            return next(new ApiError(403, 'ليس لديك صلاحية لتقييم هذا التسليم'));
        }

        // التحقق من عدم تجاوز الدرجة الحد الأقصى
        if (score > submission.max_score) {
            return next(new ApiError(400, `الدرجة لا يمكن أن تتجاوز ${submission.max_score}`));
        }

        await SubmissionModel.updateGrade(submissionId, {
            score,
            feedback
        });

        res.status(200).json({
            success: true,
            message: 'تم تقييم التسليم بنجاح'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على درجات الطالب
 */
exports.getStudentGrades = async (req, res, next) => {
    try {
        const studentId = req.user.id;
        const { courseId } = req.params;

        if (!courseId) {
            return next(new ApiError(400, 'معرف الدورة مطلوب'));
        }

        // جلب الواجبات والتسليمات الخاصة بالطالب
        const assignments = await AssignmentModel.findByCourseId(courseId);

        const gradesData = await Promise.all(
            assignments.map(async (assignment) => {
                const submission = await SubmissionModel.findByStudentAndAssignment(
                    assignment.id,
                    studentId
                );
                return {
                    ...assignment,
                    submission: submission || null
                };
            })
        );

        res.status(200).json({
            success: true,
            data: gradesData
        });
    } catch (error) {
        next(error);
    }
};

/**
 * الحصول على إحصائيات الواجب
 */
exports.getAssignmentStats = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const instructorId = req.user.id;

        if (!assignmentId) {
            return next(new ApiError(400, 'معرف الواجب مطلوب'));
        }

        // التحقق من الصلاحيات
        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment || assignment.created_by !== instructorId) {
            return next(new ApiError(403, 'ليس لديك صلاحية'));
        }

        const stats = await AssignmentModel.getStats(assignmentId);
        const submissionStats = await SubmissionModel.getStats(assignmentId);

        res.status(200).json({
            success: true,
            data: { ...stats, ...submissionStats }
        });
    } catch (error) {
        next(error);
    }
};
