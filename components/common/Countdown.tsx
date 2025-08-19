import React, { useState, useEffect, useCallback } from 'react';

const Countdown: React.FC<{ targetDate: Date; onComplete?: () => void }> = ({ targetDate, onComplete }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +targetDate - +new Date();
        return difference > 0 ? {
            hours: Math.floor(difference / (1000 * 60 * 60)),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        } : null;
    }, [targetDate]);
    
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    
    useEffect(() => {
        if (!timeLeft) {
            // Ensure onComplete is called if timer is already finished on mount
            if (onComplete) {
                onComplete();
            }
            return;
        }

        const timer = setTimeout(() => {
            const newTime = calculateTimeLeft();
            setTimeLeft(newTime);
        }, 1000);

        return () => clearTimeout(timer);
    }, [timeLeft, calculateTimeLeft, onComplete]);

    const format = (num: number) => num.toString().padStart(2, '0');
    
    if (!timeLeft) {
        return null;
    }
    
    return (
        <div className="text-center">
            <div className="flex space-x-1 justify-center">
                <div className="p-2 bg-brand-bg/50 rounded-md">
                    <span className="text-xl font-bold text-brand-primary">{format(timeLeft.hours)}</span>
                    <span className="text-xs block uppercase text-brand-text-secondary">hrs</span>
                </div>
                <div className="p-2 bg-brand-bg/50 rounded-md">
                    <span className="text-xl font-bold text-brand-primary">{format(timeLeft.minutes)}</span>
                    <span className="text-xs block uppercase text-brand-text-secondary">min</span>
                </div>
                <div className="p-2 bg-brand-bg/50 rounded-md">
                    <span className="text-xl font-bold text-brand-primary">{format(timeLeft.seconds)}</span>
                    <span className="text-xs block uppercase text-brand-text-secondary">sec</span>
                </div>
            </div>
        </div>
    );
};

export default Countdown;