const { query, queryOne } = require('../config/database');
const bcrypt = require('bcryptjs');

// Get all users with filters
exports.getAllUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = 'SELECT id, email, role, first_name, last_name, phone, is_verified, is_active, last_login, created_at FROM users WHERE 1=1';
        const params = [];

        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }

        if (status === 'active') {
            sql += ' AND is_active = TRUE';
        } else if (status === 'inactive') {
            sql += ' AND is_active = FALSE';
        }

        if (search) {
            sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const users = await query(sql, params);

        // Get total count
        let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const countParams = [];

        if (role) {
            countSql += ' AND role = ?';
            countParams.push(role);
        }
        if (status === 'active') countSql += ' AND is_active = TRUE';
        else if (status === 'inactive') countSql += ' AND is_active = FALSE';
        if (search) {
            countSql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const totalCount = await queryOne(countSql, countParams);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount.total,
                totalPages: Math.ceil(totalCount.total / limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await queryOne(
            'SELECT id, email, role, first_name, last_name, phone, profile_picture, bio, interests, is_verified, is_active, last_login, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get additional stats based on role
        let additionalData = {};

        if (user.role === 'student') {
            const enrollments = await queryOne(
                'SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?',
                [userId]
            );
            additionalData.enrollmentsCount = enrollments.count;
        } else if (user.role === 'instructor') {
            const courses = await queryOne(
                'SELECT COUNT(*) as count FROM courses WHERE instructor_id = ?',
                [userId]
            );
            additionalData.coursesCount = courses.count;
        } else if (user.role === 'client') {
            const projects = await queryOne(
                'SELECT COUNT(*) as count FROM projects WHERE client_id = ?',
                [userId]
            );
            additionalData.projectsCount = projects.count;
        }

        res.json({
            success: true,
            data: { ...user, ...additionalData }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { first_name, last_name, phone, role, is_active } = req.body;

        const user = await queryOne('SELECT id FROM users WHERE id = ?', [userId]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await query(
            'UPDATE users SET first_name = ?, last_name = ?, phone = ?, role = ?, is_active = ? WHERE id = ?',
            [first_name, last_name, phone, role, is_active, userId]
        );

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// Deactivate/Activate user
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { is_active } = req.body;

        await query(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active, userId]
        );

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: error.message
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting admin users
        const user = await queryOne('SELECT role FROM users WHERE id = ?', [userId]);
        
        if (user && user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin users'
            });
        }

        await query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

// Get all projects for review
exports.getAllProjects = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `
            SELECT p.*, 
                   u.first_name as client_first_name, u.last_name as client_last_name,
                   a.first_name as assigned_first_name, a.last_name as assigned_last_name,
                   COUNT(DISTINCT d.id) as dataset_count
            FROM projects p
            JOIN users u ON p.client_id = u.id
            LEFT JOIN users a ON p.assigned_to = a.id
            LEFT JOIN datasets d ON p.id = d.project_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            sql += ' AND p.status = ?';
            params.push(status);
        }

        sql += ' GROUP BY p.id ORDER BY p.submitted_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

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

// Assign project to admin/analyst
exports.assignProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { assignedTo } = req.body;

        await query(
            'UPDATE projects SET assigned_to = ?, status = ? WHERE id = ?',
            [assignedTo, 'processing', projectId]
        );

        // Notify assigned user
        await query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [assignedTo, 'Project Assigned', 'A new project has been assigned to you', 'project', `/admin/projects/${projectId}`]
        );

        res.json({
            success: true,
            message: 'Project assigned successfully'
        });
    } catch (error) {
        console.error('Assign project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign project',
            error: error.message
        });
    }
};

// Submit project feedback and report
exports.submitProjectFeedback = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { feedbackText, reportFilePath } = req.body;
        const admin_id = req.user.id;

        await query(
            `INSERT INTO project_feedback (project_id, feedback_text, report_file_path, provided_by)
             VALUES (?, ?, ?, ?)`,
            [projectId, feedbackText, reportFilePath, admin_id]
        );

        // Update project status
        await query(
            'UPDATE projects SET status = ?, completed_at = NOW() WHERE id = ?',
            ['completed', projectId]
        );

        // Notify client
        const project = await queryOne('SELECT client_id, title FROM projects WHERE id = ?', [projectId]);
        
        await query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES (?, ?, ?, ?, ?)`,
            [project.client_id, 'Project Completed', `Your project "${project.title}" has been completed`, 'project', `/client/projects/${projectId}`]
        );

        res.json({
            success: true,
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        // Total users by role
        const userStats = await query(
            'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        );

        // Total courses
        const totalCourses = await queryOne(
            'SELECT COUNT(*) as count FROM courses'
        );

        // Total projects
        const totalProjects = await queryOne(
            'SELECT COUNT(*) as count FROM projects'
        );

        // Projects by status
        const projectsByStatus = await query(
            'SELECT status, COUNT(*) as count FROM projects GROUP BY status'
        );

        // Recent registrations
        const recentUsers = await query(
            'SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
        );

        // Active enrollments
        const activeEnrollments = await queryOne(
            'SELECT COUNT(*) as count FROM enrollments WHERE status = ?',
            ['active']
        );

        res.json({
            success: true,
            data: {
                users: userStats.reduce((acc, curr) => {
                    acc[curr.role] = curr.count;
                    return acc;
                }, {}),
                totalCourses: totalCourses.count,
                totalProjects: totalProjects.count,
                projectsByStatus: projectsByStatus.reduce((acc, curr) => {
                    acc[curr.status] = curr.count;
                    return acc;
                }, {}),
                recentUsers,
                activeEnrollments: activeEnrollments.count
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// Generate system report
exports.generateReport = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;

        let reportData = {};

        if (reportType === 'user-activity') {
            reportData = await query(
                `SELECT DATE(created_at) as date, role, COUNT(*) as count 
                 FROM users 
                 WHERE created_at BETWEEN ? AND ?
                 GROUP BY DATE(created_at), role`,
                [startDate, endDate]
            );
        } else if (reportType === 'course-enrollment') {
            reportData = await query(
                `SELECT c.title, COUNT(e.id) as enrollments
                 FROM courses c
                 LEFT JOIN enrollments e ON c.id = e.course_id
                 WHERE e.enrolled_at BETWEEN ? AND ?
                 GROUP BY c.id`,
                [startDate, endDate]
            );
        } else if (reportType === 'project-completion') {
            reportData = await query(
                `SELECT DATE(completed_at) as date, COUNT(*) as completed
                 FROM projects
                 WHERE completed_at BETWEEN ? AND ? AND status = 'completed'
                 GROUP BY DATE(completed_at)`,
                [startDate, endDate]
            );
        }

        res.json({
            success: true,
            reportType,
            period: { startDate, endDate },
            data: reportData
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    }
};