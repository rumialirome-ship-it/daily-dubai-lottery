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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);

// --- Static File Serving for Frontend ---
const buildPath = path.join(__dirname, '..', 'dist');
app.use(express.static(buildPath));
// --- End Static File Serving ---

// --- SPA Fallback ---
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});
// --- End SPA Fallback ---

const startServer = async () => {
    try {
        // Test the database connection before starting the server
        const connection = await db.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        console.log('Database connection verified successfully.');

        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! FATAL: COULD NOT CONNECT TO THE DATABASE !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('Please check your .env file in the /backend directory and ensure your MySQL server is running.');
        console.error('Error details:', error.message);
        process.exit(1); // Exit the process with an error code
    }
};

startServer();
