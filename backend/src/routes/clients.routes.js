const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { verifyToken, authorize } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure multer for dataset uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/datasets/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'dataset-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /csv|xlsx|xls|json|zip/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only CSV, Excel, JSON, and ZIP files are allowed'));
        }
    }
});

// All routes require authentication and client role
router.use(verifyToken);
router.use(authorize('client'));

// Dashboard
router.get('/dashboard/stats', clientController.getDashboardStats);

// Projects
router.get('/projects', clientController.getMyProjects);
router.post('/projects', clientController.createProject);
router.get('/projects/:projectId', clientController.getProjectById);
router.put('/projects/:projectId', clientController.updateProject);

// Dataset upload
router.post('/projects/:projectId/upload-dataset', upload.single('dataset'), clientController.uploadDataset);

// Reports
router.get('/projects/:projectId/download-report', clientController.downloadReport);

module.exports = router;