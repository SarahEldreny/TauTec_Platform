// ============================================================================
// src/services/projectService.js - Project Business Logic Layer (Client & Admin)
// ============================================================================

const ProjectModel = require('../models/Project');
const NotificationModel = require('../models/Notification');
const UserModel = require('../models/User'); // سنفترض وجود هذا الموديل
const ApiError = require('../middleware/errorHandler').ApiError;

// =======================================================
// 1. دوال العملاء (Client)
// =======================================================

/**
 * إنشاء طلب مشروع جديد
 */
exports.createProject = async (clientId, projectData) => {
    const { title, description } = projectData;

    if (!title || !description) {
        throw new ApiError(400, 'Title and description are required.');
    }

    // 1. إنشاء المشروع
    const projectId = await ProjectModel.create({ client_id: clientId, ...projectData });

    // 2. إشعار المشرفين (Admins) بوجود طلب جديد
    const admins = await UserModel.findUsersByRole('admin'); 
    const client = await UserModel.findById(clientId);

    if (admins && client) {
        for (const admin of admins) {
            await NotificationModel.create(
                admin.id,
                'New Project Request',
                `New project request from client ${client.first_name} ${client.last_name}: "${title}".`,
                'project',
                `/admin/projects/${projectId}`
            );
        }
    }
    
    return projectId;
};

/**
 * جلب جميع مشاريع العميل
 */
exports.getClientProjects = async (clientId) => {
    return await ProjectModel.findByClient(clientId);
};

/**
 * جلب مشروع واحد والتحقق من ملكيته للعميل
 */
exports.getProjectById = async (projectId, clientId) => {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
        throw new ApiError(404, 'Project not found.');
    }

    if (project.client_id !== clientId) {
        throw new ApiError(403, 'Access denied. You do not own this project.');
    }

    // جلب آخر تقرير (Feedback)
    project.latest_feedback = await ProjectModel.getLatestFeedback(projectId);
    
    return project;
};

/**
 * تحديث بيانات المشروع (مسموح به فقط إذا كانت الحالة 'submitted' أو 'revising')
 */
exports.updateProject = async (projectId, clientId, projectData) => {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
        throw new ApiError(404, 'Project not found.');
    }

    if (project.client_id !== clientId) {
        throw new ApiError(403, 'Access denied. You do not own this project.');
    }
    
    if (project.status !== 'submitted' && project.status !== 'revising') {
        throw new ApiError(400, `Cannot update project in '${project.status}' status.`);
    }

    await ProjectModel.update(projectId, projectData);
    return true;
};

/**
 * جلب إحصائيات لوحة تحكم العميل
 */
exports.getClientDashboardStats = async (clientId) => {
    const projects = await ProjectModel.findByClient(clientId);
    const stats = projects.reduce((acc, project) => {
        if (project.status === 'submitted') acc.submitted++;
        if (project.status === 'in_progress') acc.in_progress++;
        if (project.status === 'completed') acc.completed++;
        return acc;
    }, { submitted: 0, in_progress: 0, completed: 0, latest_grade: 'N/A' });
    
    const latestCompleted = projects.find(p => p.status === 'completed');
    if (latestCompleted) {
         const feedback = await ProjectModel.getLatestFeedback(latestCompleted.id);
         if (feedback) stats.latest_grade = feedback.grade;
    }
    
    return stats;
};

// =======================================================
// 2. دوال الإشراف (Admin/Instructor)
// =======================================================

/**
 * جلب جميع المشاريع (للوحة تحكم الإدارة)
 */
exports.getAllProjects = async (filters) => {
    // *افتراض: وجود دالة findAll في ProjectModel لدعم الفلترة*
    return await ProjectModel.findAll(filters); 
};

/**
 * تعيين مدرب لمشروع (Admin Action)
 */
exports.assignInstructor = async (projectId, instructorId) => {
    const project = await ProjectModel.findById(projectId);
    const instructor = await UserModel.findById(instructorId);

    if (!project) {
        throw new ApiError(404, 'Project not found.');
    }

    if (!instructor || instructor.role !== 'instructor') {
        throw new ApiError(400, 'Invalid instructor ID.');
    }
    
    if (project.status !== 'submitted') {
        throw new ApiError(400, `Cannot assign project in '${project.status}' status.`);
    }

    // تعيين المشروع
    await ProjectModel.assignInstructor(projectId, instructorId);

    // إشعار المدرب المعين
    await NotificationModel.create(
        instructorId,
        'New Project Assignment',
        `You have been assigned to project: "${project.title}".`,
        'project',
        `/instructor/projects/${projectId}`
    );
    
    // إشعار العميل بأن المشروع قيد التنفيذ
    await NotificationModel.create(
        project.client_id,
        'Project Status Update',
        `Your project "${project.title}" is now 'in progress' and assigned to an instructor.`,
        'project',
        `/client/projects/${projectId}`
    );

    return true;
};

/**
 * إرسال تقييم (Feedback) على المشروع (Instructor Action)
 */
exports.submitProjectFeedback = async (projectId, instructorId, grade, comments, reportFilePath = null) => {
    const project = await ProjectModel.findById(projectId);

    if (!project) {
        throw new ApiError(404, 'Project not found.');
    }

    if (project.assigned_to !== instructorId) {
        throw new ApiError(403, 'You are not assigned to this project.');
    }

    if (project.status === 'completed') {
        throw new ApiError(400, 'Project is already completed.');
    }

    // 1. إضافة التقييم وتحديث حالة المشروع إلى 'completed'
    const feedbackId = await ProjectModel.addFeedback(projectId, instructorId, grade, comments, reportFilePath);

    // 2. إشعار العميل بإكمال المشروع
    await NotificationModel.create(
        project.client_id,
        'Project Completed & Graded',
        `Your project "${project.title}" has been completed and received a grade: ${grade}.`,
        'project',
        `/client/projects/${projectId}`
    );

    return feedbackId;
};