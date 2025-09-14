const db = require('../database/db');
const bcrypt = require('bcryptjs');
const { isBetWinner } = require('../utils/helpers');
const { generateDrawStats, generateLiveDrawAnalysis } = require('../utils/reportHelpers');

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// === Client Management ===

const getAllClients = (req, res) => {
    db.all("SELECT id, clientId, username, role, wallet, area, contact, isActive FROM clients", [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const getClientById = (req, res) => {
    db.get("SELECT id, clientId, username, role, wallet, area, contact, isActive, commissionRates, prizeRates FROM clients WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!row) return res.status(404).json({ message: "Client not found" });
        res.json({
            ...row,
            commissionRates: JSON.parse(row.commissionRates || '{}'),
            prizeRates: JSON.parse(row.prizeRates || '{}'),
        });
    });
};

const registerClient = (req, res) => {
    const { clientId, username, password, contact, area, wallet, commissionRates, prizeRates } = req.body;
    
    // Check for existing clientId or username
    db.get("SELECT * FROM clients WHERE clientId = ? OR username = ?", [clientId, username], (err, row) => {
        if (err) return res.status(500).json({ message: err.message });
        if (row) return res.status(400).json({ message: "Client ID or Username already exists." });
        
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ message: "Error hashing password." });
            
            const newClient = {
                id: `client-${Date.now()}`,
                role: 'CLIENT',
                isActive: true,
                clientId, username, password: hash, contact, area,
                wallet: wallet || 0,
                commissionRates: JSON.stringify(commissionRates || {}),
                prizeRates: JSON.stringify(prizeRates || {})
            };

            const stmt = db.prepare("INSERT INTO clients (id, clientId, username, password, role, wallet, area, contact, isActive, commissionRates, prizeRates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            stmt.run(Object.values(newClient), function(err) {
                if (err) return res.status(500).json({ message: err.message });
                res.status(201).json({ ...newClient, password: '' });
            });
        });
    });
};

const updateClientDetails = (req, res) => {
    const { id } = req.params;
    const { clientId, username, contact, area, isActive, commissionRates, prizeRates } = req.body;

    const fields = { clientId, username, contact, area, isActive, 
        commissionRates: JSON.stringify(commissionRates),
        prizeRates: JSON.stringify(prizeRates)
    };
    
    const updates = Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => `${key} = ?`);

    if (updates.length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
    }
    
    const values = Object.values(fields).filter(v => v !== undefined);

    const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
    db.run(sql, [...values, id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Client not found." });
        
        db.get("SELECT * FROM clients WHERE id = ?", [id], (err, row) => {
             res.json({ ...row, password: '' });
        });
    });
};

const changeClientPassword = (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters." });
    }
    bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: "Error hashing password." });
        db.run("UPDATE clients SET password = ? WHERE id = ?", [hash, req.params.id], function(err) {
            if (err) return res.status(500).json({ message: err.message });
            if (this.changes === 0) return res.status(404).json({ message: "Client not found." });
            res.status(204).send();
        });
    });
};

const adjustClientWallet = (req, res) => {
    const { amount, type, description } = req.body;
    const clientId = req.params.id;
    if (amount <= 0) return res.status(400).json({ message: "Amount must be positive." });

    db.get("SELECT wallet FROM clients WHERE id = ?", [clientId], (err, client) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!client) return res.status(404).json({ message: "Client not found." });

        let newBalance = client.wallet;
        if (type === 'DEBIT') {
            if (client.wallet < amount) return res.status(400).json({ message: "Insufficient funds." });
            newBalance -= amount;
        } else {
            newBalance += amount;
        }

        const newTransaction = {
            id: `txn-${Date.now()}`,
            clientId, type, amount, description,
            balanceAfter: newBalance,
            createdAt: new Date().toISOString(),
        };

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
            const stmt = db.prepare("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
            stmt.run(Object.values(newTransaction));
            db.run("COMMIT", (err) => {
                if(err) return res.status(500).json({message: "Transaction failed."});
                
                db.get("SELECT * from clients WHERE id = ?", [clientId], (err, updatedClient) => {
                    res.json({ ...updatedClient, password: '' });
                });
            });
        });
    });
};

// === Draw Management ===

