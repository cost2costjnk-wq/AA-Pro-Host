
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { Plus, Search, Pencil, FileSpreadsheet, Printer, Bell, X, Calendar, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { exportToExcel, printData, transformPartiesForExport } from '../services/exportService';
import { useToast } from './Toast';
import NepaliDatePicker from './NepaliDatePicker';
import { formatNepaliDate } from '../services/nepaliDateService';

interface PartiesProps {
  triggerAdd?: number;
}

const Parties: React.FC<PartiesProps> = ({ triggerAdd }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newParty, setNewParty] = useState<Partial<Party>>({ type: 'customer', name: '', phone: '', address: '', dueDate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [openingType, setOpeningType] = useState<'receive' | 'pay'>('receive');

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [reminderData, setReminderData] = useState({ date: new Date().toISOString(), note: '', priority: 'medium' as any });

  const { addToast } = useToast();

  useEffect(() => {
    setParties(db.getParties());
  }, [showModal, showReminderModal]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      openNewPartyModal();
    }
  }, [triggerAdd]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParty.name) {
      if (newParty.id) {
        db.updateParty(newParty as Party);
        if (openingBalance) {
             const amount = Number(openingBalance);
             const finalAmount = openingType === 'receive' ? amount : -amount;
             const opTx = db.getTransactions().find(t => 
                t.partyId === newParty.id && 
                t.type === 'BALANCE_ADJUSTMENT' && 
                t.category === 'Opening Balance'
             );
             if (opTx) {
                 if (opTx.totalAmount !== finalAmount) {
                     db.updateTransaction(opTx.id, {
                         ...opTx,
                         totalAmount: finalAmount,
                         partyName: newParty.name || opTx.partyName 
                     });
                 }
             } else if (amount > 0) {
                 db.addTransaction({
                    id: `OP-${newParty.id}-${Date.now()}`,
                    date: new Date().toISOString(),
                    type: 'BALANCE_ADJUSTMENT',
                    partyId: newParty.id!,
                    partyName: newParty.name!,
                    items: [],
                    totalAmount: finalAmount,
                    notes: 'Opening Balance',
                    category: 'Opening Balance',
                    paymentMode: 'Adjustment'
                });
             }
        }
        addToast('Party details updated successfully', 'success');
      } else {
        const newId = Date.now().toString();
        db.addParty({
          id: newId,
          name: newParty.name,
          phone: newParty.phone || '',
          type: newParty.type as 'customer' | 'supplier',
          address: newParty.address,
          dueDate: newParty.dueDate,
          balance: 0 
        });
        if (openingBalance && Number(openingBalance) > 0) {
            const amount = Number(openingBalance);
            const finalAmount = openingType === 'receive' ? amount : -amount;
            db.addTransaction({
                id: `OP-${newId}`,
                date: new Date().toISOString(),
                type: 'BALANCE_ADJUSTMENT',
                partyId: newId,
                partyName: newParty.name,
                items: [],
                totalAmount: finalAmount,
                notes: 'Opening Balance',
                category: 'Opening Balance',
                paymentMode: 'Adjustment'
            });
        }
        addToast('New party added successfully', 'success');
      }
      setShowModal(false);
      resetForm();
      setParties(db.getParties());
    } else {
      addToast('Party Name is required', 'error');
    }
  };

  const handleEdit = (party: Party) => {
    setNewParty({ ...party });
    const opTx = db.getTransactions().find(t => 
        t.partyId === party.id && 
        t.type === 'BALANCE_ADJUSTMENT' && 
        t.category === 'Opening Balance'
    );
    if (opTx) {
        setOpeningBalance(Math.abs(opTx.totalAmount).toString());
        setOpeningType(opTx.totalAmount >= 0 ? 'receive' : 'pay');
    } else {
        setOpeningBalance('');
        setOpeningType('receive');
    }
    setShowModal(true);
  };

  const openNewPartyModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setNewParty({ type: 'customer', name: '', phone: '', address: '', dueDate: '' });
    setOpeningBalance('');
    setOpeningType('receive');
  };

  const openReminderModal = (party: Party) => {
      setSelectedParty(party);
      setReminderData({
          date: new Date().toISOString(),
          note: `Follow up payment of ${formatCurrency(Math.abs(party.balance))}`,
          priority: Math.abs(party.balance) > 50000 ? 'high' : 'medium'
      });
      setShowReminderModal(true);
  };

  const handleSetReminder = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedParty && reminderData.note) {
          db.addManualReminder({
              id: Date.now().toString(),
              title: `FOLLOW UP: ${selectedParty.name}`,
              date: reminderData.date,
              type: 'party_due',
              priority: reminderData.priority,
              amount: Math.abs(selectedParty.balance)
          });
          addToast(`Manual reminder set for ${selectedParty.name}`, 'success');
          setShowReminderModal(false);
      }
  };

  const handleExportExcel = () => {
    try {
      const data = transformPartiesForExport(parties);
      exportToExcel(data, 'Parties_Report');
      addToast('Exported to Excel successfully', 'success');
    } catch (e) {
      addToast('Failed to export data', 'error');
    }
  };

  const handlePrintPdf = () => {
    const data = transformPartiesForExport(parties);
    const columns = ['Name', 'Type', 'Phone', 'Balance', 'Status'];
    const rows = data.map(d => [d['Name'], d['Type'], d['Phone'], formatCurrency(Math.abs(d['Balance'] as number)), d['Status']]);
    printData('Parties List', columns, rows);
  };

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parties</h1>
        <div className="flex gap-3">
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={handlePrintPdf} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
            </button>
            <button onClick={openNewPartyModal} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                <Plus className="w-4 h-4" />
                Add Party
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex-1">
             <Search className="w-4 h-4 text-gray-400" />
             <input type="text" placeholder="Search parties..." className="ml-2 bg-transparent border-none outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3 text-right">Balance</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParties.map(party => (
                <tr key={party.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xs uppercase">
                      {party.name.substring(0, 2)}
                    </div>
                    <div>
                      {party.name}
                      {party.dueDate && (
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> Due: {formatNepaliDate(party.dueDate)}
                          </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs ${party.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {party.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{party.phone || '-'}</td>
                  <td className={`px-6 py-4 text-right font-bold ${party.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(party.balance))}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      {party.balance >= 0 ? 'To Rx' : 'To Give'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openReminderModal(party)} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Set Manual Reminder">
                          <Bell className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(party)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredParties.length === 0 && (
                 <tr><td colSpan={5} className="text-center py-8 text-gray-400">No parties found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{newParty.id ? 'Edit Party' : 'Add New Party'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="type" checked={newParty.type === 'customer'} onChange={() => { setNewParty({...newParty, type: 'customer'}); setOpeningType('receive'); }} /> Customer
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="type" checked={newParty.type === 'supplier'} onChange={() => { setNewParty({...newParty, type: 'supplier'}); setOpeningType('pay'); }} /> Supplier
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" value={newParty.phone || ''} onChange={e => setNewParty({...newParty, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" value={newParty.address || ''} onChange={e => setNewParty({...newParty, address: e.target.value})} />
                  </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-gray-500" /><label className="text-sm font-bold text-gray-700">Opening Balance</label></div>
                  <div className="grid grid-cols-2 gap-3">
                      <div><input type="number" min="0" placeholder="0.00" className="w-full border border-gray-300 rounded-lg p-2 outline-none bg-white" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} /></div>
                      <div>
                          <select className={`w-full border border-gray-300 rounded-lg p-2 outline-none ${openingType === 'receive' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}`} value={openingType} onChange={e => setOpeningType(e.target.value as 'receive' | 'pay')}>
                              <option value="receive">To Receive (Dr)</option>
                              <option value="pay">To Pay (Cr)</option>
                          </select>
                      </div>
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date (Optional)</label>
                  <NepaliDatePicker value={newParty.dueDate || ''} onChange={(d) => setNewParty({...newParty, dueDate: d})} placeholder="Set due date" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-bold">{newParty.id ? 'Update Party' : 'Save Party'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Reminder Modal */}
      {showReminderModal && selectedParty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4 border-b pb-4">
                      <div>
                          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-brand-500" /> Payment Reminder</h2>
                          <p className="text-xs text-gray-500 mt-1">Manual follow-up for {selectedParty.name}</p>
                      </div>
                      <button onClick={() => setShowReminderModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                  </div>

                  <div className={`p-4 rounded-xl mb-6 text-center border-2 ${selectedParty.balance >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                      <div className="text-[10px] uppercase font-black tracking-widest opacity-60">Current Total Dues</div>
                      <div className="text-2xl font-black">{formatCurrency(Math.abs(selectedParty.balance))}</div>
                      <div className="text-xs font-bold mt-1 uppercase tracking-tighter">{selectedParty.balance >= 0 ? 'Account Receivable' : 'Account Payable'}</div>
                  </div>

                  <form onSubmit={handleSetReminder} className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Follow-up Date</label>
                          <NepaliDatePicker value={reminderData.date} onChange={(d) => setReminderData({...reminderData, date: d})} />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Priority Level</label>
                          <div className="grid grid-cols-3 gap-2">
                             {(['low', 'medium', 'high'] as const).map(p => (
                                <button key={p} type="button" onClick={() => setReminderData({...reminderData, priority: p})} className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${reminderData.priority === p ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                   {p.toUpperCase()}
                                </button>
                             ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Follow-up Note</label>
                          <textarea required className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none min-h-[100px] resize-none" placeholder="e.g. Promised to pay by check tomorrow morning..." value={reminderData.note} onChange={e => setReminderData({...reminderData, note: e.target.value})} />
                      </div>

                      <button type="submit" className="w-full py-3.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                          <CheckCircle className="w-5 h-5" /> Set Manual Reminder
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Parties;
