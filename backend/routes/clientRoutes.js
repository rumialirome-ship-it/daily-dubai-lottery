const express = require('express');
const router = express.Router();
const path = require('path');
const { protect } = require(path.join(__dirname, '..', 'middleware', 'authMiddleware'));
const { 
    getClientData,
    getClientBets,
    getClientTransactions,
    placeBets,
    updateClientCredentials
} = require(path.join(__dirname, '..', 'controllers', 'clientController'));

// All routes in this file are protected
router.use(protect);

router.get('/me', getClientData);
router.get('/bets', getClientBets);
router.get('/transactions', getClientTransactions);
router.post('/bets', placeBets);
router.put('/credentials', updateClientCredentials);

module.exports = router;
