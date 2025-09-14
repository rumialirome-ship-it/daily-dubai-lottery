const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const loginUser = async (req, res) => {
    const { loginIdentifier, password, role } = req.body;

    const sql = `SELECT * FROM clients WHERE (username = ? OR clientId = ?) AND role = ?`;
    try {
        const [rows] = await db.query(sql, [loginIdentifier, loginIdentifier, role]);
        const client = rows[0];

        if (client) {
            const isMatch = await bcrypt.compare(password, client.password);
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
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Database error during login.' });
    }
};

module.exports = { loginUser };
