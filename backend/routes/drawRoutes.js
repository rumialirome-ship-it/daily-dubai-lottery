const express = require('express');
const router = express.Router();
const path = require('path');
const { getDraws } = require(path.join(__dirname, '..', 'controllers', 'drawController'));

// This is a public route, no protection needed
router.get('/', getDraws);

module.exports = router;
