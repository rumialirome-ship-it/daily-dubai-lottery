import React from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Draw, DrawStatus } from '../../types/index.ts';

const getStatusStyles = (status: DrawStatus) => {
    switch (status) {
        case DrawStatus.Open: return { badge: 'bg-green-500/20 text-green-400', text: 'text-green-400' };
        case DrawStatus.Closed: return { badge: 'bg-yellow-500/20 text-yellow-400', text: 'text-yellow-400' };
        case DrawStatus.Finished: return { badge: 'bg-blue-500/20 text-blue-400', text: 'text-blue-400' };
        case DrawStatus.Upcoming: return { badge: 'bg-gray-500/20 text-gray-400', text: 'text-gray-400' };
        case DrawStatus.Suspended: return { badge: 'bg-red-500/20 text-red-400', text: 'text-red-400' };
        default: return { badge: 'bg-brand-secondary text-brand-text-secondary', text: 'text-brand-text-secondary' };
    }
};

const DrawStatusCard: React.FC<{ draw: Draw }> = ({ draw }) => {
    const styles = getStatusStyles(draw.status);
    return (
        <div className="bg-brand-surface border border-brand-secondary p-4 rounded-lg shadow-lg text-center flex flex-col justify-between h-full transition-all hover:border-brand-primary/50 hover:scale-105">
            <div>
                 <h3 className="font-bold text-brand-text text-sm mb-1">{draw.drawTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</h3>
                 <p className="text-xs text-brand-text-secondary mb-3">Draw {draw.name}</p>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center min-h-[60px]">
                {draw.status === DrawStatus.Finished && draw.winningNumbers && draw.winningNumbers.length > 0 ? (
                     <div className="w-full">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2 inline-block ${styles.badge}`}>
                            {draw.status}
                        </span>
                        <p className="text-brand-primary font-bold text-2xl leading-tight tracking-wider font-mono" title="First Position Winning Number (F)">
                            {draw.winningNumbers[0]}
                        </p>
                        {draw.winningNumbers.length > 1 && (
                            <div className="text-brand-text-secondary text-xs font-mono mt-1" title="Second Position Winning Numbers (S)">
                                {draw.winningNumbers.slice(1).join(' • ')}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${styles.badge}`}>
                        {draw.status}
                    </span>
                )}
            </div>
        </div>
    );
};


const MarketStatus: React.FC = () => {
    const { draws } = useAppContext();
    
    return (
        <div className="bg-brand-surface/50 p-6 rounded-xl shadow-lg border border-brand-secondary">
            <h2 className="text-2xl font-semibold text-brand-primary mb-4 text-center">Today's Draw Status</h2>

            {draws.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                     {draws.sort((a, b) => a.drawTime.getTime() - b.drawTime.getTime()).map(draw => (
                        <DrawStatusCard key={draw.id} draw={draw} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-brand-text-secondary my-4">No draws scheduled for today.</p>
            )}
        </div>
    );
};

export default MarketStatus;