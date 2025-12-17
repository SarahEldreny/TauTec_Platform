// ============================================================================
// src/controllers/courseController.js - Refactored to use CourseService
// ============================================================================

const courseService = require('../services/courseService');
// لم نعد نحتاج إلى query أو queryOne، فالخدمة هي من تستخدم الموديلات
// const { query, queryOne } = require('../config/database'); 
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
// =======================================================
// 1. دوال عامة (Public)
// =======================================================

// Get all published courses (Public)
exports.getAllCourses = async (req, res) => {
    try {
        // نمرر الفلاتر مباشرة إلى الـ Service
        const filters = req.query; 
        const courses = await courseService.getAllCourses(filters);

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to fetch courses'
        });
    }
};

// Get course by ID (Public/Student)
exports.getCourseById = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        // نمرر الـ userId (إذا كان متوفراً من التوكن) لإمكانية فحص حالة التسجيل
        const userId = req.user ? req.user.id : null; 
        
        const course = await courseService.getCourseById(courseId, userId);

        res.json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to fetch course details'
        });
    }
};

// =======================================================
// 2. دوال المدربين (Instructor)
// =======================================================

// Create a new course
exports.createCourse = async (req, res) => {
    try {
        const instructorId = req.user.id;
        
        const result = await courseService.createCourse(req.body, instructorId);

        res.status(201).json({
            success: true,
            message: 'Course draft created successfully.',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to create course'
        });
    }
};

// Update an existing course
exports.updateCourse = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const instructorId = req.user.id;

        const updatedCourse = await courseService.updateCourse(courseId, instructorId, req.body);

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: updatedCourse
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to update course'
        });
    }
};

// Delete a course
exports.deleteCourse = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const instructorId = req.user.id;

        await courseService.deleteCourse(courseId, instructorId);

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to delete course'
        });
    }
};

// Publish a course
exports.publishCourse = async (req, res) => {
    try {
        const courseId = parseInt(req.params.id);
        const instructorId = req.user.id;

        const result = await courseService.publishCourse(courseId, instructorId);

        res.json({
            success: true,
            message: `Course "${result.title}" published successfully`
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to publish course'
        });
    }
};

// Get instructor's courses
exports.getInstructorCourses = async (req, res) => {
    try {
        const instructor_id = req.user.id;

        const courses = await courseService.getInstructorCourses(instructor_id);

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to get instructor courses'
        });
    }
};

// =======================================================
// 3. دوال إدارة المحتوى (Modules & Lessons)
// =======================================================

// Add a module to a course
exports.addModule = async (req, res) => {
    try {
        const courseId = parseInt(req.params.courseId);
        const instructorId = req.user.id;
        
        const result = await courseService.addModule(courseId, instructorId, req.body);

        res.status(201).json({
            success: true,
            message: 'Module added successfully',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to add module'
        });
    }
};

// Add a lesson to a module
exports.addLesson = async (req, res) => {
    try {
        const moduleId = parseInt(req.params.moduleId);
        const instructorId = req.user.id;

        const result = await courseService.addLesson(moduleId, instructorId, req.body);

        res.status(201).json({
            success: true,
            message: 'Lesson added successfully',
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
             success: false,
             message: error.message || 'Failed to add lesson'
        });
    }
};