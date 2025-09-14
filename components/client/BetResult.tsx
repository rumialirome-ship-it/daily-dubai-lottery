import React from 'react';
import { Bet, Draw, DrawStatus, GameType } from '../../types/index.ts';
import { isBetWinner } from '../../utils/helpers.ts';
import { useAppContext } from '../../contexts/AppContext.tsx';

const BetResult: React.FC<{ bet: Bet; draw?: Draw }> = ({ bet, draw }) => {
    const { currentClient } = useAppContext();

    if (!draw) {
        return <span className="text-gray-400">Loading...</span>;
    }
    if (draw.status === DrawStatus.Finished) {
        if (isBetWinner(bet, draw.winningNumbers)) {
            let winnings = 0;
            // Ensure the logged-in client is the one who placed the bet and has prize rates defined.
            if (currentClient && currentClient.id === bet.clientId && currentClient.prizeRates) {
                const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
                // Safely access the prize rates for the specific game type.
                const gamePrizeRates = currentClient.prizeRates[bet.gameType as keyof typeof currentClient.prizeRates];
                
                if (gamePrizeRates && typeof gamePrizeRates[conditionKey] === 'number') {
                    const rate = gamePrizeRates[conditionKey];
                    // The prize is calculated based on the client-specific rate.
                    winnings = bet.stake * (rate / 100);
                }
            }
            return <span className="font-bold text-green-400">Won (+RS. {winnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>;
        }
        return <span className="text-red-400">Lost</span>;
    }
    if (draw.status === DrawStatus.Closed) {
        return <span className="text-yellow-400">Processing</span>;
    }
    return <span className="text-blue-400">Pending</span>;
};

export default BetResult;