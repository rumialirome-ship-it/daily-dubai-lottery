const db = require('../database/db');
const { getDynamicDrawStatus } = require('../utils/drawHelpers');

const getDraws = (req, res) => {
    db.all("SELECT * FROM draws", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "Failed to retrieve draws." });
        }
        
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
    });
};

module.exports = { getDraws };
