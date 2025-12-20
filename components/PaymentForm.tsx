
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Party, Transaction, Account, CashNoteCount, Denomination } from '../types';
import NepaliDatePicker from './NepaliDatePicker';
import { X, Save, ArrowDownLeft, ArrowUpRight, Search, ChevronDown, Banknote, RotateCcw, Sparkles } from 'lucide-react';
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
  
  const [date, setDate] = useState(new Date().toISOString());
  const [voucherNo, setVoucherNo] = useState(Date.now().toString().slice(-6));
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedAccountId, setSelectedAccountId] = useState('1'); 
  const [notes, setNotes] = useState('');

  // Cash Breakdown State
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
    }
  }, [initialData]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || !amount) return;

    const party = parties.find(p => p.id === selectedPartyId);
    const account = accounts.find(a => a.id === selectedAccountId);
    const isCash = account?.type === 'Cash';

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

    if (initialData) db.updateTransaction(initialData.id, transactionData);
    else db.addTransaction(transactionData);
    onSave();
  };

  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(partySearchTerm.toLowerCase()));
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const isCashAccount = selectedAccount?.type === 'Cash';
  const receivedSum = receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);
  const returnedSum = returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);
  const netPhysicalValue = receivedSum - returnedSum;

  const handleAutoSuggest = () => {
      const drawer = db.getCashDrawer();
      let diff = receivedSum - Number(amount || 0);
      if (diff <= 0) return;
      const suggestions: CashNoteCount[] = [];
      const tempAvailable = new Map(drawer.notes.map(n => [n.denomination, n.count]));
      receivedNotes.forEach(rn => tempAvailable.set(rn.denomination, (tempAvailable.get(rn.denomination) || 0) + rn.count));

      for (const d of DENOMINATIONS) {
          const avail = tempAvailable.get(d) || 0;
          if (avail > 0 && diff >= d) {
              const count = Math.min(Math.floor(diff / d), avail);
              suggestions.push({ denomination: d, count });
              diff -= (count * d);
          } else suggestions.push({ denomination: d, count: 0 });
      }
      setReturnedNotes(suggestions);
      addToast('Change auto-suggested from drawer availability.', 'info');
  };

  return (
    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isPaymentIn ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPaymentIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
               {isPaymentIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <h2 className={`text-lg font-bold ${isPaymentIn ? 'text-emerald-900' : 'text-red-900'}`}>{isPaymentIn ? 'Receive Payment' : 'Pay Out'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white/50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Voucher No</label>
             <input type="text" required className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={voucherNo} onChange={e => setVoucherNo(e.target.value)} /></div>
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label><NepaliDatePicker value={date} onChange={setDate} /></div>
          </div>
          <div className="relative">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Party</label>
             <input type="text" required className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Search Party..." value={partySearchTerm} onChange={e => {setPartySearchTerm(e.target.value); setShowPartyDropdown(true);}} />
             {showPartyDropdown && (
                 <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-20 max-h-40 overflow-auto mt-1">
                    {filteredParties.map(p => <div key={p.id} className="p-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => {setSelectedPartyId(p.id); setPartySearchTerm(p.name); setShowPartyDropdown(false);}}>{p.name}</div>)}
                 </div>
             )}
          </div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
          <input type="number" required className="w-full border border-gray-300 rounded-lg p-2 text-xl font-bold focus:ring-2 focus:ring-brand-500 outline-none" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} /></div>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account / Mode</label>
             <div className="flex gap-2">
                <select className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                {isCashAccount && (
                    <button type="button" onClick={() => setShowCashModal(true)} className={`p-2 rounded-lg border flex items-center justify-center transition-all ${receivedSum > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-300 text-gray-400'}`} title="Notes Breakdown"><Banknote className="w-5 h-5" /></button>
                )}
             </div>
          </div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label><textarea className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </form>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button type="submit" onClick={handleSave} className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm ${isPaymentIn ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>Save Transaction</button>
        </div>

        {showCashModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="bg-brand-600 p-6 text-white flex justify-between items-center">
                        <h3 className="text-xl font-bold flex items-center gap-2"><Banknote className="w-6 h-6" /> Cash Note Entry</h3>
                        <button onClick={() => setShowCashModal(false)} className="text-white hover:opacity-70"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 border-b pb-2 flex justify-between"><span>NOTES RECEIVED</span> <span className="text-emerald-600">{formatCurrency(receivedSum)}</span></h4>
                            {receivedNotes.map((n, i) => (
                                <div key={n.denomination} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                                    <span className="w-12 font-bold text-gray-600">{n.denomination}</span>
                                    <input type="number" min="0" className="w-20 p-1 border rounded text-center" value={n.count || ''} onChange={e => {const val = parseInt(e.target.value) || 0; setReceivedNotes(prev => prev.map((item, idx) => idx === i ? {...item, count: val} : item));}} />
                                    <span className="w-24 text-right text-gray-500">{formatCurrency(n.denomination * n.count)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 border-b pb-2 flex justify-between"><span>NOTES RETURNED</span> <span className="text-red-600">{formatCurrency(returnedSum)}</span></h4>
                            {isPaymentIn && <button type="button" onClick={handleAutoSuggest} className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold border border-emerald-100 flex items-center gap-1 mb-2"><Sparkles className="w-3 h-3" /> Auto-Suggest Change</button>}
                            {returnedNotes.map((n, i) => (
                                <div key={n.denomination} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                                    <span className="w-12 font-bold text-gray-600">{n.denomination}</span>
                                    <input type="number" min="0" className="w-20 p-1 border rounded text-center" value={n.count || ''} onChange={e => {const val = parseInt(e.target.value) || 0; setReturnedNotes(prev => prev.map((item, idx) => idx === i ? {...item, count: val} : item));}} />
                                    <span className="w-24 text-right text-gray-500">{formatCurrency(n.denomination * n.count)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                        <div className="text-sm font-bold text-gray-600">Net Physical Value: <span className={Math.abs(netPhysicalValue) === Number(amount) ? 'text-emerald-600' : 'text-orange-500'}>{formatCurrency(netPhysicalValue)}</span></div>
                        <button type="button" onClick={() => setShowCashModal(false)} className="px-8 py-2 bg-brand-600 text-white rounded-lg font-bold">Done</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PaymentForm;
