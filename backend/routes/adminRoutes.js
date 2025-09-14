const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
    getAllClients, 
    registerClient, 
    updateClientDetails, 
    changeClientPassword,
    adjustClientWallet,
    getClientById,
    declareWinner,
    getDrawStats,
    getLiveDrawAnalysis,
    placeBetsForClient,
    getAllBets,
    getAllTransactions
} = require('../controllers/adminController');

// All routes in this file are protected and require admin privileges
router.use(protect, admin);

// Client management
router.get('/clients', getAllClients);
router.post('/clients', registerClient);
router.get('/clients/:id', getClientById);
router.put('/clients/:id', updateClientDetails);
router.put('/clients/:id/password', changeClientPassword);
router.post('/clients/:id/wallet', adjustClientWallet);

// Draw management
router.post('/draws/:id/declare-winner', declareWinner);

// Betting
router.post('/bets', placeBetsForClient);
router.get('/bets', getAllBets);
router.get('/transactions', getAllTransactions);

// Reporting
router.get('/reports/draw/:id', getDrawStats);
router.get('/reports/live/:id', getLiveDrawAnalysis);

module.exports = router;
