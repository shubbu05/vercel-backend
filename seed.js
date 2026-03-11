require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

const seedDB = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Execute schema SQL to ensure tables exist
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql')).toString();
        await client.query(schemaSQL);

        // Roles
        const roleNames = [
            'Change Requester',
            'Change Reviewer',
            'DC Helpdesk',
            'InfoSec',
            'Change Approver',
            'Implementation Team',
            'Admin'
        ];

        const roleIds = {};
        for (const role of roleNames) {
            const res = await client.query(
                `INSERT INTO Roles (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id, name`,
                [role]
            );
            roleIds[res.rows[0].name] = res.rows[0].id;
        }

        // Users
        const users = [
            { username: 'admin1', email: 'admin1@aai.aero', contact: '1000', dept: 'SystemAdmin', role: 'Admin' },
            { username: 'requester1', email: 'requester1@aai.aero', contact: '1001', dept: 'IT Services', role: 'Change Requester' },
            { username: 'reviewer1', email: 'reviewer1@aai.aero', contact: '1002', dept: 'System Setup', role: 'Change Reviewer' },
            { username: 'infosec1', email: 'infosec1@aai.aero', contact: '1003', dept: 'Information Security', role: 'InfoSec' },
            { username: 'approver1', email: 'approver1@aai.aero', contact: '1004', dept: 'IT Directorate', role: 'Change Approver' },
            { username: 'helpdesk1', email: 'helpdesk1@aai.aero', contact: '1005', dept: 'Data Center', role: 'DC Helpdesk' },
            { username: 'implement1', email: 'implement1@aai.aero', contact: '1006', dept: 'Network Implementation', role: 'Implementation Team' }
        ];

        const password_hash = await bcrypt.hash('password123', 10);
        for (const u of users) {
            await client.query(
                `INSERT INTO Users (username, password_hash, email, contact_number, department, role_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 ON CONFLICT (username) DO NOTHING`,
                [u.username, password_hash, u.email, u.contact, u.dept, roleIds[u.role]]
            );
        }

        await client.query('COMMIT');
        console.log("Database seeded successfully with Roles and Test Users.");
        console.log("Password for all users is: password123");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Failed to seed database: ", e);
    } finally {
        client.release();
        process.exit();
    }
};

seedDB();
