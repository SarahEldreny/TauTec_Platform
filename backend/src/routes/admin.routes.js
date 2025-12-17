const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');

// All routes require authentication and admin role
router.use(verifyToken);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateUser);
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

// Project Management
router.get('/projects', adminController.getAllProjects);
router.post('/projects/:projectId/assign', adminController.assignProject);
router.post('/projects/:projectId/feedback', adminController.submitProjectFeedback);

// Reports
router.get('/reports', adminController.generateReport);

module.exports = router;