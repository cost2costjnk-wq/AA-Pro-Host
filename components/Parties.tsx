import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { Plus, Search, Pencil, FileSpreadsheet, FileDown, Trash2, X, User, Phone, MapPin, ChevronDown, CheckCircle } from 'lucide-react';
import { exportToExcel, transformPartiesForExport } from '../services/exportService';
import { generatePdf } from '../services/pdfService';
import { useToast } from './Toast';

interface PartiesProps {
  triggerAdd?: number;
}

const Parties: React.FC<PartiesProps> = ({ triggerAdd }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newParty, setNewParty] = useState<Partial<Party>>({ type: 'customer', name: '', phone: '', address: '', dueDate: '', balance: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();
  const canEdit = authService.can('parties', 'edit');
  const canDelete = authService.can('parties', 'delete');

  const loadParties = () => {
    setParties(db.getParties());
  };

  useEffect(() => {
    loadParties();
    window.addEventListener('db-updated', loadParties);
    return () => window.removeEventListener('db-updated', loadParties);
  }, [showModal]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && canEdit) {
      openNewPartyModal();
    }
  }, [triggerAdd]);

  // Escape key handler for local modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (newParty.name) {
      const partyToSave: Party = {
          id: newParty.id || Date.now().toString(),
          name: newParty.name,
          phone: newParty.phone || '',
          address: newParty.address || '',
          type: (newParty.type as 'customer' | 'supplier') || 'customer',
          balance: newParty.balance || 0,
          dueDate: newParty.dueDate || ''
      };

      if (newParty.id) {
          await db.updateParty(partyToSave);
      } else {
          await db.addParty(partyToSave);
      }
      
      setShowModal(false);
      resetForm();
      addToast(`Party "${partyToSave.name}" saved successfully`, 'success');
    }
  };

  const handleEdit = (party: Party) => {
    if (!canEdit) return;
    setNewParty({ ...party });
    setShowModal(true);
  };

  const handlePdfDownload = () => {
      const columns = ['Name', 'Type', 'Phone', 'Address', 'Balance'];
      const rows = filteredParties.map(p => [
          p.name,
          p.type.toUpperCase(),
          p.phone || '-',
          p.address || '-',
          formatCurrency(p.balance)
      ]);
      generatePdf('Partner Balance Summary Report', columns, rows, 'Parties_Report');
      addToast('PDF download started', 'success');
  };

  const openNewPartyModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setNewParty({ type: 'customer', name: '', phone: '', address: '', dueDate: '', balance: 0 });
  };

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(searchTerm))
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Parties & Partners</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manage your customer and supplier relationships</p>
        </div>
        <div className="flex gap-3">
            {canEdit && (
              <button onClick={openNewPartyModal} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-brand-500/20 active:scale-95">
                  <Plus className="w-4 h-4" /> Add New Partner
              </button>
            )}
            <button onClick={handlePdfDownload} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm transition-all" title="Download PDF">
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline font-bold text-xs">PDF</span>
            </button>
            <button onClick={() => exportToExcel(transformPartiesForExport(parties), 'Parties_Report')} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shadow-sm transition-all">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline font-bold text-xs">Excel</span>
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center bg-gray-50/50 dark:bg-gray-900/50 px-6">
             <Search className="w-4 h-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search by name, phone or address..." 
                className="ml-3 bg-transparent border-none outline-none text-sm w-full dark:text-white placeholder-gray-400" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
             />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="px-8 py-4">Partner Identity</th>
                    <th className="px-8 py-4">Type</th>
                    <th className="px-8 py-4">Contact & Location</th>
                    <th className="px-8 py-4 text-right">Running Balance</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredParties.map(party => (
                <tr key={party.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 group transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${party.type === 'customer' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'}`}>
                            {party.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white text-base">{party.name}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5 capitalize">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${party.type === 'customer' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800'}`}>
                          {party.type}
                      </span>
                  </td>
                  <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium">
                              <Phone className="w-3 h-3 opacity-50" /> {party.phone || 'N/A'}
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                              <MapPin className="w-3 h-3 opacity-50" /> {party.address || 'No Address Set'}
                          </div>
                      </div>
                  </td>
                  <td className={`px-8 py-5 text-right font-black text-lg ${party.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(party.balance))}
                      <span className="text-[10px] ml-1 opacity-60 uppercase">{party.balance >= 0 ? 'Dr' : 'Cr'}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      {canEdit && <button onClick={() => handleEdit(party)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Pencil className="w-4.5 h-4.5" /></button>}
                      {canDelete && <button onClick={() => { if(window.confirm(`Delete ${party.name}? This will not remove their historical transactions.`)) { /* Removal logic in DB service */ } }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredParties.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-3 bg-gray-50/50 dark:bg-gray-900/10">
                <User className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                <p className="font-black uppercase tracking-[0.2em] text-xs text-gray-400">No partner records found</p>
            </div>
        )}
      </div>

      {showModal && canEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {newParty.id ? 'Modify Partner' : 'Create Partner Node'}
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Identity & Credit Configuration</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Partner Type</label>
                    <div className="flex bg-gray-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <button 
                            type="button" 
                            onClick={() => setNewParty({...newParty, type: 'customer'})}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${newParty.type === 'customer' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-blue-100 dark:border-blue-900' : 'text-gray-400'}`}
                        >
                            Customer
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setNewParty({...newParty, type: 'supplier'})}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${newParty.type === 'supplier' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm border border-orange-100 dark:border-orange-900' : 'text-gray-400'}`}
                        >
                            Supplier
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Full Name / Business Title</label>
                        <input 
                            required 
                            autoFocus
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" 
                            value={newParty.name} 
                            onChange={e => setNewParty({...newParty, name: e.target.value})} 
                            placeholder="Enter legal name..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Contact Phone (Optional)</label>
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" 
                                value={newParty.phone} 
                                onChange={e => setNewParty({...newParty, phone: e.target.value})} 
                                placeholder="98XXXXXXXX"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Physical Address (Optional)</label>
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" 
                                value={newParty.address} 
                                onChange={e => setNewParty({...newParty, address: e.target.value})} 
                                placeholder="City, Street, Ward..."
                            />
                        </div>
                    </div>
                    
                    {!newParty.id && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Opening Balance</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-300">Rs.</span>
                                <input 
                                    type="number" 
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-lg font-black text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-brand-500/10" 
                                    value={newParty.balance} 
                                    onChange={e => setNewParty({...newParty, balance: Number(e.target.value)})} 
                                />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold uppercase mt-2 px-2">Use positive for Debit (Receivable) and negative for Credit (Payable)</p>
                        </div>
                    )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Discard</button>
                <button type="submit" className="px-12 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-500/40 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Commit Partner Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parties;