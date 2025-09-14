const jwt = require('jsonwebtoken');
const db = require('../database/db');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const [rows] = await db.query('SELECT id, username, role FROM clients WHERE id = ?', [decoded.id]);
            const client = rows[0];
            
            if (!client) {
                return res.status(401).json({ message: 'Not authorized, client not found' });
            }
            
            req.client = client;
            next();

        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.client && req.client.role === 'ADMIN') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
