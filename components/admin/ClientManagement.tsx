import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { Client, Role, GameType, PrizeRate, Draw, DrawStatus, TransactionType } from '../../types/index.ts';
import Modal from '../common/Modal.tsx';
import PasswordInput from '../common/PasswordInput.tsx';
import ClientDrawReport from './ClientDrawReport.tsx';
import FinancialLedger from '../common/FinancialLedger.tsx';
import { defaultPrizeRates } from '../../data/mockData.ts';


type ModalType = 'ADD_CLIENT' | 'MANAGE_WALLET' | 'CHANGE_PASSWORD' | 'EDIT_CLIENT' | 'EDIT_RATES' | 'CLIENT_DRAW_REPORT' | 'FINANCIAL_LEDGER';

const defaultCommissionRates: Record<GameType, number> = {
    [GameType.FourDigits]: 0,
    [GameType.ThreeDigits]: 0,
    [GameType.TwoDigits]: 0,
    [GameType.OneDigit]: 0,
    [GameType.Combo]: 0,
    [GameType.Positional]: 0,
};

const ClientManagement = () => {
    const { clients, draws, updateClient, registerClient, changeClientPasswordByAdmin, updateClientDetailsByAdmin, adjustClientWallet } = useAppContext();
    
    const [modal, setModal] = useState<{ type: ModalType; data?: Client } | null>(null);
    const [actionsMenu, setActionsMenu] = useState<string | null>(null);
    const [selectedReportDrawId, setSelectedReportDrawId] = useState<string>('');
    const [newClientData, setNewClientData] = useState({
        clientId: '',
        username: '',
        password: '',
        contact: '',
        area: '',
        wallet: 0,
        commissionRates: { ...defaultCommissionRates },
        prizeRates: { ...defaultPrizeRates }
    });
    const [editClientData, setEditClientData] = useState({ clientId: '', username: '', contact: '', area: '' });
    const [editRatesData, setEditRatesData] = useState<{ commissionRates: Record<GameType, number>; prizeRates: Record<GameType, PrizeRate> }>({ commissionRates: defaultCommissionRates, prizeRates: defaultPrizeRates });
    const [walletAmount, setWalletAmount] = useState<string>('');
    const [walletAction, setWalletAction] = useState<'deposit' | 'withdraw'>('deposit');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    
    const clientsList = useMemo(() => 
        clients.filter(c => c.role === Role.Client && (c.username.toLowerCase().includes(searchTerm.toLowerCase()) || c.clientId.toLowerCase().includes(searchTerm.toLowerCase())))
    , [clients, searchTerm]);

    const finishedDraws = useMemo(() => 
        draws.filter(d => d.status === DrawStatus.Finished).sort((a,b) => b.drawTime.getTime() - a.drawTime.getTime()), 
    [draws]);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleOpenModal = (type: ModalType, data?: Client) => {
        setNotification(null);
        setActionsMenu(null); // Close dropdown when modal opens
        setModal({ type, data });
        if (type === 'ADD_CLIENT') {
            setNewClientData({
                clientId: '',
                username: '',
                password: '',
                contact: '',
                area: '',
                wallet: 0,
                commissionRates: { ...defaultCommissionRates },
                prizeRates: { ...defaultPrizeRates }
            });
        }
        if (type === 'CHANGE_PASSWORD') {
            setNewPassword('');
            setConfirmPassword('');
        }
        if (type === 'MANAGE_WALLET') {
            setWalletAction('deposit');
            setWalletAmount('');
        }
        if (type === 'EDIT_CLIENT' && data) {
            setEditClientData({ clientId: data.clientId, username: data.username, contact: data.contact, area: data.area });
        }
        if (type === 'EDIT_RATES' && data) {
            setEditRatesData({ commissionRates: { ...defaultCommissionRates, ...data.commissionRates }, prizeRates: { ...defaultPrizeRates, ...(data.prizeRates || {}) } });
        }
        if (type === 'CLIENT_DRAW_REPORT') {
            setSelectedReportDrawId('');
        }
    };
    
    const handleCloseModal = () => {
        setModal(null);
        setWalletAmount('');
        setNewPassword('');
        setConfirmPassword('');
        setEditClientData({ clientId: '', username: '', contact: '', area: '' });
        setEditRatesData({ commissionRates: defaultCommissionRates, prizeRates: defaultPrizeRates });
        setSelectedReportDrawId('');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientData.clientId.trim()) {
            showNotification('error', "Client ID is required.");
            return;
        }
        if (newClientData.password.length < 4) {
            showNotification('error', "Password must be at least 4 characters.");
            return;
        }
        if (!newClientData.username.trim()) {
            showNotification('error', "Username is required.");
            return;
        }

        const result = await registerClient({ 
            ...newClientData, 
            wallet: Number(newClientData.wallet) || 0,
        });
        showNotification(result.success ? 'success' : 'error', result.message);
        if (result.success) {
            handleCloseModal();
        }
    };

    const handleEditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;

        if (!editClientData.clientId.trim() || !editClientData.username.trim()) {
            showNotification('error', "Client ID and Username cannot be empty.");
            return;
        }

        const result = await updateClientDetailsByAdmin(client.id, {
            clientId: editClientData.clientId,
            username: editClientData.username,
            contact: editClientData.contact,
            area: editClientData.area,
        });

        showNotification(result.success ? 'success' : 'error', result.message);
        if (result.success) {
            handleCloseModal();
        }
    };
    
    const handleEditRates = (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;

        updateClient({ ...client, commissionRates: editRatesData.commissionRates, prizeRates: editRatesData.prizeRates });
        showNotification('success', `Rates for ${client.username} updated successfully.`);
        handleCloseModal();
    };


    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;

        if (newPassword.length < 4) {
            showNotification('error', 'Password must be at least 4 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('error', 'Passwords do not match.');
            return;
        }

        changeClientPasswordByAdmin(client.id, newPassword, (result) => {
            showNotification(result.success ? 'success' : 'error', result.message);
            if (result.success) {
                handleCloseModal();
            }
        });
    };

    const handleWalletUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = modal?.data;
        if (!client) return;
        const amount = parseFloat(walletAmount);
        if (isNaN(amount) || amount <= 0) {
            showNotification('error', 'Please enter a valid positive amount.');
            return;
        }

        const description = walletAction === 'deposit' ? 'Deposit: Manual by Admin' : 'Withdrawal: Manual by Admin';
        const transactionType = walletAction === 'deposit' ? TransactionType.Credit : TransactionType.Debit;
        
        const result = await adjustClientWallet(client.id, amount, transactionType, description);

        if(result.success) {
            showNotification('success', `Wallet for ${client.username} updated successfully.`);
            handleCloseModal();
        } else {
            showNotification('error', result.message);
        }
    };

    const toggleClientStatus = (client: Client) => {
        setActionsMenu(null);
        updateClient({ ...client, isActive: !client.isActive });
        showNotification('success', `Status for ${client.username} has been updated.`);
    };

    const gameCategoriesForForm = [
        { key: GameType.FourDigits, label: '4 Digits'},
        { key: GameType.ThreeDigits, label: '3 Digits'},
        { key: GameType.TwoDigits, label: '2 Digits'},
        { key: GameType.OneDigit, label: '1 Digit'},
    ];
    
    const renderModalContent = () => {
        if (!modal) return null;
        const client = modal.data;

        switch (modal.type) {
            case 'FINANCIAL_LEDGER':
                if (!client) return null;
                return <FinancialLedger clientId={client.id} />;
            case 'CLIENT_DRAW_REPORT':
                if (!client) return null;
                const selectedDraw = finishedDraws.find(d => d.id === selectedReportDrawId);
                return (
                    <div className="space-y-4">
                        <div>
                             <label htmlFor="draw-select" className="block text-sm font-bold text-brand-text-secondary mb-2">Select a Finished Draw</label>
                             <select
                                id="draw-select"
                                value={selectedReportDrawId}
                                onChange={e => setSelectedReportDrawId(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                                <option value="">-- Choose a draw --</option>
                                {finishedDraws.map(draw => (
                                    <option key={draw.id} value={draw.id}>Draw {draw.name} ({draw.drawTime.toLocaleDateString()})</option>
                                ))}
                            </select>
                        </div>
                        {selectedDraw && <ClientDrawReport client={client} draw={selectedDraw} />}
                    </div>
                )
            case 'ADD_CLIENT':
                return (
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="p-4 bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                            <h3 className="text-lg font-bold text-brand-primary mb-4">Client Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Client ID</label>
                                    <input type="text" placeholder="e.g., DDL0001" value={newClientData.clientId} onChange={e => setNewClientData(p => ({...p, clientId: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Client Name</label>
                                    <input type="text" placeholder="e.g., Adnan" value={newClientData.username} onChange={e => setNewClientData(p => ({...p, username: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Password</label>
                                    <PasswordInput placeholder="min. 4 chars" value={newClientData.password} onChange={e => setNewClientData(p => ({...p, password: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Contact No.</label>
                                    <input type="text" placeholder="e.g., 3001234567" value={newClientData.contact} onChange={e => setNewClientData(p => ({...p, contact: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Area</label>
                                    <input type="text" placeholder="e.g., Khi" value={newClientData.area} onChange={e => setNewClientData(p => ({...p, area: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                                <div>
                                    <label className="block text-brand-text-secondary text-sm font-bold mb-2">Initial Deposit</label>
                                    <input type="number" placeholder="e.g., 10000" value={newClientData.wallet === 0 ? '' : newClientData.wallet} onFocus={(e) => { if(e.target.value === '0') e.target.select()}} onChange={e => setNewClientData(p => ({...p, wallet: Number(e.target.value)}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                            <h3 className="text-lg font-bold text-brand-primary mb-4">Rates & Commission</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-brand-text">
                                    <thead className="bg-brand-secondary/50 text-brand-text-secondary text-center">
                                        <tr>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Game</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Commission (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Prize: First (F) (%)</th>
                                            <th className="py-2 px-4 font-bold border-b border-brand-secondary">Prize: Second (S) (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-secondary/50">
                                        {gameCategoriesForForm.map(({ key, label }) => (
                                            <tr key={key} className="bg-brand-surface/50 text-center">
                                                <td className="py-2 px-4 text-left font-semibold text-brand-text-secondary border-r border-brand-secondary">{label}</td>
                                                <td className="py-2 px-2 border-r border-brand-secondary">
                                                    <input type="number" step="0.1" className="w-24 bg-brand-bg border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                     value={newClientData.commissionRates[key]}
                                                     onChange={e => setNewClientData(p => ({ ...p, commissionRates: { ...p.commissionRates, [key]: parseFloat(e.target.value) || 0 } }))}
                                                    />
                                                </td>
                                                <td className="py-2 px-2 border-r border-brand-secondary">
                                                    <input type="number" className="w-24 bg-brand-bg border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                     value={newClientData.prizeRates[key]?.first}
                                                     onChange={e => setNewClientData(p => ({ ...p, prizeRates: { ...p.prizeRates, [key]: { ...p.prizeRates[key], first: Number(e.target.value) || 0 } } }))}
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input type="number" className="w-24 bg-brand-bg border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"
                                                     value={newClientData.prizeRates[key]?.second}
                                                     onChange={e => setNewClientData(p => ({ ...p, prizeRates: { ...p.prizeRates, [key]: { ...p.prizeRates[key], second: Number(e.target.value) || 0 } } }))}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <button type="submit" className="w-full bg-brand-primary hover:bg-yellow-400 text-brand-bg font-bold py-3 px-4 rounded-lg mt-4">Create Client Account</button>
                    </form>
                );
            case 'EDIT_CLIENT':
                return (
                     <form onSubmit={handleEditClient} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editClientId">Client ID</label>
                                <input id="editClientId" name="clientId" type="text" value={editClientData.clientId} onChange={e => setEditClientData(p => ({...p, clientId: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                            </div>
                             <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editUsername">Username</label>
                                <input id="editUsername" name="username" type="text" value={editClientData.username} onChange={e => setEditClientData(p => ({...p, username: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" required/>
                            </div>
                            <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editContact">Contact No.</label>
                                <input id="editContact" name="contact" type="text" value={editClientData.contact} onChange={e => setEditClientData(p => ({...p, contact: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            </div>
                            <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="editArea">Area</label>
                                <input id="editArea" name="area" type="text" value={editClientData.area} onChange={e => setEditClientData(p => ({...p, area: e.target.value}))} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Update Details</button>
                    </form>
                );
            case 'EDIT_RATES':
                 const clientForRates = modal.data;
                 if (!clientForRates) return null;
                return (
                    <form onSubmit={handleEditRates} className="space-y-4">
                        <div className="overflow-x-auto bg-brand-secondary/30 rounded-lg border border-brand-secondary">
                            <table className="w-full text-sm text-brand-text">
                                <thead className="bg-brand-secondary/50 text-brand-text-secondary text-center">
                                    <tr>
                                        <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Game</th>
                                        <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Commission (%)</th>
                                        <th className="py-2 px-4 font-bold border-b border-r border-brand-secondary">Prize: First (F) (%)</th>
                                        <th className="py-2 px-4 font-bold border-b border-brand-secondary">Prize: Second (S) (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-secondary/50">
                                    {(
                                        [
                                            { key: GameType.FourDigits, label: '4 (Four) Digit'},
                                            { key: GameType.ThreeDigits, label: '3 (Three) Digit'},
                                            { key: GameType.TwoDigits, label: '2 (Two) Digit'},
                                            { key: GameType.OneDigit, label: '1 (One) Digit'},
                                        ] as const
                                    ).map(game => (
                                        <tr key={game.key} className="bg-brand-surface/50 text-center">
                                            <td className="py-2 px-4 text-left font-semibold text-brand-text-secondary border-r border-brand-secondary">{game.label}</td>
                                            <td className="py-2 px-2 border-r border-brand-secondary">
                                                <div className="mx-auto max-w-[120px]">
                                                    <input type="number" step="0.1" value={editRatesData.commissionRates[game.key] || 0} onChange={e => setEditRatesData(p => ({...p, commissionRates: {...p.commissionRates, [game.key]: parseFloat(e.target.value) || 0 }}))} className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 border-r border-brand-secondary">
                                                <div className="mx-auto max-w-[120px]">
                                                    <input type="number" value={editRatesData.prizeRates[game.key]?.first || 0} onChange={e => setEditRatesData(p => ({...p, prizeRates: {...p.prizeRates, [game.key]: {...p.prizeRates[game.key], first: Number(e.target.value) || 0} }}))} className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2">
                                                <div className="mx-auto max-w-[120px]">
                                                    <input type="number" value={editRatesData.prizeRates[game.key]?.second || 0} onChange={e => setEditRatesData(p => ({...p, prizeRates: {...p.prizeRates, [game.key]: {...p.prizeRates[game.key], second: Number(e.target.value) || 0} }}))} className="w-full bg-brand-surface border border-brand-secondary rounded py-1 px-2 text-center text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-primary"/>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Update Rates</button>
                    </form>
                );
            case 'MANAGE_WALLET':
                if (!client) return null;
                return (
                     <div className="space-y-4">
                        <p className="text-brand-text-secondary">Current Balance: <span className="font-bold text-brand-text">RS. {client.wallet.toFixed(2)}</span></p>
                        <div className="border-b border-brand-secondary">
                             <nav className="-mb-px flex space-x-4">
                                <button
                                    onClick={() => setWalletAction('deposit')}
                                    className={`px-3 py-2 font-semibold ${walletAction === 'deposit' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}
                                >
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setWalletAction('withdraw')}
                                    className={`px-3 py-2 font-semibold ${walletAction === 'withdraw' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-secondary'}`}
                                >
                                    Withdraw
                                </button>
                            </nav>
                        </div>
                        <form onSubmit={handleWalletUpdate} className="pt-4">
                             <div>
                                <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="walletAmount">Amount</label>
                                <input id="walletAmount" type="number" value={walletAmount} onChange={e => setWalletAmount(e.target.value)} className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="e.g., 500" required/>
                            </div>
                            <button
                                type="submit"
                                className={`w-full mt-4 font-bold text-white py-2 px-4 rounded-lg ${walletAction === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                            >
                                {walletAction === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                            </button>
                        </form>
                    </div>
                );
            case 'CHANGE_PASSWORD':
                if (!client) return null;
                return (
                     <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="newPassword">New Password</label>
                            <PasswordInput
                                id="newPassword"
                                name="newPassword"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-brand-text-secondary text-sm font-bold mb-2" htmlFor="confirmPassword">Confirm New Password</label>
                            <PasswordInput
                                id="confirmPassword"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Update Password</button>
                    </form>
                );
            default: return null;
        }
    };

    return (
        <div>
            {notification && (
                <div className={`fixed top-28 right-8 z-50 p-4 rounded-lg shadow-lg text-sm text-center ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {notification.message}
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-brand-text">Client Management ({clientsList.length})</h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <input type="text" placeholder="Search by username or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-flex-grow w-full md:w-64 bg-brand-surface border border-brand-secondary rounded-lg py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary" />
                    <button onClick={() => handleOpenModal('ADD_CLIENT')} className="bg-brand-primary text-brand-bg font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors whitespace-nowrap">+ Add Client</button>
                </div>
            </div>

            <div className="overflow-x-auto bg-brand-surface rounded-lg shadow">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text uppercase bg-brand-secondary/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Client ID</th>
                            <th scope="col" className="px-6 py-3">Username</th>
                            <th scope="col" className="px-6 py-3">Contact / Area</th>
                            <th scope="col" className="px-6 py-3">Wallet</th>
                            <th scope="col" className="px-6 py-3 text-center">Status</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientsList.map(client => (
                            <tr key={client.id} className="bg-brand-surface border-b border-brand-secondary hover:bg-brand-secondary/20 transition-colors">
                                <td className="px-6 py-4 font-mono text-brand-text-secondary">{client.clientId}</td>
                                <th scope="row" className="px-6 py-4 font-medium text-brand-text whitespace-nowrap">
                                    {client.username}
                                </th>
                                <td className="px-6 py-4">{client.contact}<br/><span className="text-xs">{client.area}</span></td>
                                <td className="px-6 py-4 font-mono text-brand-text">RS. {client.wallet.toFixed(2)}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.isActive ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                        {client.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="relative inline-block text-left">
                                        <button 
                                            onClick={() => setActionsMenu(actionsMenu === client.id ? null : client.id)}
                                            className="inline-flex justify-center w-full rounded-md border border-brand-secondary shadow-sm px-4 py-2 bg-brand-surface text-sm font-medium text-brand-text-secondary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-primary"
                                        >
                                            Actions
                                            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {actionsMenu === client.id && (
                                            <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-brand-surface ring-1 ring-brand-primary ring-opacity-50 z-10">
                                                <div className="py-1" role="menu" aria-orientation="vertical">
                                                    <button onClick={() => handleOpenModal('FINANCIAL_LEDGER', client)} className="block w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">View Ledger</button>
                                                    <button onClick={() => handleOpenModal('CLIENT_DRAW_REPORT', client)} className="block w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">View Draw Report</button>
                                                    <button onClick={() => handleOpenModal('MANAGE_WALLET', client)} className="block w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">Manage Wallet</button>
                                                    <div className="border-t border-brand-secondary my-1"></div>
                                                    <button onClick={() => handleOpenModal('EDIT_CLIENT', client)} className="block w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">Edit Details</button>
                                                    <button onClick={() => handleOpenModal('EDIT_RATES', client)} className="block w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">Edit Rates</button>
                                                    <button onClick={() => handleOpenModal('CHANGE_PASSWORD', client)} className="block w-full text-left px-4 py-2 text-sm text-brand-text-secondary hover:bg-brand-secondary hover:text-brand-text">Change Password</button>
                                                     <div className="border-t border-brand-secondary my-1"></div>
                                                    <button onClick={() => toggleClientStatus(client)} className="block w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-brand-secondary hover:text-yellow-300">
                                                        {client.isActive ? 'Suspend Client' : 'Activate Client'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {clientsList.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-brand-text-secondary">No clients found. {searchTerm && "Try adjusting your search."}</p>
                    </div>
                )}
            </div>
            
            {modal && (
                <Modal 
                    title={
                        modal.type === 'ADD_CLIENT' ? 'Add New Client' :
                        modal.type === 'EDIT_CLIENT' ? `Edit Details: ${modal.data?.username}` :
                        modal.type === 'EDIT_RATES' ? `Edit Rates: ${modal.data?.username}` :
                        modal.type === 'CHANGE_PASSWORD' ? `Change Password: ${modal.data?.username}` :
                        modal.type === 'CLIENT_DRAW_REPORT' ? `Bet Report: ${modal.data?.username}` :
                        modal.type === 'FINANCIAL_LEDGER' ? `Financial Ledger: ${modal.data?.username}` :
                        `Manage Wallet: ${modal.data?.username}`
                    } 
                    onClose={handleCloseModal}
                >
                    {renderModalContent()}
                </Modal>
            )}
        </div>
    );
};

export default ClientManagement;