import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { Transaction, Party, Product, TransactionItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { 
  ArrowLeft, 
  FileDown,
  FileSpreadsheet,
  Search,
  ArrowRight,
  Calculator,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Package,
  Activity,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Users,
  ChevronDown,
  X,
  FileText,
  Save,
  ShoppingCart,
  CheckCircle,
  RotateCcw,
  Clock,
  Filter,
  Pencil,
  ChevronLeft,
  Calendar,
  Trash2,
  Plus,
  FilterX,
  Layers
} from 'lucide-react';
import { exportToExcel, transformTransactionsForExport, transformPartiesForExport, transformProductsForExport } from '../services/exportService';
import { generatePdf } from '../services/pdfService';
import { useToast } from './Toast';

type ReportType = 
  | 'DASHBOARD'
  | 'SALES' 
  | 'PURCHASE' 
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'DAY_BOOK' 
  | 'ALL_TRANSACTIONS'
  | 'PROFIT_LOSS'
  | 'PARTY_STATEMENT'
  | 'ALL_TRANSACTIONS_LEDGER'
  | 'ALL_PARTY_STATEMENT'
  | 'RECEIVABLE_AGING'
  | 'STOCK_QUANTITY'
  | 'OUT_OF_STOCK';

interface AgingItem {
  id: string;
  date: string;
  amount: number;
}

interface AgingBucket {
  items: AgingItem[];
  total: number;
}

interface AgingRow {
  id: string;
  name: string;
  phone?: string;
  total: number;
  buckets: {
    current: AgingBucket;
    week1: AgingBucket;
    day15: AgingBucket;
    month1: AgingBucket;
    month3: AgingBucket;
  };
}

interface RestockItem {
  productId: string;
  name: string;
  category: string;
  stock: number;
  threshold: number;
  required: number;
  rate: number;
  unit: string;
}

interface LedgerRow {
  id: string;
  date: string;
  type: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
  narration: string;
  original: Transaction;
}

interface ReportsProps {
  targetReport?: string | null;
  onConsumeTarget?: () => void;
  onConvertToPurchase?: (items: TransactionItem[]) => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

const Reports: React.FC<ReportsProps> = ({ targetReport, onConsumeTarget, onConvertToPurchase, onEditTransaction }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('DASHBOARD');

  useEffect(() => {
    if (targetReport) {
      setActiveReport(targetReport as ReportType);
      if (onConsumeTarget) onConsumeTarget();
    }
  }, [targetReport, onConsumeTarget]);

  const renderContent = () => {
    switch (activeReport) {
      case 'DASHBOARD': return <ReportsBrowser onNavigate={setActiveReport} />;
      case 'SALES': return <TransactionReport title="Sales Report" type="SALE" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PURCHASE': return <TransactionReport title="Purchase Report" type="PURCHASE" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'SALE_RETURN': return <TransactionReport title="Sales Return Report" type="SALE_RETURN" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PURCHASE_RETURN': return <TransactionReport title="Purchase Return Report" type="PURCHASE_RETURN" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'DAY_BOOK': return <DayBookReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'ALL_TRANSACTIONS': return <AllTransactionsReport onBack={() => setActiveReport('DASHBOARD')} onEdit={onEditTransaction} />;
      case 'PROFIT_LOSS': return <ProfitLossReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PARTY_STATEMENT': return <PartyStatementReport onBack={() => setActiveReport('DASHBOARD')} onEdit={onEditTransaction} />;
      case 'RECEIVABLE_AGING': return <ReceivableAgingReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'ALL_PARTY_STATEMENT': return <AllPartiesReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'STOCK_QUANTITY': return <StockReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'OUT_OF_STOCK': return <ReplenishmentReport onBack={() => setActiveReport('DASHBOARD')} onConvert={onConvertToPurchase} />;
      default: return <div className="p-20 text-center flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-gray-200" />
          <h3 className="font-bold text-gray-400 uppercase tracking-widest">Report Not Found</h3>
          <button onClick={() => setActiveReport('DASHBOARD')} className="text-brand-600 font-bold hover:underline">Return to Browser</button>
      </div>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto h-full flex flex-col font-sans">
      {renderContent()}
    </div>
  );
};

const ReportsBrowser: React.FC<{ onNavigate: (r: ReportType) => void }> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Transactions' | 'Parties' | 'Inventory'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const reportGroups = [
    {
      category: 'Transactions',
      title: 'Transaction Report',
      reports: [
        { id: 'SALES', title: 'Sales', desc: 'View your sales data on a given time' },
        { id: 'PURCHASE', title: 'Purchase', desc: 'View your purchase data on a given time' },
        { id: 'SALE_RETURN', title: 'Sales Return', desc: 'View your sales return data on a given time' },
        { id: 'PURCHASE_RETURN', title: 'Purchase Return', desc: 'View your purchase return data on a given time' },
        { id: 'DAY_BOOK', title: 'Day Book', desc: 'View all of your daily transactions', hasView: true },
        { id: 'ALL_TRANSACTIONS', title: 'All Transactions', desc: 'Unified ledger of all business transactions', hasView: true },
        { id: 'PROFIT_LOSS', title: 'Profit And Loss', desc: 'View your profit & loss in a given time' },
      ]
    },
    {
      category: 'Parties',
      title: 'Party Report',
      reports: [
        { id: 'PARTY_STATEMENT', title: 'Party Statement', desc: 'Check the transactions of certain party', hasView: true },
        { id: 'ALL_PARTY_STATEMENT', title: 'All Party Statement', desc: 'Print or download balance list of all parties', hasView: true },
        { id: 'RECEIVABLE_AGING', title: 'Receivable Aging', desc: 'Track overdue payments by date buckets (1wk to 4mo+)', hasView: true },
      ]
    },
    {
      category: 'Inventory',
      title: 'Inventory Report',
      reports: [
        { id: 'STOCK_QUANTITY', title: 'Stock Report', desc: 'Current inventory levels and valuation' },
        { id: 'OUT_OF_STOCK', title: 'Restock / Auto Order', desc: 'Identify items that need replenishment', hasView: true },
      ]
    }
  ];

  const filteredGroups = useMemo(() => {
    return reportGroups
      .filter(group => activeCategory === 'All' || group.category === activeCategory)
      .map(group => ({
        ...group,
        reports: group.reports.filter(r => 
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          r.desc.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(group => group.reports.length > 0);
  }, [activeCategory, searchQuery]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Browse Various Reports</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search reports..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {['All Reports', 'Transactions', 'Parties', 'Inventory'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat.replace(' Reports', '') as any)}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
              (activeCategory === 'All' && cat === 'All Reports') || activeCategory === cat
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        {filteredGroups.map((group) => (
          <div key={group.category} className="space-y-6">
            <h2 className="text-lg font-bold text-gray-600 tracking-wide">{group.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {group.reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => onNavigate(report.id as ReportType)}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all text-left flex flex-col group min-h-[140px]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                      {report.title}
                    </h3>
                    {report.hasView && (
                      <span className="text-[10px] font-bold text-brand-600 uppercase flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    {report.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- All Transactions Report ---
const AllTransactionsReport: React.FC<{ onBack: () => void, onEdit?: (t: Transaction) => void }> = ({ onBack, onEdit }) => {
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
    const [endDate, setEndDate] = useState(new Date().toISOString());
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const transactions = useMemo(() => {
        const txs = db.getTransactions();
        let filtered = txs;

        if (startDate) {
            const start = new Date(startDate); start.setHours(0,0,0,0);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate); end.setHours(23,59,59,999);
            filtered = filtered.filter(t => new Date(t.date) <= end);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.partyName.toLowerCase().includes(term) || 
                t.id.toLowerCase().includes(term) ||
                (t.notes && t.notes.toLowerCase().includes(term))
            );
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [startDate, endDate, searchTerm]);

    const handleExport = () => {
        exportToExcel(transformTransactionsForExport(transactions), 'All_Transactions');
        addToast('Exported successfully', 'success');
    };

    const handlePdfDownload = () => {
        const columns = ['Date', 'Type', 'Party', 'Amount', 'Mode'];
        const rows = transactions.map(t => [
            formatNepaliDate(t.date),
            t.type.replace('_', ' '),
            t.partyName,
            formatCurrency(t.totalAmount),
            t.paymentMode || 'Credit'
        ]);
        generatePdf('Full Business Ledger', columns, rows, 'All_Transactions');
        addToast('PDF download started', 'success');
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">All Transactions</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Unified Business Ledger</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Filter..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="Start Date" /></div>
                    <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="End Date" /></div>
                    <button onClick={handlePdfDownload} className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 shadow-sm" title="Download PDF"><FileDown className="w-5 h-5" /></button>
                    <button onClick={handleExport} className="p-2.5 bg-white border border-gray-200 text-emerald-600 rounded-xl hover:bg-emerald-50 shadow-sm" title="Export Excel"><FileSpreadsheet className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Vch No</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Party</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Edit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-gray-500 font-medium">{formatNepaliDate(t.date)}</td>
                                    <td className="px-6 py-4 font-mono text-gray-400 text-xs">#{t.id.slice(-6)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                                            t.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 
                                            t.type === 'PURCHASE' ? 'bg-blue-50 text-blue-600' : 
                                            t.type === 'EXPENSE' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {t.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{t.partyName}</td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(t.totalAmount)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => onEdit?.(t)} className="p-1.5 text-gray-300 hover:text-brand-600 transition-colors opacity-0 group-hover:opacity-100"><Pencil className="w-4 h-4" /></button>
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

// --- Receivable Aging Report ---
const ReceivableAgingReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedPartyId, setFocusedPartyId] = useState<string | null>(null);
    const { addToast } = useToast();

    const agingData = useMemo((): AgingRow[] => {
        const parties = db.getParties().filter(p => p.balance > 0); 
        const transactions = db.getTransactions();
        const now = new Date();

        return parties.map(party => {
            const partyTxns = transactions
                .filter(t => t.partyId === party.id && (t.type === 'SALE' || t.type === 'BALANCE_ADJUSTMENT'))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            let current: AgingItem[] = [];
            let week1: AgingItem[] = [];
            let day15: AgingItem[] = [];
            let month1: AgingItem[] = [];
            let month3: AgingItem[] = [];

            let remainingBalance = party.balance;

            partyTxns.forEach(t => {
                if (remainingBalance <= 0) return;
                
                const amountToAge = Math.min(t.totalAmount, remainingBalance);
                const tDate = new Date(t.date);
                const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
                const entry: AgingItem = { id: t.id, date: t.date, amount: amountToAge };

                if (diffDays <= 7) current.push(entry);
                else if (diffDays <= 15) week1.push(entry);
                else if (diffDays <= 30) day15.push(entry);
                else if (diffDays <= 90) month1.push(entry);
                else month3.push(entry);

                remainingBalance -= amountToAge;
            });

            if (remainingBalance > 0) month3.push({ id: 'Adjustment', date: partyTxns[partyTxns.length-1]?.date || now.toISOString(), amount: remainingBalance });

            const sumArr = (arr: AgingItem[]): number => arr.reduce((s, i) => s + i.amount, 0);

            return {
                id: party.id,
                name: party.name,
                phone: party.phone,
                total: party.balance,
                buckets: {
                  current: { items: current, total: sumArr(current) },
                  week1: { items: week1, total: sumArr(week1) },
                  day15: { items: day15, total: sumArr(day15) },
                  month1: { items: month1, total: sumArr(month1) },
                  month3: { items: month3, total: sumArr(month3) }
                }
            };
        }).filter(item => item.total > 0 && item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const totals = useMemo(() => {
        return agingData.reduce((acc, curr: AgingRow) => ({
            total: acc.total + curr.total,
            current: acc.current + curr.buckets.current.total,
            week1: acc.week1 + curr.buckets.week1.total,
            day15: acc.day15 + curr.buckets.day15.total,
            month1: acc.month1 + curr.buckets.month1.total,
            month3: acc.month3 + curr.buckets.month3.total,
        }), { total: 0, current: 0, week1: 0, day15: 0, month1: 0, month3: 0 });
    }, [agingData]);

    const handlePdfDownload = () => {
        const columns = ['Party', 'Total', 'Current', '1Wk+', '15D+', '1Mo+', '3Mo+'];
        const rows = agingData.map(r => [
            r.name, 
            formatCurrency(r.total), 
            formatCurrency(r.buckets.current.total), 
            formatCurrency(r.buckets.week1.total), 
            formatCurrency(r.buckets.day15.total), 
            formatCurrency(r.buckets.month1.total), 
            formatCurrency(r.buckets.month3.total)
        ]);
        generatePdf('Full Receivable Aging Summary', columns, rows, 'Receivable_Aging');
        addToast('Aging report PDF generated', 'success');
    };

    const focusedParty = focusedPartyId ? agingData.find(p => p.id === focusedPartyId) : null;

    if (focusedParty) {
      return (
        <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-300">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => setFocusedPartyId(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
                 <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase">{focusedParty.name} - Aging Details</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{focusedParty.phone || 'No phone'}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { label: 'Current', data: focusedParty.buckets.current, color: 'emerald' },
                { label: '1 Week+', data: focusedParty.buckets.week1, color: 'blue' },
                { label: '15 Days+', data: focusedParty.buckets.day15, color: 'yellow' },
                { label: '1 Month+', data: focusedParty.buckets.month1, color: 'orange' },
                { label: '3 Months+', data: focusedParty.buckets.month3, color: 'red' }
              ].map(bucket => (
                 <div key={bucket.label} className={`bg-${bucket.color}-50 p-5 rounded-2xl border border-${bucket.color}-100`}>
                    <p className={`text-[10px] font-black text-${bucket.color}-600 uppercase tracking-widest mb-1`}>{bucket.label}</p>
                    <p className={`text-xl font-black text-${bucket.color}-700`}>{formatCurrency(bucket.data.total)}</p>
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                        {bucket.data.items.length > 0 ? (
                           bucket.data.items.map(i => (
                             <div key={i.id} className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                <span>#{i.id.slice(-6)}</span>
                                <span>{formatCurrency(i.amount)}</span>
                             </div>
                           ))
                        ) : (
                           <span className="text-[10px] text-gray-300 italic">No invoices</span>
                        )}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Receivable Aging</h2>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Search party..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={handlePdfDownload} className="p-2.5 bg-white border border-gray-200 rounded-xl text-blue-600 hover:bg-blue-50 shadow-sm" title="Download PDF"><FileDown className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-5">Party Name</th>
                                <th className="px-6 py-5 text-right">Total Balance</th>
                                <th className="px-6 py-5 text-right">0-7 Days</th>
                                <th className="px-6 py-5 text-right">1 Week+</th>
                                <th className="px-6 py-5 text-right">15 Days+</th>
                                <th className="px-6 py-5 text-right">1 Month+</th>
                                <th className="px-6 py-5 text-right">3 Months+</th>
                                <th className="px-6 py-5 text-center">Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {agingData.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{row.name}</div>
                                        <div className="text-[10px] text-gray-400">{row.phone || 'No Phone'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(row.total)}</td>
                                    <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(row.buckets.current.total)}</td>
                                    <td className="px-6 py-4 text-right text-blue-600">{formatCurrency(row.buckets.week1.total)}</td>
                                    <td className="px-6 py-4 text-right text-yellow-600">{formatCurrency(row.buckets.day15.total)}</td>
                                    <td className="px-6 py-4 text-right text-orange-600">{formatCurrency(row.buckets.month1.total)}</td>
                                    <td className="px-6 py-4 text-right text-red-600">{formatCurrency(row.buckets.month3.total)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => setFocusedPartyId(row.id)} className="p-1.5 bg-gray-100 rounded-lg text-gray-400 hover:text-brand-600"><ChevronRight className="w-4 h-4" /></button>
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

// --- Replenishment Report ---
const ReplenishmentReport: React.FC<{ onBack: () => void, onConvert?: (items: TransactionItem[]) => void }> = ({ onBack, onConvert }) => {
    const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
    const [manualLimit, setManualLimit] = useState<number>(5);
    const { addToast } = useToast();

    useEffect(() => {
        const products = db.getProducts();
        const lowStock: RestockItem[] = products
            .filter(p => p.type !== 'service' && (p.stock <= manualLimit || p.stock < (p.minStockLevel || manualLimit)))
            .map(p => ({
                productId: p.id,
                name: p.name,
                category: p.category || 'General',
                stock: p.stock,
                threshold: p.minStockLevel || manualLimit,
                required: Math.max(1, (p.minStockLevel || manualLimit) - p.stock),
                rate: p.purchasePrice,
                unit: p.unit
            }));
        setRestockItems(lowStock);
    }, [manualLimit]);

    const handleConvertToPurchase = () => {
        if (onConvert) {
            const items: TransactionItem[] = restockItems.map(i => ({
                productId: i.productId,
                productName: i.name,
                quantity: i.required,
                rate: i.rate,
                unit: i.unit,
                amount: i.required * i.rate
            }));
            onConvert(items);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-black text-[#0f172a] uppercase">Restock Assistant</h2>
                </div>
                <button onClick={handleConvertToPurchase} className="px-6 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-bold text-xs uppercase">
                    Convert to Purchase Bill
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5">Item Details</th>
                                <th className="px-8 py-5 text-center">Current Stock</th>
                                <th className="px-8 py-5 text-center">Required</th>
                                <th className="px-8 py-5 text-right">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {restockItems.map((item) => (
                                <tr key={item.productId} className="hover:bg-gray-50/50">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-gray-800">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 uppercase">{item.category}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center font-black text-red-600">{item.stock}</td>
                                    <td className="px-8 py-6 text-center font-black text-brand-600">{item.required} {item.unit}</td>
                                    <td className="px-8 py-6 text-right font-black">{formatCurrency(item.required * item.rate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Party Statement Report ---
const PartyStatementReport: React.FC<{ onBack: () => void, onEdit?: (t: Transaction) => void }> = ({ onBack, onEdit }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const { addToast } = useToast();

  useEffect(() => { setParties(db.getParties()); }, []);

  const selectedParty = useMemo(() => parties.find(p => p.id === selectedPartyId), [parties, selectedPartyId]);

  const statementData = useMemo((): LedgerRow[] => {
    if (!selectedPartyId) return [];
    const txns = db.getTransactions()
      .filter(t => t.partyId === selectedPartyId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return txns.map(t => {
      let debit = 0; let credit = 0;
      if (t.type === 'SALE') debit = t.totalAmount;
      else if (t.type === 'PURCHASE' || t.type === 'PAYMENT_IN') credit = t.totalAmount;
      else if (t.type === 'PAYMENT_OUT') debit = t.totalAmount;
      
      runningBalance += (debit - credit);
      return {
        id: t.id, date: t.date, type: t.type, account: t.type, 
        debit, credit, balance: Math.abs(runningBalance), 
        balanceType: runningBalance >= 0 ? 'Dr' : 'Cr', 
        narration: t.notes || '', original: t
      };
    });
  }, [selectedPartyId]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-xl font-black text-gray-800 uppercase">Party Ledger</h2>
        </div>
        <select 
          className="p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold w-64 outline-none"
          value={selectedPartyId}
          onChange={e => setSelectedPartyId(e.target.value)}
        >
          <option value="">Select Party...</option>
          {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Debit</th>
                <th className="px-6 py-4 text-right">Credit</th>
                <th className="px-6 py-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {statementData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{formatNepaliDate(row.date)}</td>
                  <td className="px-6 py-4 font-bold">{row.type}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-black">{formatCurrency(row.balance)} {row.balanceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Profit & Loss Report ---
const ProfitLossReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
    const [endDate, setEndDate] = useState(new Date().toISOString());

    const metrics = useMemo(() => {
        const transactions = db.getTransactions();
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);

        let sales = 0; let expenses = 0;
        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= start && tDate <= end) {
                if (t.type === 'SALE') sales += t.totalAmount;
                else if (t.type === 'EXPENSE') expenses += t.totalAmount;
            }
        });
        return { sales, expenses, net: sales - expenses };
    }, [startDate, endDate]);

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold uppercase">Profit & Loss</h2>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400">Total Sales</p>
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency(metrics.sales)}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400">Total Expenses</p>
                    <p className="text-2xl font-black text-red-600">{formatCurrency(metrics.expenses)}</p>
                </div>
                <div className="bg-brand-600 p-8 rounded-3xl text-white shadow-xl">
                    <p className="text-[10px] font-black uppercase opacity-60">Net Profit</p>
                    <p className="text-2xl font-black">{formatCurrency(metrics.net)}</p>
                </div>
            </div>
        </div>
    );
};

// --- Other Basic Reports ---
const StockReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const products = useMemo(() => db.getProducts().filter(p => p.type !== 'service'), []);
    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-bold uppercase">Stock Valuation</h2>
            </div>
            <div className="bg-white rounded-3xl border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 font-black uppercase text-[10px] text-gray-500">
                        <tr><th className="px-6 py-4">Item</th><th className="px-6 py-4 text-center">Stock</th><th className="px-6 py-4 text-right">Value</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4">{p.name}</td>
                                <td className="px-6 py-4 text-center font-bold">{p.stock}</td>
                                <td className="px-6 py-4 text-right font-bold">{formatCurrency(p.stock * p.purchasePrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AllPartiesReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const parties = useMemo(() => db.getParties(), []);
    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-bold uppercase">Parties Balance</h2>
            </div>
            <div className="bg-white rounded-3xl border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 font-black uppercase text-[10px] text-gray-500">
                        <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-right">Balance</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {parties.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-bold">{p.name}</td>
                                <td className={`px-6 py-4 text-right font-black ${p.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(p.balance))} {p.balance >= 0 ? 'Dr' : 'Cr'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Generic Transaction Report ---
const TransactionReport: React.FC<{ title: string, type: Transaction['type'], onBack: () => void }> = ({ title, type, onBack }) => {
    const txns = useMemo(() => db.getTransactions().filter(t => t.type === type), [type]);
    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-bold uppercase">{title}</h2>
            </div>
            <div className="bg-white rounded-3xl border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 font-black text-[10px] text-gray-500 uppercase">
                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Party</th><th className="px-6 py-4 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {txns.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4">{formatNepaliDate(t.date)}</td>
                                <td className="px-6 py-4 font-bold">{t.partyName}</td>
                                <td className="px-6 py-4 text-right font-black">{formatCurrency(t.totalAmount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Day Book Report ---
const DayBookReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [date, setDate] = useState(new Date().toISOString());
    const transactions = useMemo(() => {
        const start = new Date(date); start.setHours(0,0,0,0);
        const end = new Date(date); end.setHours(23,59,59,999);
        return db.getTransactions().filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
    }, [date]);

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold uppercase">Day Book</h2>
                </div>
                <div className="w-48"><NepaliDatePicker value={date} onChange={setDate} /></div>
            </div>
            <div className="bg-white rounded-3xl border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 font-black text-[10px] text-gray-500 uppercase">
                        <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Party</th><th className="px-6 py-4 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {transactions.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-6 py-4 font-bold">{t.type}</td>
                                <td className="px-6 py-4 font-bold">{t.partyName}</td>
                                <td className="px-6 py-4 text-right font-black">{formatCurrency(t.totalAmount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;