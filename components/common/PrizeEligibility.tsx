import React from 'react';

const PrizeEligibility = () => (
    <div className="bg-brand-surface p-6 rounded-xl shadow-lg border border-brand-secondary text-brand-text-secondary text-left">
        <h2 className="text-xl font-semibold text-brand-primary mb-4 text-center">Prize Eligibility & Payouts</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-brand-secondary/50 text-brand-text uppercase">
                    <tr>
                        <th className="py-2 px-4 text-left">Game Type</th>
                        <th className="py-2 px-4 text-center">First Position (F) Prize</th>
                        <th className="py-2 px-4 text-center">Second Position (S) Prize</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-secondary/50">
                    <tr className="bg-brand-surface/50">
                        <td className="py-2 px-4 font-semibold">4 Digits</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 5250</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 1650</td>
                    </tr>
                    <tr className="bg-brand-surface/50">
                        <td className="py-2 px-4 font-semibold">3 Digits</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 800</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 260</td>
                    </tr>
                    <tr className="bg-brand-surface/50">
                        <td className="py-2 px-4 font-semibold">2 Digits</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 80</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 26</td>
                    </tr>
                    <tr className="bg-brand-surface/50">
                        <td className="py-2 px-4 font-semibold">1 Digit</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 8</td>
                        <td className="py-2 px-4 text-center font-mono">Stake x 2.6</td>
                    </tr>
                </tbody>
            </table>
            <p className="mt-4 text-xs">
                <strong>First Position (F):</strong> Your number must match the first winning number drawn for its game type. For 1-3 digits, it must match the start of the 4-digit number.
            </p>
            <p className="mt-2 text-xs">
                <strong>Second Position (S):</strong> Your number must match any of the second, third, or fourth winning numbers drawn for its game type.
            </p>
        </div>
    </div>
);

export default PrizeEligibility;
