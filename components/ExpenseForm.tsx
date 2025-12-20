
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Transaction, Account, CashNoteCount, Denomination } from '../types';
import NepaliDatePicker from './NepaliDatePicker';
import { X, Save, Receipt, ChevronDown, Banknote, RotateCcw, Sparkles } from 'lucide-react';
import { formatCurrency } from '../services/formatService';
import { useToast } from './Toast';

const DENOMINATIONS: Denomination[] = [1000, 500, 100, 50, 20, 10, 5, 2, 1];

interface ExpenseFormProps {
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: () => void;
}

const COMMON_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salary',
  'Petrol',
  'Transportation',
  'Tea & Snacks',
  'Maintenance',
  'Office Supplies',
  'Internet',
  'Telephone',
  'Marketing',
  'Other'
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({ initialData, onClose, onSave }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expNo, setExpNo] = useState(Date.now().toString().slice(-6));
  const [date, setDate] = useState(new Date().toISOString());
  const [category, setCategory] = useState('Petrol');
  const [selectedAccountId, setSelectedAccountId] = useState('1'); // Default Cash
  const [amount, setAmount] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [paidTo, setPaidTo] = useState('');

  // Cash Breakdown State
  const [showCashModal, setShowCashModal] = useState(false);
  const [receivedNotes, setReceivedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
  const [returnedNotes, setReturnedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));

  const { addToast } = useToast();

  useEffect(() => {
    setAccounts(db.getAccounts());
    if (initialData) {
      setExpNo(initialData.id);
      setDate(initialData.date);
      setCategory(initialData.category || 'Other');
      setAmount(initialData.totalAmount);
      setRemarks(initialData.notes || '');
      setPaidTo(initialData.partyName !== 'General Expense' ? initialData.partyName : '');
      if (initialData.accountId) {
        setSelectedAccountId(initialData.accountId);
      }
      if (initialData.cashBreakdown) {
          setReceivedNotes(initialData.cashBreakdown.received);
          setReturnedNotes(initialData.cashBreakdown.returned);
      }
    }
  }, [initialData]);

  // Form Shortcut Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerSave();
      }
      if (e.key === 'Escape') {
        if (!showCashModal) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [amount, category, expNo, date, remarks, paidTo, selectedAccountId, showCashModal]);

  const triggerSave = () => {
    if (!amount || !category) {
      addToast('Please fill required fields (Amount and Category)', 'error');
      return;
    }
    
    const account = accounts.find(a => a.id === selectedAccountId);
    const isCash = account?.type === 'Cash';

    const transactionData: Transaction = {
      id: expNo,
      date: date,
      type: 'EXPENSE',
      partyId: '', // No specific party ID for general expenses
      partyName: paidTo || 'General Expense',
      items: [], 
      totalAmount: Number(amount),
      notes: remarks,
      category: category,
      accountId: selectedAccountId,
      paymentMode: isCash ? 'Cash' : 'Bank',
      // Store the physical notes given out in the 'returned' array (which subtracts from drawer in db.ts)
      cashBreakdown: isCash ? { received: receivedNotes, returned: returnedNotes } : undefined
    };

    if (initialData) {
      db.updateTransaction(initialData.id, transactionData);
    } else {
      db.addTransaction(transactionData);
    }

    onSave();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSave();
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const isCashAccount = selectedAccount?.type === 'Cash';
  const notesOutSum = returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);

  const handleAutoSuggest = () => {
      const drawer = db.getCashDrawer();
      let diff = Number(amount || 0);
      if (diff <= 0) return;
      
      const suggestions: CashNoteCount[] = [];
      const tempAvailable = new Map(drawer.notes.map(n => [n.denomination, n.count]));

      for (const d of DENOMINATIONS) {
          const avail = tempAvailable.get(d) || 0;
          if (avail > 0 && diff >= d) {
              const count = Math.min(Math.floor(diff / d), avail);
              suggestions.push({ denomination: d, count });
              diff -= (count * d);
          } else suggestions.push({ denomination: d, count: 0 });
      }
      setReturnedNotes(suggestions);
      addToast('Notes auto-suggested from drawer availability.', 'info');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
               <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData ? 'Edit Expense' : 'Add New Expense'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expense No</label>
               <input 
                 type="text" 
                 required
                 className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono bg-gray-50"
                 value={expNo}
                 readOnly={!!initialData}
                 onChange={e => setExpNo(e.target.value)}
               />
             </div>
             <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
               <div className="w-full">
                 <NepaliDatePicker value={date} onChange={setDate} />
               </div>
             </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
             <div className="relative">
               <select 
                 required
                 className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
                 value={category}
                 onChange={e => setCategory(e.target.value)}
               >
                 {COMMON_CATEGORIES.map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
             </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Total Amount</label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rs.</span>
               <input 
                 type="number" 
                 required
                 min="0.01"
                 step="0.01"
                 className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-xl font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                 placeholder="0.00"
                 value={amount}
                 onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
               />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Paid From</label>
               <div className="flex gap-2">
                <select 
                    className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                    ))}
                </select>
                {isCashAccount && (
                    <button 
                      type="button" 
                      onClick={() => setShowCashModal(true)} 
                      className={`p-2 rounded-lg border flex items-center justify-center transition-all ${notesOutSum > 0 ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'}`}
                      title="Cash Drawer Note Entry"
                    >
                        <Banknote className="w-5 h-5" />
                    </button>
                )}
               </div>
            </div>
            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Paid To (Optional)</label>
               <input 
                 type="text" 
                 className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                 placeholder="Name of receiver..."
                 value={paidTo}
                 onChange={e => setPaidTo(e.target.value)}
               />
            </div>
          </div>

          <div>
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Remarks</label>
             <textarea 
               className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] resize-none"
               placeholder="Enter description..."
               value={remarks}
               onChange={e => setRemarks(e.target.value)}
             />
          </div>

        </form>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSave}
            disabled={!amount}
            className="px-6 py-2.5 bg-emerald-500 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save Expense
          </button>
        </div>

      </div>

      {/* Cash Note Breakdown Modal */}
      {showCashModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                  <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2"><Banknote className="w-6 h-6" /> Cash Out Entry</h3>
                        <p className="text-brand-100 text-xs mt-1">Specify exact notes being removed from the drawer.</p>
                      </div>
                      <button onClick={() => setShowCashModal(false)} className="text-white hover:opacity-70"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <span className="text-sm font-bold text-gray-600 uppercase">Expense Amount:</span>
                          <span className="text-xl font-black text-gray-900">{formatCurrency(Number(amount || 0))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                          <h4 className="font-bold text-gray-800 text-sm uppercase">Physical Notes Leaving Drawer</h4>
                          <button 
                            type="button" 
                            onClick={handleAutoSuggest} 
                            className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold border border-emerald-100 flex items-center gap-1"
                          >
                              <Sparkles className="w-3 h-3" /> Auto-Suggest
                          </button>
                      </div>

                      <div className="space-y-2">
                          {returnedNotes.map((n, i) => (
                              <div key={n.denomination} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${n.count > 0 ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-100'}`}>
                                  <div className="flex items-center gap-3">
                                    {/* Fix: changed note.denomination to n.denomination */}
                                    <div className={`w-10 h-7 rounded flex items-center justify-center font-bold text-xs ${n.denomination >= 500 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{n.denomination}</div>
                                    <X className="w-3 h-3 text-gray-300" />
                                  </div>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    className="w-20 p-2 border border-gray-300 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-brand-500" 
                                    value={n.count || ''} 
                                    onChange={e => {
                                      const val = parseInt(e.target.value) || 0; 
                                      setReturnedNotes(prev => prev.map((item, idx) => idx === i ? {...item, count: val} : item));
                                    }} 
                                  />
                                  <span className="w-24 text-right font-bold text-gray-600">{formatCurrency(n.denomination * n.count)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                      <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Physical Value</p>
                          <div className={`text-lg font-bold ${notesOutSum === Number(amount || 0) ? 'text-emerald-600' : 'text-orange-500'}`}>{formatCurrency(notesOutSum)}</div>
                      </div>
                      <button type="button" onClick={() => setShowCashModal(false)} className="px-10 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all">Done</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExpenseForm;