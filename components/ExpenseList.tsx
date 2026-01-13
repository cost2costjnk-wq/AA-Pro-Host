import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Transaction } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { Plus, Search, Calendar, Filter, X, Trash2, Pencil, ChevronDown, ArrowUpDown, FileDown, ArrowRight } from 'lucide-react';
import { downloadTransactionPdf } from '../services/pdfService';
import { useToast } from './Toast';

interface ExpenseListProps {
  onNew: () => void;
  refreshKey?: number;
  onEdit: (transaction: Transaction) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ onNew, refreshKey, onEdit }) => {
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Transaction[]>([]);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Category');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('All Payment Modes');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Derived lists for dropdowns
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);

  const { addToast } = useToast();

  const loadData = () => {
    const allTransactions = db.getTransactions().filter(t => t.type === 'EXPENSE');
    setExpenses(allTransactions);

    // Extract unique categories and modes for dropdowns
    const uniqueCats = Array.from(new Set(allTransactions.map(t => t.category).filter(Boolean))) as string[];
    const uniqueModes = Array.from(new Set(allTransactions.map(t => t.paymentMode).filter(Boolean))) as string[];
    
    setCategories(['All Category', ...uniqueCats]);
    setPaymentModes(['All Payment Modes', ...uniqueModes]);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-updated', loadData);
    return () => window.removeEventListener('db-updated', loadData);
  }, [refreshKey]);

  useEffect(() => {
    filterData();
  }, [expenses, searchTerm, selectedCategory, selectedPaymentMode, startDate, endDate]);

  const filterData = () => {
    let result = [...expenses];

    // 1. Search (ID, Remarks, Amount)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term)) ||
        t.totalAmount.toString().includes(term)
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'All Category') {
      result = result.filter(t => t.category === selectedCategory);
    }

    // 3. Payment Mode Filter
    if (selectedPaymentMode !== 'All Payment Modes') {
      result = result.filter(t => t.paymentMode === selectedPaymentMode);
    }

    // 4. Date Range Filter
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

    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredExpenses(result);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      db.deleteTransaction(id);
    }
  };

  const handleDownloadPdf = (exp: Transaction) => {
      downloadTransactionPdf(exp);
      addToast('Expense voucher PDF generated', 'success');
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Category');
    setSelectedPaymentMode('All Payment Modes');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = searchTerm || selectedCategory !== 'All Category' || selectedPaymentMode !== 'All Payment Modes' || startDate || endDate;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Expenses Ledger</h1>
          <p className="text-sm text-gray-500 font-medium">Tracking {filteredExpenses.length} expense records</p>
        </div>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 font-black uppercase text-[10px] tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add New Expense
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] p-5 shadow-sm space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-gray-700 flex-1 w-full shadow-inner focus-within:ring-2 focus-within:ring-brand-500/50 transition-all">
             <Search className="w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search by ID, remarks or amount..." 
               className="ml-3 bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 dark:text-white"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none min-w-[150px]">
                <select 
                  className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2.5 pl-4 pr-10 rounded-xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-sm cursor-pointer transition-all"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  {categories.length === 0 ? <option>All Category</option> : categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative flex-1 lg:flex-none min-w-[150px]">
                <select 
                  className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2.5 pl-4 pr-10 rounded-xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/50 shadow-sm cursor-pointer transition-all"
                  value={selectedPaymentMode}
                  onChange={e => setSelectedPaymentMode(e.target.value)}
                >
                  {paymentModes.length === 0 ? <option>All Payment Modes</option> : paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="w-36">
                      <NepaliDatePicker 
                          value={startDate} 
                          onChange={setStartDate}
                          placeholder="From Date"
                          className="!bg-transparent border-none shadow-none"
                      />
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-300" />
                  <div className="w-36">
                      <NepaliDatePicker 
                          value={endDate} 
                          onChange={setEndDate}
                          placeholder="To Date"
                          className="!bg-transparent border-none shadow-none"
                      />
                  </div>
              </div>
              
              {hasFilters && (
                  <button 
                    onClick={handleClearFilters}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100"
                    title="Clear All Filters"
                  >
                      <X className="w-4 h-4" />
                  </button>
              )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-8 py-5">Exp No.</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Payment Mode</th>
                <th className="px-8 py-5 text-right">Total Amount</th>
                <th className="px-8 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 group transition-colors">
                  <td className="px-8 py-5">
                      <div className="font-bold text-gray-900 dark:text-white font-mono text-xs">#{expense.id.slice(-6)}</div>
                      {expense.notes && <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]" title={expense.notes}>{expense.notes}</div>}
                  </td>
                  <td className="px-8 py-5">
                      <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-black uppercase border border-orange-100 dark:border-orange-800">
                        {expense.category || 'Other'}
                      </span>
                  </td>
                  <td className="px-8 py-5 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                      {formatNepaliDate(expense.date)}
                  </td>
                  <td className="px-8 py-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-tight">
                      {expense.paymentMode || 'Cash'}
                  </td>
                  <td className="px-8 py-5 text-gray-900 dark:text-white font-black text-right text-base">
                      {formatCurrency(expense.totalAmount)}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button onClick={() => handleDownloadPdf(expense)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all" title="Download Voucher PDF">
                        <FileDown className="w-4.5 h-4.5" />
                      </button>
                      <button onClick={() => onEdit(expense)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Pencil className="w-4.5 h-4.5" /></button>
                      <button onClick={() => handleDelete(expense.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-3 bg-gray-50/20 dark:bg-gray-900/10">
                <Calendar className="w-12 h-12 text-gray-200 dark:text-gray-700 opacity-30" />
                <p className="font-black uppercase tracking-[0.2em] text-xs text-gray-400">No expense records found</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
