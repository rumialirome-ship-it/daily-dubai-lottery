const express = require('express');
const router = express.Router();
const path = require('path');
const { loginUser } = require(path.join(__dirname, '..', 'controllers', 'authController'));

router.post('/login', loginUser);

module.exports = router;
