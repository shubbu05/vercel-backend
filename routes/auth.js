const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log("Login attempt:", username);

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    try {
        const userResult = await pool.query(
            `SELECT u.*, r.name as role 
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.username = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = userResult.rows[0];
        const dbPassword = user.password || user.password_hash; // Handle both column names

        let validPassword = false;

        if (!dbPassword) {
            return res.status(500).json({ success: false, message: 'Password not set in database' });
        }

        // If password looks like bcrypt hash
        if (dbPassword.startsWith('$2')) {
            validPassword = await bcrypt.compare(password, dbPassword);
        } else {
            // fallback for plain text passwords
            validPassword = password === dbPassword;
        }

        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const secret = process.env.JWT_SECRET || 'supersecretkey123';
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, department: user.department },
            secret,
            { expiresIn: '8h' }
        );

        // Audit Log for Login
        try {
            await pool.query(
                `INSERT INTO auditlogs (user_id, action, ip_address) VALUES ($1, $2, $3)`,
                [user.id, 'User Login', req.ip]
            );
        } catch (auditErr) {
            console.error("Audit log error:", auditErr);
        }

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (err) {
        console.error("Login route error:", err.stack);
        res.status(500).json({ success: false, message: 'Login processing failed' });
    }
});

router.get('/me', async (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ user: decoded });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
