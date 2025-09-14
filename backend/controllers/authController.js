const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { getClientById } = require('./clientController');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const loginUser = (req, res) => {
    const { loginIdentifier, password, role } = req.body;

    const sql = `SELECT * FROM clients WHERE (username = ? OR clientId = ?) AND role = ?`;
    db.get(sql, [loginIdentifier, loginIdentifier, role], (err, client) => {
        if (err) {
            return res.status(500).json({ message: 'Database error during login.' });
        }

        if (client) {
            bcrypt.compare(password, client.password, (err, isMatch) => {
                if (err) {
                    return res.status(500).json({ message: 'Error comparing passwords.' });
                }
                if (isMatch) {
                     if (!client.isActive) {
                        return res.status(403).json({ message: 'Your account has been suspended.' });
                    }
                    res.json({
                        id: client.id,
                        clientId: client.clientId,
                        username: client.username,
                        role: client.role,
                        token: generateToken(client.id),
                    });
                } else {
                    res.status(401).json({ message: 'Invalid credentials' });
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
};

module.exports = { loginUser };
