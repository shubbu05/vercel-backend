const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken, verifyRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Setup multer for local file uploads (RCA files)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'RCA-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Complete an implementation
router.post('/:cr_id', verifyToken, verifyRole(['Implementation Team', 'Admin']), upload.single('rca_file'), async (req, res) => {
    const { actual_start, actual_end, status, remarks } = req.body;
    const crId = req.params.cr_id;
    const rcaPath = req.file ? req.file.path : null;

    if (status === 'Failed' && !rcaPath) {
        return res.status(400).json({ error: 'RCA file is mandatory for failed implementations.' });
    }

    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        // Insert or Update implementation details
        await client.query(
            `INSERT INTO ImplementationDetails (cr_id, actual_start, actual_end, status, remarks, rca_path)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (cr_id) DO UPDATE SET 
                actual_start = EXCLUDED.actual_start,
                actual_end = EXCLUDED.actual_end,
                status = EXCLUDED.status,
                remarks = EXCLUDED.remarks,
                rca_path = EXCLUDED.rca_path`,
            [crId, actual_start, actual_end, status, remarks, rcaPath]
        );

        // Update CR Status
        const crStatus = status === 'Failed' ? 'Failed' : 'Implemented';
        await client.query(`UPDATE ChangeRequests SET status = $1 WHERE id = $2`, [crStatus, crId]);

        // Log Audit
        await client.query(
            `INSERT INTO AuditLogs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)`,
            [req.user.id, `Implementation: ${status}`, 'ChangeRequest', crId, req.ip]
        );

        await client.query('COMMIT');
        client.release();

        res.json({ message: 'Implementation details saved', cr_status: crStatus });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record implementation' });
    }
});

module.exports = router;
