
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Party, Transaction, Account, CashNoteCount, Denomination } from '../types';
import NepaliDatePicker from './NepaliDatePicker';
import { X, Save, ArrowDownLeft, ArrowUpRight, Banknote, Sparkles, Check } from 'lucide-react';
import { formatCurrency } from '../services/formatService';
import { useToast } from './Toast';

const DENOMINATIONS: Denomination[] = [1000, 500, 100, 50, 20, 10, 5, 2, 1];

interface PaymentFormProps {
  type: 'PAYMENT_IN' | 'PAYMENT_OUT';
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ type, initialData, onClose, onSave }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  
  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);
  
  const [date, setDate] = useState(new Date().toISOString());
  const [voucherNo, setVoucherNo] = useState(Date.now().toString().slice(-6));
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedAccountId, setSelectedAccountId] = useState('1'); 
  const [notes, setNotes] = useState('');

  const [showCashModal, setShowCashModal] = useState(false);
  const [receivedNotes, setReceivedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
  const [returnedNotes, setReturnedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));

  const isPaymentIn = type === 'PAYMENT_IN';
  const { addToast } = useToast();

  useEffect(() => {
    const allParties = db.getParties();
    setParties(allParties);
    setAccounts(db.getAccounts());
    if (initialData) {
      setSelectedPartyId(initialData.partyId);
      const party = allParties.find(p => p.id === initialData.partyId);
      setPartySearchTerm(party ? party.name : initialData.partyName);
      setDate(initialData.date);
      setVoucherNo(initialData.id);
      setAmount(initialData.totalAmount);
      setNotes(initialData.notes || '');
      if (initialData.accountId) setSelectedAccountId(initialData.accountId);
      if (initialData.cashBreakdown) {
          setReceivedNotes(initialData.cashBreakdown.received);
          setReturnedNotes(initialData.cashBreakdown.returned);
      }
    } else {
        const cashAcc = db.getAccounts().find(a => a.type === 'Cash' && a.isDefault);
        if (cashAcc) setSelectedAccountId(cashAcc.id);
    }
  }, [initialData]);

  useEffect(() => {
    if (showPartyDropdown && dropdownRef.current) {
        const highlightedEl = dropdownRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
        if (highlightedEl) highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex, showPartyDropdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [amount, selectedPartyId, voucherNo, date, notes, selectedAccountId, showCashModal, receivedNotes, returnedNotes]);

  const triggerSave = async () => {
    if (!selectedPartyId || !amount) {
      addToast('Missing Required Fields (Party or Amount)', 'error');
      return;
    }
    const party = parties.find(p => p.id === selectedPartyId);
    const account = accounts.find(a => a.id === selectedAccountId);
    const isCash = account?.type === 'Cash';
    
    // For Payment In, user receives notes. For Payment Out, user gives notes.
    const netCashVal = isPaymentIn 
        ? (receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0) - returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0))
        : (returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0) - receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0));
    
    if (isCash && Math.abs(netCashVal - Number(amount)) > 0.1 && !showCashModal) {
        setShowCashModal(true);
        addToast('Cash breakdown mismatch. Please verify notes.', 'error');
        return;
    }

    const transactionData: Transaction = {
      id: voucherNo,
      date: date,
      type: type,
      partyId: selectedPartyId,
      partyName: party?.name || 'Unknown',
      items: [], 
      totalAmount: Number(amount),
      notes: notes,
      accountId: selectedAccountId,
      paymentMode: isCash ? 'Cash' : 'Bank',
      cashBreakdown: isCash ? { received: receivedNotes, returned: returnedNotes } : undefined
    };

    if (initialData) {
        await db.updateTransaction(initialData.id, transactionData);
        addToast('Record updated.', 'success');
        onSave();
    } else {
        await db.addTransaction(transactionData);
        addToast('Record saved.', 'success');
        
        // Reset for continuous entry
        setSelectedPartyId('');
        setPartySearchTerm('');
        setAmount('');
        setNotes('');
        setVoucherNo(Date.now().toString().slice(-6));
        setReceivedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
        setReturnedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
        setShowCashModal(false);
        
        if (partyInputRef.current) partyInputRef.current.focus();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSave();
  };

  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(partySearchTerm.toLowerCase()));

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (showPartyDropdown) {
        const total = filteredParties.length;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(prev => (prev + 1) % total); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => (prev - 1 + total) % total); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredParties[highlightedIndex]) {
                const p = filteredParties[highlightedIndex];
                setSelectedPartyId(p.id);
                setPartySearchTerm(p.name);
                setShowPartyDropdown(false);
                if (amountInputRef.current) amountInputRef.current.focus();
            }
        } else if (e.key === 'Escape') setShowPartyDropdown(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const isCashAccount = selectedAccount?.type === 'Cash';
  const receivedSum = receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);
  const returnedSum = returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);

  const handleAutoSuggest = () => {
      const drawer = db.getCashDrawer();
      let diff = Number(amount || 0);
      if (diff <= 0) return;
      const suggestions: CashNoteCount[] = [];
      const tempAvailable = new Map(drawer.notes.map(n => [n.denomination, n.count]));
      
      // If payment in, we are populating receivedNotes. If payment out, we are populating returnedNotes.
      for (const d of DENOMINATIONS) {
          const avail = isPaymentIn ? 1000 : (tempAvailable.get(d) || 0); // Payment in doesn't care about availability
          if (avail > 0 && diff >= d) {
              const count = isPaymentIn ? Math.floor(diff / d) : Math.min(Math.floor(diff / d), avail);
              suggestions.push({ denomination: d, count });
              diff -= (count * d);
          } else suggestions.push({ denomination: d, count: 0 });
      }
      
      if (isPaymentIn) setReceivedNotes(suggestions);
      else setReturnedNotes(suggestions);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
        <div className={`px-8 py-6 border-b flex items-center justify-between ${isPaymentIn ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isPaymentIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
               {isPaymentIn ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <div>
              <h2 className={`text-xl font-black uppercase tracking-tight ${isPaymentIn ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                {isPaymentIn ? 'Cash Receipt' : 'Payment Voucher'}
              </h2>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{isPaymentIn ? 'Money In' : 'Money Out'} Node</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Ref Number</label>
             <input type="text" required className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-sm font-bold focus:ring-4 focus:ring-brand-500/10 outline-none bg-gray-50 dark:bg-gray-900 dark:text-white" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} /></div>
             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Date (BS)</label><NepaliDatePicker value={date} onChange={setDate} /></div>
          </div>

          <div className="relative">
             <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Target Party Identity</label>
             <input ref={partyInputRef} type="text" required className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-black outline-none focus:ring-4 focus:ring-brand-500/10 bg-gray-50 dark:bg-gray-900 dark:text-white transition-all" placeholder="Search partner..." value={partySearchTerm} onChange={e => {setPartySearchTerm(e.target.value); setShowPartyDropdown(true); setHighlightedIndex(0);}} onFocus={() => setShowPartyDropdown(true)} onKeyDown={handlePartyKeyDown} />
             {showPartyDropdown && (
                 <div ref={dropdownRef} className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-20 max-h-48 overflow-auto mt-2 animate-in fade-in slide-in-from-top-2">
                    {filteredParties.map((p, idx) => (
                        <div key={p.id} data-index={idx} className={`p-4 border-b dark:border-gray-700 last:border-0 cursor-pointer flex justify-between items-center ${highlightedIndex === idx ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`} onClick={() => {setSelectedPartyId(p.id); setPartySearchTerm(p.name); setShowPartyDropdown(false); if (amountInputRef.current) amountInputRef.current.focus();}}>
                            <span className="font-bold">{p.name}</span>
                            <span className="text-[10px] font-black opacity-50">{formatCurrency(Math.abs(p.balance))} {p.balance >= 0 ? 'Dr' : 'Cr'}</span>
                        </div>
                    ))}
                 </div>
             )}
          </div>

          <div>
             <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Settlement Amount</label>
             <input ref={amountInputRef} type="number" required className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-3xl font-black focus:ring-4 focus:ring-brand-500/10 outline-none bg-gray-50 dark:bg-gray-900 dark:text-white" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
          </div>

          <div>
             <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Financial Node</label>
             <div className="flex gap-2">
                <select className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold bg-gray-50 dark:bg-gray-900 dark:text-white appearance-none outline-none focus:ring-4 focus:ring-brand-500/10" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name.toUpperCase()} ({formatCurrency(acc.balance)})</option>)}
                </select>
                {isCashAccount && (
                    <button type="button" onClick={() => setShowCashModal(true)} className={`px-4 rounded-2xl border transition-all flex items-center justify-center ${receivedSum > 0 || returnedSum > 0 ? 'bg-brand-50 border-brand-200 text-brand-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-300 hover:text-brand-500'}`} title="Physical Note Breakdown"><Banknote className="w-6 h-6" /></button>
                )}
             </div>
          </div>

          <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Remarks / Narration</label><textarea className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-medium outline-none bg-gray-50 dark:bg-gray-900 dark:text-white focus:ring-4 focus:ring-brand-500/10 resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </form>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Discard</button>
          <button type="submit" onClick={handleSave} className={`px-10 py-4 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all active:scale-95 ${isPaymentIn ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}>
            Save Entry (Ctrl+S)
          </button>
        </div>

        {/* Note Breakdown Modal */}
        {showCashModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-brand-600 p-8 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Banknote className="w-7 h-7" /> Physical Cash Sync</h3>
                            <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1">Reconcile currency node</p>
                        </div>
                        <button onClick={() => setShowCashModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b pb-4 dark:border-gray-800">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isPaymentIn ? 'Notes Received' : 'Notes Disbursed'}</span>
                            <div className="flex flex-col items-end">
                                <span className={`text-2xl font-black ${isPaymentIn ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {formatCurrency(isPaymentIn ? receivedSum : returnedSum)}
                                </span>
                                <button type="button" onClick={handleAutoSuggest} className="text-[9px] bg-brand-500 text-white px-3 py-1 rounded-full font-black mt-2 shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"><Sparkles className="w-3 h-3" /> Quick Fill</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {DENOMINATIONS.map((d, i) => {
                                const list = isPaymentIn ? receivedNotes : returnedNotes;
                                const setList = isPaymentIn ? setReceivedNotes : setReturnedNotes;
                                const item = list.find(n => n.denomination === d) || { denomination: d, count: 0 };
                                
                                return (
                                    <div key={d} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.count > 0 ? 'bg-brand-50/20 border-brand-500 ring-2 ring-brand-500/5' : 'bg-transparent border-gray-100 dark:border-gray-800'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-8 rounded-lg flex items-center justify-center font-black text-xs bg-white dark:bg-gray-800 border shadow-sm">{d}</div>
                                            <span className="text-xs text-gray-300">X</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            min="0"
                                            className="w-20 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center font-black outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white"
                                            value={item.count || ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setList(prev => prev.map(n => n.denomination === d ? {...n, count: val} : n));
                                            }}
                                        />
                                        <div className="w-24 text-right font-bold text-gray-500 text-xs">
                                            {formatCurrency(d * (item.count || 0))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-8 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Voucher Amount</p>
                            <p className="text-xl font-black dark:text-white">{formatCurrency(Number(amount || 0))}</p>
                        </div>
                        <button type="button" onClick={() => setShowCashModal(false)} className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 hover:bg-brand-700 active:scale-95"><Check className="w-4 h-4" /> Finalize</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PaymentForm;
