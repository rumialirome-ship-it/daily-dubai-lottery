
import React, { useState, useEffect } from 'react';

const PositionalBettingForm: React.FC<{
    onBook: (pattern: string, stake: number) => Promise<{ successCount: number, total: number, message: string }>,
    disabled: boolean
}> = ({ onBook, disabled }) => {
    const [pattern, setPattern] = useState('');
    const [stake, setStake] = useState(5);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [error, setError] = useState('');

    const handlePatternChange = (value: string) => {
        const newPattern = value.toUpperCase().replace(/[^0-9X]/g, '').slice(0, 4);
        setPattern(newPattern);
        if (error) setError('');
    };

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        setError('');

        if (pattern.length !== 4) {
            setError('Pattern must be exactly 4 characters long (use digits and "X").');
            return;
        }

        if (!/[0-9]/.test(pattern)) {
            setError('Pattern must contain at least one digit.');
            return;
        }
        
        const result = await onBook(pattern, stake);
        setFeedback({ type: result.successCount > 0 ? 'success' : 'error', message: result.message });

        if (result.successCount > 0) {
            setPattern('');
            setStake(5);
        }
    };
    
    const isBookable = !disabled && pattern.length === 4 && /[0-9]/.test(pattern);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-brand-text-secondary">Enter Pattern (F-Prize)</label>
                <p className="text-xs text-brand-text-secondary mb-2">Place a bet on a digit appearing in a specific position of the <strong className="text-yellow-400">First Winning Number</strong>. Use 'X' as a wildcard.</p>
                <input
                    type="text"
                    value={pattern}
                    onChange={(e) => handlePatternChange(e.target.value)}
                    maxLength={4}
                    placeholder="e.g., 5XX4 or X1X2"
                    className="w-full bg-brand-bg border-2 border-brand-secondary rounded-lg py-3 px-4 text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-mono text-2xl tracking-[.2em] text-center"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
            
            <div className="flex flex-wrap gap-4 items-end justify-between">
                 <div>
                    <label className="text-sm font-bold text-brand-text-secondary">Stake Amount</label>
                    <input
                        type="number"
                        value={stake === 0 ? '' : stake}
                        min={1}
                        step={1}
                        onFocus={e => e.target.select()}
                        onChange={(e) => setStake(Number(e.target.value))}
                        className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>
                <button type="submit" disabled={!isBookable} className="bg-brand-primary text-brand-bg font-bold py-2 px-6 rounded-lg disabled:bg-brand-secondary disabled:cursor-not-allowed hover:bg-yellow-400">
                    Book Now
                </button>
            </div>
             {feedback && (
                <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-wrap text-left ${feedback.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {feedback.message}
                </div>
            )}
        </form>
    );
};

export default PositionalBettingForm;