
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { parseMessageWithRules } from '../../services/RuleBasedParser.ts';
import { ParsedBet, GameType, BettingCondition } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';

const RuleBasedBulkBetting = () => {
    const { currentClient, draws, placeBulkBetsForCurrentClient } = useAppContext();
    const [selectedDrawId, setSelectedDrawId] = useState('');
    const [message, setMessage] = useState('');
    const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [manualNumber, setManualNumber] = useState('');
    const [manualStake, setManualStake] = useState('5');
    const [selectedCondition, setSelectedCondition] = useState<BettingCondition>(BettingCondition.First);

    const openDraws = draws.filter(d => d.status === 'OPEN');

    useEffect(() => {
        if (openDraws.length > 0 && !openDraws.find(d => d.id === selectedDrawId)) {
            setSelectedDrawId(openDraws[0].id);
        } else if (openDraws.length === 0) {
            setSelectedDrawId('');
        }
    }, [openDraws, selectedDrawId]);

    const handleParseMessage = () => {
        if (!message.trim()) {
            setNotification({ type: 'error', message: 'Message cannot be empty.' });
            return;
        }
        setIsLoading(true);
        setNotification(null);
        try {
            const bets = parseMessageWithRules(message);
            if (bets.length === 0) {
                 setNotification({type: 'error', message: "Parser could not find any valid bets in the message. Please check the format."})
            }
            setParsedBets(bets);
        } catch (error) {
            console.error(error);
            setNotification({type: 'error', message: "An error occurred while parsing the message."})
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlaceBets = async () => {
        if (!currentClient) {
            setNotification({ type: 'error', message: "You must be logged in." });
            return;
        }
        if (!selectedDrawId) {
            setNotification({ type: 'error', message: "Please select an open draw." });
            return;
        }
        if (parsedBets.length === 0) {
            setNotification({ type: 'error', message: "No bets to place." });
            return;
        }

        setIsLoading(true);

        try {
            const betsToPlace = parsedBets.map(b => ({
                drawId: selectedDrawId,
                gameType: b.gameType,
                number: b.number,
                stake: b.stake,
                createdAt: new Date(),
                condition: b.condition || selectedCondition,
            }));
            
            const result = await placeBulkBetsForCurrentClient(betsToPlace);
            setNotification({ type: result.successCount > 0 ? 'success' : 'error', message: result.message });
            if (result.successCount > 0) {
                setParsedBets([]);
                setMessage('');
                setManualNumber('');
                setManualStake('5');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const getGameTypeForNumber = (numStr: string): GameType => {
        switch (numStr.length) {
            case 1: return GameType.OneDigit;
            case 2: return GameType.TwoDigits;
            case 3: return GameType.ThreeDigits;
            default: return GameType.FourDigits;
        }
    };

    const handleManualAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const stake = parseInt(manualStake, 10);
        if (manualNumber.length > 0 && manualNumber.length <= 4 && stake > 0) {
            const newBet = {
                number: manualNumber,
                stake: stake,
                gameType: getGameTypeForNumber(manualNumber)
            };
            setParsedBets(prev => [...prev, newBet]);
            setManualNumber('');
            setManualStake('5');
        }
    };

    const totalStake = parsedBets.reduce((sum, bet) => sum + bet.stake, 0);

    return (
        <div>
            <h2 className="text-xl font-bold text-brand-text mb-4">Rule-Based Bulk Betting</h2>
            {openDraws.length > 0 && currentClient ? (
                <div className="space-y-6">
                     <div>
                        <label htmlFor="draw-select" className="block text-sm font-bold text-brand-text-secondary mb-2">Select Draw</label>
                        <select
                            id="draw-select"
                            value={selectedDrawId}
                            onChange={e => setSelectedDrawId(e.target.value)}
                            className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-3 px-4 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                            {openDraws.map(draw => (
                                <option key={draw.id} value={draw.id}>Draw {draw.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-brand-text-secondary mb-2">Default Betting Condition</label>
                         <div className="flex flex-wrap gap-x-4 gap-y-2 bg-brand-bg p-3 rounded-lg border border-brand-secondary">
                            {(Object.keys(BettingCondition) as Array<keyof typeof BettingCondition>).map((key) => (
                                <label key={key} className="flex items-center space-x-2 text-brand-text cursor-pointer">
                                    <input
                                        type="radio"
                                        name="betting-condition"
                                        value={BettingCondition[key]}
                                        checked={selectedCondition === BettingCondition[key]}
                                        onChange={() => setSelectedCondition(BettingCondition[key])}
                                        className="form-radio h-4 w-4 text-brand-primary bg-brand-surface border-brand-secondary focus:ring-brand-primary"
                                    />
                                    <span>{key} Position</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-brand-text-secondary mt-1">This will be used for bets where the condition isn't specified in the message (e.g. via 'F' or 'S').</p>
                    </div>
                   
                    <div>
                        <label htmlFor="bet-message" className="block text-sm font-bold text-brand-text-secondary mb-2">
                            Paste Your Message
                        </label>
                        <textarea
                            id="bet-message"
                            rows={6}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Paste the full message here, then click 'Parse Message' below."
                            className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-3 px-4 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
                            disabled={isLoading}
                        />
                         <button 
                            onClick={handleParseMessage} 
                            disabled={isLoading || !message.trim() || !selectedDrawId}
                            className="mt-2 w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-brand-secondary disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Parsing...' : 'Parse Message'}
                        </button>
                    </div>

                    <div className="text-center text-brand-text-secondary">or</div>

                    <div>
                        <label className="block text-sm font-bold text-brand-text-secondary mb-2">Add Bets Manually</label>
                        <form onSubmit={handleManualAdd} className="flex flex-wrap gap-4 items-end bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                            <div className="flex-grow">
                                <label className="text-xs font-bold text-brand-text-secondary">Number (1-4 digits)</label>
                                <input type="text" value={manualNumber} onChange={e => setManualNumber(e.target.value.replace(/[^0-9]/g, ''))} maxLength={4} className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono text-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-brand-text-secondary">Stake</label>
                                <input type="number" value={manualStake} min="1" step="1" onChange={e => setManualStake(e.target.value)} className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            </div>
                            <button type="submit" disabled={!manualNumber || manualNumber.length === 0} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-brand-secondary">Add Bet</button>
                        </form>
                    </div>

                    {parsedBets.length > 0 && (
                        <div className="bg-brand-bg p-4 rounded-lg border border-brand-secondary">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-brand-primary">Review Bets</h3>
                                <button onClick={() => setParsedBets([])} className="text-xs text-red-400 hover:text-red-300">Clear All Bets</button>
                            </div>
                            <div className="overflow-x-auto max-h-64">
                                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Number</th>
                                            <th scope="col" className="px-6 py-3">Game Type</th>
                                            <th scope="col" className="px-6 py-3">Condition</th>
                                            <th scope="col" className="px-6 py-3 text-right">Stake</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-brand-bg">
                                        {parsedBets.map((bet, index) => (
                                            <tr key={index} className="border-b border-brand-secondary">
                                                <td className="px-6 py-2 font-mono text-brand-text">{bet.number}</td>
                                                <td className="px-6 py-2">{getGameTypeDisplayName(bet.gameType)}</td>
                                                <td className="px-6 py-2">{bet.condition || selectedCondition}</td>
                                                <td className="px-6 py-2 text-right font-mono">{bet.stake.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 pt-4 border-t border-brand-secondary flex flex-col md:flex-row justify-between items-center gap-4">
                               <div className="text-lg font-bold">
                                   <span>Total Bets: <span className="text-brand-primary">{parsedBets.length}</span></span>
                                   <span className="mx-4">|</span>
                                   <span>Total Stake: <span className="text-brand-primary">RS. {totalStake.toLocaleString('en-US',{minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></span>
                               </div>
                               <button onClick={handlePlaceBets} disabled={isLoading || !selectedDrawId} className="w-full md:w-auto bg-brand-primary hover:bg-yellow-400 text-brand-bg font-bold py-3 px-6 rounded-lg disabled:bg-brand-secondary disabled:cursor-not-allowed transition-colors">
                                   {isLoading ? 'Placing Bets...' : 'Confirm & Place Bets'}
                               </button>
                            </div>
                        </div>
                    )}
                    {notification && (
                        <div className={`mt-4 p-3 rounded-lg text-sm text-center ${notification.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                            {notification.message}
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-center text-yellow-400 font-semibold p-4 bg-brand-surface rounded-lg">The market is currently closed. Bulk betting is disabled.</p>
            )}
        </div>
    );
};

export default RuleBasedBulkBetting;