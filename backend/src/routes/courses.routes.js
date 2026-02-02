const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', courseController.getAllCourses);

// Admin route - get all courses (including drafts)
router.get('/admin/all', verifyToken, authorize('admin'), courseController.getAllCoursesAdmin);

// Admin route - publish all draft courses (for migration/testing)
router.post('/admin/publish-all-drafts', verifyToken, authorize('admin'), courseController.publishAllDrafts);

// Debug endpoint - publish all draft courses (for testing without authentication)
router.post('/debug/publish-all-drafts', courseController.publishAllDrafts);

// Instructor routes (MUST be before /:id to prevent 'instructor' from matching as ID)
router.get('/instructor/my-courses', verifyToken, authorize('instructor'), courseController.getInstructorCourses);
router.post('/', verifyToken, authorize('instructor', 'admin'), courseController.createCourse);
router.post('/:id/publish', verifyToken, authorize('instructor', 'admin'), courseController.publishCourse);

// Course by ID (must be after specific routes)
router.get('/:id/structure', verifyToken, authorize('instructor', 'admin'), courseController.getCourseStructure);
router.get('/:id', courseController.getCourseById);
router.put('/:id', verifyToken, authorize('instructor', 'admin'), courseController.updateCourse);
router.delete('/:id', verifyToken, authorize('instructor', 'admin'), courseController.deleteCourse);

// Module management
router.post('/:courseId/modules', verifyToken, authorize('instructor', 'admin'), courseController.addModule);
router.post('/modules/:moduleId/lessons', verifyToken, authorize('instructor', 'admin'), courseController.addLesson);

module.exports = router;
