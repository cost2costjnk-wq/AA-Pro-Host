
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { Plus, Search, Pencil, FileSpreadsheet, Printer, FileDown, Trash2 } from 'lucide-react';
import { exportToExcel, transformPartiesForExport } from '../services/exportService';
import { generatePdf } from '../services/pdfService';
import { useToast } from './Toast';

interface PartiesProps {
  triggerAdd?: number;
}

const Parties: React.FC<PartiesProps> = ({ triggerAdd }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newParty, setNewParty] = useState<Partial<Party>>({ type: 'customer', name: '', phone: '', address: '', dueDate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();
  const canEdit = authService.can('parties', 'edit');
  const canDelete = authService.can('parties', 'delete');

  useEffect(() => {
    setParties(db.getParties());
  }, [showModal]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && canEdit) {
      openNewPartyModal();
    }
  }, [triggerAdd]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (newParty.name) {
      if (newParty.id) db.updateParty(newParty as Party);
      else db.addParty({ id: Date.now().toString(), name: newParty.name, phone: newParty.phone || '', type: newParty.type as 'customer' | 'supplier', address: newParty.address, dueDate: newParty.dueDate, balance: 0 });
      setShowModal(false);
      resetForm();
      setParties(db.getParties());
      addToast('Party saved successfully', 'success');
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
    setNewParty({ type: 'customer', name: '', phone: '', address: '', dueDate: '' });
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
            {canEdit && (
              <button onClick={openNewPartyModal} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-bold uppercase text-[10px] tracking-widest shadow-md">
                  <Plus className="w-4 h-4" /> Add Party
              </button>
            )}
            <button onClick={handlePdfDownload} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-blue-50 shadow-sm" title="Download PDF">
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => exportToExcel(transformPartiesForExport(parties), 'Parties_Report')} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex-1">
             <Search className="w-4 h-4 text-gray-400" />
             <input type="text" placeholder="Search parties..." className="ml-2 bg-transparent border-none outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Type</th><th className="px-6 py-3 text-right">Balance</th><th className="px-6 py-3 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParties.map(party => (
                <tr key={party.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 font-medium text-gray-900">{party.name}</td>
                  <td className="px-6 py-4 capitalize"><span className={`px-2 py-1 rounded-full text-xs ${party.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{party.type}</span></td>
                  <td className={`px-6 py-4 text-right font-bold ${party.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(party.balance))}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && <button onClick={() => handleEdit(party)} className="p-1.5 text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => { if(window.confirm('Delete party?')) { /* Logic to delete in DB if wanted */ } }} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && canEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{newParty.id ? 'Edit Party' : 'Add New Party'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input required className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} /></div>
              <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600">Cancel</button><button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded-lg font-bold">Save Party</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parties;
