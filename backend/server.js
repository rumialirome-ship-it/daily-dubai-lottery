// Explicitly load .env file from the 'backend' directory
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./database/db');

// Route imports - Using path.join for robust path resolution
const authRoutes = require(path.join(__dirname, 'routes', 'authRoutes'));
const drawRoutes = require(path.join(__dirname, 'routes', 'drawRoutes'));
const clientRoutes = require(path.join(__dirname, 'routes', 'clientRoutes'));
const adminRoutes = require(path.join(__dirname, 'routes', 'adminRoutes'));
const healthRoutes = require(path.join(__dirname, 'routes', 'healthRoutes'));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- API Routes with Cache Control ---

// Middleware to prevent caching of any API response
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};

// Create a master router for all API endpoints
const apiRouter = express.Router();

// Apply the no-cache middleware to all routes under /api
apiRouter.use(noCache);

// Register the individual route handlers
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/draws', drawRoutes);
apiRouter.use('/client', clientRoutes);
apiRouter.use('/admin', adminRoutes);

// Mount the master API router
app.use('/api', apiRouter);

// --- End API Routes ---


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
