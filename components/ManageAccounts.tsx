
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Account, Transaction } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { 
  Plus, 
  Landmark, 
  Wallet, 
  CreditCard, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Search,
  ArrowRightLeft,
  Calendar,
  Banknote,
  FileText,
  Send,
  RefreshCw,
  X
} from 'lucide-react';
import { useToast } from './Toast';
import NepaliDatePicker from './NepaliDatePicker';

const ManageAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('1'); // Default to Cash
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    name: '', type: 'Bank', balance: 0, bankName: '', accountNumber: ''
  });

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
     toAccountId: '',
     amount: '' as number | '',
     date: new Date().toISOString(),
     remarks: ''
  });

  // Adjust Balance Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({
     newBalance: '' as number | '',
     date: new Date().toISOString(),
     remarks: ''
  });

  const { addToast } = useToast();

  useEffect(() => {
    refreshAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadTransactions(selectedAccountId);
    }
  }, [selectedAccountId, accounts]); // Reload if accounts update (balance changes)

  const refreshAccounts = () => {
    const accs = db.getAccounts();
    setAccounts(accs);
    setTotalBalance(accs.reduce((sum, a) => sum + a.balance, 0));
    
    // Ensure selected account still exists, else select first
    if (!accs.find(a => a.id === selectedAccountId) && accs.length > 0) {
      setSelectedAccountId(accs[0].id);
    }
  };

  const loadTransactions = (accId: string) => {
    const allTxns = db.getTransactions();
    // Filter transactions linked to this account OR paymentMode logic for legacy compatibility
    // Legacy: if type is Cash and paymentMode='Cash' -> Cash Account (ID 1)
    
    const accountTxns = allTxns.filter(t => {
      // Direct Link
      if (t.accountId === accId) return true;
      // Transfer Destination
      if (t.type === 'TRANSFER' && t.transferAccountId === accId) return true;
      
      // Fallback for transactions created before accountId was added
      if (!t.accountId && accId === '1' && (t.paymentMode === 'Cash' || !t.paymentMode)) return true;
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

    setTransactions(accountTxns);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccount.name) {
      const account: Account = {
        id: newAccount.id || Date.now().toString(),
        name: newAccount.name!,
        type: newAccount.type as any || 'Bank',
        balance: Number(newAccount.balance) || 0,
        bankName: newAccount.bankName,
        accountNumber: newAccount.accountNumber,
        isDefault: false
      };

      if (newAccount.id) {
        db.updateAccount(account);
        addToast('Account updated successfully', 'success');
      } else {
        db.addAccount(account);
        addToast('New account created', 'success');
      }
      setShowAddModal(false);
      refreshAccounts();
      setNewAccount({ name: '', type: 'Bank', balance: 0, bankName: '', accountNumber: '' });
    }
  };

  const handleDeleteAccount = (id: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      const success = db.deleteAccount(id);
      if (success) {
        addToast('Account deleted successfully', 'success');
        refreshAccounts();
      } else {
        addToast("Cannot delete default account or account with existing transactions.", 'error');
      }
    }
  };

  const handleEditAccount = (acc: Account) => {
    setNewAccount({ ...acc });
    setShowAddModal(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.toAccountId && transferData.amount && selectedAccount) {
        const amount = Number(transferData.amount);
        if (amount <= 0) {
            addToast('Amount must be greater than 0', 'error');
            return;
        }
        if (selectedAccount.balance < amount) {
            addToast('Insufficient funds in source account', 'error');
            return;
        }
        if (transferData.toAccountId === selectedAccount.id) {
            addToast('Cannot transfer to same account', 'error');
            return;
        }

        const destAccount = accounts.find(a => a.id === transferData.toAccountId);

        db.addTransaction({
            id: Date.now().toString(),
            date: transferData.date,
            type: 'TRANSFER',
            partyId: '',
            partyName: `Transfer to ${destAccount?.name}`,
            items: [],
            totalAmount: amount,
            notes: transferData.remarks,
            accountId: selectedAccount.id, // Source
            transferAccountId: transferData.toAccountId // Destination
        });

        addToast('Transfer successful', 'success');
        setShowTransferModal(false);
        setTransferData({ toAccountId: '', amount: '', date: new Date().toISOString(), remarks: '' });
        refreshAccounts();
    }
  };

  const handleAdjustment = (e: React.FormEvent) => {
      e.preventDefault();
      if (adjustData.newBalance !== '' && selectedAccount) {
          const newBal = Number(adjustData.newBalance);
          const diff = newBal - selectedAccount.balance;
          
          if (diff === 0) {
              addToast('New balance is same as current balance', 'info');
              return;
          }

          db.addTransaction({
              id: Date.now().toString(),
              date: adjustData.date,
              type: 'BALANCE_ADJUSTMENT',
              partyId: '',
              partyName: 'System Adjustment',
              items: [],
              totalAmount: diff, // Signed difference (Positive = Credit, Negative = Debit)
              notes: adjustData.remarks || 'Manual Balance Correction',
              accountId: selectedAccount.id
          });

          addToast('Balance adjusted successfully', 'success');
          setShowAdjustModal(false);
          setAdjustData({ newBalance: '', date: new Date().toISOString(), remarks: '' });
          refreshAccounts();
      }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'Cash': return <Banknote className="w-6 h-6" />;
      case 'Bank': return <Landmark className="w-6 h-6" />;
      case 'Mobile Wallet': return <Wallet className="w-6 h-6" />;
      default: return <CreditCard className="w-6 h-6" />;
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="p-4 lg:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Accounts ({accounts.length})</h1>
        <div className="flex gap-2">
            <button 
            onClick={() => { setNewAccount({ name: '', type: 'Bank', balance: 0 }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
            >
            <Plus className="w-4 h-4" />
            Add Account
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
        {/* Left Sidebar: Account List */}
        <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl flex flex-col">
           <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-gray-500 text-sm">Total Balance:</span>
                 <span className="font-bold text-gray-900 text-lg">{formatCurrency(totalBalance)}</span>
              </div>
              <div className="text-xs text-gray-400 uppercase font-semibold mt-4 mb-2">Accounts</div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                    selectedAccountId === acc.id 
                      ? 'bg-emerald-50 border border-emerald-100' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedAccountId === acc.id ? 'bg-white text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                       {getAccountIcon(acc.type)}
                    </div>
                    <div>
                       <div className={`font-medium ${selectedAccountId === acc.id ? 'text-emerald-900' : 'text-gray-900'}`}>{acc.name}</div>
                       <div className="text-xs text-gray-400">{acc.type}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${acc.balance < 0 ? 'text-red-500' : (selectedAccountId === acc.id ? 'text-emerald-600' : 'text-gray-600')}`}>
                    {formatCurrency(acc.balance)}
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Right Content: Selected Account Details */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col">
           {selectedAccount ? (
             <>
               {/* Detail Header */}
               <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        {getAccountIcon(selectedAccount.type)}
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedAccount.name}</h2>
                        <div className="flex gap-4 text-sm text-gray-500">
                          {selectedAccount.accountNumber && <span>Ac No: {selectedAccount.accountNumber}</span>}
                          {selectedAccount.bankName && <span>{selectedAccount.bankName}</span>}
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                     <button 
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                     >
                        <Send className="w-4 h-4" />
                        Transfer
                     </button>
                     <button 
                        onClick={() => setShowAdjustModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                     >
                        <RefreshCw className="w-4 h-4" />
                        Adjust
                     </button>
                     <div className="w-px h-6 bg-gray-200 mx-1"></div>
                     <button onClick={() => handleEditAccount(selectedAccount)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <Pencil className="w-5 h-5" />
                     </button>
                     {!selectedAccount.isDefault && (
                        <button onClick={() => handleDeleteAccount(selectedAccount.id)} className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-lg">
                           <Trash2 className="w-5 h-5" />
                        </button>
                     )}
                  </div>
               </div>

               {/* Stats */}
               <div className="px-6 py-6">
                 <div className="text-sm text-gray-500 mb-1">Current Balance</div>
                 <div className="text-3xl font-bold text-gray-900">{formatCurrency(selectedAccount.balance)}</div>
               </div>

               {/* Transactions List */}
               <div className="flex-1 flex flex-col border-t border-gray-100 min-h-0">
                  <div className="px-6 py-4 flex items-center justify-between">
                     <h3 className="font-bold text-gray-800">Transactions Activity ({transactions.length})</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                           <tr>
                              <th className="px-6 py-3">Type</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Rec/Paid Amount</th>
                              <th className="px-6 py-3">Remarks</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {transactions.map(t => {
                              const isSource = t.accountId === selectedAccountId;
                              const isDest = t.transferAccountId === selectedAccountId;
                              let amount = t.totalAmount;
                              let isMoneyIn = ['SALE', 'PAYMENT_IN', 'PURCHASE_RETURN'].includes(t.type);

                              // Handle Transfer Logic for Display
                              if (t.type === 'TRANSFER') {
                                  if (isDest) isMoneyIn = true; // Received Transfer
                                  else isMoneyIn = false; // Sent Transfer
                              }

                              // Handle Adjustment Logic for Display
                              if (t.type === 'BALANCE_ADJUSTMENT') {
                                  // t.totalAmount is signed difference.
                                  // Positive = Added Money (In). Negative = Removed Money (Out).
                                  if (t.totalAmount >= 0) {
                                      isMoneyIn = true;
                                  } else {
                                      isMoneyIn = false;
                                      amount = Math.abs(t.totalAmount);
                                  }
                              }

                              // Handle Standard Expense Logic
                              if (['PURCHASE', 'PAYMENT_OUT', 'SALE_RETURN', 'EXPENSE'].includes(t.type)) {
                                  isMoneyIn = false;
                              }

                              return (
                                 <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                       <div className="font-medium text-gray-900">
                                           {t.type === 'TRANSFER' ? (isDest ? 'Received Transfer' : 'Transfer Out') : t.type.replace('_', ' ')}
                                       </div>
                                       <div className="text-xs text-gray-400">#{t.id} - {t.partyName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                       {formatNepaliDate(t.date)}
                                    </td>
                                    <td className={`px-6 py-4 font-bold ${isMoneyIn ? 'text-emerald-600' : 'text-red-500'}`}>
                                       {isMoneyIn ? '+' : '-'}{formatCurrency(amount)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]">
                                       {t.notes || '--'}
                                    </td>
                                 </tr>
                              );
                           })}
                           {transactions.length === 0 && (
                              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No transactions found</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
             </>
           ) : (
             <div className="flex items-center justify-center h-full text-gray-400">Select an account to view details</div>
           )}
        </div>
      </div>

      {/* Add/Edit Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{newAccount.id ? 'Edit Account' : 'Add New Account'}</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                   <input required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Laxmi Sunrise Bank" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                   <select className="w-full border border-gray-300 rounded-lg p-2 outline-none" value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value as any})}>
                      <option value="Bank">Bank Account</option>
                      <option value="Cash">Cash In Hand</option>
                      <option value="Mobile Wallet">Mobile Wallet (Esewa/Khalti)</option>
                      <option value="Other">Other</option>
                   </select>
                </div>
                
                {newAccount.type === 'Bank' && (
                  <>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2 outline-none" placeholder="e.g. Laxmi Sunrise" value={newAccount.bankName || ''} onChange={e => setNewAccount({...newAccount, bankName: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2 outline-none" placeholder="0000..." value={newAccount.accountNumber || ''} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})} />
                     </div>
                  </>
                )}

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                   <input type="number" className="w-full border border-gray-300 rounded-lg p-2 outline-none" placeholder="0" value={newAccount.balance} onChange={e => setNewAccount({...newAccount, balance: Number(e.target.value)})} />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                   <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                   <button type="submit" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">{newAccount.id ? 'Update' : 'Save'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Transfer Funds</h2>
                <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
                <div className="text-xs text-gray-500 uppercase font-semibold">Source Account</div>
                <div className="font-bold text-gray-800">{selectedAccount.name}</div>
                <div className="text-sm text-gray-600">Balance: {formatCurrency(selectedAccount.balance)}</div>
             </div>

             <form onSubmit={handleTransfer} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transfer To</label>
                    <select 
                        required
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={transferData.toAccountId}
                        onChange={e => setTransferData({...transferData, toAccountId: e.target.value})}
                    >
                        <option value="">Select Destination Account</option>
                        {accounts.filter(a => a.id !== selectedAccount.id).map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                        ))}
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input 
                        type="number" 
                        required
                        min="1"
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0.00"
                        value={transferData.amount}
                        onChange={e => setTransferData({...transferData, amount: e.target.value ? Number(e.target.value) : ''})}
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="w-full">
                       <NepaliDatePicker value={transferData.date} onChange={(d) => setTransferData({...transferData, date: d})} />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. Bank Deposit"
                        value={transferData.remarks}
                        onChange={e => setTransferData({...transferData, remarks: e.target.value})}
                    />
                 </div>

                 <button 
                   type="submit" 
                   className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mt-2"
                 >
                    Confirm Transfer
                 </button>
             </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Adjust Balance</h2>
                <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
             </div>
             
             <div className="text-sm text-gray-600 mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                This will create a correction entry to set your account balance to the actual physical amount.
             </div>

             <div className="flex justify-between mb-2 px-1">
                 <span className="text-sm text-gray-500">Current System Balance:</span>
                 <span className="font-bold">{formatCurrency(selectedAccount.balance)}</span>
             </div>

             <form onSubmit={handleAdjustment} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actual Physical Balance</label>
                    <input 
                        type="number" 
                        required
                        className="w-full border border-gray-300 rounded-lg p-2 text-lg font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="0.00"
                        value={adjustData.newBalance}
                        onChange={e => setAdjustData({...adjustData, newBalance: e.target.value ? Number(e.target.value) : ''})}
                    />
                 </div>
                 
                 {adjustData.newBalance !== '' && (
                     <div className="text-right text-sm">
                        <span className="text-gray-500">Difference: </span>
                        <span className={`font-bold ${Number(adjustData.newBalance) - selectedAccount.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Number(adjustData.newBalance) - selectedAccount.balance)}
                        </span>
                     </div>
                 )}

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="w-full">
                       <NepaliDatePicker value={adjustData.date} onChange={(d) => setAdjustData({...adjustData, date: d})} />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <input 
                        type="text" 
                        required
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="e.g. Reconciliation correction"
                        value={adjustData.remarks}
                        onChange={e => setAdjustData({...adjustData, remarks: e.target.value})}
                    />
                 </div>

                 <button 
                   type="submit" 
                   className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium mt-2"
                 >
                    Save Adjustment
                 </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAccounts;
