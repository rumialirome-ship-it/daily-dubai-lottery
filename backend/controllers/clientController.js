const db = require('../database/db');
const bcrypt = require('bcryptjs');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getClientData = (req, res) => {
    db.get("SELECT id, clientId, username, role, wallet, area, contact, isActive, commissionRates, prizeRates FROM clients WHERE id = ?", [req.client.id], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!row) return res.status(404).json({ message: "Client not found" });

        res.json({
            ...row,
            commissionRates: JSON.parse(row.commissionRates || '{}'),
            prizeRates: JSON.parse(row.prizeRates || '{}'),
        });
    });
};

const getClientBets = (req, res) => {
    db.all("SELECT * FROM bets WHERE clientId = ? ORDER BY createdAt DESC", [req.client.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const getClientTransactions = (req, res) => {
     db.all("SELECT * FROM transactions WHERE clientId = ? ORDER BY createdAt DESC", [req.client.id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const placeBets = (req, res) => {
    const { bets: betsToPlace } = req.body;
    const clientId = req.client.id;

    if (!Array.isArray(betsToPlace) || betsToPlace.length === 0) {
        return res.status(400).json({ message: "Bets data is invalid or empty." });
    }

    db.get("SELECT wallet FROM clients WHERE id = ?", [clientId], (err, client) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!client) return res.status(404).json({ message: "Client not found." });

        const totalStake = betsToPlace.reduce((sum, bet) => sum + bet.stake, 0);
        if (client.wallet < totalStake) {
            return res.status(400).json({ message: `Insufficient funds. Wallet: ${client.wallet.toFixed(2)}, Required: ${totalStake.toFixed(2)}` });
        }

        const newBalance = client.wallet - totalStake;
        const newTransaction = {
            id: `txn-${Date.now()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking: ${betsToPlace.length} bet(s)`,
            balanceAfter: newBalance, createdAt: new Date().toISOString()
        };

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
            
            const transStmt = db.prepare("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
            transStmt.run(Object.values(newTransaction));
            
            const betStmt = db.prepare("INSERT INTO bets (id, clientId, drawId, gameType, number, stake, createdAt, condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            betsToPlace.forEach(bet => {
                betStmt.run(`bet-${generateUniqueId()}`, clientId, bet.drawId, bet.gameType, bet.number, bet.stake, new Date().toISOString(), bet.condition);
            });

            db.run("COMMIT", err => {
                if (err) return res.status(500).json({ message: "Transaction failed." });
                res.status(201).json({ successCount: betsToPlace.length, message: `${betsToPlace.length} bets placed successfully.` });
            });
        });
    });
};

const updateClientCredentials = (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const clientId = req.client.id;

    db.get("SELECT * FROM clients WHERE id = ?", [clientId], (err, client) => {
        if (err || !client) return res.status(404).json({ message: "Client not found." });

        bcrypt.compare(currentPassword, client.password, (err, isMatch) => {
            if (!isMatch) return res.status(401).json({ message: "Incorrect current password." });

            const updates = [];
            const values = [];

            if (newUsername) {
                updates.push("username = ?");
                values.push(newUsername);
            }
            if (newPassword) {
                 bcrypt.hash(newPassword, 10, (err, hash) => {
                    if (err) return res.status(500).json({ message: "Error hashing password." });
                    updates.push("password = ?");
                    values.push(hash);
                    
                    if (updates.length === 0) return res.status(400).json({ message: "No new credentials provided." });
                    
                    const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
                    db.run(sql, [...values, clientId], function (err) {
                        if (err) return res.status(500).json({ message: err.message });
                        getClientData(req, res); // Return updated client data
                    });
                });
            } else {
                 if (updates.length === 0) return res.status(400).json({ message: "No new credentials provided." });
                const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
                db.run(sql, [...values, clientId], function (err) {
                    if (err) return res.status(500).json({ message: err.message });
                    getClientData(req, res); // Return updated client data
                });
            }
        });
    });
};


module.exports = {
    getClientData,
    getClientBets,
    getClientTransactions,
    placeBets,
    updateClientCredentials
};
