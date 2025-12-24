
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Transaction, Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import PrintBill from './PrintBill';
import { Plus, Search, Calendar, X, Trash2, Printer, Pencil, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, Zap, FileDown } from 'lucide-react';
import { exportToExcel, printData, transformTransactionsForExport } from '../services/exportService';
import { downloadTransactionPdf } from '../services/pdfService';
import { useToast } from './Toast';

interface TransactionListProps {
  type: Transaction['type'];
  onNew: () => void;
  refreshKey?: number;
  onEdit?: (transaction: Transaction) => void;
  onConvert?: (transaction: Transaction) => void;
}

type SortKey = 'date' | 'id' | 'partyName' | 'totalAmount';

const TransactionList: React.FC<TransactionListProps> = ({ type, onNew, refreshKey, onEdit, onConvert }) => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
  const [endDate, setEndDate] = useState(new Date().toISOString());
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [printTransaction, setPrintTransaction] = useState<Transaction | null>(null);
  const [printParty, setPrintParty] = useState<Party | undefined>(undefined);
  const { addToast } = useToast();

  const moduleId = type.toLowerCase().replace('_', '-').includes('sale') ? 'sales-invoices' : 'purchase-bills';
  const canEdit = authService.can(moduleId, 'edit');
  const canDelete = authService.can(moduleId, 'delete');

  useEffect(() => {
    const data = db.getTransactions().filter(t => t.type === type);
    setAllTransactions(data);
  }, [type, refreshKey]);

  useEffect(() => {
    let result = allTransactions;
    if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); result = result.filter(t => new Date(t.date) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); result = result.filter(t => new Date(t.date) <= end); }
    if (searchTerm) { const term = searchTerm.toLowerCase(); result = result.filter(t => t.partyName.toLowerCase().includes(term) || t.id.toLowerCase().includes(term)); }
    result.sort((a, b) => {
      const aValue = a[sortConfig.key]; const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    setDisplayedTransactions(result);
  }, [allTransactions, searchTerm, startDate, endDate, sortConfig]);

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (window.confirm('Are you sure you want to void this transaction?')) {
      db.deleteTransaction(id);
      setAllTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleDownloadPdf = (t: Transaction) => {
      const party = db.getParties().find(p => p.id === t.partyId);
      downloadTransactionPdf(t, party);
      addToast('PDF download started', 'success');
  };

  const getTitle = () => {
    switch (type) {
      case 'SALE': return 'Sales Invoices';
      case 'PURCHASE': return 'Purchase Bills';
      case 'PAYMENT_IN': return 'Payment In';
      case 'PAYMENT_OUT': return 'Payment Out';
      default: return 'Transactions';
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">{getTitle()}</h1>
        <div className="flex gap-3">
             <button onClick={() => exportToExcel(transformTransactionsForExport(displayedTransactions), 'Transactions')} className="p-3 bg-white border border-gray-200 text-emerald-600 rounded-lg hover:bg-emerald-50 shadow-sm" title="Export to Excel">
                 <FileSpreadsheet className="w-4 h-4" />
             </button>
            {canEdit && (
              <button onClick={onNew} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors shadow-sm ${type.includes('SALE') ? 'bg-brand-500 hover:bg-brand-600' : 'bg-blue-500 hover:bg-blue-600'}`}><Plus className="w-4 h-4" /> New</button>
            )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
           <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 w-full sm:max-w-xs">
             <Search className="w-4 h-4 text-gray-400" />
             <input type="text" placeholder="Search..." className="ml-2 bg-transparent border-none outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
        </div>
        <div className="overflow-x-auto rounded-b-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Vch No</th><th className="px-6 py-3">Party Name</th><th className="px-6 py-3 text-right">Amount</th><th className="px-6 py-3 text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {displayedTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 text-gray-500">{formatNepaliDate(t.date)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">#{t.id.slice(-6)}</td>
                  <td className="px-6 py-4 text-gray-700 font-medium">{t.partyName}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(t.totalAmount)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {onEdit && canEdit && <button onClick={() => onEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>}
                        <button onClick={() => handleDownloadPdf(t)} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Download PDF"><FileDown className="w-4 h-4" /></button>
                        <button onClick={() => { setPrintParty(db.getParties().find(p => p.id === t.partyId)); setPrintTransaction(t); }} className="p-1.5 text-gray-400 hover:text-blue-600" title="Print Browser"><Printer className="w-4 h-4" /></button>
                        {canDelete && <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {printTransaction && <PrintBill transaction={printTransaction} party={printParty} onClose={() => setPrintTransaction(null)} />}
    </div>
  );
};

export default TransactionList;
