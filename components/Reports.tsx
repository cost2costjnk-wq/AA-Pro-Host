
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { Transaction, Party, Product, TransactionItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { 
  ArrowLeft, 
  Printer,
  FileSpreadsheet,
  Search,
  ArrowRight,
  Calculator,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Package,
  History,
  Activity,
  ChevronRight,
  PieChart,
  TrendingDown,
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
  ArrowUpDown,
  Pencil,
  ChevronLeft,
  Calendar,
  Trash2,
  Plus,
  FilterX,
  Layers,
  Banknote,
  Receipt
} from 'lucide-react';
// Added missing transformPartiesForExport and transformProductsForExport to the import list below
import { exportToExcel, printData, transformTransactionsForExport, transformPartiesForExport, transformProductsForExport } from '../services/exportService';
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
  | 'ALL_PARTY_STATEMENT'
  | 'RECEIVABLE_AGING'
  | 'STOCK_QUANTITY'
  | 'OUT_OF_STOCK';

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
          <h3 className="font-bold text-gray-400 uppercase tracking-widest">Report under development</h3>
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
                    <button onClick={handleExport} className="p-2.5 bg-white border border-gray-200 text-emerald-600 rounded-xl hover:bg-emerald-50 shadow-sm"><FileSpreadsheet className="w-5 h-5" /></button>
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

// --- Receivable Aging Report Component ---
const ReceivableAgingReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedPartyId, setFocusedPartyId] = useState<string | null>(null);
    const { addToast } = useToast();

    const agingData = useMemo(() => {
        const parties = db.getParties().filter(p => p.balance > 0); 
        const transactions = db.getTransactions();
        const now = new Date();

        return parties.map(party => {
            const partyTxns = transactions
                .filter(t => t.partyId === party.id && (t.type === 'SALE' || t.type === 'BALANCE_ADJUSTMENT'))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // Aging categories with invoice drill-down
            let current: any[] = [];   // 0-7 days
            let week1: any[] = [];     // 8-15 days
            let day15: any[] = [];     // 16-30 days
            let month1: any[] = [];    // 31-90 days
            let month3: any[] = [];    // 91+ days

            let remainingBalance = party.balance;

            partyTxns.forEach(t => {
                if (remainingBalance <= 0) return;
                
                const amountToAge = Math.min(t.totalAmount, remainingBalance);
                const tDate = new Date(t.date);
                const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
                const entry = { id: t.id, date: t.date, amount: amountToAge };

                if (diffDays <= 7) current.push(entry);
                else if (diffDays <= 15) week1.push(entry);
                else if (diffDays <= 30) day15.push(entry);
                else if (diffDays <= 90) month1.push(entry);
                else month3.push(entry);

                remainingBalance -= amountToAge;
            });

            // Catch-all for residual balance
            if (remainingBalance > 0) month3.push({ id: 'Adjustment', date: partyTxns[partyTxns.length-1]?.date || now.toISOString(), amount: remainingBalance });

            const sumArr = (arr: any[]) => arr.reduce((s, i) => s + i.amount, 0);

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
        return agingData.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            current: acc.current + curr.buckets.current.total,
            week1: acc.week1 + curr.buckets.week1.total,
            day15: acc.day15 + curr.buckets.day15.total,
            month1: acc.month1 + curr.buckets.month1.total,
            month3: acc.month3 + curr.buckets.month3.total,
        }), { total: 0, current: 0, week1: 0, day15: 0, month1: 0, month3: 0 });
    }, [agingData]);

    const handleExport = () => {
        const data = agingData.map(r => ({
            'Party Name': r.name,
            'Phone': r.phone || 'N/A',
            'Total Dues': r.total,
            'Current (0-7d)': r.buckets.current.total,
            '1 Week+ (8-15d)': r.buckets.week1.total,
            '15 Days+ (16-30d)': r.buckets.day15.total,
            '1 Month+ (31-90d)': r.buckets.month1.total,
            '3 Months+ (91d+)': r.buckets.month3.total
        }));
        exportToExcel(data, 'Receivable_Aging_Report');
        addToast('Aging report exported to Excel', 'success');
    };

    const handlePrintAll = () => {
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
        printData('Full Receivable Aging Summary', columns, rows);
    };

    const focusedParty = focusedPartyId ? agingData.find(p => p.id === focusedPartyId) : null;

    if (focusedParty) {
      return (
        <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-300">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => setFocusedPartyId(null)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                 <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase">{focusedParty.name} - Aging Details</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{focusedParty.phone || 'No phone'}</p>
                 </div>
              </div>
              <button 
                onClick={() => {
                  const columns = ['Bucket', 'Invoices', 'Amount'];
                  const rows = [
                    ['Current (0-7d)', focusedParty.buckets.current.items.map(i => `${i.id}(${formatNepaliDate(i.date)})`).join(', '), formatCurrency(focusedParty.buckets.current.total)],
                    ['1 Week+ (8-15d)', focusedParty.buckets.week1.items.map(i => `${i.id}(${formatNepaliDate(i.date)})`).join(', '), formatCurrency(focusedParty.buckets.week1.total)],
                    ['15 Days+ (16-30d)', focusedParty.buckets.day15.items.map(i => `${i.id}(${formatNepaliDate(i.date)})`).join(', '), formatCurrency(focusedParty.buckets.day15.total)],
                    ['1 Month+ (31-90d)', focusedParty.buckets.month1.items.map(i => `${i.id}(${formatNepaliDate(i.date)})`).join(', '), formatCurrency(focusedParty.buckets.month1.total)],
                    ['3 Months+ (91d+)', focusedParty.buckets.month3.items.map(i => `${i.id}(${formatNepaliDate(i.date)})`).join(', '), formatCurrency(focusedParty.buckets.month3.total)],
                  ];
                  printData(`Aging Analysis: ${focusedParty.name}`, columns, rows);
                }}
                className="p-3 bg-gray-900 text-white rounded-xl shadow-lg"
              >
                <Printer className="w-5 h-5" />
              </button>
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
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Receivable Aging</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Debt Concentration Analysis</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search party..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={handleExport} className="p-2.5 bg-white border border-gray-200 rounded-xl text-emerald-600 hover:bg-emerald-50 shadow-sm transition-all" title="Export Excel"><FileSpreadsheet className="w-5 h-5" /></button>
                    <button onClick={handlePrintAll} className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-black shadow-lg shadow-gray-200 transition-all" title="Print All"><Printer className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Dues</p>
                    <p className="text-lg font-black text-gray-900">{formatCurrency(totals.total)}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">0-7 Days</p>
                    <p className="text-lg font-black text-emerald-700">{formatCurrency(totals.current)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">1 Week+</p>
                    <p className="text-lg font-black text-blue-700">{formatCurrency(totals.week1)}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                    <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">15 Days+</p>
                    <p className="text-lg font-black text-yellow-700">{formatCurrency(totals.day15)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">1 Month+</p>
                    <p className="text-lg font-black text-orange-700">{formatCurrency(totals.month1)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">3 Months+</p>
                    <p className="text-lg font-black text-red-700">{formatCurrency(totals.month3)}</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-5 w-64">Party Name</th>
                                <th className="px-6 py-5 text-right font-black text-gray-900 border-x border-gray-100 bg-gray-100/30">Total Balance</th>
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
                                        <div className="text-[10px] text-gray-400 font-bold">{row.phone || 'No Phone'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900 border-x border-gray-100 bg-gray-100/30">
                                        {formatCurrency(row.total)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{row.buckets.current.total > 0 ? formatCurrency(row.buckets.current.total) : '-'}</td>
                                    <td className="px-6 py-4 text-right text-blue-600 font-medium">{row.buckets.week1.total > 0 ? formatCurrency(row.buckets.week1.total) : '-'}</td>
                                    <td className="px-6 py-4 text-right text-yellow-600 font-bold">{row.buckets.day15.total > 0 ? formatCurrency(row.buckets.day15.total) : '-'}</td>
                                    <td className="px-6 py-4 text-right text-orange-600 font-black">{row.buckets.month1.total > 0 ? formatCurrency(row.buckets.month1.total) : '-'}</td>
                                    <td className="px-6 py-4 text-right text-red-600 font-black">{row.buckets.month3.total > 0 ? formatCurrency(row.buckets.month3.total) : '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => setFocusedPartyId(row.id)} className="p-1.5 bg-gray-100 rounded-lg text-gray-400 hover:text-brand-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {agingData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <CheckCircle className="w-12 h-12 text-brand-500" />
                                            <p className="font-black uppercase tracking-[0.3em] text-xs">No overdue receivables</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-900 text-white font-black sticky bottom-0 z-10">
                            <tr>
                                <td className="px-6 py-4 uppercase text-[10px] tracking-widest">Grand Totals</td>
                                <td className="px-6 py-4 text-right text-brand-400">{formatCurrency(totals.total)}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(totals.current)}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(totals.week1)}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(totals.day15)}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(totals.month1)}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(totals.month3)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Restock Assistant (Replenishment) Component ---
const ReplenishmentReport: React.FC<{ onBack: () => void, onConvert?: (items: any[]) => void }> = ({ onBack, onConvert }) => {
    const [restockItems, setRestockItems] = useState<any[]>([]);
    const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
    const [manualLimit, setManualLimit] = useState<number>(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const { addToast } = useToast();
    const addDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        refreshList();
    }, [manualLimit]);

    const refreshList = () => {
        const products = db.getProducts();
        const draft = db.getReplenishmentDraft();
        
        // Initial list based on manual limit or system threshold
        const lowStockItems = products
            .filter(p => p.type !== 'service' && (p.stock <= manualLimit || p.stock < (p.minStockLevel || manualLimit)))
            .map(p => {
                const draftItem = draft.find(d => d.productId === p.id);
                const suggestedQty = Math.max(0, (p.minStockLevel || manualLimit) - p.stock);
                return {
                    productId: p.id,
                    name: p.name,
                    category: p.category || 'General',
                    stock: p.stock,
                    threshold: p.minStockLevel || manualLimit,
                    required: draftItem ? draftItem.required : (suggestedQty > 0 ? suggestedQty : 1),
                    rate: p.purchasePrice,
                    unit: p.unit
                };
            });
        
        setRestockItems(lowStockItems);
        setIsLoading(false);
    };

    const masterProducts = useMemo(() => db.getProducts().filter(p => p.type !== 'service'), []);
    const filteredMasterProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        return masterProducts.filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) && 
            !restockItems.find(r => r.productId === p.id)
        ).slice(0, 10);
    }, [productSearch, masterProducts, restockItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(event.target as Node)) {
                setShowAddDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const uniqueCategories = useMemo(() => Array.from(new Set(restockItems.map(i => i.category))), [restockItems]);

    const displayList = useMemo(() => {
        return restockItems
            .filter(i => !excludedCategories.includes(i.category))
            .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (a.stock <= 0 && b.stock > 0) return -1;
                if (a.stock > 0 && b.stock <= 0) return 1;
                return (a.threshold - a.stock) - (b.threshold - b.stock);
            });
    }, [restockItems, excludedCategories, searchTerm]);

    const updateRequired = (id: string, val: number) => {
        setRestockItems(prev => prev.map(item => 
            item.productId === id ? { ...item, required: Math.max(0, val) } : item
        ));
    };

    const deleteRow = (id: string) => {
        setRestockItems(prev => prev.filter(i => i.productId !== id));
        addToast('Item removed from current list', 'info');
    };

    const handleAddItem = (p: Product) => {
        const suggestedQty = Math.max(1, (p.minStockLevel || manualLimit) - p.stock);
        const newItem = {
            productId: p.id,
            name: p.name,
            category: p.category || 'General',
            stock: p.stock,
            threshold: p.minStockLevel || manualLimit,
            required: suggestedQty,
            rate: p.purchasePrice,
            unit: p.unit
        };
        setRestockItems(prev => [newItem, ...prev]);
        setProductSearch('');
        setShowAddDropdown(false);
        addToast(`${p.name} added to list`, 'success');
    };

    const handleSaveDraft = () => {
        db.updateReplenishmentDraft(restockItems.map(i => ({ productId: i.productId, required: i.required })));
        addToast('Restock draft saved successfully', 'success');
    };

    const handleExport = () => {
        const data = displayList.map(i => ({
            'Maintain (Threshold)': i.threshold,
            'Item Name': i.name,
            'Category': i.category,
            'Current Stock': i.stock,
            'Order Qty': i.required,
            'Unit': i.unit,
            'Unit Cost': i.rate,
            'Total Est. Cost': i.required * i.rate
        }));
        exportToExcel(data, 'Replenishment_Order_List');
        addToast('Replenishment list exported to Excel', 'success');
    };

    const handlePrint = () => {
        const columns = ['Maintain', 'Item', 'Category', 'In Stock', 'Order Required', 'Est. Cost'];
        const rows = displayList.map(i => [
            `${i.threshold} ${i.unit}`,
            i.name,
            i.category,
            `${i.stock} ${i.unit}`,
            `${i.required} ${i.unit}`,
            formatCurrency(i.required * i.rate)
        ]);
        printData('Replenishment / Restock Order', columns, rows);
    };

    const handleConvertToPurchase = () => {
        const selected = displayList.filter(i => i.required > 0);
        if (selected.length === 0) {
            addToast('No items with required quantity to order', 'error');
            return;
        }
        
        if (onConvert) {
            const purchaseItems: TransactionItem[] = selected.map(i => ({
                productId: i.productId,
                productName: i.name,
                quantity: i.required,
                rate: i.rate,
                unit: i.unit,
                amount: i.required * i.rate
            }));
            onConvert(purchaseItems);
        }
    };

    const toggleCategoryExclusion = (cat: string) => {
        setExcludedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const totalEstimatedCost = displayList.reduce((s, i) => s + (i.required * i.rate), 0);

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight">Restock Assistant</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Inventory Replenishment Engine</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExport} className="p-2 bg-white border border-gray-200 text-emerald-600 rounded-xl hover:bg-emerald-50 shadow-sm transition-all" title="Export Excel"><FileSpreadsheet className="w-5 h-5" /></button>
                    <button onClick={handlePrint} className="p-2 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 shadow-sm transition-all" title="Print PDF"><Printer className="w-5 h-5" /></button>
                    <button onClick={handleSaveDraft} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs uppercase shadow-sm">
                        <Save className="w-4 h-4" /> Save Draft
                    </button>
                    <button onClick={handleConvertToPurchase} className="flex items-center gap-2 px-6 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all font-bold text-xs uppercase shadow-lg shadow-brand-500/20">
                        <ShoppingCart className="w-4 h-4" /> Finalize Bill
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1" ref={addDropdownRef}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search any item to add manually..." 
                                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                                value={productSearch}
                                onChange={e => {setProductSearch(e.target.value); setShowAddDropdown(true);}}
                                onFocus={() => setShowAddDropdown(true)}
                            />
                            {showAddDropdown && productSearch.trim() && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                                    {filteredMasterProducts.map(p => (
                                        <div key={p.id} className="p-3 border-b hover:bg-brand-50 cursor-pointer flex justify-between items-center" onClick={() => handleAddItem(p)}>
                                            <div><p className="font-bold text-sm">{p.name}</p><p className="text-[10px] text-gray-400 uppercase">Stock: {p.stock} | {p.category}</p></div>
                                            <Plus className="w-4 h-4 text-brand-500" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-3 flex items-center gap-3 shadow-sm min-w-[220px]">
                            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                            <label className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">Stock &lt; </label>
                            <input 
                                type="number" 
                                className="w-full text-sm font-black text-brand-600 outline-none" 
                                value={manualLimit} 
                                onChange={e => setManualLimit(parseInt(e.target.value) || 0)} 
                            />
                        </div>
                    </div>
                </div>

                <div className="md:col-span-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm overflow-hidden flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><FilterX className="w-3.5 h-3.5" /> Exclude Categories</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[60px] custom-scrollbar">
                        {uniqueCategories.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => toggleCategoryExclusion(cat)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border ${
                                    excludedCategories.includes(cat) 
                                    ? 'bg-red-50 text-red-600 border-red-100' 
                                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-8 py-5">Maintain (Threshold)</th>
                                <th className="px-8 py-5">Item Details</th>
                                <th className="px-8 py-5 text-center">In Stock</th>
                                <th className="px-8 py-5 text-center">Order Required</th>
                                <th className="px-8 py-5 text-right">Est. Cost</th>
                                <th className="px-8 py-5 text-center w-20">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayList.map((item) => (
                                <tr key={item.productId} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="inline-flex items-center gap-2 bg-gray-100/50 px-3 py-1 rounded-full text-xs font-black text-gray-500">
                                            <Layers className="w-3 h-3 opacity-50" /> {item.threshold} {item.unit}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-gray-800">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{item.category}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-lg font-black ${item.stock <= 0 ? 'text-red-600 animate-pulse' : 'text-orange-500'}`}>{item.stock}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="inline-flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 group-hover:bg-white transition-all">
                                            <button onClick={() => updateRequired(item.productId, item.required - 1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors bg-white shadow-sm">-</button>
                                            <input 
                                                type="number" 
                                                className="w-16 text-center bg-transparent font-black text-brand-600 text-lg outline-none" 
                                                value={item.required}
                                                onChange={e => updateRequired(item.productId, parseInt(e.target.value) || 0)}
                                            />
                                            <button onClick={() => updateRequired(item.productId, item.required + 1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-500 transition-colors bg-white shadow-sm">+</button>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="font-black text-gray-800">{formatCurrency(item.required * item.rate)}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">@{formatCurrency(item.rate)}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button onClick={() => deleteRow(item.productId)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-gray-900 text-white flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Items to Order</p>
                            <p className="text-2xl font-black">{displayList.filter(i => i.required > 0).length} / {displayList.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Estimated Investment</p>
                            <p className="text-2xl font-black text-brand-500">{formatCurrency(totalEstimatedCost)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <button onClick={() => { if(window.confirm('Reset all quantities to suggested levels?')) refreshList(); }} className="text-[10px] font-black uppercase text-gray-400 hover:text-white flex items-center gap-1.5 transition-all">
                            <RotateCcw className="w-3 h-3" /> Reset all filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Party Statement Report (Requested Layout) ---
const PartyStatementReport: React.FC<{ onBack: () => void, onEdit?: (t: Transaction) => void }> = ({ onBack, onEdit }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setParties(db.getParties());
  }, []);

  const selectedParty = useMemo(() => parties.find(p => p.id === selectedPartyId), [parties, selectedPartyId]);

  const statementData = useMemo(() => {
    if (!selectedPartyId) return [];

    const allTxns = db.getTransactions()
      .filter(t => t.partyId === selectedPartyId && t.type !== 'QUOTATION')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const ledger: any[] = [];

    allTxns.forEach(t => {
      let debit = 0;
      let credit = 0;

      if (t.type === 'SALE') {
          debit = t.totalAmount;
      } else if (t.type === 'PURCHASE') {
          credit = t.totalAmount;
      } else if (t.type === 'PAYMENT_IN') {
          credit = t.totalAmount;
      } else if (t.type === 'PAYMENT_OUT') {
          debit = t.totalAmount;
      } else if (t.type === 'BALANCE_ADJUSTMENT') {
          if (t.totalAmount >= 0) debit = t.totalAmount;
          else credit = Math.abs(t.totalAmount);
      } else if (t.type === 'SALE_RETURN') {
          credit = t.totalAmount;
      } else if (t.type === 'PURCHASE_RETURN') {
          debit = t.totalAmount;
      }

      runningBalance += (debit - credit);

      const tDate = new Date(t.date);
      let showRow = true;
      if (startDate && tDate < new Date(startDate)) showRow = false;
      if (endDate && tDate > new Date(endDate)) showRow = false;

      if (showRow) {
        ledger.push({
          id: t.id,
          date: t.date,
          type: t.type === 'BALANCE_ADJUSTMENT' ? 'BALA' : 
                t.type === 'SALE' ? 'SALE' : 
                t.type === 'PURCHASE' ? 'PURC' : 
                t.type.includes('PAYMENT') ? 'PAYM' : 
                t.type === 'SALE_RETURN' ? 'SRTN' : 'VCHR',
          account: t.type === 'SALE' || t.type === 'PURCHASE' ? 
                   `${t.type} ${t.items?.map(i => `${i.productName} ${i.quantity}${i.unit || 'pcs'}@${i.rate}`).join(', ')}` : 
                   t.type.replace('_', ' '),
          debit,
          credit,
          balance: Math.abs(runningBalance),
          balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
          narration: t.notes || '',
          original: t
        });
      }
    });

    return ledger;
  }, [selectedPartyId, startDate, endDate]);

  const handlePrint = () => {
    if (!selectedParty) return;
    const columns = ['Date', 'Type', 'Vch No', 'Account', 'Debit', 'Credit', 'Balance', 'Narration'];
    const rows = statementData.map(r => [
      formatNepaliDate(r.date), 
      r.type, 
      r.id.slice(-6), 
      r.account, 
      r.debit > 0 ? formatCurrency(r.debit) : '', 
      r.credit > 0 ? formatCurrency(r.credit) : '', 
      `${formatCurrency(r.balance)} ${r.balanceType}`,
      r.narration
    ]);
    printData(`Statement: ${selectedParty.name}`, columns, rows);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Party Statement (Ledger)</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Select Party..." 
                className="pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold w-64 outline-none focus:ring-2 focus:ring-brand-500"
                value={selectedParty?.name || partySearch}
                onChange={(e) => { setPartySearch(e.target.value); if(selectedPartyId) setSelectedPartyId(''); setShowPartyDropdown(true); }}
                onFocus={() => setShowPartyDropdown(true)}
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {showPartyDropdown && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                {parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase())).map(p => (
                  <div key={p.id} className="p-3 border-b last:border-0 hover:bg-brand-50 cursor-pointer text-sm font-bold text-gray-700" onClick={() => { setSelectedPartyId(p.id); setPartySearch(p.name); setShowPartyDropdown(false); }}>
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="Start Date" /></div>
          <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="End Date" /></div>
          <button onClick={handlePrint} className="p-3 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-black transition-all active:scale-95"><Printer className="w-5 h-5" /></button>
        </div>
      </div>

      {!selectedPartyId ? (
        <div className="flex-1 bg-white border border-dashed border-gray-300 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 gap-4">
           <Users className="w-16 h-16 opacity-10" />
           <p className="font-bold uppercase text-xs tracking-[0.2em]">Select a party to view transaction ledger</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">{selectedParty?.name}</h1>
            <div className="flex gap-4 mt-1">
               <span className="text-[10px] font-black uppercase text-brand-600 tracking-widest">{selectedParty?.type}</span>
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Phone: {selectedParty?.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-[13px] border-collapse">
              <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-y border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 border-r border-gray-100 text-center w-32">Date</th>
                  <th className="px-6 py-4 border-r border-gray-100 text-center w-20">Type</th>
                  <th className="px-6 py-4 border-r border-gray-100 text-center w-28">Vch No</th>
                  <th className="px-6 py-4 border-r border-gray-100 text-left">Account</th>
                  <th className="px-6 py-4 border-r border-gray-100 text-right w-32">Debit(Rs.)</th>
                  <th className="px-6 py-4 border-r border-gray-100 text-right w-32">Credit(Rs.)</th>
                  <th className="px-6 py-4 border-r border-gray-100 text-right w-40">Balance(Rs.)</th>
                  <th className="px-6 py-4 text-left">Narration</th>
                  <th className="px-6 py-4 text-center w-16">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                <tr className="bg-blue-50/30">
                   <td colSpan={3} className="px-6 py-4 border-r border-gray-100"></td>
                   <td className="px-6 py-4 border-r border-gray-100 font-black text-gray-900 uppercase">Opening Balance</td>
                   <td className="px-6 py-4 border-r border-gray-100"></td>
                   <td className="px-6 py-4 border-r border-gray-100"></td>
                   <td className="px-6 py-4 border-r border-gray-100 text-right font-black text-gray-900">0 Dr</td>
                   <td className="px-6 py-4" colSpan={2}></td>
                </tr>
                {statementData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 border-r border-gray-100 text-center font-bold text-gray-500">{formatNepaliDate(row.date)}</td>
                    <td className="px-6 py-4 border-r border-gray-100 text-center font-black text-[10px]">{row.type}</td>
                    <td className="px-6 py-4 border-r border-gray-100 text-center font-mono text-gray-400">#{row.id.slice(-6)}</td>
                    <td className="px-6 py-4 border-r border-gray-100 font-bold text-gray-800 leading-tight">
                       <div className="flex flex-col">
                          <span className="uppercase text-[11px] mb-0.5">{row.type.replace('_', ' ')}</span>
                          <span className="text-[10px] text-gray-400 font-medium leading-normal">{row.account}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 border-r border-gray-100 text-right font-black text-gray-900">{row.debit > 0 ? formatCurrency(row.debit) : ''}</td>
                    <td className="px-6 py-4 border-r border-gray-100 text-right font-black text-gray-900">{row.credit > 0 ? formatCurrency(row.credit) : ''}</td>
                    <td className="px-6 py-4 border-r border-gray-100 text-right font-black text-gray-900">{formatCurrency(row.balance)} {row.balanceType}</td>
                    <td className="px-6 py-4 text-gray-400 italic text-xs truncate max-w-[150px]">{row.narration}</td>
                    <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => onEdit?.(row.original)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {statementData.length === 0 && (
               <div className="py-20 text-center flex flex-col items-center gap-2 opacity-30">
                  <FileText className="w-10 h-10" />
                  <p className="text-xs font-black uppercase">No transaction activity recorded for this period</p>
               </div>
            )}
          </div>
          
          <div className="p-6 bg-gray-900 text-white flex justify-between items-center rounded-b-3xl">
             <div className="flex gap-10">
                <div>
                   <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Total Debit</p>
                   <p className="text-xl font-black">{formatCurrency(statementData.reduce((s,r)=>s+r.debit,0))}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Credit</p>
                   <p className="text-xl font-black">{formatCurrency(statementData.reduce((s,r)=>s+r.credit,0))}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Final Net Balance</p>
                <p className="text-3xl font-black text-brand-500">
                   {formatCurrency(statementData.length > 0 ? statementData[statementData.length-1].balance : 0)} 
                   <span className="text-sm ml-1 opacity-60 font-bold">{statementData.length > 0 ? statementData[statementData.length-1].balanceType : ''}</span>
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TransactionReport: React.FC<{ title: string, type: Transaction['type'], onBack: () => void }> = ({ title, type, onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const prods = db.getProducts();
    const txns = db.getTransactions();
    setAllProducts(prods);
    setAllTxns(txns);

    let data = txns.filter(t => t.type === type);

    if (startDate) {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      data = data.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate); end.setHours(23,59,59,999);
      data = data.filter(t => new Date(t.date) <= end);
    }
    setTransactions(data);
  }, [type, startDate, endDate]);

  return (
    <div className="flex flex-col h-full space-y-6">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
             <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From Date" /></div>
             <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To Date" /></div>
          </div>
       </div>

       {(type === 'SALE' || type === 'SALE_RETURN') && (
          <FinancialSummaryCards transactions={transactions} products={allProducts} allTransactions={allTxns} />
       )}

       <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Detailed Logs</span>
             </div>
             <div className="flex gap-2">
                <button onClick={() => exportToExcel(transformTransactionsForExport(transactions), 'Report')} className="p-3 bg-white border border-gray-200 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"><FileSpreadsheet className="w-4 h-4" /></button>
                <button onClick={() => printData(title, ['Date', 'Ref', 'Party', 'Amount'], transactions.map(t => [formatNepaliDate(t.date), t.id, t.partyName, formatCurrency(t.totalAmount)]))} className="p-3 bg-white border border-gray-200 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"><Printer className="w-5 h-5" /></button>
             </div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] tracking-widest sticky top-0 z-10 shadow-sm">
                   <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Ref No</th>
                      <th className="px-6 py-4">Party Details</th>
                      <th className="px-6 py-4 text-right">Total Amount</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {transactions.map(t => (
                     <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-500">{formatNepaliDate(t.date)}</td>
                        <td className="px-6 py-4 font-mono text-gray-400 font-bold text-xs">#{t.id.slice(-6)}</td>
                        <td className="px-6 py-4 font-black text-gray-800">{t.partyName}</td>
                        <td className="px-6 py-4 text-right font-black text-brand-600 text-lg">{formatCurrency(t.totalAmount)}</td>
                     </tr>
                   ))}
                   {transactions.length === 0 && (
                       <tr><td colSpan={4} className="py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">No matching records found</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

const FinancialSummaryCards: React.FC<{ transactions: Transaction[], products: Product[], allTransactions: Transaction[] }> = ({ transactions, products, allTransactions }) => {
    const metrics = useMemo(() => {
        const productMap = new Map<string, Product>();
        products.forEach(p => productMap.set(p.id, p));

        let netSales = 0;
        let totalCogs = 0;
        let periodExpenses = 0;

        transactions.forEach(t => {
            if (t.type === 'SALE') {
                netSales += t.totalAmount;
                t.items?.forEach(item => {
                    const p = productMap.get(item.productId);
                    if (p && p.type !== 'service') {
                        let qty = item.quantity;
                        if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                            qty = item.quantity / p.conversionRatio;
                        }
                        totalCogs += (qty * p.purchasePrice);
                    }
                });
            } else if (t.type === 'SALE_RETURN') {
                netSales -= t.totalAmount;
                t.items?.forEach(item => {
                    const p = productMap.get(item.productId);
                    if (p && p.type !== 'service') {
                        let qty = item.quantity;
                        if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                            qty = item.quantity / p.conversionRatio;
                        }
                        totalCogs -= (qty * p.purchasePrice);
                    }
                });
            }
        });

        if (transactions.length > 0) {
            const dates = transactions.map(t => new Date(t.date).getTime());
            const minDate = Math.min(...dates);
            const maxDate = Math.max(...dates);
            periodExpenses = allTransactions
                .filter(t => t.type === 'EXPENSE')
                .filter(t => {
                    const time = new Date(t.date).getTime();
                    return time >= minDate && time <= maxDate;
                })
                .reduce((sum, t) => sum + t.totalAmount, 0);
        }

        const grossProfit = netSales - totalCogs;
        const netProfit = grossProfit - periodExpenses;

        return { netSales, totalCogs, grossProfit, periodExpenses, netProfit };
    }, [transactions, products, allTransactions]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase mb-1 tracking-wider">
                    <ArrowUpCircle className="w-4 h-4" /> Net Value
                </div>
                <div className="text-2xl font-black text-gray-800">{formatCurrency(metrics.netSales)}</div>
                <div className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tight">Revenue contribution</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 text-orange-600 text-[10px] font-black uppercase mb-1 tracking-wider">
                    <ArrowDownCircle className="w-4 h-4" /> Stock Value
                </div>
                <div className="text-2xl font-black text-gray-800">{formatCurrency(metrics.totalCogs)}</div>
                <div className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tight">Inventory investment</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase mb-1 tracking-wider">
                    <Calculator className="w-4 h-4" /> Margin
                </div>
                <div className="text-2xl font-black text-gray-800">{formatCurrency(metrics.grossProfit)}</div>
                <div className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tight">Profit on records</div>
            </div>
            <div className="bg-brand-600 p-5 rounded-2xl shadow-lg shadow-brand-500/20 transform hover:scale-[1.02] transition-all">
                <div className="flex items-center gap-2 text-brand-100 text-[10px] font-black uppercase mb-1 tracking-wider">
                    <BarChart3 className="w-4 h-4" /> Actual Gain
                </div>
                <div className="text-2xl font-black text-white">{formatCurrency(metrics.netProfit)}</div>
                <div className="text-[10px] text-brand-100/70 mt-1 font-bold uppercase tracking-tight">Bottom Line impact</div>
            </div>
        </div>
    );
};

const DayBookReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [date, setDate] = useState(new Date().toISOString());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allTxns, setAllTxns] = useState<Transaction[]>([]);

    useEffect(() => {
        const txns = db.getTransactions();
        const prods = db.getProducts();
        setAllProducts(prods);
        setAllTxns(txns);

        const start = new Date(date); start.setHours(0,0,0,0);
        const end = new Date(date); end.setHours(23,59,59,999);
        const daily = txns.filter(t => { 
            const d = new Date(t.date); 
            return d >= start && d <= end; 
        });
        setTransactions(daily);
    }, [date]);

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Daily Cash Book</h2>
                </div>
                <div className="w-48"><NepaliDatePicker value={date} onChange={setDate} /></div>
            </div>

            <FinancialSummaryCards transactions={transactions} products={allProducts} allTransactions={allTxns} />

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transactions for {formatNepaliDate(date)}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] tracking-widest sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Particulars</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-6 py-4 font-mono text-gray-400 text-xs">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                            t.type === 'SALE' ? 'bg-emerald-50 text-emerald-600' : 
                                            t.type === 'PURCHASE' ? 'bg-blue-50 text-blue-600' : 
                                            t.type === 'EXPENSE' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {t.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{t.partyName}</td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900 text-lg">{formatCurrency(t.totalAmount)}</td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr><td colSpan={4} className="py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">No activity for this day</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ProfitLossReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
    const [endDate, setEndDate] = useState(new Date().toISOString());
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        setAllProducts(db.getProducts());
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);
        setTransactions(db.getTransactions().filter(t => { const d = new Date(t.date); return d >= start && d <= end; }));
    }, [startDate, endDate]);

    const data = useMemo(() => {
        const productMap = new Map<string, Product>();
        allProducts.forEach(p => productMap.set(p.id, p));

        let sales = 0; let returns = 0; let cogs = 0; let expenses = 0;
        const expMap: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type === 'SALE') {
                sales += t.totalAmount;
                t.items?.forEach(i => {
                    const p = productMap.get(i.productId);
                    if (p && p.type !== 'service') {
                        let qty = i.quantity;
                        if (i.unit && p.secondaryUnit && i.unit === p.secondaryUnit && p.conversionRatio) qty /= p.conversionRatio;
                        cogs += (qty * p.purchasePrice);
                    }
                });
            } else if (t.type === 'SALE_RETURN') {
                returns += t.totalAmount;
                t.items?.forEach(item => {
                    const p = productMap.get(item.productId);
                    if (p && p.type !== 'service') {
                        let qty = item.quantity;
                        if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                            qty = item.quantity / p.conversionRatio;
                        }
                        cogs -= (qty * p.purchasePrice);
                    }
                });
            } else if (t.type === 'EXPENSE') {
                expenses += t.totalAmount;
                const cat = t.category || 'General';
                expMap[cat] = (expMap[cat] || 0) + t.totalAmount;
            }
        });

        const netSales = sales - returns;
        const grossProfit = netSales - cogs;
        const netProfit = grossProfit - expenses;

        return { netSales, cogs, grossProfit, expenses, netProfit, expMap };
    }, [transactions, allProducts]);

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Financial Performance</h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} /></div>
                    <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 space-y-8 overflow-y-auto custom-scrollbar">
                    <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-4">Revenue & COGS Breakdown</h3>
                    
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><span className="text-gray-600 font-bold text-lg">Net Sales</span><span className="font-black text-2xl text-emerald-600">{formatCurrency(data.netSales)}</span></div>
                        <div className="flex justify-between items-center text-orange-600"><span className="font-bold uppercase text-[10px] tracking-widest">Cost of Goods (COGS)</span><span className="font-black text-xl">({formatCurrency(data.cogs)})</span></div>
                        <div className="pt-6 border-t-2 border-gray-900 flex justify-between items-center bg-gray-50 p-6 rounded-3xl"><span className="text-gray-800 font-black uppercase text-xs tracking-widest">Gross Profit</span><span className="font-black text-3xl text-blue-600">{formatCurrency(data.grossProfit)}</span></div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-10 space-y-8 overflow-y-auto custom-scrollbar">
                    <h3 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-4">Operating Overhead</h3>
                    <div className="space-y-4">
                        {Object.entries(data.expMap).map(([cat, amt]) => (
                            <div key={cat} className="flex justify-between items-center p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                <span className="text-gray-600 font-black uppercase text-[10px] tracking-wider">{cat}</span>
                                <span className="font-black text-gray-900">{formatCurrency(amt as number)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pt-8 border-t border-gray-100 flex justify-between items-center"><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Total Expenses</span><span className="font-black text-red-600 text-lg">{formatCurrency(data.expenses)}</span></div>
                    
                    <div className="pt-6">
                        <div className="bg-gray-900 text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase text-brand-400 tracking-widest">Net Business Profit</span>
                                <div className="text-5xl font-black mt-3">{formatCurrency(data.netProfit as number)}</div>
                                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    <PieChart className="w-3 h-3" /> Net Margin: {data.netSales > 0 ? ((data.netProfit / data.netSales) * 100).toFixed(1) : 0}%
                                </div>
                            </div>
                            <BarChart3 className="absolute bottom-0 right-0 w-40 h-40 text-white/5 -mb-10 -mr-10" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AllPartiesReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const parties = useMemo(() => {
        return db.getParties().filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const totals = useMemo(() => {
        return parties.reduce((acc, p) => ({
            receivable: acc.receivable + (p.balance > 0 ? p.balance : 0),
            payable: acc.payable + (p.balance < 0 ? Math.abs(p.balance) : 0)
        }), { receivable: 0, payable: 0 });
    }, [parties]);

    const handleExport = () => {
        exportToExcel(transformPartiesForExport(parties), 'All_Parties_Balances');
        addToast('Exported successfully', 'success');
    };

    const handlePrint = () => {
        printData('Party Balance List', ['Name', 'Phone', 'Type', 'Balance', 'Status'], parties.map(p => [
            p.name, p.phone, p.type, formatCurrency(Math.abs(p.balance)), p.balance >= 0 ? 'To Rx' : 'To Pay'
        ]));
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Party Balances</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Receivables & Payables Summary</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Search party..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={handleExport} className="p-2.5 bg-white border border-gray-200 text-emerald-600 rounded-xl hover:bg-emerald-50 shadow-sm transition-all"><FileSpreadsheet className="w-5 h-5" /></button>
                    <button onClick={handlePrint} className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-black shadow-lg"><Printer className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total To Receive</p>
                    <p className="text-2xl font-black text-emerald-700">{formatCurrency(totals.receivable)}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Total To Give</p>
                    <p className="text-2xl font-black text-red-700">{formatCurrency(totals.payable)}</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Balance</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {parties.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{p.phone || '-'}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{p.type}</span></td>
                                    <td className={`px-6 py-4 text-right font-black ${p.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(p.balance))}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-black uppercase tracking-tight ${p.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {p.balance >= 0 ? 'Receivable' : 'Payable'}
                                        </span>
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

const StockReport: React.FC<{ onBack: () => void, filter?: string }> = ({ onBack, filter }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    const products = useMemo(() => {
        return db.getProducts().filter(p => p.type !== 'service' && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const totalValuation = useMemo(() => {
        return products.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);
    }, [products]);

    const handleExport = () => {
        exportToExcel(transformProductsForExport(products), 'Inventory_Valuation_Report');
        addToast('Exported successfully', 'success');
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Inventory Ledger</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Current Valuation & Quantity</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Search item..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={handleExport} className="p-2.5 bg-white border border-gray-200 text-emerald-600 rounded-xl hover:bg-emerald-50 shadow-sm transition-all"><FileSpreadsheet className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100">
                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Stock Assets Value (at Cost)</p>
                <p className="text-3xl font-black text-brand-700">{formatCurrency(totalValuation)}</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Item Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-center">In Stock</th>
                                <th className="px-6 py-4 text-right">Cost Price</th>
                                <th className="px-6 py-4 text-right">Valuation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs font-bold uppercase tracking-wider">{p.category}</td>
                                    <td className={`px-6 py-4 text-center font-black ${p.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{p.stock} {p.unit}</td>
                                    <td className="px-6 py-4 text-right text-gray-500">{formatCurrency(p.purchasePrice)}</td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(p.stock * p.purchasePrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
