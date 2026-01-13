
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Transaction, Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import PrintBill from './PrintBill';
import { Plus, Search, Calendar, X, Trash2, Printer, Pencil, FileSpreadsheet, FileDown } from 'lucide-react';
import { exportToExcel, transformTransactionsForExport } from '../services/exportService';
import { downloadTransactionPdf } from '../services/pdfService';
import { useToast } from './Toast';

interface TransactionListProps {
  type: Transaction['type'];
  onNew: () => void;
  refreshKey?: number;
  onEdit?: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ type, onNew, refreshKey, onEdit }) => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
  const [endDate, setEndDate] = useState(new Date().toISOString());
  const [printTransaction, setPrintTransaction] = useState<Transaction | null>(null);
  const [printParty, setPrintParty] = useState<Party | undefined>(undefined);
  const { addToast } = useToast();

  const getModuleId = () => {
    switch (type) {
      case 'SALE': return 'sales-invoices';
      case 'QUOTATION': return 'sales-quotations';
      case 'SALE_RETURN': return 'sales-return';
      case 'PAYMENT_IN': return 'sales-payment-in';
      case 'PURCHASE': return 'purchase-bills';
      case 'PURCHASE_ORDER': return 'purchase-orders';
      case 'PURCHASE_RETURN': return 'purchase-return';
      case 'PAYMENT_OUT': return 'purchase-payment-out';
      default: return 'dashboard';
    }
  };

  const moduleId = getModuleId();
  const canEdit = authService.can(moduleId, 'edit');
  const canDelete = authService.can(moduleId, 'delete');

  const loadTransactions = () => {
    const data = db.getTransactions().filter(t => t.type === type);
    setAllTransactions(data);
  };

  useEffect(() => {
    loadTransactions();
    window.addEventListener('db-updated', loadTransactions);
    return () => window.removeEventListener('db-updated', loadTransactions);
  }, [type, refreshKey]);

  useEffect(() => {
    let result = allTransactions;
    if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); result = result.filter(t => new Date(t.date) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); result = result.filter(t => new Date(t.date) <= end); }
    if (searchTerm) { const term = searchTerm.toLowerCase(); result = result.filter(t => t.partyName.toLowerCase().includes(term) || t.id.toLowerCase().includes(term)); }
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setDisplayedTransactions(result);
  }, [allTransactions, searchTerm, startDate, endDate]);

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
      case 'QUOTATION': return 'Sales Quotations';
      case 'SALE_RETURN': return 'Sales Returns';
      case 'PURCHASE': return 'Purchase Bills';
      case 'PURCHASE_ORDER': return 'Purchase Orders';
      case 'PURCHASE_RETURN': return 'Purchase Returns';
      case 'PAYMENT_IN': return 'Payment Receipts';
      case 'PAYMENT_OUT': return 'Payment Disbursements';
      default: return 'Transactions';
    }
  };

  const isSalesFlow = ['SALE', 'QUOTATION', 'SALE_RETURN', 'PAYMENT_IN'].includes(type);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{getTitle()}</h1>
            <p className="text-xs text-gray-500 font-medium">Viewing {displayedTransactions.length} records</p>
        </div>
        <div className="flex gap-3">
             <button onClick={() => exportToExcel(transformTransactionsForExport(displayedTransactions), getTitle())} className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-emerald-600 rounded-xl hover:bg-emerald-50 shadow-sm transition-all" title="Export to Excel">
                 <FileSpreadsheet className="w-4 h-4" />
             </button>
            {canEdit && (
              <button 
                onClick={onNew} 
                className={`flex items-center gap-2 px-6 py-2.5 text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest shadow-lg ${isSalesFlow ? 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'}`}
              >
                <Plus className="w-4 h-4" /> New Entry
              </button>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50/30 dark:bg-gray-900/20">
           <div className="flex items-center bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 w-full sm:max-w-xs shadow-inner focus-within:ring-2 focus-within:ring-brand-500/50 transition-all">
             <Search className="w-4 h-4 text-gray-400" />
             <input type="text" placeholder="Search..." className="ml-2 bg-transparent border-none outline-none text-sm w-full dark:text-white placeholder-gray-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <div className="flex items-center gap-2">
                <div className="w-36"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From" /></div>
                <div className="w-36"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To" /></div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Ref</th>
                    <th className="px-8 py-4">Party</th>
                    <th className="px-8 py-4 text-right">Amount</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayedTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 group transition-colors">
                  <td className="px-8 py-5 text-gray-600 dark:text-gray-400 font-medium">{formatNepaliDate(t.date)}</td>
                  <td className="px-8 py-5 font-bold text-gray-900 dark:text-white font-mono text-xs">#{t.id.slice(-8)}</td>
                  <td className="px-8 py-5 text-gray-700 dark:text-gray-300 font-bold">{t.partyName}</td>
                  <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white text-base">{formatCurrency(t.totalAmount)}</td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {onEdit && canEdit && (
                            <button onClick={() => onEdit(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl" title="Edit"><Pencil className="w-4.5 h-4.5" /></button>
                        )}
                        <button onClick={() => handleDownloadPdf(t)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl" title="Download"><FileDown className="w-4.5 h-4.5" /></button>
                        <button onClick={() => { setPrintParty(db.getParties().find(p => p.id === t.partyId)); setPrintTransaction(t); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl" title="Print"><Printer className="w-4.5 h-4.5" /></button>
                        {canDelete && (
                            <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl" title="Delete"><Trash2 className="w-4.5 h-4.5" /></button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayedTransactions.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-3">
                <Calendar className="w-12 h-12 text-gray-200" />
                <p className="font-black uppercase text-xs text-gray-400">No records found</p>
            </div>
        )}
      </div>
      {printTransaction && <PrintBill transaction={printTransaction} party={printParty} onClose={() => setPrintTransaction(null)} />}
    </div>
  );
};

export default TransactionList;