const declareWinner = async (req, res) => {
    const { drawId } = req.params;
    const { winningNumbers } = req.body;
    if (!Array.isArray(winningNumbers) || winningNumbers.length !== 4) {
        return res.status(400).json({ message: "Winning numbers must be an array of 4 strings." });
    }

    try {
        const draw = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM draws WHERE id = ?", [drawId], (err, row) => err ? reject(err) : resolve(row));
        });
        if (!draw) return res.status(404).json({ message: "Draw not found." });

        const relevantBets = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM bets WHERE drawId = ?", [drawId], (err, rows) => err ? reject(err) : resolve(rows));
        });

        const allClients = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM clients", [], (err, rows) => err ? reject(err) : resolve(rows));
        });
        const clientMap = new Map(allClients.map(c => [c.id, { ...c, prizeRates: JSON.parse(c.prizeRates || '{}'), commissionRates: JSON.parse(c.commissionRates || '{}') }]));

        const walletAdjustments = new Map();
        const newTransactions = [];

        // Calculate winnings
        relevantBets.forEach(bet => {
            if (isBetWinner(bet, winningNumbers)) {
                const client = clientMap.get(bet.clientId);
                if (!client) return;
                const rate = client.prizeRates?.[bet.gameType]?.[bet.condition.toLowerCase()];
                if (rate) {
                    const winnings = bet.stake * (rate / 100);
                    walletAdjustments.set(client.id, (walletAdjustments.get(client.id) || 0) + winnings);
                    newTransactions.push({
                        id: `txn-win-${bet.id}`, clientId: client.id, type: 'CREDIT', amount: winnings,
                        description: `Prize Money: Winnings for Draw ${draw.name}`, createdAt: new Date().toISOString(), relatedId: draw.id,
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
                const commissionRate = client.commissionRates?.['4D'] || 0; // Assuming 4D rate for all
                if (commissionRate > 0) {
                    const commission = totalStake * (commissionRate / 100);
                    walletAdjustments.set(clientId, (walletAdjustments.get(clientId) || 0) + commission);
                     newTransactions.push({
                        id: `txn-comm-${clientId}-${draw.id}`, clientId, type: 'CREDIT', amount: commission,
                        description: `Commission: Earned for Draw ${draw.name}`, createdAt: new Date().toISOString(), relatedId: draw.id
                    });
                }
            }
        });

        // Apply wallet changes and add transactions
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("UPDATE draws SET winningNumbers = ?, status = 'FINISHED' WHERE id = ?", [JSON.stringify(winningNumbers), drawId]);

            const clientUpdateStmt = db.prepare("UPDATE clients SET wallet = wallet + ? WHERE id = ?");
            const transactionInsertStmt = db.prepare("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt, relatedId) VALUES (?,?,?,?,?,?,?,?)");

            walletAdjustments.forEach((adjustment, clientId) => {
                const client = clientMap.get(clientId);
                if (client) {
                    clientUpdateStmt.run(adjustment, clientId);
                    const newBalance = client.wallet + adjustment;
                    newTransactions
                        .filter(t => t.clientId === clientId)
                        .forEach(t => transactionInsertStmt.run(t.id, t.clientId, t.type, t.amount, t.description, newBalance, t.createdAt, t.relatedId));
                }
            });

            db.run("COMMIT", (err) => {
                if (err) return res.status(500).json({ message: "Failed to commit winner declaration." });
                res.status(200).json({ message: "Winners declared successfully." });
            });
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// === Betting ===
const placeBetsForClient = (req, res) => {
    const { bets: betsToPlace, clientId } = req.body;

    db.get("SELECT * FROM clients WHERE id = ?", [clientId], (err, client) => {
        if (err) return res.status(500).json({ message: err.message });
        if (!client) return res.status(404).json({ message: "Client not found." });

        const totalStake = betsToPlace.reduce((sum, bet) => sum + bet.stake, 0);
        if (client.wallet < totalStake) {
            return res.status(400).json({ message: `Insufficient funds. Wallet: ${client.wallet.toFixed(2)}, Required: ${totalStake.toFixed(2)}` });
        }

        const newBalance = client.wallet - totalStake;
        const newTransaction = {
            id: `txn-admin-${Date.now()}`, clientId, type: 'DEBIT', amount: totalStake,
            description: `Booking by Admin: ${betsToPlace.length} bet(s)`,
            balanceAfter: newBalance, createdAt: new Date().toISOString()
        };

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("UPDATE clients SET wallet = ? WHERE id = ?", [newBalance, clientId]);
            
            const transStmt = db.prepare("INSERT INTO transactions (id, clientId, type, amount, description, balanceAfter, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
            transStmt.run(Object.values(newTransaction));
            
            const betStmt = db.prepare("INSERT INTO bets (id, clientId, drawId, gameType, number, stake, createdAt, condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            betsToPlace.forEach(bet => {
                betStmt.run(`bet-admin-${generateUniqueId()}`, clientId, bet.drawId, bet.gameType, bet.number, bet.stake, new Date().toISOString(), bet.condition);
            });

            db.run("COMMIT", err => {
                if (err) return res.status(500).json({ message: "Transaction failed." });
                res.status(201).json({ successCount: betsToPlace.length, message: `Successfully placed ${betsToPlace.length} bets for ${client.username}.` });
            });
        });
    });
};

const getAllBets = (req, res) => {
    db.all("SELECT * FROM bets ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
};

const getAllTransactions = (req, res) => {
    db.all("SELECT * FROM transactions ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(rows);
    });
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