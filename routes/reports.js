const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Dashboard statistics
router.get('/dashboard-stats', verifyToken, async (req, res) => {
    try {
        let stats = {};

        if (req.user.role === 'Admin') {
            const totalCrs = await pool.query('SELECT COUNT(*) FROM ChangeRequests');
            const totalUsers = await pool.query('SELECT COUNT(*) FROM Users');

            stats = {
                totalCrs: totalCrs.rows[0].count,
                totalUsers: totalUsers.rows[0].count
            };
        } else if (req.user.role === 'Change Requester') {
            const myCrs = await pool.query('SELECT COUNT(*) FROM ChangeRequests WHERE requester_id = $1', [req.user.id]);
            const pendingCrs = await pool.query(`SELECT COUNT(*) FROM ChangeRequests WHERE requester_id = $1 AND status != 'Closed' AND status != 'Failed'`, [req.user.id]);

            stats = {
                myCrs: myCrs.rows[0].count,
                pendingCrs: pendingCrs.rows[0].count
            };
        } else {
            // For Reviewers, Security, Approvers, etc
            const pendingAuth = await pool.query(`
                SELECT COUNT(*) FROM ChangeRequests 
                WHERE (status = 'Submitted' AND $1 = 'Change Reviewer')
                   OR (status = 'Under Review' AND $1 = 'InfoSec')
                   OR (status = 'Security Review' AND $1 = 'Change Approver')
                   OR (status = 'Final Approval' AND $1 = 'Implementation Team')
            `, [req.user.role]);

            stats = {
                pendingActions: pendingAuth.rows[0].count
            };
        }

        // Priority Breakdown (For all roles)
        const priorityBreakdown = await pool.query(
            'SELECT priority, COUNT(*) FROM ChangeRequests GROUP BY priority'
        );

        res.json({ stats, priorityBreakdown: priorityBreakdown.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Full Audit Logs
router.get('/audit-logs', verifyToken, verifyRole(['Admin']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.*, u.username as user_name 
             FROM AuditLogs a 
             LEFT JOIN Users u ON a.user_id = u.id 
             ORDER BY a.timestamp DESC 
             LIMIT 100`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

module.exports = router;
