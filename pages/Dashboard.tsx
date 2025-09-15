import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Role } from '../types';
import Header from '../components/common/Header';
import MarketStatus from '../components/common/MarketStatus';
import AdminDashboard from '../components/admin/AdminDashboard';
import ClientDashboard from '../components/client/ClientDashboard';
import MarketTimings from '../components/common/MarketTimings';
import CurrentDateDisplay from '../components/common/CurrentDateDisplay';
import PrizeEligibility from '../components/common/PrizeEligibility';

const Dashboard: React.FC = () => {
    const { currentClient, logout } = useAppContext();
    const [isRulesVisible, setIsRulesVisible] = useState(false);
    
    if (!currentClient) return null;

    return (
        <div className="min-h-screen bg-brand-bg pt-16">
            <Header onLogout={logout} client={currentClient} />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-brand-text mb-2">Welcome back, {currentClient.username}!</h1>
                    <CurrentDateDisplay />
                </div>
                <div className="mb-8">
                    <MarketTimings />
                </div>
                <MarketStatus />
                <div className="mt-8">
                    {currentClient.role === Role.Admin ? <AdminDashboard /> : <ClientDashboard />}
                </div>
                 <div className="mt-12 text-center">
                    <button
                        onClick={() => setIsRulesVisible(!isRulesVisible)}
                        className="bg-brand-surface hover:bg-brand-secondary border border-brand-secondary text-brand-text-secondary font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-300"
                    >
                        {isRulesVisible ? 'Hide Game Rules & Payouts' : 'Show Game Rules & Payouts'}
                    </button>
                    {isRulesVisible && (
                        <div className="mt-6 animate-fade-in-down">
                            <PrizeEligibility />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
