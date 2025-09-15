const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { isBetWinner } = require('../utils/helpers');
const { generateDrawStats, generateLiveDrawAnalysis } = require('../utils/reportHelpers');
const { normalizeClientData } = require('../utils/dataHelpers');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// === Client Management ===

const getAllClients = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM clients");
        res.json(rows.map(normalizeClientData));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClientById = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM clients WHERE id = ?", [req.params.id]);
        const client = rows[0];
        if (!client) return res.status(404).json({ message: "Client not found" });
        res.json(normalizeClientData(client));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const registerClient = async (req, res) => {
    const { clientId, username, password, contact, area, wallet, commissionRates, prizeRates } = req.body;
    
    try {
        const [existing] = await db.execute("SELECT * FROM clients WHERE clientId = ? OR username = ?", [clientId, username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Client ID or Username already exists." });
        }
        
        const hash = await bcrypt.hash(password, 10);
        
        const newClient = {
            id: `client-${Date.now()}`,
            clientId, username, password: hash,
            role: 'CLIENT',
            wallet: wallet || 0,
            area, contact,
            isActive: 1, // Use 1 for true in MySQL
            commissionRates: JSON.stringify(commissionRates || {}),
            prizeRates: JSON.stringify(prizeRates || {})
        };

        const sql = "INSERT INTO clients (id, clientId, username, password, role, wallet, area, contact, isActive, commissionRates, prizeRates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        await db.execute(sql, Object.values(newClient));
        
        res.status(201).json(normalizeClientData(newClient));

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateClientDetails = async (req, res) => {
    const { id } = req.params;
    const { clientId, username, contact, area, isActive, commissionRates, prizeRates } = req.body;

    try {
        const fields = { clientId, username, contact, area, isActive, 
            commissionRates: commissionRates !== undefined ? JSON.stringify(commissionRates) : undefined,
            prizeRates: prizeRates !== undefined ? JSON.stringify(prizeRates) : undefined
        };
        
        const updates = Object.entries(fields)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => `${key} = ?`);

        if (updates.length === 0) {
            return res.status(400).json({ message: "No update fields provided." });
        }
        
        const values = Object.values(fields).filter(v => v !== undefined);

        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(sql, [...values, id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Client not found." });
        
        const [updatedRows] = await db.execute("SELECT * FROM clients WHERE id = ?", [id]);
        res.json(normalizeClientData(updatedRows[0]));

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const changeClientPassword = async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters." });
    }
    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const [result] = await db.execute("UPDATE clients SET password = ? WHERE id = ?", [hash, req.params.id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Client not found." });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const adjustClientWallet = async (req, res) => {
    const { amount, type, description } = req.body;
    const clientId = req.params.id;
    if (amount <= 0) return res.status(400).json({ message: "Amount must be positive." });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute("SELECT wallet FROM clients WHERE id = ? FOR UPDATE", [clientId]);
        const client = rows[0];
        if (!client) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found." });
        }

        let newBalance = client.wallet;
        if (type === 'DEBIT') {
            if (client.wallet < amount) {
                await connection.rollback();
                return res.status(400).json({ message: "Insufficient funds." });
            }
            newBalance -= amount;
        } else {
            newBalance += amount;
        }

        const newTransaction = {
            id: `txn-${Date.now()}`, clientId, type, amount, description,
            balanceAfter: newBalance, createdAt: new Date()
        };

        await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
        await connection.execute("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", Object.values(newTransaction));
        
        await connection.commit();
        
        const [updatedClientRows] = await db.execute("SELECT * from clients WHERE id = ?", [clientId]);
        res.json(normalizeClientData(updatedClientRows[0]));

    } catch (error) {
        await connection.rollback();
        res.status(500).json({message: "Transaction failed."});
    } finally {
        connection.release();
    }
};

// === Draw Management ===

const declareWinner = async (req, res) => {
    const { id: drawId } = req.params;
    const { winningNumbers } = req.body;
    if (!Array.isArray(winningNumbers) || winningNumbers.length !== 4) {
        return res.status(400).json({ message: "Winning numbers must be an array of 4 strings." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [draws] = await connection.execute("SELECT * FROM draws WHERE id = ?", [drawId]);
        if (draws.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Draw not found." });
        }

        const [relevantBets] = await connection.execute("SELECT *, bettingCondition as `condition` FROM bets WHERE drawId = ?", [drawId]);
        const [allClients] = await connection.execute("SELECT * FROM clients FOR UPDATE");
        
        const clientMap = new Map(allClients.map(c => [c.id, { ...c, prizeRates: JSON.parse(c.prizeRates || '{}'), commissionRates: JSON.parse(c.commissionRates || '{}') }]));

        const walletAdjustments = new Map();
        const newTransactions = [];

        // Calculate winnings
        relevantBets.forEach(bet => {
            if (isBetWinner(bet, winningNumbers)) {
                const client = clientMap.get(bet.clientId);
                if (!client) return;
                const rateKey = bet.condition.toLowerCase();
                const rate = client.prizeRates?.[bet.gameType]?.[rateKey];
                if (rate) {
                    const winnings = bet.stake * (rate / 100);
                    walletAdjustments.set(client.id, (walletAdjustments.get(client.id) || 0) + winnings);
                    newTransactions.push({
                        id: `txn-win-${bet.id}`, clientId: client.id, type: 'CREDIT', amount: winnings,
                        description: `Prize Money: Winnings for Draw ${draws[0].name}`, createdAt: new Date(), relatedId: drawId,
                    });
                }
            }
        });

        // Calculate commissions
        const clientStakeTotals = new Map();
        relevantBets.forEach(bet => {
            clientStakeTotals.set(bet.clientId, (clientStakeTotals.get(bet.clientId) || 0) + bet.stake);
        });

        clientStakeTotals.forEach((totalStake, clientId) => {
            const client = clientMap.get(clientId);
            if (client) {
                // This logic is a bit ambiguous, using 4D as a default. It's kept from original.
                const commissionRate = client.commissionRates?.['4D'] || 0; 
                if (commissionRate > 0) {
                    const commission = totalStake * (commissionRate / 100);
                    walletAdjustments.set(clientId, (walletAdjustments.get(clientId) || 0) + commission);
                     newTransactions.push({
                        id: `txn-comm-${clientId}-${drawId}`, clientId, type: 'CREDIT', amount: commission,
                        description: `Commission: Earned for Draw ${draws[0].name}`, createdAt: new Date(), relatedId: drawId
                    });
                }
            }
        });
        
        // Update Draw
        await connection.execute("UPDATE draws SET winningNumbers = ?, status = 'FINISHED' WHERE id = ?", [JSON.stringify(winningNumbers), drawId]);

        // Apply wallet changes and add transactions
        for (const [clientId, adjustment] of walletAdjustments.entries()) {
            const client = clientMap.get(clientId);
            if(client) {
                const newBalance = client.wallet + adjustment;
                await connection.execute("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
                
                const clientTransactions = newTransactions.filter(t => t.clientId === clientId);
                for(const t of clientTransactions) {
                    // Update balance for transaction record just before inserting
                    t.balanceAfter = newBalance;
                    await connection.execute("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt, relatedId) VALUES (?,?,?,?,?,?,?,?)",
                        [t.id, t.clientId, t.type, t.amount, t.description, t.balanceAfter, t.createdAt, t.relatedId]
                    );
                }
            }
        }
        
        await connection.commit();
        res.status(200).json({ message: "Winners declared successfully." });

    } catch (error) {
        await connection.rollback();
        console.error("Declare winner error:", error);
        res.status(500).json({ message: "Failed to commit winner declaration." });
    } finally {
        connection.release();
    }
};

// === Betting ===
const placeBetsForClient = async (req, res) => {
    const { bets: betsToPlace, clientId } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [clientRows] = await connection.execute("SELECT * FROM clients WHERE id = ? FOR UPDATE", [clientId]);
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
            id: `txn-admin-${Date.now()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking by Admin: ${betsToPlace.length} bet(s)`,
            balanceAfter: newBalance, createdAt: new Date()
        };
        await connection.execute("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", Object.values(newTransaction));
        
        if (betsToPlace.length > 0) {
            const betInsertSql = "INSERT INTO bets (id, clientId, drawId, gameType, number, stake, createdAt, bettingCondition, positions) VALUES ?";
            const betValues = betsToPlace.map(bet => [
                `bet-admin-${generateUniqueId()}`, clientId, bet.drawId, bet.gameType, bet.number, bet.stake, new Date(), bet.condition, JSON.stringify(bet.positions || null)
            ]);
            await connection.query(betInsertSql, [betValues]);
        }

        await connection.commit();
        res.status(201).json({ successCount: betsToPlace.length, message: `Successfully placed ${betsToPlace.length} bets for ${client.username}.` });

    } catch (error) {
        await connection.rollback();
        console.error("Place bets for client error:", error);
        res.status(500).json({ message: "Transaction failed." });
    } finally {
        connection.release();
    }
};

const getAllBets = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT *, bettingCondition as `condition` FROM bets ORDER BY createdAt DESC");
        res.json(rows);
    } catch(error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM transactions ORDER BY createdAt DESC");
        res.json(rows);
    } catch(error) {
        res.status(500).json({ message: error.message });
    }
};

// === Reporting ===
const getDrawStats = (req, res) => generateDrawStats(req, res, db);
const getLiveDrawAnalysis = (req, res) => generateLiveDrawAnalysis(req, res, db);


module.exports = {
    getAllClients,
    getClientById,
    registerClient,
    updateClientDetails,
    changeClientPassword,
    adjustClientWallet,
    declareWinner,
    placeBetsForClient,
    getDrawStats,
    getLiveDrawAnalysis,
    getAllBets,
    getAllTransactions
};
