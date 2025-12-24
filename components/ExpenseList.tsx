
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Transaction } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { Plus, Search, Calendar, Filter, X, Trash2, Pencil, ChevronDown, ArrowUpDown, FileDown } from 'lucide-react';
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
  const [date, setDate] = useState('');
  
  // Derived lists for dropdowns
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);

  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  useEffect(() => {
    filterData();
  }, [expenses, searchTerm, selectedCategory, selectedPaymentMode, date]);

  const loadData = () => {
    const allTransactions = db.getTransactions().filter(t => t.type === 'EXPENSE');
    setExpenses(allTransactions);

    // Extract unique categories and modes for dropdowns
    const uniqueCats = Array.from(new Set(allTransactions.map(t => t.category).filter(Boolean))) as string[];
    const uniqueModes = Array.from(new Set(allTransactions.map(t => t.paymentMode).filter(Boolean))) as string[];
    
    setCategories(['All Category', ...uniqueCats]);
    setPaymentModes(['All Payment Modes', ...uniqueModes]);
  };

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

    // 4. Date Filter
    if (date) {
      const filterDate = date.split('T')[0];
      result = result.filter(t => t.date.split('T')[0] === filterDate);
    }

    setFilteredExpenses(result);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      db.deleteTransaction(id);
      loadData();
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
    setDate('');
  };

  const hasFilters = searchTerm || selectedCategory !== 'All Category' || selectedPaymentMode !== 'All Payment Modes' || date;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses ({expenses.length})</h1>
        <button 
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New Expense
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex items-center bg-white rounded-lg px-3 py-2 border border-gray-200 flex-1 lg:max-w-xs shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
           <Search className="w-4 h-4 text-gray-400" />
           <input 
             type="text" 
             placeholder="Search Expense..." 
             className="ml-2 bg-transparent border-none outline-none text-sm w-full placeholder-gray-400"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <select 
                className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                {categories.length === 0 ? <option>All Category</option> : categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
                value={selectedPaymentMode}
                onChange={e => setSelectedPaymentMode(e.target.value)}
              >
                {paymentModes.length === 0 ? <option>All Payment Modes</option> : paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="w-40">
                <NepaliDatePicker 
                    value={date} 
                    onChange={setDate}
                    placeholder="All Date"
                    className="bg-white"
                />
            </div>
            
            {hasFilters && (
                <button 
                  onClick={handleClearFilters}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Clear Filters"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Exp No.</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4">Remarks</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 text-gray-900 font-medium">
                      #{expense.id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                      {expense.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                      {formatNepaliDate(expense.date)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                      {expense.paymentMode || 'Cash'}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-bold text-right">
                      {formatCurrency(expense.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={expense.notes}>
                      {expense.notes || '--'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownloadPdf(expense)} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Download Voucher PDF">
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => onEdit(expense)} className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseList;
