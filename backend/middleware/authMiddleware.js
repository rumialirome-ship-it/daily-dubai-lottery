const jwt = require('jsonwebtoken');
const db = require('../database/db');

const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            db.get('SELECT id, username, role FROM clients WHERE id = ?', [decoded.id], (err, user) => {
                if (err || !user) {
                    return res.status(401).json({ message: 'Not authorized, user not found' });
                }
                req.user = user;
                next();
            });

        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
