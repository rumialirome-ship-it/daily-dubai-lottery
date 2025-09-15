import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Draw, DrawStatus, MarketOverride } from '../../types';
import Modal from '../common/Modal';
import DrawReport from './DrawReport';
import LiveBettingReport from './LiveBettingReport';

const DrawManagement = () => {
    const { draws, declareWinner, toggleDrawStatus, marketOverride, setMarketOverride, updateDrawTime, shiftAllDrawTimes } = useAppContext();
    const [winningNumbers, setWinningNumbers] = useState<{ [key: string]: string[] }>({});
    const [selectedReportDraw, setSelectedReportDraw] = useState<Draw | null>(null);
    const [selectedLiveReportDraw, setSelectedLiveReportDraw] = useState<Draw | null>(null);
    const [timeModalState, setTimeModalState] = useState<{ type: 'single', draw: Draw } | { type: 'all' } | null>(null);
    const [newTimeValue, setNewTimeValue] = useState('');
    const [shiftMinutes, setShiftMinutes] = useState(0);
    const [editingDrawId, setEditingDrawId] = useState<string | null>(null);


    useEffect(() => {
        // This effect robustly initializes state for each draw's inputs without wiping out admin input.
        // It uses a functional update and a hasOwnProperty check to ensure stability during re-renders.
        setWinningNumbers(currentNumbers => {
            const newNumbersState = { ...currentNumbers };
            let hasChanged = false;
            for (const draw of draws) {
                // Only initialize state for a draw if it doesn't already exist.
                if (!Object.prototype.hasOwnProperty.call(newNumbersState, draw.id)) {
                    newNumbersState[draw.id] = ['', '', '', ''];
                    hasChanged = true;
                }
            }
            // Return the original state object if no changes were made to prevent unnecessary re-renders.
            return hasChanged ? newNumbersState : currentNumbers;
        });
    }, [draws]);

    const handleDeclareOrUpdateWinner = (drawId: string) => {
        const numbersForThisDraw = winningNumbers[drawId];

        // Explicitly check that we have an array of 4 elements.
        if (!Array.isArray(numbersForThisDraw) || numbersForThisDraw.length !== 4) {
            alert('Internal Error: Winning number data is missing or corrupt. Please refresh and try again.');
            return;
        }

        const invalidFieldIndices: string[] = [];

        // Validate each of the four numbers individually.
        for (let i = 0; i < 4; i++) {
            const singleNumber = numbersForThisDraw[i];
            
            // Check if the entry is a string and if it consists of exactly 4 digits.
            const isFourDigitNumber = typeof singleNumber === 'string' && /^\d{4}$/.test(singleNumber);
            
            if (!isFourDigitNumber) {
                invalidFieldIndices.push(`#${i + 1}`);
            }
        }

        // If any validation failed, construct a detailed error message.
        if (invalidFieldIndices.length > 0) {
            const errorMessage = `Error: All four winning number fields must be filled with a 4-digit number. Problematic field(s): ${invalidFieldIndices.join(', ')}`;
            alert(errorMessage);
            return;
        }

        // If all checks passed, proceed with declaring the winner.
        declareWinner(drawId, numbersForThisDraw);
        setEditingDrawId(null); // Exit editing mode after submission
    };
    
    const handleNumberChange = (drawId: string, value: string, index: number) => {
        const currentNumbers = [...(winningNumbers[drawId] || ['', '', '', ''])];
        currentNumbers[index] = value.replace(/[^0-9]/g, '').slice(0, 4);
        setWinningNumbers(prev => ({ ...prev, [drawId]: currentNumbers }));
    };

    const handleStartEdit = (draw: Draw) => {
        setEditingDrawId(draw.id);
        setWinningNumbers(prev => ({ ...prev, [draw.id]: [...(draw.winningNumbers || ['', '', '', ''])] }));
    };
    
    const handleCancelEdit = () => {
        setEditingDrawId(null);
    };

    const getStatusColor = (status: DrawStatus) => {
        switch (status) {
            case DrawStatus.Open: return 'text-green-400';
            case DrawStatus.Closed: return 'text-yellow-400';
            case DrawStatus.Finished: return 'text-blue-400';
            case DrawStatus.Upcoming: return 'text-gray-400';
            case DrawStatus.Suspended: return 'text-gray-500';
        }
    };

    const handleViewReport = (draw: Draw) => {
        if(draw.status === DrawStatus.Finished) {
            setSelectedReportDraw(draw);
        }
    };

    const handleViewLiveReport = (e: React.MouseEvent, draw: Draw) => {
        e.stopPropagation();
        if (draw.status === DrawStatus.Open || draw.status === DrawStatus.Closed) {
            setSelectedLiveReportDraw(draw);
        }
    };

    const handleOpenTimeModal = (type: 'all' | 'single', draw?: Draw) => {
        if (type === 'single' && draw) {
            const timeString = draw.drawTime.toTimeString().substring(0, 5); // HH:mm format
            setNewTimeValue(timeString);
            setTimeModalState({ type: 'single', draw });
        } else if (type === 'all') {
            setShiftMinutes(0);
            setTimeModalState({ type: 'all' });
        }
    };
    
    const handleUpdateTime = () => {
        if (timeModalState?.type === 'single' && newTimeValue) {
            const draw = timeModalState.draw;
            const [hours, minutes] = newTimeValue.split(':').map(Number);
            const newDate = new Date(draw.drawTime);
            newDate.setHours(hours, minutes, 0, 0);
            updateDrawTime(draw.id, newDate);
            setTimeModalState(null);
        }
    };

    const handleShiftAllDraws = () => {
        if (timeModalState?.type === 'all' && shiftMinutes !== 0) {
            shiftAllDrawTimes(shiftMinutes);
            setTimeModalState(null);
        }
    };


    const MarketControlButton = ({ mode, label }: { mode: MarketOverride, label: string }) => {
        const isActive = marketOverride === mode;
        const baseClasses = "font-bold py-2 px-4 rounded-lg transition-colors flex-1";
        const activeClasses = "bg-brand-primary text-brand-bg shadow-lg";
        const inactiveClasses = "bg-brand-secondary hover:bg-opacity-80 text-brand-text-secondary";

        return (
            <button onClick={() => setMarketOverride(mode)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
                {label}
            </button>
        );
    };
    
    const getMarketStatusDescription = () => {
        switch(marketOverride) {
            case 'OPEN': return { text: 'Market is Manually OPEN', color: 'text-green-400' };
            case 'CLOSED': return { text: 'Market is Manually CLOSED', color: 'text-red-400' };
            default: return { text: 'Market is running on Automatic schedule', color: 'text-blue-400' };
        }
    }

    const marketStatusInfo = getMarketStatusDescription();

    const renderTimeModalContent = () => {
        if (!timeModalState) return null;
    
        if (timeModalState.type === 'single') {
            return (
                <div className="space-y-4">
                    <p className="text-brand-text-secondary">Current draw time: {timeModalState.draw.drawTime.toLocaleTimeString()}</p>
                    <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="newTime">New Draw Time</label>
                        <input id="newTime" type="time" value={newTimeValue} onChange={e => setNewTimeValue(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    </div>
                    <button onClick={handleUpdateTime} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save Time</button>
                </div>
            );
        }
    
        if (timeModalState.type === 'all') {
            return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="shiftMinutes">Shift all non-finished draws by (minutes)</label>
                        <input id="shiftMinutes" type="number" step="5" value={shiftMinutes} onChange={e => setShiftMinutes(Number(e.target.value))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g., 30 or -15"/>
                         <p className="text-xs text-brand-text-secondary mt-1">Use a positive number to delay draws, negative to advance them.</p>
                    </div>
                    <button onClick={handleShiftAllDraws} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Confirm Shift</button>
                </div>
            );
        }
        return null;
    };


    return (
        <div>
            <h2 className="text-2xl font-bold text-brand-text mb-4">Draw Management</h2>
            
            <div className="bg-brand-surface p-4 rounded-lg border border-brand-secondary mb-6">
                <h3 className="text-lg font-bold text-brand-text mb-2">Market & Time Control</h3>
                <p className={`text-sm mb-4 font-semibold ${marketStatusInfo.color}`}>{marketStatusInfo.text}</p>
                <div className="flex flex-col md:flex-row gap-2">
                    <MarketControlButton mode="AUTO" label="Set to Automatic" />
                    <MarketControlButton mode="OPEN" label="Force Open Market" />
                    <MarketControlButton mode="CLOSED" label="Force Close Market" />
                </div>
                 <div className="mt-4 border-t border-brand-secondary pt-4">
                    <button onClick={() => handleOpenTimeModal('all')} className="w-full bg-brand-accent hover:bg-sky-400 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Adjust All Draw Times
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draws.map(draw => {
                    const isEditing = editingDrawId === draw.id;
                    const cardClasses = isEditing 
                        ? 'border-brand-primary shadow-glow' 
                        : 'hover:border-brand-primary/80';
                    const cursorClass = !isEditing && draw.status === DrawStatus.Finished 
                        ? 'cursor-pointer'
                        : '';
                        
                    return (
                        <div
                            key={draw.id}
                            className={`bg-brand-surface rounded-lg shadow p-4 border border-brand-secondary transition-all duration-300 ${cardClasses} ${cursorClass}`}
                            onClick={() => !isEditing && handleViewReport(draw)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-brand-text">Draw {draw.name}</h3>
                                    <p className={`text-sm font-semibold ${getStatusColor(draw.status)}`}>
                                        {draw.status}
                                        {isEditing && <span className="text-yellow-400"> (Editing)</span>}
                                        {draw.status === DrawStatus.Suspended && <span className="text-xs"> (Paused)</span>}
                                    </p>
                                </div>
                                <span className="text-xs text-brand-text-secondary">{draw.drawTime.toLocaleTimeString()}</span>
                            </div>
                            {draw.status === DrawStatus.Finished && !isEditing ? (
                                <div className="mt-4">
                                    <p className="text-brand-text-secondary">Winning Numbers:</p>
                                    <p className="text-xl font-bold text-brand-primary">{draw.winningNumbers?.join(', ')}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs text-brand-text-secondary mt-2">Click card to view report</p>
                                        <button onClick={(e) => { e.stopPropagation(); handleStartEdit(draw); }} className="bg-brand-accent text-white font-bold py-1 px-3 rounded-md hover:bg-sky-400 text-sm transition-colors">
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-2">
                                    {(winningNumbers[draw.id] || ['', '', '', '']).map((num, index) => (
                                        <input
                                            key={index}
                                            type="text"
                                            maxLength={4}
                                            placeholder={`Winner #${index + 1}`}
                                            value={num}
                                            onChange={(e) => handleNumberChange(draw.id, e.target.value, index)}
                                            className="w-full bg-brand-bg border border-brand-secondary rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                            disabled={draw.status !== DrawStatus.Closed && !isEditing}
                                        />
                                    ))}
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeclareOrUpdateWinner(draw.id); }}
                                            disabled={draw.status !== DrawStatus.Closed && !isEditing}
                                            className="mt-2 flex-grow bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-md disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400 transition-colors"
                                        >
                                            {isEditing ? 'Update Winners' : 'Declare'}
                                        </button>
                                        {isEditing && (
                                            <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="mt-2 bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 transition-colors" title="Cancel Edit">
                                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenTimeModal('single', draw); }} className="mt-2 bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition-colors disabled:bg-brand-secondary disabled:cursor-not-allowed" title="Edit Draw Time" disabled={draw.status === DrawStatus.Suspended || isEditing}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                                        </button>
                                        {(draw.status === DrawStatus.Open || draw.status === DrawStatus.Closed) && (
                                            <button onClick={(e) => handleViewLiveReport(e, draw)} className="mt-2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors" title="View Live Trend Report">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1V2z"/></svg>
                                            </button>
                                        )}
                                        {draw.status !== DrawStatus.Suspended ? (
                                            <button onClick={(e) => { e.stopPropagation(); toggleDrawStatus(draw.id); }} className="mt-2 bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-brand-secondary disabled:cursor-not-allowed" title="Suspend Draw" disabled={isEditing}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); toggleDrawStatus(draw.id); }} className="mt-2 bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors" title="Activate Draw" disabled={isEditing}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
             {selectedReportDraw && (
                <Modal title={`Report for Draw ${selectedReportDraw.name}`} onClose={() => setSelectedReportDraw(null)}>
                    <DrawReport draw={selectedReportDraw} />
                </Modal>
            )}
             {selectedLiveReportDraw && (
                <Modal title={`Live Trend Report for Draw ${selectedLiveReportDraw.name}`} onClose={() => setSelectedLiveReportDraw(null)}>
                    <LiveBettingReport draw={selectedLiveReportDraw} />
                </Modal>
            )}
             {timeModalState && (
                <Modal 
                    title={timeModalState.type === 'single' ? `Edit Time for Draw ${timeModalState.draw.name}` : "Shift All Draw Times"} 
                    onClose={() => setTimeModalState(null)}
                >
                    {renderTimeModalContent()}
                </Modal>
            )}
        </div>
    );
};

export default DrawManagement;
