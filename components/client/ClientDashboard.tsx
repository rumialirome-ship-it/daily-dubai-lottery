import React, { useState } from 'react';
import WalletInfo from './WalletInfo.tsx';
import BettingInterface from './BettingInterface.tsx';
import BetHistory from './BetHistory.tsx';
import ClientTabButton from './ClientTabButton.tsx';
import RuleBasedBulkBetting from './RuleBasedBulkBetting.tsx';
import FinancialStatement from './FinancialStatement.tsx';

const ClientDashboard = () => {
    const [activeTab, setActiveTab] = useState('booking');

    return (
        <div className="space-y-8">
            <WalletInfo />
            <div className="bg-brand-surface rounded-xl shadow-lg border border-brand-secondary">
                <div className="border-b border-brand-secondary px-4 md:px-6">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto">
                        <ClientTabButton tabId="booking" activeTab={activeTab} onClick={setActiveTab}>Place Bet</ClientTabButton>
                        <ClientTabButton tabId="bulk-betting" activeTab={activeTab} onClick={setActiveTab}>Bulk Betting</ClientTabButton>
                        <ClientTabButton tabId="history" activeTab={activeTab} onClick={setActiveTab}>Bet History</ClientTabButton>
                        <ClientTabButton tabId="statement" activeTab={activeTab} onClick={setActiveTab}>Financial Statement</ClientTabButton>
                    </nav>
                </div>
                <div className="p-4 md:p-6">
                    {activeTab === 'booking' && <BettingInterface />}
                    {activeTab === 'bulk-betting' && <RuleBasedBulkBetting />}
                    {activeTab === 'history' && <BetHistory />}
                    {activeTab === 'statement' && <FinancialStatement />}
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;