const express = require('express');
const router = express.Router();
const path = require('path');
const { checkHealth } = require(path.join(__dirname, '..', 'controllers', 'healthController'));

// This is a public route for health checking
router.get('/', checkHealth);

module.exports = router;

