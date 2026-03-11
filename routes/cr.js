const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken, verifyRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Setup multer for local file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'CR-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Get all CRs (with filter based on Role)
router.get('/', verifyToken, async (req, res) => {
    try {
        let query = `
            SELECT cr.*, u.username as requester_name 
            FROM ChangeRequests cr 
            LEFT JOIN Users u ON cr.requester_id = u.id
            ORDER BY cr.created_at DESC
        `;
        let params = [];

        // If Requester, only see their own
        if (req.user.role === 'Change Requester') {
            query = `
                SELECT cr.*, u.username as requester_name 
                FROM ChangeRequests cr 
                LEFT JOIN Users u ON cr.requester_id = u.id
                WHERE cr.requester_id = $1
                ORDER BY cr.created_at DESC
            `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching CRs' });
    }
});

// Get CR by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT cr.*, u.username as requester_name 
             FROM ChangeRequests cr 
             LEFT JOIN Users u ON cr.requester_id = u.id 
             WHERE cr.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'CR not found' });

        const historyResult = await pool.query(
            `SELECT ah.*, r.name as role_name, u.username 
             FROM ApprovalHistory ah
             LEFT JOIN Roles r ON ah.role_id = r.id
             LEFT JOIN Users u ON ah.user_id = u.id
             WHERE ah.cr_id = $1 ORDER BY ah.timestamp ASC`,
            [req.params.id]
        );

        res.json({ cr: result.rows[0], history: historyResult.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new CR
router.post('/', verifyToken, verifyRole(['Change Requester', 'Admin']), upload.fields([
    { name: 'implementation_plan', maxCount: 1 },
    { name: 'rollback_plan', maxCount: 1 }
]), async (req, res) => {
    const { project_department, description, reason, planned_start, planned_end, priority, impacted_users_apps } = req.body;

    // Generate CR ID
    const year = new Date().getFullYear();
    const countResult = await pool.query("SELECT COUNT(*) FROM ChangeRequests");
    const count = parseInt(countResult.rows[0].count) + 1;
    const cr_id = `AAI-CR-${year}-${count.toString().padStart(4, '0')}`;

    const impPath = req.files['implementation_plan'] ? req.files['implementation_plan'][0].path : null;
    const rbPath = req.files['rollback_plan'] ? req.files['rollback_plan'][0].path : null;

    try {
        const result = await pool.query(
            `INSERT INTO ChangeRequests
        (cr_id, requester_id, project_department, description, reason, planned_start, planned_end, priority, impacted_users_apps, status, implementation_plan_path, rollback_plan_path)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Submitted', $10, $11) RETURNING * `,
            [cr_id, req.user.id, project_department, description, reason, planned_start, planned_end, priority, impacted_users_apps, impPath, rbPath]
        );

        // Log Audit
        await pool.query(
            `INSERT INTO AuditLogs(user_id, action, entity_type, entity_id, ip_address) VALUES($1, $2, $3, $4, $5)`,
            [req.user.id, 'Created CR', 'ChangeRequest', result.rows[0].id, req.ip]
        );

        // TODO: Trigger Email Notifications
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create CR' });
    }
});

// Approve/Reject/Send Back Flow
router.post('/:id/workflow', verifyToken, async (req, res) => {
    const { action, comments, next_status } = req.body;
    const crId = req.params.id;

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        // Insert History
        await client.query(
            `INSERT INTO ApprovalHistory(cr_id, role_id, user_id, action, comments)
    VALUES($1, (SELECT id FROM Roles WHERE name = $2), $3, $4, $5)`,
            [crId, req.user.role, req.user.id, action, comments]
        );

        // Update Status
        await client.query(
            `UPDATE ChangeRequests SET status = $1 WHERE id = $2`,
            [next_status, crId]
        );

        // Log Audit
        await client.query(
            `INSERT INTO AuditLogs(user_id, action, entity_type, entity_id, ip_address) VALUES($1, $2, $3, $4, $5)`,
            [req.user.id, `Workflow: ${action} -> ${next_status}`, 'ChangeRequest', crId, req.ip]
        );

        await client.query('COMMIT');
        client.release();

        res.json({ message: 'Workflow updated successfully', status: next_status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update workflow' });
    }
});

module.exports = router;
