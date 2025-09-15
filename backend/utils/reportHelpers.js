const { isBetWinner } = require('./helpers');

const generateDrawStats = async (req, res, db) => {
    const { id: drawId } = req.params;

    try {
        const [drawRows] = await db.execute("SELECT * FROM draws WHERE id = ?", [drawId]);
        const draw = drawRows[0];
        if (!draw || draw.status !== 'FINISHED') {
            return res.status(404).json({ message: "Finished draw not found." });
        }

        const winningNumbers = JSON.parse(draw.winningNumbers);

        const [bets] = await db.execute("SELECT *, bettingCondition as `condition` FROM bets WHERE drawId = ?", [drawId]);
        const [clients] = await db.query("SELECT * FROM clients");
        const clientMap = new Map(clients.map(c => [c.id, { ...c, prizeRates: JSON.parse(c.prizeRates || '{}') }]));

        let totalStake = 0;
        let totalPayout = 0;
        const betsByNumber = new Map();
        const categoryAnalysis = new Map();
        const digitAnalysis = new Map();
        const conditionAnalysis = new Map();

        bets.forEach(bet => {
            totalStake += bet.stake;
            
            // Bet by Number
            if (!betsByNumber.has(bet.number)) betsByNumber.set(bet.number, { count: 0, totalStake: 0, players: new Set() });
            const numData = betsByNumber.get(bet.number);
            numData.count++;
            numData.totalStake += bet.stake;
            numData.players.add(bet.clientId);

            // Category
            if (!categoryAnalysis.has(bet.gameType)) categoryAnalysis.set(bet.gameType, { totalStake: 0, betCount: 0, players: new Set() });
            const catData = categoryAnalysis.get(bet.gameType);
            catData.totalStake += bet.stake;
            catData.betCount++;
            catData.players.add(bet.clientId);
            
            // Condition
            if (!conditionAnalysis.has(bet.condition)) conditionAnalysis.set(bet.condition, { totalStake: 0, totalPayout: 0 });
            const condData = conditionAnalysis.get(bet.condition);
            condData.totalStake += bet.stake;

            // Digits
            bet.number.split('').forEach(digit => {
                if (!digitAnalysis.has(digit)) digitAnalysis.set(digit, { betCount: 0, totalStake: 0, players: new Set() });
                const digitData = digitAnalysis.get(digit);
                digitData.betCount++;
                digitData.totalStake += bet.stake;
                digitData.players.add(bet.clientId);
            });

            if (isBetWinner(bet, winningNumbers)) {
                const client = clientMap.get(bet.clientId);
                if (client) {
                    const rate = client.prizeRates?.[bet.gameType]?.[bet.condition.toLowerCase()];
                    if (rate) {
                        const winnings = bet.stake * (rate / 100);
                        totalPayout += winnings;
                        condData.totalPayout += winnings;
                    }
                }
            }
        });

        res.json({
            totalStake,
            totalPayout,
            netProfit: totalStake - totalPayout,
            betsByNumber: Object.fromEntries(betsByNumber),
            categoryAnalysis: Object.fromEntries(Array.from(categoryAnalysis.entries()).map(([k, v]) => [k, {...v, playerCount: v.players.size, players: undefined }])),
            digitAnalysis: Object.fromEntries(Array.from(digitAnalysis.entries()).map(([k, v]) => [k, {...v, playerCount: v.players.size, players: undefined }])),
            conditionAnalysis: Object.fromEntries(Array.from(conditionAnalysis.entries()).map(([k,v]) => [k, {...v, netProfit: v.totalStake - v.totalPayout }]))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateLiveDrawAnalysis = async (req, res, db) => {
    const { id: drawId } = req.params;

    try {
        const [bets] = await db.execute("SELECT *, bettingCondition as `condition` FROM bets WHERE drawId = ?", [drawId]);
        if (bets.length === 0) return res.status(404).json({ message: "No bets found for this draw." });
        
        const positionalDigitCounts = {};
        const totalDigitCountsMap = new Map();
        const groupedBets = {};

        const initPath = (obj, path, value = {}) => {
            path.reduce((acc, key, i) => {
                if (acc[key] === undefined) acc[key] = (i === path.length - 1) ? value : {};
                return acc[key];
            }, obj);
        };
        
        bets.forEach(bet => {
            const gameDisplayName = `${bet.gameType} Digits`;
            initPath(groupedBets, [gameDisplayName, bet.condition], []);
            groupedBets[gameDisplayName][bet.condition].push(bet);

            bet.number.split('').forEach(digit => {
                totalDigitCountsMap.set(digit, (totalDigitCountsMap.get(digit) || 0) + 1);
            });

            if (['4D', '3D', '2D'].includes(bet.gameType)) {
                 bet.number.split('').forEach((digit, index) => {
                     initPath(positionalDigitCounts, [bet.gameType, bet.condition, index], new Map());
                     const posMap = positionalDigitCounts[bet.gameType][bet.condition][index];
                     posMap.set(digit, (posMap.get(digit) || 0) + 1);
                 });
            }
        });
        
        for (const gameType in positionalDigitCounts) {
            for (const condition in positionalDigitCounts[gameType]) {
                for (const posIndex in positionalDigitCounts[gameType][condition]) {
                     const posMap = positionalDigitCounts[gameType][condition][posIndex];
                     positionalDigitCounts[gameType][condition][posIndex] = Array.from(posMap.entries())
                         .map(([digit, count]) => ({ digit, count }))
                         .sort((a, b) => b.count - a.count);
                }
            }
        }
        
        const totalDigitCounts = Array.from(totalDigitCountsMap.entries())
            .map(([digit, count]) => ({ digit, count }))
            .sort((a, b) => b.count - a.count);

        res.json({
            positionalDigitCounts,
            totalDigitCounts,
            groupedBets,
            totalBets: bets.length,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { generateDrawStats, generateLiveDrawAnalysis };
