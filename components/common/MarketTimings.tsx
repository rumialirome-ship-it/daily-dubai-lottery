import React from 'react';

const MarketTimings = () => (
    <div className="bg-brand-surface p-6 rounded-xl shadow-lg border border-brand-secondary text-brand-text-secondary">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            <div>
                <h3 className="text-lg font-semibold text-brand-text mb-2">Daily Market Hours</h3>
                <p>Market Opens: <span className="font-bold text-brand-primary">10:00 AM</span></p>
                <p>Market Closes: <span className="font-bold text-brand-primary">11:00 PM</span></p>
                <p className="text-xs mt-2">The market operates on a continuous 24-hour cycle.</p>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-brand-text mb-2">🎯 Daily Betting Schedule</h3>
                <p>The Booking and Balloting will be held <span className="font-bold text-brand-primary">13 times daily</span> within the market cycle.</p>
                <p className="text-xs mt-2">Betting for each draw closes 15 minutes before its scheduled time.</p>
            </div>
        </div>
    </div>
);

export default MarketTimings;