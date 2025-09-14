require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const drawRoutes = require('./routes/drawRoutes');
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

// --- Static File Serving for Frontend ---
// This must come AFTER the API routes
const buildPath = path.join(__dirname, '..', 'dist');
app.use(express.static(buildPath));
// --- End Static File Serving ---

// --- SPA Fallback ---
// This will serve the index.html for any route not handled by the API or static file server
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});
// --- End SPA Fallback ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));