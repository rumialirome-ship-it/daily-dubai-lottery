const path = require('path');
const db = require(path.join(__dirname, '..', 'database', 'db'));
const bcrypt = require('bcryptjs');
const { isBetWinner } = require(path.join(__dirname, '..', 'utils', 'helpers'));
const { generateDrawStats, generateLiveDrawAnalysis } = require(path.join(__dirname, '..', 'utils', 'reportHelpers'));

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// === Client Management ===

const getAllClients = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, clientId, username, role, wallet, area, contact, isActive FROM clients");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const getClientById = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, clientId, username, role, wallet, area, contact, isActive, commissionRates, prizeRates FROM clients WHERE id = ?", [req.params.id]);
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

const registerClient = async (req, res) => {
    const { clientId, username, password, contact, area, wallet, commissionRates, prizeRates } = req.body;
    
    try {
        const [existing] = await db.query("SELECT * FROM clients WHERE clientId = ? OR username = ?", [clientId, username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Client ID or Username already exists." });
        }
        
        const hash = await bcrypt.hash(password, 10);
        
        const newClient = {
            id: `client-${Date.now()}`,
            role: 'CLIENT',
            isActive: true,
            clientId, username, password: hash, contact, area,
            wallet: wallet || 0,
            commissionRates: JSON.stringify(commissionRates || {}),
            prizeRates: JSON.stringify(prizeRates || {})
        };

        await db.query("INSERT INTO clients SET ?", newClient);
        res.status(201).json({ ...newClient, password: '' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const updateClientDetails = async (req, res) => {
    const { id } = req.params;
    const { clientId, username, contact, area, isActive, commissionRates, prizeRates } = req.body;

    const fields = { clientId, username, contact, area, isActive, 
        commissionRates: commissionRates !== undefined ? JSON.stringify(commissionRates) : undefined,
        prizeRates: prizeRates !== undefined ? JSON.stringify(prizeRates) : undefined,
    };
    
    const updates = Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => `${key} = ?`);

    if (updates.length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
    }
    
    const values = Object.values(fields).filter(v => v !== undefined);

    try {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        const [result] = await db.query(sql, [...values, id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Client not found." });
        
        const [updatedRows] = await db.query("SELECT * FROM clients WHERE id = ?", [id]);
        res.json({ ...updatedRows[0], password: '' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const changeClientPassword = async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters." });
    }
    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const [result] = await db.query("UPDATE clients SET password = ? WHERE id = ?", [hash, req.params.id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Client not found." });
        res.status(204).send();
    } catch(err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const adjustClientWallet = async (req, res) => {
    const { amount, type, description } = req.body;
    const clientId = req.params.id;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return res.status(400).json({ message: "Amount must be a positive number." });

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

        let newBalance = parseFloat(client.wallet);
        if (type === 'DEBIT') {
            if (newBalance < parsedAmount) {
                await connection.rollback();
                return res.status(400).json({ message: "Insufficient funds." });
            }
            newBalance -= parsedAmount;
        } else {
            newBalance += parsedAmount;
        }

        const newTransaction = {
            id: `txn-${Date.now()}`, clientId, type, amount: parsedAmount, description,
            balanceAfter: newBalance, createdAt: new Date(),
        };

        await connection.query("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
        await connection.query("INSERT INTO transactions SET ?", newTransaction);
        
        await connection.commit();
        
        const [updatedClientRows] = await db.query("SELECT * FROM clients WHERE id = ?", [clientId]);
        res.json({ ...updatedClientRows[0], password: '' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Transaction failed." });
    } finally {
        if (connection) connection.release();
    }
};

// === Draw Management ===

const declareWinner = async (req, res) => {
    const { id: drawId } = req.params;
    const { winningNumbers } = req.body;
    if (!Array.isArray(winningNumbers) || winningNumbers.length !== 4) {
        return res.status(400).json({ message: "Winning numbers must be an array of 4 strings." });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [drawRows] = await connection.query("SELECT * FROM draws WHERE id = ?", [drawId]);
        const draw = drawRows[0];
        if (!draw) {
            await connection.rollback();
            return res.status(404).json({ message: "Draw not found." });
        }

        const [relevantBets] = await connection.query("SELECT * FROM bets WHERE drawId = ?", [drawId]);
        const [allClients] = await connection.query("SELECT * FROM clients");
        const clientMap = new Map(allClients.map(c => [c.id, { ...c, wallet: parseFloat(c.wallet), prizeRates: JSON.parse(c.prizeRates || '{}'), commissionRates: JSON.parse(c.commissionRates || '{}') }]));

        const walletAdjustments = new Map();
        const newTransactions = [];

        relevantBets.forEach(bet => {
            if (isBetWinner(bet, winningNumbers)) {
                const client = clientMap.get(bet.clientId);
                if (!client) return;
                const rate = client.prizeRates?.[bet.gameType]?.[bet.condition.toLowerCase()];
                if (rate) {
                    const winnings = parseFloat(bet.stake) * (rate / 100);
                    walletAdjustments.set(client.id, (walletAdjustments.get(client.id) || 0) + winnings);
                    newTransactions.push({
                        id: `txn-win-${bet.id}`, clientId: client.id, type: 'CREDIT', amount: winnings,
                        description: `Prize Money: Winnings for Draw ${draw.name}`, createdAt: new Date(), relatedId: draw.id,
                    });
                }
            }
        });

        const clientStakeTotals = new Map();
        relevantBets.forEach(bet => clientStakeTotals.set(bet.clientId, (clientStakeTotals.get(bet.clientId) || 0) + parseFloat(bet.stake)));

        clientStakeTotals.forEach((totalStake, clientId) => {
            const client = clientMap.get(clientId);
            if (client) {
                const commissionRate = client.commissionRates?.['4D'] || 0;
                if (commissionRate > 0) {
                    const commission = totalStake * (commissionRate / 100);
                    walletAdjustments.set(clientId, (walletAdjustments.get(clientId) || 0) + commission);
                     newTransactions.push({
                        id: `txn-comm-${clientId}-${draw.id}`, clientId, type: 'CREDIT', amount: commission,
                        description: `Commission: Earned for Draw ${draw.name}`, createdAt: new Date(), relatedId: draw.id
                    });
                }
            }
        });

        await connection.query("UPDATE draws SET winningNumbers = ?, status = 'FINISHED' WHERE id = ?", [JSON.stringify(winningNumbers), drawId]);

        for (const [clientId, adjustment] of walletAdjustments.entries()) {
             const client = clientMap.get(clientId);
             if (client) {
                const newBalance = client.wallet + adjustment;
                await connection.query("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
                
                const clientTransactions = newTransactions.filter(t => t.clientId === clientId);
                for (const t of clientTransactions) {
                    await connection.query("INSERT INTO transactions SET ?", { ...t, balanceAfter: newBalance });
                }
            }
        }
        
        await connection.commit();
        res.status(200).json({ message: "Winners declared successfully." });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// === Betting ===
const placeBetsForClient = async (req, res) => {
    const { bets: betsToPlace, clientId } = req.body;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.query("SELECT * FROM clients WHERE id = ? FOR UPDATE", [clientId]);
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
            id: `txn-admin-${Date.now()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking by Admin: ${betsToPlace.length} bet(s)`,
            balanceAfter: newBalance, createdAt: new Date()
        };

        await connection.query("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
        await connection.query("INSERT INTO transactions SET ?", newTransaction);
        
        for (const bet of betsToPlace) {
            const newBet = {
                id: `bet-admin-${generateUniqueId()}`, clientId, drawId: bet.drawId, 
                gameType: bet.gameType, number: bet.number, stake: bet.stake, 
                createdAt: new Date(), condition: bet.condition
            };
            await connection.query("INSERT INTO bets SET ?", newBet);
        }

        await connection.commit();
        res.status(201).json({ successCount: betsToPlace.length, message: `Successfully placed ${betsToPlace.length} bets for ${client.username}.` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Transaction failed." });
    } finally {
        if (connection) connection.release();
    }
};

const getAllBets = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM bets ORDER BY createdAt DESC");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM transactions ORDER BY createdAt DESC");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
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
