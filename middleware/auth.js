const jwt = require('jsonwebtoken');

/* Verify JWT Token */
const verifyToken = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header provided' });
    }

    // Expect header: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = parts[1];

    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'supersecretkey123'
        );

        req.user = decoded;

        next();

    } catch (err) {

        console.error("JWT verification failed:", err.message);

        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};


/* Verify Role Permissions */
const verifyRole = (roles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }

        next();
    };

};

module.exports = { verifyToken, verifyRole };