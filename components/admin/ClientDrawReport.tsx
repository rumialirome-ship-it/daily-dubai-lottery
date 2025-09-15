

import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Client, Draw, Bet, GameType, BettingCondition } from '../../types';
import { isBetWinner } from '../../utils/helpers';

interface ReportData {
    booked: string[];
    totalStake: number;
    totalPrize: number;
    isWinner: boolean;
}

const getPositionalInfo = (pattern: string): { position: number; digit: string } | null => {
    if (pattern.length !== 4) return null;
    const matches = pattern.match(/X/gi);
    if (!matches || matches.length !== 3) return null; // Must have exactly 3 'X's for this simplified report

    const digitIndex = pattern.split('').findIndex(char => char.toUpperCase() !== 'X');
    if (digitIndex === -1) return null; // No digit found

    return {
        position: digitIndex + 1,
        digit: pattern[digitIndex]
    };
};

const ClientDrawReport: React.FC<{ client: Client; draw: Draw }> = ({ client, draw }) => {
    const { bets } = useAppContext();

    const reportData = useMemo(() => {
        const clientBets = bets.filter(b => b.clientId === client.id && b.drawId === draw.id);

        const gameOrder = [
            '4 Digits', '3 Digits', '2 Digits', '1 Digit',
            'MP 1st Digit', 'MP 2nd Digit', 'MP 3rd Digit', 'MP 4th Digit'
        ];
        
        const data: Map<string, { [key in BettingCondition]?: ReportData }> = new Map(gameOrder.map(g => [g, {}]));

        for (const bet of clientBets) {
            let gameName = '';
            let bookedNumber = bet.number;

            if (bet.gameType === GameType.Positional) {
                const posInfo = getPositionalInfo(bet.number);
                if (posInfo) {
                    gameName = `MP ${posInfo.position}${posInfo.position === 1 ? 'st' : posInfo.position === 2 ? 'nd' : posInfo.position === 3 ? 'rd' : 'th'} Digit`;
                    bookedNumber = posInfo.digit;
                } else {
                    continue; // Skip complex positional patterns for this report
                }
            } else if (bet.number.length === 1) {
                gameName = '1 Digit';
            } else {
                gameName = `${bet.number.length} Digits`;
            }

            if (!data.has(gameName)) continue;

            const gameGroup = data.get(gameName)!;
            if (!gameGroup[bet.condition]) {
                gameGroup[bet.condition] = { booked: [], totalStake: 0, totalPrize: 0, isWinner: false };
            }
            const conditionGroup = gameGroup[bet.condition]!;

            conditionGroup.booked.push(bookedNumber);
            conditionGroup.totalStake += bet.stake;

            if (isBetWinner(bet, draw.winningNumbers)) {
                conditionGroup.isWinner = true;
                if (client && client.prizeRates) {
                    const conditionKey = bet.condition.toLowerCase() as 'first' | 'second';
                    // Positional bets use 1D prize rates as a fallback if not explicitly set
                    const prizeRateGameType = (bet.gameType === GameType.Positional || bet.gameType === GameType.Combo) ? GameType.OneDigit : bet.gameType;
                    const gamePrizeRates = client.prizeRates[prizeRateGameType as keyof typeof client.prizeRates];

                    if (gamePrizeRates && typeof gamePrizeRates[conditionKey] === 'number') {
                        const rate = gamePrizeRates[conditionKey];
                        const winnings = bet.stake * (rate / 100);
                        conditionGroup.totalPrize += winnings;
                    }
                }
            }
        }
        
        // Calculate summary
        let totalFirstStake = 0, totalSecondStake = 0;
        let actualPrizeF = 0, actualPrizeS = 0;
        let totalBookingAmount = 0;
        let commission = 0;

        const stakePerGameType = new Map<GameType, number>();
        clientBets.forEach(bet => {
            stakePerGameType.set(bet.gameType, (stakePerGameType.get(bet.gameType) || 0) + bet.stake);
        });

        if (client.commissionRates) {
            stakePerGameType.forEach((stake, gameType) => {
                const rate = client.commissionRates?.[gameType] || 0;
                commission += stake * (rate / 100);
            });
        }

        for (const [, conditions] of data.entries()) {
            if (conditions.FIRST) {
                totalFirstStake += conditions.FIRST.totalStake;
                actualPrizeF += conditions.FIRST.totalPrize;
            }
            if (conditions.SECOND) {
                totalSecondStake += conditions.SECOND.totalStake;
                actualPrizeS += conditions.SECOND.totalPrize;
            }
        }

        totalBookingAmount = totalFirstStake + totalSecondStake;
        const totalEarned = commission + actualPrizeF + actualPrizeS;

        return {
            tableData: data,
            gameOrder,
            summary: {
                totalFirstStake,
                totalSecondStake,
                totalBookingAmount,
                commission,
                actualPrizeF,
                actualPrizeS,
                totalEarned
            }
        };

    }, [client, draw, bets]);
    
    const { tableData, gameOrder, summary } = reportData;
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="text-brand-text">
            <h3 className="text-xl font-bold text-center mb-2 text-brand-primary">BET PLACED BY CLIENT {client.clientId} / {client.username.toUpperCase()}</h3>
            <div className="border border-brand-secondary rounded-lg overflow-hidden">
                <table className="min-w-full text-sm text-center">
                    <thead className="bg-brand-secondary/50 text-brand-text uppercase">
                        <tr>
                            <th rowSpan={2} className="py-2 px-2 border-r border-brand-secondary/50">Games</th>
                            <th colSpan={3} className="py-2 px-2 border-r border-brand-secondary/50">First Position</th>
                            <th colSpan={3} className="py-2 px-2">Second Position</th>
                        </tr>
                        <tr>
                            <th className="py-2 px-2 border-t border-r border-brand-secondary/50 font-semibold">Booked Digits</th>
                            <th className="py-2 px-2 border-t border-r border-brand-secondary/50 font-semibold">Stake</th>
                            <th className="py-2 px-2 border-t border-r border-brand-secondary/50 font-semibold">Prize</th>
                            <th className="py-2 px-2 border-t border-brand-secondary/50 font-semibold">Booked Digits</th>
                            <th className="py-2 px-2 border-t border-brand-secondary/50 font-semibold">Stake</th>
                            <th className="py-2 px-2 border-t border-brand-secondary/50 font-semibold">Prize</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                        {gameOrder.map(gameName => {
                            const first = tableData.get(gameName)?.[BettingCondition.First];
                            const second = tableData.get(gameName)?.[BettingCondition.Second];

                            if (!first && !second) return null;

                            return (
                                <tr key={gameName} className="bg-brand-surface hover:bg-brand-surface/50">
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-semibold text-left">{gameName}</td>
                                    {/* First Position */}
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono break-all">{first?.booked.join(', ')}</td>
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{first?.totalStake > 0 ? formatCurrency(first.totalStake) : ''}</td>
                                    <td className={`py-2 px-2 border-r border-brand-secondary/50 font-mono font-bold ${first?.isWinner ? 'bg-yellow-400/80 text-black' : ''}`}>
                                        {first?.totalPrize > 0 ? formatCurrency(first.totalPrize) : ''}
                                    </td>
                                    {/* Second Position */}
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono break-all">{second?.booked.join(', ')}</td>
                                    <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{second?.totalStake > 0 ? formatCurrency(second.totalStake) : ''}</td>
                                    <td className={`py-2 px-2 font-mono font-bold ${second?.isWinner ? 'bg-yellow-400/80 text-black' : ''}`}>
                                        {second?.totalPrize > 0 ? formatCurrency(second.totalPrize) : ''}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot className="bg-brand-secondary/50 font-bold text-brand-text">
                        <tr>
                            <td className="py-2 px-2 border-r border-brand-secondary/50 text-right">TOTAL</td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50"></td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{formatCurrency(summary.totalFirstStake)}</td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono text-yellow-300">{formatCurrency(summary.actualPrizeF)}</td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50"></td>
                             <td className="py-2 px-2 border-r border-brand-secondary/50 font-mono">{formatCurrency(summary.totalSecondStake)}</td>
                             <td className="py-2 px-2 font-mono text-yellow-300">{formatCurrency(summary.actualPrizeS)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Total Booking</p>
                    <p className="font-bold text-lg">{formatCurrency(summary.totalBookingAmount)}</p>
                </div>
                <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Commission</p>
                    <p className="font-bold text-lg">{formatCurrency(summary.commission)}</p>
                </div>
                <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Prize - F</p>
                    <p className="font-bold text-lg text-yellow-400">{formatCurrency(summary.actualPrizeF)}</p>
                </div>
                 <div className="bg-brand-secondary p-2 rounded-lg">
                    <p className="text-xs text-brand-text-secondary uppercase">Prize - S</p>
                    <p className="font-bold text-lg text-yellow-400">{formatCurrency(summary.actualPrizeS)}</p>
                </div>
                <div className="bg-brand-primary p-2 rounded-lg text-brand-bg col-span-2 md:col-span-1">
                    <p className="text-xs font-semibold uppercase">Total Earned</p>
                    <p className="font-bold text-xl">{formatCurrency(summary.totalEarned)}</p>
                </div>
            </div>
        </div>
    );
};

export default ClientDrawReport;
