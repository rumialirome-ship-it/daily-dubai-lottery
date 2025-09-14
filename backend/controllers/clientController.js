const db = require('../database/db');
const bcrypt = require('bcryptjs');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getClientData = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, clientId, username, role, wallet, area, contact, isActive, commissionRates, prizeRates FROM clients WHERE id = ?", [req.client.id]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found" });

        res.json({
            ...client,
            commissionRates: JSON.parse(client.commissionRates || '{}'),
            prizeRates: JSON.parse(client.prizeRates || '{}'),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const getClientBets = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM bets WHERE clientId = ? ORDER BY createdAt DESC", [req.client.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const getClientTransactions = async (req, res) => {
     try {
        const [rows] = await db.query("SELECT * FROM transactions WHERE clientId = ? ORDER BY createdAt DESC", [req.client.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const placeBets = async (req, res) => {
    const { bets: betsToPlace } = req.body;
    const clientId = req.client.id;

    if (!Array.isArray(betsToPlace) || betsToPlace.length === 0) {
        return res.status(400).json({ message: "Bets data is invalid or empty." });
    }
    
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.query("SELECT wallet FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        const client = rows[0];

        if (!client) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found." });
        }

        const totalStake = betsToPlace.reduce((sum, bet) => sum + bet.stake, 0);
        if (parseFloat(client.wallet) < totalStake) {
            await connection.rollback();
            return res.status(400).json({ message: `Insufficient funds. Wallet: ${parseFloat(client.wallet).toFixed(2)}, Required: ${totalStake.toFixed(2)}` });
        }

        const newBalance = parseFloat(client.wallet) - totalStake;
        const newTransaction = {
            id: `txn-${Date.now()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking: ${betsToPlace.length} bet(s)`,
            balanceAfter: newBalance, createdAt: new Date()
        };

        await connection.query("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
        await connection.query("INSERT INTO transactions SET ?", newTransaction);
        
        for (const bet of betsToPlace) {
             const newBet = {
                id: `bet-${generateUniqueId()}`, clientId, drawId: bet.drawId, 
                gameType: bet.gameType, number: bet.number, stake: bet.stake, 
                createdAt: new Date(), condition: bet.condition
            };
            await connection.query("INSERT INTO bets SET ?", newBet);
        }

        await connection.commit();
        res.status(201).json({ successCount: betsToPlace.length, message: `${betsToPlace.length} bets placed successfully.` });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Transaction failed." });
    } finally {
        if (connection) connection.release();
    }
};

const updateClientCredentials = async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const clientId = req.client.id;

    try {
        const [rows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found." });

        const isMatch = await bcrypt.compare(currentPassword, client.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect current password." });

        const updates = [];
        const values = [];

        if (newUsername) {
            updates.push("username = ?");
            values.push(newUsername);
        }
        if (newPassword) {
            const hash = await bcrypt.hash(newPassword, 10);
            updates.push("password = ?");
            values.push(hash);
        }
        
        if (updates.length === 0) return res.status(400).json({ message: "No new credentials provided." });
        
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(sql, [...values, clientId]);

        // Re-fetch and send updated data
        const [updatedRows] = await db.query("SELECT id, clientId, username, role, wallet, area, contact, isActive, commissionRates, prizeRates FROM clients WHERE id = ?", [clientId]);
        res.json({
            ...updatedRows[0],
            commissionRates: JSON.parse(updatedRows[0].commissionRates || '{}'),
            prizeRates: JSON.parse(updatedRows[0].prizeRates || '{}'),
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};


module.exports = {
    getClientData,
    getClientBets,
    getClientTransactions,
    placeBets,
    updateClientCredentials
};
