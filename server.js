const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const userRoutes = require('./routes/users');

const authRoutes = require('./routes/auth');
const crRoutes = require('./routes/cr');
const implementRoutes = require('./routes/implement');
const reportRoutes = require('./routes/reports');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cr', crRoutes);
app.use('/api/implement', implementRoutes);
app.use('/api/reports', reportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
