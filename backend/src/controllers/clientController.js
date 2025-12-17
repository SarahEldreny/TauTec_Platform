const { query, queryOne } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Create project request
exports.createProject = async (req, res) => {
    try {
        const { title, description, projectType, category, requirements } = req.body;
        const client_id = req.user.id;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        const result = await query(
            `INSERT INTO projects 
             (client_id, title, description, project_type, category, requirements, status)
             VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
            [client_id, title, description, projectType, category, requirements]
        );

        // Notify admins about new project
        const admins = await query(
            'SELECT id FROM users WHERE role = ? AND is_active = TRUE',
            ['admin']
        );

        for (const admin of admins) {
            await query(
                `INSERT INTO notifications (user_id, title, message, type, link)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    admin.id,
                    'New Project Request',
                    `New project request from client: ${title}`,
                    'project',
                    `/admin/projects/${result.insertId}`
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Project request submitted successfully',
            data: { projectId: result.insertId }
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create project',
            error: error.message
        });
    }
};

// Upload dataset for project
exports.uploadDataset = async (req, res) => {
    try {
        const { projectId } = req.params;
        const client_id = req.user.id;

        // Verify project ownership
        const project = await queryOne(
            'SELECT * FROM projects WHERE id = ? AND client_id = ?',
            [projectId, client_id]
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or access denied'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { filename, size, mimetype } = req.file;
        const filePath = `/uploads/datasets/${filename}`;

        await query(
            `INSERT INTO datasets (project_id, file_name, file_path, file_size, file_type)
             VALUES (?, ?, ?, ?, ?)`,
            [projectId, filename, filePath, size, mimetype]
        );

        res.json({
            success: true,
            message: 'Dataset uploaded successfully',
            data: { filePath, fileName: filename }
        });
    } catch (error) {
        console.error('Upload dataset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload dataset',
            error: error.message
        });
    }
};

// Get client's projects
exports.getMyProjects = async (req, res) => {
    try {
        const client_id = req.user.id;
        const { status } = req.query;

        let sql = `
            SELECT p.*, 
                   COUNT(DISTINCT d.id) as dataset_count,
                   COUNT(DISTINCT pf.id) as feedback_count,
                   u.first_name as assigned_first_name,
                   u.last_name as assigned_last_name
            FROM projects p
            LEFT JOIN datasets d ON p.id = d.project_id
            LEFT JOIN project_feedback pf ON p.id = pf.project_id
            LEFT JOIN users u ON p.assigned_to = u.id
            WHERE p.client_id = ?
        `;
        const params = [client_id];

        if (status) {
            sql += ' AND p.status = ?';
            params.push(status);
        }

        sql += ' GROUP BY p.id ORDER BY p.submitted_at DESC';

        const projects = await query(sql, params);

        res.json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects',
            error: error.message
        });
    }
};

// Get project details
exports.getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const client_id = req.user.id;

        const project = await queryOne(
            `SELECT p.*, 
                    u.first_name as assigned_first_name,
                    u.last_name as assigned_last_name,
                    u.email as assigned_email
             FROM projects p
             LEFT JOIN users u ON p.assigned_to = u.id
             WHERE p.id = ? AND p.client_id = ?`,
            [projectId, client_id]
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Get datasets
        const datasets = await query(
            'SELECT * FROM datasets WHERE project_id = ? ORDER BY uploaded_at DESC',
            [projectId]
        );

        // Get feedback
        const feedback = await query(
            `SELECT pf.*, u.first_name, u.last_name
             FROM project_feedback pf
             JOIN users u ON pf.provided_by = u.id
             WHERE pf.project_id = ?
             ORDER BY pf.created_at DESC`,
            [projectId]
        );

        res.json({
            success: true,
            data: {
                project,
                datasets,
                feedback
            }
        });
    } catch (error) {
        console.error('Get project details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project details',
            error: error.message
        });
    }
};

// Update project
exports.updateProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, projectType, category, requirements } = req.body;
        const client_id = req.user.id;

        // Check if project exists and belongs to client
        const project = await queryOne(
            'SELECT * FROM projects WHERE id = ? AND client_id = ?',
            [projectId, client_id]
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found or access denied'
            });
        }

        // Don't allow updates if project is completed or being processed
        if (project.status === 'completed' || project.status === 'processing') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update project in current status'
            });
        }

        await query(
            `UPDATE projects 
             SET title = ?, description = ?, project_type = ?, category = ?, requirements = ?
             WHERE id = ?`,
            [title, description, projectType, category, requirements, projectId]
        );

        res.json({
            success: true,
            message: 'Project updated successfully'
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project',
            error: error.message
        });
    }
};

// Get client dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const client_id = req.user.id;

        // Total projects
        const totalProjects = await queryOne(
            'SELECT COUNT(*) as count FROM projects WHERE client_id = ?',
            [client_id]
        );

        // Projects by status
        const projectsByStatus = await query(
            `SELECT status, COUNT(*) as count 
             FROM projects 
             WHERE client_id = ? 
             GROUP BY status`,
            [client_id]
        );

        // Recent projects
        const recentProjects = await query(
            `SELECT id, title, status, submitted_at 
             FROM projects 
             WHERE client_id = ? 
             ORDER BY submitted_at DESC 
             LIMIT 5`,
            [client_id]
        );

        // Total datasets uploaded
        const totalDatasets = await queryOne(
            `SELECT COUNT(*) as count 
             FROM datasets d
             JOIN projects p ON d.project_id = p.id
             WHERE p.client_id = ?`,
            [client_id]
        );

        res.json({
            success: true,
            data: {
                totalProjects: totalProjects.count,
                projectsByStatus: projectsByStatus.reduce((acc, curr) => {
                    acc[curr.status] = curr.count;
                    return acc;
                }, {}),
                recentProjects,
                totalDatasets: totalDatasets.count
            }
        });
    } catch (error) {
        console.error('Get client stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// Download project report
exports.downloadReport = async (req, res) => {
    try {
        const { projectId } = req.params;
        const client_id = req.user.id;

        // Verify ownership and get report
        const feedback = await queryOne(
            `SELECT pf.* 
             FROM project_feedback pf
             JOIN projects p ON pf.project_id = p.id
             WHERE pf.project_id = ? AND p.client_id = ? AND pf.report_file_path IS NOT NULL
             ORDER BY pf.created_at DESC
             LIMIT 1`,
            [projectId, client_id]
        );

        if (!feedback || !feedback.report_file_path) {
            return res.status(404).json({
                success: false,
                message: 'Report not available'
            });
        }

        const filePath = path.join(__dirname, '../../', feedback.report_file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Report file not found'
            });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download report',
            error: error.message
        });
    }
};