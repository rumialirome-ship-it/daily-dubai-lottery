import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { getSmartAnalysis } from '../../services/GeminiService';
import { DrawStatus, GameType, Bet, SmartAnalysisReport } from '../../types';
import { getGameTypeDisplayName } from '../../utils/helpers';
import StatsCard from '../common/StatsCard';

type BetBreakdown = Map<string, { totalStake: number, count: number }>;

const SmartReporting = () => {
    const { draws, bets, clients } = useAppContext();
    const [selectedDrawId, setSelectedDrawId] = useState('');
    const [report, setReport] = useState<SmartAnalysisReport | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeGameTab, setActiveGameTab] = useState<GameType>(GameType.FourDigits);

    const reportableDraws = useMemo(() =>
        draws.filter(d => d.status === DrawStatus.Finished || d.status === DrawStatus.Closed)
            .sort((a, b) => b.drawTime.getTime() - a.drawTime.getTime()),
        [draws]
    );

    const selectedDraw = useMemo(() => reportableDraws.find(d => d.id === selectedDrawId), [reportableDraws, selectedDrawId]);

    const generateReport = async () => {
        if (!selectedDraw || selectedDraw.status !== DrawStatus.Finished) {
            alert('AI analysis can only be generated for finished draws with winning numbers.');
            return;
        }
        setIsLoading(true);
        setReport(null);

        const relevantBets = bets.filter(b => b.drawId === selectedDrawId);
        const analysis = await getSmartAnalysis({ draw: selectedDraw, bets: relevantBets, clients });
        setReport(analysis);

        setIsLoading(false);
    };

    const gameWiseBetBreakdown = useMemo(() => {
        if (!selectedDrawId) {
            return new Map<GameType, BetBreakdown>();
        }

        const relevantBets = bets.filter(b => b.drawId === selectedDrawId);
        const breakdown = new Map<GameType, BetBreakdown>();

        for (const bet of relevantBets) {
            if (!breakdown.has(bet.gameType)) {
                breakdown.set(bet.gameType, new Map());
            }
            const gameBreakdown = breakdown.get(bet.gameType)!;

            if (!gameBreakdown.has(bet.number)) {
                gameBreakdown.set(bet.number, { totalStake: 0, count: 0 });
            }
            const numberStats = gameBreakdown.get(bet.number)!;
            numberStats.totalStake += bet.stake;
            numberStats.count += 1;
        }

        return breakdown;
    }, [selectedDrawId, bets]);

    const handleSelectDraw = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedDrawId(e.target.value);
        setReport(null);
    };

    const totalPossibleNumbersMap: Partial<Record<GameType, number>> = {
        [GameType.FourDigits]: 10000,
        [GameType.ThreeDigits]: 1000,
        [GameType.TwoDigits]: 100,
        [GameType.OneDigit]: 10,
    };

    const gameTabs = [
        GameType.FourDigits,
        GameType.ThreeDigits,
        GameType.TwoDigits,
        GameType.OneDigit,
    ];

    const currentTabBreakdown = gameWiseBetBreakdown.get(activeGameTab);

    const totalPossible = totalPossibleNumbersMap[activeGameTab];
    const bookedCount = currentTabBreakdown?.size || 0;
    const unbookedCount = totalPossible ? totalPossible - bookedCount : 0;
    const bookedPercentage = totalPossible && totalPossible > 0 ? ((bookedCount / totalPossible) * 100).toFixed(2) : '0.00';
    const unbookedPercentage = totalPossible && totalPossible > 0 ? ((unbookedCount / totalPossible) * 100).toFixed(2) : '0.00';

    const unbookedNumbers = useMemo(() => {
        if (activeGameTab !== GameType.OneDigit && activeGameTab !== GameType.TwoDigits) {
            return null;
        }
        const allPossible = [];
        const numDigits = activeGameTab === GameType.OneDigit ? 1 : 2;
        const maxNum = Math.pow(10, numDigits);
        for (let i = 0; i < maxNum; i++) {
            allPossible.push(i.toString().padStart(numDigits, '0'));
        }
        const booked = new Set(currentTabBreakdown?.keys() || []);
        return allPossible.filter(num => !booked.has(num));
    }, [activeGameTab, currentTabBreakdown]);


    return (
        <div>
            <h2 className="text-2xl font-bold text-brand-text mb-4">Smart-Powered Draw Reporting</h2>
            <div className="bg-brand-surface p-4 rounded-lg shadow border border-brand-secondary">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <select
                        value={selectedDrawId}
                        onChange={handleSelectDraw}
                        className="w-full md:w-auto flex-grow bg-brand-bg border border-brand-secondary rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        <option value="">Select a Closed or Finished Draw</option>
                        {reportableDraws.map(draw => (
                            <option key={draw.id} value={draw.id}>
                                Draw {draw.name} ({draw.status}) - {draw.drawTime.toLocaleDateString()}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={generateReport}
                        disabled={!selectedDrawId || isLoading || selectedDraw?.status !== DrawStatus.Finished}
                        className="w-full md:w-auto bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-md disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors"
                    >
                        {isLoading ? 'Generating...' : 'Generate AI Analysis'}
                    </button>
                </div>
            </div>

            {selectedDraw && (
                 <div className="mt-6">
                    <h3 className="text-xl font-bold text-brand-primary mb-3">Played Numbers for Draw {selectedDraw.name}</h3>
                     <div className="border-b border-brand-secondary mb-4">
                        <nav className="-mb-px flex space-x-4 overflow-x-auto">
                           {gameTabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveGameTab(tab)}
                                    className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeGameTab === tab ? 'bg-brand-surface text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-surface/50'}`}
                                >
                                    {getGameTypeDisplayName(tab)}
                                </button>
                            ))}
                        </nav>
                    </div>
                     <div className="bg-brand-surface p-4 rounded-b-lg rounded-r-lg shadow border border-brand-secondary">
                        {totalPossible && totalPossible > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                                <StatsCard title="Total Possible Numbers" value={totalPossible.toLocaleString()} />
                                <StatsCard title="Unique Booked Numbers" value={`${bookedCount.toLocaleString()} (${bookedPercentage}%)`} className="text-green-400" />
                                <StatsCard title="Unbooked Numbers" value={`${unbookedCount.toLocaleString()} (${unbookedPercentage}%)`} className="text-brand-text-secondary" />
                            </div>
                        )}
                        {currentTabBreakdown && currentTabBreakdown.size > 0 ? (
                            <div className="overflow-x-auto max-h-96">
                                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Number</th>
                                            <th scope="col" className="px-6 py-3 text-right">Total Stake</th>
                                            <th scope="col" className="px-6 py-3 text-center">Times Played</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-secondary/50">
                                        {Array.from(currentTabBreakdown.entries()).sort((a,b) => b[1].totalStake - a[1].totalStake).map(([number, data]) => (
                                            <tr key={number} className="hover:bg-brand-secondary/30 transition-colors">
                                                <td className="px-6 py-3 font-mono font-bold text-brand-text">{number}</td>
                                                <td className="px-6 py-3 text-right font-mono">RS. {data.totalStake.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-center">{data.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-brand-text-secondary py-4">No bets were placed for this game type in this draw.</p>
                        )}
                        {unbookedNumbers && (
                             <div className="mt-6 pt-4 border-t border-brand-secondary">
                                <h4 className="text-lg font-bold text-brand-text mb-2">Unbooked Numbers ({unbookedNumbers.length})</h4>
                                {unbookedNumbers.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 bg-brand-bg p-2 rounded-md max-h-48 overflow-y-auto">
                                        {unbookedNumbers.map(num => (
                                            <span key={num} className="font-mono text-sm px-2 py-1 rounded bg-brand-secondary text-brand-text-secondary">
                                                {num}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-green-400 py-4">All possible numbers for this game were booked!</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="mt-4 text-center">
                    <div role="status" className="flex justify-center items-center space-x-2">
                        <svg aria-hidden="true" className="w-8 h-8 text-brand-secondary animate-spin fill-brand-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span className="text-brand-text-secondary">Generating report with Gemini Smart...</span>
                    </div>
                </div>
            )}

            {report && (
                <div className="mt-6 bg-brand-surface p-6 rounded-lg shadow border border-brand-secondary animate-fade-in-down">
                    <h3 className="text-xl font-bold text-brand-primary mb-4">AI Analysis for Draw {selectedDraw?.name}</h3>
                    {typeof report === 'string' ? (
                        <p className="text-red-400">{report}</p>
                    ) : (
                        <div className="space-y-4 text-brand-text">
                            <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                <h4 className="font-bold text-lg text-brand-primary">{report.headline}</h4>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                     <p className="text-sm font-bold text-brand-text-secondary mb-1">Profitability</p>
                                     <p>{report.netProfitAnalysis}</p>
                                </div>
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                     <p className="text-sm font-bold text-brand-text-secondary mb-1">Participation</p>
                                    <p>{report.performanceAnalysis}</p>
                                </div>
                                <div className="bg-brand-secondary/30 p-4 rounded-lg">
                                    <p className="text-sm font-bold text-brand-text-secondary mb-1">Conclusion</p>
                                    <p>{report.conclusion}</p>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartReporting;
