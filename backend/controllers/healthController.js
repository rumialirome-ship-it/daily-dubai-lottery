const path = require('path');
const db = require(path.join(__dirname, '..', 'database', 'db'));

const checkHealth = async (req, res) => {
    let dbStatus = 'down';
    let errorMessage = null;

    try {
        const connection = await db.getConnection();
        await connection.ping(); // A lightweight operation to check if the server is responsive.
        dbStatus = 'up';
        connection.release();
    } catch (error) {
        errorMessage = error.message || 'An unknown database error occurred.';
        console.error("Health check DB Error:", error);
    }

    res.status(dbStatus === 'up' ? 200 : 503).json({
        status: 'ok',
        database: {
            status: dbStatus,
            error: errorMessage
        },
        timestamp: new Date().toISOString()
    });
};

module.exports = { checkHealth };

