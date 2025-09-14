const db = require('../database/db');
const { getDynamicDrawStatus } = require('../utils/drawHelpers');

const getDraws = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM draws");
        
        const marketOverride = 'AUTO'; // This could be fetched from a config table in the future
        const currentTime = new Date();
        
        const drawsWithStatus = rows.map(draw => {
            const drawData = {
                ...draw,
                drawTime: new Date(draw.drawTime),
                winningNumbers: JSON.parse(draw.winningNumbers || '[]')
            };
            return {
                ...drawData,
                status: getDynamicDrawStatus(drawData, currentTime, marketOverride)
            }
        });
        
        res.json(drawsWithStatus);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to retrieve draws." });
    }
};

module.exports = { getDraws };
