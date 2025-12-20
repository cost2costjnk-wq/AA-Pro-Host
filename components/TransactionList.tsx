
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Transaction, Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate, adToBs } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import PrintBill from './PrintBill';
import { Plus, Search, Calendar, Filter, X, Trash2, Printer, Pencil, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, FileStack, Zap } from 'lucide-react';
import { exportToExcel, printData, transformTransactionsForExport } from '../services/exportService';

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
  
  // Default to current month start/end to optimize viewing performance
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // 1st of current month
    return date.toISOString();
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString(); // Today
  });
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  
  // Printing State
  const [printTransaction, setPrintTransaction] = useState<Transaction | null>(null);
  const [printParty, setPrintParty] = useState<Party | undefined>(undefined);

  // 1. Initial Load of Type-specific transactions from DB
  useEffect(() => {
    const data = db.getTransactions().filter(t => t.type === type);
    setAllTransactions(data);
  }, [type, refreshKey]);

  // 2. Filter & Sort Logic
  useEffect(() => {
    let result = allTransactions;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.date) <= end);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.partyName.toLowerCase().includes(term) || 
        t.id.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setDisplayedTransactions(result);
  }, [allTransactions, searchTerm, startDate, endDate, sortConfig]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to void this transaction? Stock and Party Balance will be reversed.')) {
      db.deleteTransaction(id);
      setAllTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handlePrint = (transaction: Transaction) => {
    const party = db.getParties().find(p => p.id === transaction.partyId);
    setPrintParty(party);
    setPrintTransaction(transaction);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const handleExportExcel = () => {
    const data = transformTransactionsForExport(displayedTransactions);
    exportToExcel(data, `${type}_Report`);
  };

  const handlePrintPdf = () => {
    const data = transformTransactionsForExport(displayedTransactions);
    const columns = ['Date', 'Voucher', 'Party', 'Amount', 'Payment Mode', 'Notes'];
    const rows = data.map(d => [d['Date'], d['Voucher No'], d['Party'], formatCurrency(d['Total Amount'] as number), d['Paid Via'], d['Remarks']]);
    printData(`${getTitle()} Report`, columns, rows);
  };

  const getTitle = () => {
    switch (type) {
      case 'SALE': return 'Sales Invoices';
      case 'PURCHASE': return 'Purchase Bills';
      case 'SALE_RETURN': return 'Sales Return';
      case 'PURCHASE_RETURN': return 'Purchase Return';
      case 'QUOTATION': return 'Quotations';
      case 'PURCHASE_ORDER': return 'Purchase Orders';
      case 'PAYMENT_IN': return 'Payment In';
      case 'PAYMENT_OUT': return 'Payment Out';
      default: return 'Transactions';
    }
  };

  const getButtonLabel = () => {
     switch (type) {
      case 'SALE': return 'New Sale';
      case 'PURCHASE': return 'New Purchase';
      case 'SALE_RETURN': return 'New Return';
      case 'PURCHASE_RETURN': return 'New Return';
      case 'QUOTATION': return 'New Quotation';
      case 'PURCHASE_ORDER': return 'New Order';
      case 'PAYMENT_IN': return 'Record Payment';
      case 'PAYMENT_OUT': return 'Record Payment';
      default: return 'New';
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
      if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1 inline opacity-0 group-hover:opacity-50" />;
      return sortConfig.direction === 'asc' 
          ? <ArrowUp className="w-3 h-3 text-brand-500 ml-1 inline" />
          : <ArrowDown className="w-3 h-3 text-brand-500 ml-1 inline" />;
  };

  const hasFilters = searchTerm || startDate || endDate;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">{getTitle()}</h1>
        <div className="flex gap-3">
             <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                title="Export to Excel"
            >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
            </button>
            <button 
                onClick={handlePrintPdf}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                title="Print List"
            >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
            </button>
            <button 
            onClick={onNew}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors shadow-sm ${type.includes('SALE') || type.includes('QUOTATION') || type === 'PAYMENT_IN' ? 'bg-brand-500 hover:bg-brand-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
            <Plus className="w-4 h-4" />
            {getButtonLabel()}
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
           
           <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 w-full sm:max-w-xs">
             <Search className="w-4 h-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search invoice or party..." 
                className="ml-2 bg-transparent border-none outline-none text-sm w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>

           <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="w-36">
                  <NepaliDatePicker 
                    value={startDate} 
                    onChange={setStartDate} 
                    placeholder="From Date"
                  />
                </div>
                <span className="text-gray-400">-</span>
                <div className="w-36">
                  <NepaliDatePicker 
                    value={endDate} 
                    onChange={setEndDate} 
                    placeholder="To Date"
                  />
                </div>
              </div>
              
              {hasFilters && (
                <button 
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
           </div>
        </div>

        <div className="overflow-x-auto rounded-b-xl pb-32 lg:pb-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Date (BS)
                    <SortIcon column="date" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    Ref No
                    <SortIcon column="id" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                  onClick={() => handleSort('partyName')}
                >
                  <div className="flex items-center">
                    Party Name
                    <SortIcon column="partyName" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center justify-end">
                    Amount
                    <SortIcon column="totalAmount" />
                  </div>
                </th>
                {type !== 'PAYMENT_IN' && type !== 'PAYMENT_OUT' && (
                  <th className="px-6 py-3 text-center">Items</th>
                )}
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {formatNepaliDate(t.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">
                      #{t.id.slice(-6)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">{t.partyName}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    {formatCurrency(t.totalAmount)}
                  </td>
                  {type !== 'PAYMENT_IN' && type !== 'PAYMENT_OUT' && (
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                        {t.items?.reduce((acc, item) => acc + item.quantity, 0) || 0} Pcs
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {onConvert && (type === 'QUOTATION' || type === 'PURCHASE_ORDER') && (
                          <button 
                            onClick={() => onConvert(t)}
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title={type === 'QUOTATION' ? "Convert to Sale" : "Convert to Bill"}
                          >
                            <Zap className="w-4 h-4 fill-current" />
                          </button>
                        )}
                        {onEdit && (
                          <button 
                            onClick={() => onEdit(t)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handlePrint(t)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Void Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedTransactions.length === 0 && (
                 <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                   {allTransactions.length > 0 ? "No records found for the selected date range. Try clearing filters." : "No records found."}
                 </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      {printTransaction && (
        <PrintBill 
          transaction={printTransaction} 
          party={printParty} 
          onClose={() => setPrintTransaction(null)} 
        />
      )}
    </div>
  );
};

export default TransactionList;
