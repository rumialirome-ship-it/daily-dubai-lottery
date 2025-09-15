const db = require('../database/db');
const { getDynamicDrawStatus } = require('../utils/drawHelpers');

const getDraws = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM draws");
        
        const marketOverride = 'AUTO'; // This could be fetched from a config table in the future
        const currentTime = new Date();
        
        const drawsWithStatus = rows.map(draw => {
            const drawData = {
                ...draw,
                drawTime: new Date(draw.drawTime),
                // FIX: Robustly parse winningNumbers to handle NULL or empty strings from the DB
                winningNumbers: draw.winningNumbers ? JSON.parse(draw.winningNumbers) : []
            };
            return {
                ...drawData,
                status: getDynamicDrawStatus(drawData, currentTime, marketOverride)
            }
        });
        
        res.json(drawsWithStatus);
    } catch (error) {
        // Log the actual error on the server for better debugging
        console.error("Error in getDraws controller:", error);
        res.status(500).json({ message: "Failed to retrieve draws." });
    }
};

module.exports = { getDraws };
