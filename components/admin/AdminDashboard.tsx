import React, { useState } from 'react';
import ClientManagement from './ClientManagement.tsx';
import DrawManagement from './DrawManagement.tsx';
import LiveBettingMonitor from './LiveBettingMonitor.tsx';
import SmartReporting from './AIReporting.tsx';
import SmartBulkBetting from './AIBulkBetting.tsx';
import ProfileSettings from './ProfileSettings.tsx';
import DataManagement from './DataManagement.tsx';

// Icons for the tabs
const DrawIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const MonitorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const BulkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClientsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const BackupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7a8 8 0 018-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;


const AdminDashboard = () => {
    // Default tab changed to 'clients' for a better workflow
    const [activeTab, setActiveTab] = useState('clients');

    const renderContent = () => {
        switch (activeTab) {
            case 'clients': return <ClientManagement />;
            case 'draws': return <DrawManagement />;
            case 'bulk': return <SmartBulkBetting />;
            case 'monitor': return <LiveBettingMonitor />;
            case 'reports': return <SmartReporting />;
            case 'backup': return <DataManagement />;
            case 'profile': return <ProfileSettings />;
            default: return null;
        }
    };

    const TabButton = ({ tabId, icon, children }: { tabId: string, icon: React.ReactNode, children: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-300
            ${activeTab === tabId 
                ? 'border-brand-primary text-brand-primary' 
                : 'border-transparent text-brand-text-secondary hover:border-brand-secondary hover:text-brand-text'}`}
        >
            {icon}
            <span className="hidden sm:inline">{children}</span>
        </button>
    );

    return (
        <div className="bg-brand-surface rounded-xl p-4 md:p-6 border border-brand-secondary">
            <div className="border-b border-brand-secondary">
                <nav className="-mb-px flex space-x-2 md:space-x-4 overflow-x-auto">
                    {/* Tabs have been reordered for a more logical admin workflow and icons have been added */}
                    <TabButton tabId="clients" icon={<ClientsIcon />}>Clients</TabButton>
                    <TabButton tabId="draws" icon={<DrawIcon />}>Draws</TabButton>
                    <TabButton tabId="bulk" icon={<BulkIcon />}>Bulk Betting</TabButton>
                    <TabButton tabId="monitor" icon={<MonitorIcon />}>Live Betting</TabButton>
                    <TabButton tabId="reports" icon={<ReportIcon />}>Reporting</TabButton>
                    <TabButton tabId="backup" icon={<BackupIcon />}>Backup</TabButton>
                    <TabButton tabId="profile" icon={<ProfileIcon />}>Profile</TabButton>
                </nav>
            </div>
            <div className="pt-6">{renderContent()}</div>
        </div>
    );
};

export default AdminDashboard;