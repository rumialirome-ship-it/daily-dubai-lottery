const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { normalizeClientData } = require('../utils/dataHelpers');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getClientData = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM clients WHERE id = ?", [req.user.id]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found" });

        res.json(normalizeClientData(client));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClientBets = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT *, bettingCondition as `condition` FROM bets WHERE clientId = ? ORDER BY createdAt DESC", [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClientTransactions = async (req, res) => {
     try {
        const [rows] = await db.execute("SELECT * FROM transactions WHERE clientId = ? ORDER BY createdAt DESC", [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const placeBets = async (req, res) => {
    const { bets: betsToPlace } = req.body;
    const clientId = req.user.id;

    if (!Array.isArray(betsToPlace) || betsToPlace.length === 0) {
        return res.status(400).json({ message: "Bets data is invalid or empty." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [clientRows] = await connection.execute("SELECT wallet FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        const client = clientRows[0];
        if (!client) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found." });
        }

        const totalStake = betsToPlace.reduce((sum, bet) => sum + bet.stake, 0);
        if (client.wallet < totalStake) {
            await connection.rollback();
            return res.status(400).json({ message: `Insufficient funds. Wallet: ${client.wallet.toFixed(2)}, Required: ${totalStake.toFixed(2)}` });
        }

        const newBalance = client.wallet - totalStake;
        await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
        
        const newTransaction = {
            id: `txn-${Date.now()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking: ${betsToPlace.length} bet(s)`,
            balanceAfter: newBalance, createdAt: new Date()
        };
        await connection.execute("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", Object.values(newTransaction));
        
        if (betsToPlace.length > 0) {
            const betInsertSql = "INSERT INTO bets (id, clientId, drawId, gameType, number, stake, createdAt, bettingCondition, positions) VALUES ?";
            const betValues = betsToPlace.map(bet => [
                `bet-${generateUniqueId()}`, clientId, bet.drawId, bet.gameType, bet.number, bet.stake, new Date(), bet.condition, JSON.stringify(bet.positions || null)
            ]);
            await connection.query(betInsertSql, [betValues]);
        }
        
        await connection.commit();
        res.status(201).json({ successCount: betsToPlace.length, message: `${betsToPlace.length} bets placed successfully.` });

    } catch (error) {
        await connection.rollback();
        console.error("Place bets error:", error);
        res.status(500).json({ message: "Transaction failed." });
    } finally {
        connection.release();
    }
};

const updateClientCredentials = async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const clientId = req.user.id;
    
    try {
        const [rows] = await db.execute("SELECT * FROM clients WHERE id = ?", [clientId]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found." });

        const isMatch = await bcrypt.compare(currentPassword, client.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect current password." });

        let sql = 'UPDATE clients SET ';
        const values = [];

        if (newUsername) {
            sql += 'username = ?';
            values.push(newUsername);
        }

        if (newPassword) {
            if(values.length > 0) sql += ', ';
            const hash = await bcrypt.hash(newPassword, 10);
            sql += 'password = ?';
            values.push(hash);
        }

        if (values.length === 0) {
            return res.status(400).json({ message: "No new credentials provided." });
        }
        
        sql += ' WHERE id = ?';
        values.push(clientId);

        await db.execute(sql, values);
        
        const [updatedRows] = await db.execute("SELECT * FROM clients WHERE id = ?", [clientId]);
        res.json(normalizeClientData(updatedRows[0]));

    } catch(error) {
        console.error("Update credentials error:", error);
        res.status(500).json({ message: "Server error while updating credentials." });
    }
};


module.exports = {
    getClientData,
    getClientBets,
    getClientTransactions,
    placeBets,
    updateClientCredentials
};
