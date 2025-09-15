

import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { TransactionType } from '../../types';

const FinancialLedger: React.FC<{ clientId: string }> = ({ clientId }) => {
    const { transactions, clients } = useAppContext();
    const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

    const clientTransactions = useMemo(() => {
        return transactions
            .filter(t => t.clientId === clientId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [transactions, clientId]);

    if (!client) {
        return <p className="text-brand-text-secondary">Client not found.</p>;
    }
    
    if (clientTransactions.length === 0) {
        return <div className="text-center py-8"><p className="text-brand-text-secondary">No financial history found for this client.</p></div>;
    }

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="overflow-x-auto bg-brand-bg rounded-lg max-h-[60vh]">
            <table className="min-w-full text-sm text-left text-brand-text-secondary">
                <thead className="text-xs text-brand-text uppercase bg-brand-secondary/80 sticky top-0">
                    <tr>
                        <th scope="col" className="px-6 py-3">Date</th>
                        <th scope="col" className="px-6 py-3">Description</th>
                        <th scope="col" className="px-6 py-3 text-right">Debit</th>
                        <th scope="col" className="px-6 py-3 text-right">Credit</th>
                        <th scope="col" className="px-6 py-3 text-right">Balance</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-secondary/50">
                    {clientTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-brand-secondary/30">
                            <td className="px-6 py-3 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                            <td className="px-6 py-3">{tx.description}</td>
                            <td className="px-6 py-3 text-right font-mono text-yellow-400">
                                {tx.type === TransactionType.Debit ? `RS. ${formatCurrency(tx.amount)}` : '-'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-green-400">
                                {tx.type === TransactionType.Credit ? `RS. ${formatCurrency(tx.amount)}` : '-'}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-brand-text">RS. {formatCurrency(tx.balanceAfter)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FinancialLedger;
