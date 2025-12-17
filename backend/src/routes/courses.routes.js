const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);

// Instructor routes
router.post('/', verifyToken, authorize('instructor', 'admin'), courseController.createCourse);
router.put('/:id', verifyToken, authorize('instructor', 'admin'), courseController.updateCourse);
router.delete('/:id', verifyToken, authorize('instructor', 'admin'), courseController.deleteCourse);
router.post('/:id/publish', verifyToken, authorize('instructor', 'admin'), courseController.publishCourse);
router.get('/instructor/my-courses', verifyToken, authorize('instructor'), courseController.getInstructorCourses);

// Module management
router.post('/:courseId/modules', verifyToken, authorize('instructor', 'admin'), courseController.addModule);
router.post('/modules/:moduleId/lessons', verifyToken, authorize('instructor', 'admin'), courseController.addLesson);

module.exports = router;