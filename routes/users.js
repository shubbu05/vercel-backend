const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../db');


// GET all users
router.get('/', async (req, res) => {

    try {

        const users = await pool.query(`
            SELECT u.id, u.username, u.email, u.department, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.id
        `);

        res.json(users.rows);

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users' });

    }

});


// CREATE new user
router.post('/create', async (req, res) => {

    const { username, email, password, role, department } = req.body;

    try {

        const hashedPassword = await bcrypt.hash(password, 10);

        const roleResult = await pool.query(
            `SELECT id FROM roles WHERE name = $1`,
            [role]
        );

        const roleId = roleResult.rows[0].id;

        await pool.query(`
            INSERT INTO users (username,email,password_hash,role_id,department)
            VALUES ($1,$2,$3,$4,$5)
        `,
            [username, email, hashedPassword, roleId, department]);

        res.json({ success: true });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: 'Failed to create user' });

    }

});

module.exports = router;