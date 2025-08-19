import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { GameType } from '../../types/index.ts';
import { getGameTypeDisplayName } from '../../utils/helpers.ts';

const LiveBettingMonitor = () => {
    const { bets, draws, clients } = useAppContext();
    
    const openDraws = useMemo(() => draws.filter(d => d.status === 'OPEN'), [draws]);
    const [selectedDrawId, setSelectedDrawId] = useState('');

    useEffect(() => {
        if (openDraws.length > 0 && !openDraws.find(d => d.id === selectedDrawId)) {
            setSelectedDrawId(openDraws[0].id);
        } else if (openDraws.length === 0) {
            setSelectedDrawId('');
        }
    }, [openDraws, selectedDrawId]);

    const selectedDraw = useMemo(() => draws.find(d => d.id === selectedDrawId), [draws, selectedDrawId]);
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
    
    const liveBets = useMemo(() => {
        if (!selectedDraw) return [];
        return bets
            .filter(b => b.drawId === selectedDraw.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [bets, selectedDraw]);

    const totalStake = useMemo(() => liveBets.reduce((sum, bet) => sum + bet.stake, 0), [liveBets]);

    if (openDraws.length === 0) {
        return (
             <div className="text-center py-8 bg-brand-surface rounded-lg">
                <p className="text-brand-text-secondary text-lg">No draw is currently open for betting.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-2xl font-bold text-brand-text">Live Betting Monitor</h2>
                <div className="w-full md:w-auto md:max-w-xs">
                     <label htmlFor="draw-monitor-select" className="sr-only">Select Draw to Monitor</label>
                    <select
                        id="draw-monitor-select"
                        value={selectedDrawId}
                        onChange={e => setSelectedDrawId(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                        {openDraws.map(draw => (
                            <option key={draw.id} value={draw.id}>Draw {draw.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-brand-text">
                <div className="bg-brand-surface p-4 rounded-lg shadow">
                    <p className="text-sm text-brand-text-secondary">Total Bets Placed</p>
                    <p className="text-3xl font-bold">{liveBets.length.toLocaleString()}</p>
                </div>
                <div className="bg-brand-surface p-4 rounded-lg shadow">
                    <p className="text-sm text-brand-text-secondary">Total Stake Amount</p>
                    <p className="text-3xl font-bold">RS. {totalStake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="overflow-x-auto bg-brand-surface rounded-lg shadow max-h-[60vh]">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">Time</th>
                            <th scope="col" className="px-6 py-3">Client</th>
                            <th scope="col" className="px-6 py-3">Number</th>
                            <th scope="col" className="px-6 py-3">Game</th>
                            <th scope="col" className="px-6 py-3">Condition</th>
                            <th scope="col" className="px-6 py-3 text-right">Stake</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-secondary/50">
                        {liveBets.map(bet => {
                            const client = clientMap.get(bet.clientId);
                            return (
                                <tr key={bet.id} className="hover:bg-brand-secondary/30">
                                    <td className="px-6 py-3">{new Date(bet.createdAt).toLocaleTimeString()}</td>
                                    <td className="px-6 py-3 font-medium text-brand-text">{client ? `${client.username} (${client.clientId})` : 'N/A'}</td>
                                    <td className="px-6 py-3 font-mono font-bold text-brand-primary">{bet.number}</td>
                                    <td className="px-6 py-3">
                                        {getGameTypeDisplayName(bet.gameType)}
                                        {bet.gameType === GameType.Positional && bet.positions && (
                                            <span className="text-xs block text-brand-text-secondary">
                                                Pos: [{bet.positions.join(',')}]
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3">{bet.condition}</td>
                                    <td className="px-6 py-3 text-right font-mono">RS. {bet.stake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {liveBets.length === 0 && <div className="text-center py-4"><p className="text-brand-text-secondary">No bets placed for this draw yet...</p></div>}
            </div>
        </div>
    );
};

export default LiveBettingMonitor;