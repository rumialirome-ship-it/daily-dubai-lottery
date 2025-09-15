import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { GameType, Draw, BettingCondition, Bet } from '../../types';
import BettingForm from './BettingForm';
import ComboForm from './KainchiForm';
import PositionalBettingForm from './PositionalBettingForm';

const BettingInterface: React.FC = () => {
    const { draws, placeBulkBetsForCurrentClient } = useAppContext();
    const [activeTab, setActiveTab] = useState<GameType>(GameType.FourDigits);
    const [betMode, setBetMode] = useState<'FIRST' | 'SECOND' | 'BOTH'>('FIRST');
    
    const openDraws = draws.filter(d => d.status === 'OPEN');
    const [selectedDrawId, setSelectedDrawId] = useState<string>('');
    
    useEffect(() => {
        if (openDraws.length > 0 && !openDraws.find(d => d.id === selectedDrawId)) {
            setSelectedDrawId(openDraws[0].id);
        } else if (openDraws.length === 0) {
            setSelectedDrawId('');
        }
    }, [openDraws, selectedDrawId]);

    useEffect(() => {
        if (activeTab === GameType.Positional && (betMode === 'SECOND' || betMode === 'BOTH')) {
            setBetMode('FIRST');
        }
    }, [activeTab, betMode]);

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const selectedDraw = openDraws.find(d => d.id === selectedDrawId);
    const bookingCloseTime = selectedDraw ? new Date(selectedDraw.drawTime.getTime() - 15 * 60 * 1000) : null;
    const formattedCloseTime = bookingCloseTime ? bookingCloseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';


    const handleBook = async (params: { numbers: string[], stakeFirst: number, stakeSecond: number }): Promise<{ successCount: number, total: number, message: string }> => {
        if (!selectedDrawId) {
            return { successCount: 0, total: 0, message: "No draw selected or market is closed." };
        }
        
        const { numbers, stakeFirst, stakeSecond } = params;
        const betsToPlace: Omit<Bet, 'id' | 'clientId'>[] = [];
        
        numbers.forEach(number => {
            if (betMode === 'FIRST' && stakeFirst > 0) {
                betsToPlace.push({ drawId: selectedDrawId, gameType: activeTab, number, stake: stakeFirst, createdAt: new Date(), condition: BettingCondition.First });
            } else if (betMode === 'SECOND' && stakeFirst > 0) {
                betsToPlace.push({ drawId: selectedDrawId, gameType: activeTab, number, stake: stakeFirst, createdAt: new Date(), condition: BettingCondition.Second });
            } else if (betMode === 'BOTH') {
                if (stakeFirst > 0) {
                    betsToPlace.push({ drawId: selectedDrawId, gameType: activeTab, number, stake: stakeFirst, createdAt: new Date(), condition: BettingCondition.First });
                }
                if (stakeSecond > 0) {
                    betsToPlace.push({ drawId: selectedDrawId, gameType: activeTab, number, stake: stakeSecond, createdAt: new Date(), condition: BettingCondition.Second });
                }
            }
        });

        if (betsToPlace.length === 0) {
            return { successCount: 0, total: 0, message: "No valid bets to place (stake must be > 0)." };
        }

        const result = await placeBulkBetsForCurrentClient(betsToPlace);

        if (result.successCount > 0) {
            const totalAmount = betsToPlace.reduce((sum, b) => sum + b.stake, 0);
            let stakeMessage = `💰 Stake per Number: Rs. ${formatCurrency(stakeFirst)}`;
            if (betMode === 'BOTH') {
                stakeMessage = `💰 Stake per Number: Rs. ${formatCurrency(stakeFirst)} (First), Rs. ${formatCurrency(stakeSecond)} (Second)`;
            }
            const message = `✅ Successfully Booked: ${numbers.slice(0, 10).join(', ')}${numbers.length > 10 ? '...' : ''}\n${stakeMessage}\n🔢 Total Bookings: ${betsToPlace.length}\n💵 Total Amount: Rs. ${formatCurrency(totalAmount)}`;
            return { ...result, total: betsToPlace.length, message };
        } else {
            return { ...result, total: betsToPlace.length, message: `Booking failed. Reason: ${result.message}` };
        }
    };
    
    const handleComboBook = async (params: { numbers: string[], stakeFirst: number, stakeSecond: number, combinationSize: 2|3|4 }): Promise<{ successCount: number, total: number, message: string }> => {
        if (!selectedDrawId) {
            return { successCount: 0, total: 0, message: "No draw selected or market is closed." };
        }
        
        const { numbers, stakeFirst, stakeSecond, combinationSize } = params;
        
        let gameType: GameType;
        switch(combinationSize) {
            case 2: gameType = GameType.TwoDigits; break;
            case 3: gameType = GameType.ThreeDigits; break;
            case 4: gameType = GameType.FourDigits; break;
            default: return { successCount: 0, total: 0, message: "Invalid combination size." };
        }

        const betsToPlace: Omit<Bet, 'id' | 'clientId'>[] = [];
        
        numbers.forEach(number => {
            if (betMode === 'FIRST' && stakeFirst > 0) {
                betsToPlace.push({ drawId: selectedDrawId, gameType, number, stake: stakeFirst, createdAt: new Date(), condition: BettingCondition.First });
            } else if (betMode === 'SECOND' && stakeFirst > 0) {
                betsToPlace.push({ drawId: selectedDrawId, gameType, number, stake: stakeFirst, createdAt: new Date(), condition: BettingCondition.Second });
            } else if (betMode === 'BOTH') {
                if (stakeFirst > 0) {
                    betsToPlace.push({ drawId: selectedDrawId, gameType, number, stake: stakeFirst, createdAt: new Date(), condition: BettingCondition.First });
                }
                if (stakeSecond > 0) {
                    betsToPlace.push({ drawId: selectedDrawId, gameType, number, stake: stakeSecond, createdAt: new Date(), condition: BettingCondition.Second });
                }
            }
        });
        
        if (betsToPlace.length === 0) {
            return { successCount: 0, total: 0, message: "No valid bets to place (stake must be > 0)." };
        }

        const result = await placeBulkBetsForCurrentClient(betsToPlace);
        
        if (result.successCount > 0) {
            const totalAmount = betsToPlace.reduce((sum, b) => sum + b.stake, 0);
            let stakeMessage = `💰 Stake per Number: Rs. ${formatCurrency(stakeFirst)}`;
            if (betMode === 'BOTH') {
                stakeMessage = `💰 Stake per Number: Rs. ${formatCurrency(stakeFirst)} (First), Rs. ${formatCurrency(stakeSecond)} (Second)`;
            }
            const message = `✅ Successfully Booked: ${numbers.slice(0, 5).join(', ')}${numbers.length > 5 ? '...' : ''}\n${stakeMessage}\n🔢 Total Bookings: ${betsToPlace.length}\n💵 Total Amount: Rs. ${formatCurrency(totalAmount)}`;
            return { ...result, total: betsToPlace.length, message };
        } else {
            return { ...result, total: betsToPlace.length, message: `Booking failed for all combinations. Reason: ${result.message}` };
        }
    };

    const handlePositionalBook = async (pattern: string, stake: number): Promise<{ successCount: number, total: number, message: string }> => {
        if (!selectedDrawId) {
            return { successCount: 0, total: 1, message: "No draw selected or market is closed." };
        }
        
        // This is a single bet, so it can use the bulk function which handles single bets just fine.
        const betToPlace: Omit<Bet, 'id' | 'clientId'> = {
            drawId: selectedDrawId,
            gameType: GameType.Positional,
            number: pattern,
            stake,
            createdAt: new Date(),
            condition: BettingCondition.First, // Positional is always First
        };

        const result = await placeBulkBetsForCurrentClient([betToPlace]);

        if (result.successCount > 0) {
            return { successCount: 1, total: 1, message: `Successfully booked pattern ${pattern} for Rs. ${stake}.` };
        } else {
            return { successCount: 0, total: 1, message: `Booking failed. Reason: ${result.message}` };
        }
    };
    
    const tabs = [
        { id: GameType.FourDigits, label: '4 Digits', maxLength: 4 },
        { id: GameType.ThreeDigits, label: '3 Digits', maxLength: 3 },
        { id: GameType.TwoDigits, label: '2 Digits', maxLength: 2 },
        { id: GameType.OneDigit, label: '1 Digit', maxLength: 1 },
        { id: GameType.Positional, label: 'Multi Positional 1 digit' },
        { id: GameType.Combo, label: 'Combo' },
    ];

    const conditionDescriptions = {
        FIRST: "Bet wins only on the 1st winning number.",
        SECOND: "Bet wins on the 2nd, 3rd, or 4th winning number.",
        BOTH: "Places two separate bets: one for First Position and one for Second, with their respective stakes."
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-brand-text">Place Your Bet</h2>
                {openDraws.length > 0 && (
                    <div className="w-full md:w-auto">
                        <label htmlFor="draw-select" className="sr-only">Select an Open Draw</label>
                        <select
                            id="draw-select"
                            value={selectedDrawId}
                            onChange={e => setSelectedDrawId(e.target.value)}
                            className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={openDraws.length === 0}
                        >
                            {openDraws.map(draw => (
                                <option key={draw.id} value={draw.id}>
                                    Draw {draw.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
             <div className="mb-4 bg-brand-bg p-3 rounded-lg border border-brand-secondary">
                 <label className="block text-sm font-bold text-brand-text-secondary mb-2">Select Betting Condition</label>
                 <div className="flex flex-col sm:flex-row gap-x-4 gap-y-2">
                    {([
                        { value: 'FIRST', label: 'First Position'},
                        { value: 'SECOND', label: 'Second Position'},
                        { value: 'BOTH', label: 'First & Second'}
                    ] as const).map(({value, label}) => {
                        const isPositional = activeTab === GameType.Positional;
                        const isSecondOrBoth = value === 'SECOND' || value === 'BOTH';
                        const isDisabled = isPositional && isSecondOrBoth;
                        return (
                             <label key={value} className={`flex items-center space-x-2 text-brand-text ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="betting-condition"
                                    value={value}
                                    checked={betMode === value}
                                    onChange={() => setBetMode(value)}
                                    className="form-radio h-4 w-4 text-brand-primary bg-brand-surface border-brand-secondary focus:ring-brand-primary"
                                    disabled={isDisabled}
                                />
                                <span>{label}</span>
                            </label>
                        );
                    })}
                </div>
                 <p className="text-xs text-brand-text-secondary mt-2">{conditionDescriptions[betMode]}</p>
                 {activeTab === GameType.Positional && <p className="text-xs text-yellow-400 mt-1">Note: Positional bets only apply to the First Winning Number (F-Prize).</p>}
            </div>
            <div className="border-b border-brand-secondary mb-4">
                <nav className="-mb-px flex space-x-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-brand-bg text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary hover:bg-brand-secondary/50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
             {selectedDraw && (
                <div className="bg-brand-accent/10 border border-brand-accent/30 text-brand-accent p-3 rounded-lg text-center text-sm mb-4">
                    Betting on <span className="font-bold">Draw {selectedDraw.name}</span>. This market closes at <span className="font-bold">{formattedCloseTime}</span>.
                </div>
            )}
            <div className="min-h-[140px] pt-4">
                {selectedDrawId ? (
                    <>
                        {activeTab === GameType.Positional ? (
                            <PositionalBettingForm onBook={handlePositionalBook} disabled={!selectedDrawId} />
                        ) : activeTab === GameType.Combo ? (
                            <ComboForm onBook={handleComboBook} disabled={!selectedDrawId} betMode={betMode} />
                        ) : (
                            <BettingForm
                                gameType={activeTab}
                                maxLength={tabs.find(t => t.id === activeTab)?.maxLength || 4}
                                onBook={handleBook}
                                disabled={!selectedDrawId}
                                betMode={betMode}
                            />
                        )}
                    </>
                ) : (
                    <p className="text-center text-yellow-400 font-semibold p-4">The market is currently closed for betting.</p>
                )}
            </div>
        </div>
    );
};

export default BettingInterface;
