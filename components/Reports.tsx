import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { Transaction, Party, Product, TransactionItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { 
  ArrowLeft, 
  ArrowRight, 
  Activity,
  Users,
  User,
  ChevronDown,
  X,
  Pencil,
  Printer,
  TrendingUp,
  Calculator,
  BarChart2,
  Filter,
  Search,
  ChevronRight,
  PieChart,
  ShoppingBag,
  Package,
  FileSpreadsheet,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Clock,
  FileDown,
  History,
  FileText,
  RotateCcw,
  TrendingDown,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  Receipt,
  Trophy,
  Zap,
  BarChart3
} from 'lucide-react';
import { exportToExcel } from '../services/exportService';
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
  | 'ALL_PARTY_STATEMENT'
  | 'RECEIVABLE_AGING'
  | 'STOCK_QUANTITY'
  | 'OUT_OF_STOCK'
  | 'HERO_PRODUCTS';

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
      case 'HERO_PRODUCTS': return <HeroProductsReport onBack={() => setActiveReport('DASHBOARD')} />;
      default: return <div className="p-20 text-center flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-gray-200" />
          <h3 className="font-bold text-gray-400 uppercase tracking-widest">Report not found</h3>
          <button onClick={() => setActiveReport('DASHBOARD')} className="text-brand-600 font-bold hover:underline">Return to Browser</button>
      </div>;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto h-full flex flex-col font-sans overflow-y-auto print:overflow-visible print:p-0 print:h-auto print:max-w-none">
      {renderContent()}
    </div>
  );
};

const ReportsBrowser: React.FC<{ onNavigate: (r: ReportType) => void }> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Transactions' | 'Parties' | 'Inventory'>('All');

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
        { id: 'PROFIT_LOSS', title: 'Profit And Loss', desc: 'Detailed income vs expense analysis', hasView: true },
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
        { id: 'HERO_PRODUCTS', title: 'Hero Products', desc: 'Analyze top-selling items by volume and profit', hasView: true },
      ]
    }
  ];

  const categories = ['All Reports', 'Transactions', 'Parties', 'Inventory'];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex gap-4 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat.replace(' Reports', '') as any)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              (activeCategory === 'All' && cat === 'All Reports') || activeCategory === cat
                ? 'bg-brand-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        {reportGroups
          .filter(group => activeCategory === 'All' || group.category === activeCategory)
          .map((group) => (
            <div key={group.category} className="space-y-6">
              <h2 className="text-lg font-bold text-gray-600 tracking-tight">{group.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {group.reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => onNavigate(report.id as ReportType)}
                    className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col min-h-[140px]"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-gray-900 text-base">
                        {report.title}
                      </h3>
                      {report.hasView && (
                        <span className="text-[10px] font-bold text-brand-600 flex items-center gap-1 uppercase tracking-wider">
                          View <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed font-medium">
                      {report.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

// --- Report Sub-Components ---

const TransactionReport: React.FC<{ title: string, type: Transaction['type'], onBack: () => void }> = ({ title, type, onBack }) => {
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
    const [endDate, setEndDate] = useState(new Date().toISOString());
    const transactions = useMemo(() => db.getTransactions().filter(t => t.type === type && new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate)), [startDate, endDate, type]);
    const total = transactions.reduce((s, t) => s + t.totalAmount, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} /></div>
                    <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} /></div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
                    <p className="text-2xl font-black">{formatCurrency(total)}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Count</p>
                    <p className="text-2xl font-black">{transactions.length}</p>
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Ref</th><th className="px-6 py-4 Party">Party</th><th className="px-6 py-4 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4">{formatNepaliDate(t.date)}</td>
                                <td className="px-6 py-4 font-mono text-xs">#{t.id.slice(-6)}</td>
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

const DayBookReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [date, setDate] = useState(new Date().toISOString());
    
    const transactions = useMemo(() => {
        const target = date.split('T')[0];
        return db.getTransactions().filter(t => 
            t.date.split('T')[0] === target && 
            t.type !== 'QUOTATION' && 
            t.type !== 'PURCHASE_ORDER'
        );
    }, [date]);

    const stats = useMemo(() => {
        const netValue = transactions.filter(t => t.type === 'SALE').reduce((s, t) => s + t.totalAmount, 0);
        const stockValue = transactions.filter(t => t.type === 'PURCHASE').reduce((s, t) => s + t.totalAmount, 0);
        
        const prods = db.getProducts();
        const pMap = new Map(prods.map(p => [p.id, p]));
        let cogs = 0;
        transactions.filter(t => t.type === 'SALE').forEach(t => {
            t.items?.forEach(i => {
                const p = pMap.get(i.productId);
                if (p && p.type !== 'service') cogs += (i.quantity * p.purchasePrice);
            });
        });

        const margin = netValue - cogs;
        return { netValue, stockValue, margin };
    }, [transactions]);

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Daily Cash Book</h2>
                </div>
                <div className="w-48 shadow-sm">
                    <NepaliDatePicker value={date} onChange={setDate} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-emerald-50 text-emerald-500 rounded-md"><TrendingUp className="w-4 h-4" /></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Net Value</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.netValue)}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Revenue Contribution</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-orange-50 text-orange-500 rounded-md"><Calculator className="w-4 h-4" /></div>
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Stock Value</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.stockValue)}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Inventory Investment</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-50 text-blue-500 rounded-md"><Calculator className="w-4 h-4" /></div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Margin</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.margin)}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Profit on Records</p>
                </div>
                <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-500/20 text-white">
                    <div className="flex items-center gap-2 mb-2 opacity-90"><BarChart2 className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Actual Gain</span></div>
                    <p className="text-2xl font-black">{formatCurrency(stats.margin)}</p>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider mt-1">Bottom Line Impact</p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 px-8 border-b border-gray-50 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-gray-300" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transactions for {formatNepaliDate(date)}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50/50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-50">
                            <tr><th className="px-8 py-5">Time</th><th className="px-8 py-5">Type</th><th className="px-8 py-5">Particulars</th><th className="px-8 py-5 text-right">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-8 py-6 text-gray-400 font-medium text-xs">{formatTime(t.date)}</td>
                                    <td className="px-8 py-6"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${t.type === 'SALE' ? 'bg-emerald-50 text-emerald-500' : t.type === 'PURCHASE' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-500'}`}>{t.type}</span></td>
                                    <td className="px-8 py-6 font-bold text-gray-800">{t.partyName || 'Cash'}</td>
                                    <td className="px-8 py-6 text-right font-black text-gray-900 text-lg">{formatCurrency(t.totalAmount)}</td>
                                </tr>
                            ))}
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

    const stats = useMemo(() => {
        const txs = db.getTransactions().filter(t => new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate));
        const prods = db.getProducts();
        const pMap = new Map(prods.map(p => [p.id, p]));

        const sales = txs.filter(t => t.type === 'SALE').reduce((s, t) => s + (t.subTotal || t.totalAmount), 0);
        const salesReturns = txs.filter(t => t.type === 'SALE_RETURN').reduce((s, t) => s + t.totalAmount, 0);
        
        const expenses = txs.filter(t => t.type === 'EXPENSE');
        const expenseTotal = expenses.reduce((s, t) => s + t.totalAmount, 0);
        const expenseBreakdown = expenses.reduce((acc, t) => {
            const cat = t.category || 'Other';
            acc[cat] = (acc[cat] || 0) + t.totalAmount;
            return acc;
        }, {} as Record<string, number>);

        let cogs = 0;
        txs.filter(t => t.type === 'SALE').forEach(t => {
            t.items?.forEach(i => {
                const p = pMap.get(i.productId);
                if (p && p.type !== 'service') {
                   let qty = i.quantity;
                   if (i.unit && p.secondaryUnit && i.unit === p.secondaryUnit && p.conversionRatio) {
                       qty = i.quantity / p.conversionRatio;
                   }
                   cogs += (qty * p.purchasePrice);
                }
            });
        });

        const netRevenue = sales - salesReturns;
        const grossProfit = netRevenue - cogs;
        const netProfit = grossProfit - expenseTotal;
        
        const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
        const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

        return { 
          sales, salesReturns, netRevenue, 
          cogs, grossProfit, grossMargin,
          expenseTotal, expenseBreakdown, 
          netProfit, netMargin 
        };
    }, [startDate, endDate]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all border border-gray-100">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Income & Expense Analysis</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Financial Performance Audit</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} /></div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Profit</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-black text-gray-900">{formatCurrency(stats.grossProfit)}</p>
                        <p className="text-sm font-black text-emerald-600 mb-1">{stats.grossMargin.toFixed(1)}% Margin</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl"><Receipt className="w-6 h-6" /></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operating Expenses</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{formatCurrency(stats.expenseTotal)}</p>
                    <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mt-1">Outflow for Period</p>
                </div>

                <div className={`${stats.netProfit >= 0 ? 'bg-brand-600 shadow-brand-500/30' : 'bg-red-600 shadow-red-500/30'} p-8 rounded-[2.5rem] shadow-xl text-white`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-white/20 rounded-2xl"><Briefcase className="w-6 h-6" /></div>
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Net Earnings</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-black">{formatCurrency(stats.netProfit)}</p>
                        <p className="text-sm font-black text-white/80 mb-1">{stats.netMargin.toFixed(1)}% Return</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-3 text-lg border-b pb-4">
                        <ArrowUpRight className="w-6 h-6 text-emerald-500" />
                        Trading Summary
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 font-bold uppercase">Total Revenue (Gross Sales)</span>
                            <span className="font-black text-gray-900">{formatCurrency(stats.sales)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-500">
                            <span className="text-sm font-bold uppercase">Returns & Refunds (-)</span>
                            <span className="font-black">({formatCurrency(stats.salesReturns)})</span>
                        </div>
                        <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-sm text-gray-800 font-black uppercase">Net Revenue</span>
                            <span className="text-lg font-black text-gray-900">{formatCurrency(stats.netRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-orange-600 bg-orange-50/50 p-4 rounded-2xl border border-orange-100 mt-4">
                            <span className="text-sm font-black uppercase">Cost of Goods Sold (COGS)</span>
                            <span className="font-black">{formatCurrency(stats.cogs)}</span>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resulting Position</p>
                            <p className="text-2xl font-black text-emerald-600">GROSS PROFIT: {formatCurrency(stats.grossProfit)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Margin</p>
                            <p className="text-xl font-black text-gray-800">{stats.grossMargin.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-3 text-lg">
                            <ArrowDownRight className="w-6 h-6 text-red-500" />
                            Operating Expenses
                        </h3>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase border border-red-100">
                            {Object.keys(stats.expenseBreakdown).length} Categories
                        </div>
                    </div>
                    
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {(Object.entries(stats.expenseBreakdown) as [string, number][]).sort((a,b) => b[1] - a[1]).map(([cat, amt]) => {
                            const percent = stats.expenseTotal > 0 ? (amt / stats.expenseTotal) * 100 : 0;
                            return (
                                <div key={cat} className="group p-4 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <span className="font-black text-gray-800 uppercase text-xs tracking-tight">{cat}</span>
                                        </div>
                                        <span className="font-black text-gray-900">{formatCurrency(amt)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                    </div>
                                    <p className="text-right text-[9px] font-black text-gray-400 mt-1 uppercase tracking-widest">{percent.toFixed(1)}% of expenses</p>
                                </div>
                            );
                        })}
                        {Object.keys(stats.expenseBreakdown).length === 0 && (
                            <div className="py-20 text-center text-gray-400">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-10" />
                                <p className="font-black uppercase text-[10px] tracking-widest">No expenses recorded for this period</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Consolidated Outflow</p>
                        <p className="text-2xl font-black text-red-600">{formatCurrency(stats.expenseTotal)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 text-white p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
                    <Layers className="w-64 h-64 rotate-12" />
                </div>
                <div className="z-10 text-center md:text-left">
                    <p className="text-brand-400 font-black uppercase tracking-[0.3em] text-xs mb-3">Final Statement of Comprehensive Income</p>
                    <h4 className="text-4xl font-black tracking-tight uppercase">Net Period Result</h4>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-widest mt-2">{formatNepaliDate(startDate)} TO {formatNepaliDate(endDate)}</p>
                </div>
                <div className="z-10 text-center md:text-right">
                    <p className={`text-5xl font-black tracking-tighter ${stats.netProfit >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                        {formatCurrency(stats.netProfit)}
                    </p>
                    <div className="flex items-center justify-center md:justify-end gap-3 mt-4">
                        <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest">
                            Net Margin: {stats.netMargin.toFixed(2)}%
                        </div>
                        <button onClick={() => window.print()} className="p-3 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl shadow-xl transition-all active:scale-95">
                            <Printer className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PartyStatementReport: React.FC<{ onBack: () => void, onEdit?: (t: Transaction) => void }> = ({ onBack, onEdit }) => {
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [partySearchTerm, setPartySearchTerm] = useState('');
    const [showPartyDropdown, setShowPartyDropdown] = useState(false);
    const [highlightedPartyIndex, setHighlightedPartyIndex] = useState(0);
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
    const [endDate, setEndDate] = useState(new Date().toISOString());

    const parties = useMemo(() => db.getParties(), []);
    const selectedParty = useMemo(() => parties.find(p => p.id === selectedPartyId), [parties, selectedPartyId]);
    const profile = useMemo(() => db.getBusinessProfile(), []);
    
    const allTxs = useMemo(() => db.getTransactions().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), []);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { addToast } = useToast();

    const filteredPartiesInDropdown = useMemo(() => {
        const term = partySearchTerm.toLowerCase();
        return parties.filter(p => p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term)));
    }, [parties, partySearchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowPartyDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePartySelect = (p: Party) => {
        setSelectedPartyId(p.id);
        setPartySearchTerm(p.name);
        setShowPartyDropdown(false);
    };

    const handlePrintFullStatement = () => {
        if (!selectedPartyId) return;
        addToast('Printing Party Statement...', 'info');
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const handlePartyKeyDown = (e: React.KeyboardEvent) => {
        if (showPartyDropdown) {
            const count = filteredPartiesInDropdown.length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedPartyIndex(prev => (prev + 1) % count);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedPartyIndex(prev => (prev - 1 + count) % count);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredPartiesInDropdown[highlightedPartyIndex]) {
                    handlePartySelect(filteredPartiesInDropdown[highlightedPartyIndex]);
                }
            } else if (e.key === 'Escape') {
                setShowPartyDropdown(false);
            }
        }
    };

    const ledgerData = useMemo(() => {
        if (!selectedPartyId) return { rows: [], totalDebit: 0, totalCredit: 0, openingBalance: 0, finalBalance: 0 };
        let runningBalance = 0;
        let totalDebit = 0;
        let totalCredit = 0;
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);

        allTxs.forEach(t => {
            if (t.partyId !== selectedPartyId) return;
            if (t.type === 'QUOTATION' || t.type === 'PURCHASE_ORDER') return;
            const isDebit = ['SALE', 'PAYMENT_OUT', 'PURCHASE_RETURN', 'BALANCE_ADJUSTMENT', 'STOCK_ADJUSTMENT'].includes(t.type);
            const amount = Math.abs(t.totalAmount);
            const tDate = new Date(t.date);
            if (tDate < start) {
                if (isDebit) runningBalance += amount; else runningBalance -= amount;
            }
        });
        
        const openingBalance = runningBalance;
        
        const rows = allTxs
            .filter(t => t.partyId === selectedPartyId)
            .filter(t => t.type !== 'QUOTATION' && t.type !== 'PURCHASE_ORDER')
            .filter(t => {
                const tDate = new Date(t.date);
                return tDate >= start && tDate <= end;
            })
            .map(t => {
                const isDebit = ['SALE', 'PAYMENT_OUT', 'PURCHASE_RETURN', 'BALANCE_ADJUSTMENT', 'STOCK_ADJUSTMENT'].includes(t.type);
                const amount = Math.abs(t.totalAmount);
                if (isDebit) { totalDebit += amount; runningBalance += amount; } 
                else { totalCredit += amount; runningBalance -= amount; }
                
                const itemSummary = t.items?.map(i => `${i.productName}  ${i.quantity} pcs @ ${formatCurrency(i.rate)} = ${formatCurrency(i.amount)}`) || [];
                const totalQty = t.items?.reduce((s, i) => s + i.quantity, 0) || 0;

                let typeShort = t.type.substring(0, 4);
                if (t.type === 'SALE') typeShort = 'SALE';
                else if (t.type === 'PURCHASE') typeShort = 'PURC';
                else if (t.type === 'PAYMENT_IN') typeShort = 'P.IN';
                else if (t.type === 'PAYMENT_OUT') typeShort = 'P.OUT';
                else if (t.type === 'BALANCE_ADJUSTMENT') typeShort = 'BALA';

                return {
                    ...t,
                    isDebit,
                    debit: isDebit ? amount : null,
                    credit: !isDebit ? amount : null,
                    balance: runningBalance,
                    typeShort,
                    title: t.type === 'SALE' ? 'Sales' : t.type === 'PURCHASE' ? 'Purchase' : t.type.replace('_', ' '),
                    itemSummary,
                    totalQty
                };
            });
        return { rows, totalDebit, totalCredit, openingBalance, finalBalance: runningBalance };
    }, [allTxs, selectedPartyId, startDate, endDate]);

    return (
        <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500 print:block print:h-auto print:p-0 print:m-0">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        overflow: visible !important;
                        height: auto !important;
                    }
                    header, aside, .no-print, button, input, .dropdown-container, 
                    .datepicker-wrapper, .fixed, .absolute:not(.print-visible), 
                    nav, [role="alert"], div[class*="toast"], 
                    .sidebar-wrapper, .header-wrapper {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    
                    #root, #root > div, main, .max-w-7xl, .h-full, .flex-col, .overflow-y-auto { 
                        display: block !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        height: auto !important; 
                        min-height: auto !important;
                        overflow: visible !important;
                        max-width: none !important;
                        box-shadow: none !important;
                        border: none !important;
                    }

                    .ledger-scroll-container {
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                        display: block !important;
                    }
                    
                    table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        font-size: 9px !important;
                        border: 1px solid #ddd !important;
                    }
                    th, td {
                        border: 1px solid #ccc !important;
                        padding: 4px 6px !important;
                        word-wrap: break-word !important;
                        vertical-align: top !important;
                    }
                    th { 
                        background-color: #f0f0f0 !important; 
                        color: #000 !important; 
                        font-weight: 900 !important; 
                        text-align: center !important;
                        text-transform: uppercase !important;
                    }
                    
                    .col-date { width: 80px !important; }
                    .col-type { width: 45px !important; }
                    .col-vch { width: 65px !important; }
                    .col-detail { width: auto !important; }
                    .col-amt { width: 85px !important; }
                    .col-bal { width: 95px !important; }
                    .col-narr { width: 110px !important; }

                    tr { page-break-inside: avoid !important; }
                    thead { display: table-header-group !important; }
                    tfoot { display: table-footer-group !important; }
                    
                    .dr-color { color: #004a80 !important; }
                    .opening-bg { background-color: #fff9e6 !important; }
                }
            `}} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Party Statement</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group" ref={dropdownRef}>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                            <User className="w-4 h-4" />
                        </div>
                        <input 
                            type="text"
                            className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-sm w-64 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 shadow-sm transition-all"
                            placeholder="Search Party Name..."
                            value={partySearchTerm}
                            onChange={e => { setPartySearchTerm(e.target.value); setShowPartyDropdown(true); setHighlightedPartyIndex(0); }}
                            onFocus={() => setShowPartyDropdown(true)}
                            onKeyDown={handlePartyKeyDown}
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        {showPartyDropdown && partySearchTerm && (
                            <div className="absolute z-[100] top-full left-0 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                <div className="max-h-48 overflow-y-auto">
                                    {filteredPartiesInDropdown.map((p, idx) => (
                                        <div key={p.id} className={`p-3 border-b last:border-0 cursor-pointer transition-colors flex justify-between items-center ${highlightedPartyIndex === idx ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-700'}`} onClick={() => handlePartySelect(p)}>
                                            <div className="min-w-0">
                                                <span className="font-bold block truncate">{p.name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">{p.phone || 'No Phone'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-32 shadow-sm"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From" /></div>
                        <div className="w-32 shadow-sm"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To" /></div>
                        <button onClick={handlePrintFullStatement} disabled={!selectedPartyId} className="px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-black text-[9px] uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50">
                            <Printer className="w-4 h-4" /> Print Statement
                        </button>
                    </div>
                </div>
            </div>

            {selectedPartyId ? (
                <div className="flex-1 flex flex-col min-h-0 print:block print:h-auto print:p-0 print:m-0">
                    <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm flex flex-col flex-1 print:border-0 print:shadow-none print:rounded-none print:block">
                        <div className="hidden print:flex flex-col mb-8 text-center border-b pb-6">
                            <h1 className="text-3xl font-black uppercase text-brand-600">{profile.name}</h1>
                            <p className="text-sm font-bold text-gray-500">{profile.address} | PAN: {profile.pan}</p>
                            <div className="mt-6 flex justify-between px-2 items-end text-left">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Statement For</p>
                                    <p className="text-xl font-black text-gray-900 leading-tight">{selectedParty?.name}</p>
                                    {selectedParty?.phone && <p className="text-xs font-bold text-gray-500">{selectedParty.phone}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Period Coverage</p>
                                    <p className="text-sm font-black text-gray-900">{formatNepaliDate(startDate)} to {formatNepaliDate(endDate)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-10 py-6 bg-gray-50/50 flex items-center justify-between no-print">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{selectedParty?.name}</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedParty?.address || 'No Address Recorded'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Final Ledger Balance</p>
                                <p className={`text-2xl font-black ${ledgerData.finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(Math.abs(ledgerData.finalBalance))} {ledgerData.finalBalance >= 0 ? 'Dr' : 'Cr'}
                                </p>
                            </div>
                        </div>

                        <div className="ledger-scroll-container flex-1 min-h-0 overflow-auto print:overflow-visible custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1000px] print:min-w-0">
                                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-10 print:table-header-group">
                                    <tr>
                                        <th className="px-5 py-4 col-date">DATE</th>
                                        <th className="px-3 py-4 col-type">TYPE</th>
                                        <th className="px-3 py-4 col-vch">VCH/BILL</th>
                                        <th className="px-6 py-4 col-detail">TRANSACTION DETAIL / ITEM BREAKDOWN</th>
                                        <th className="px-6 py-4 col-amt text-right">DEBIT(RS.)</th>
                                        <th className="px-6 py-4 col-amt text-right">CREDIT(RS.)</th>
                                        <th className="px-6 py-4 col-bal text-right">BALANCE(RS.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-sans print:table-row-group">
                                    <tr className="bg-[#fff9e6] opening-bg">
                                        <td colSpan={4} className="px-6 py-4 font-black uppercase tracking-[0.2em] text-[10px] text-gray-400 italic">
                                            OPENING DUES B.F (Historical aggregated as at {formatNepaliDate(startDate)})
                                        </td>
                                        <td className="px-6 py-4"></td>
                                        <td className="px-6 py-4"></td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900 dr-color">
                                            {formatCurrency(Math.abs(ledgerData.openingBalance))} {ledgerData.openingBalance >= 0 ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>
                                    
                                    {ledgerData.rows.map(row => (
                                        <tr key={row.id} className="hover:bg-gray-50/50 group align-top break-inside-avoid transition-colors">
                                            <td className="px-5 py-4 text-gray-600 font-medium whitespace-nowrap">{formatNepaliDate(row.date)}</td>
                                            <td className="px-3 py-4 text-gray-500 font-black uppercase text-[9px] text-center">{row.typeShort}</td>
                                            <td className="px-3 py-4 text-gray-800 text-center font-bold font-mono text-xs">#{row.id.slice(-6)}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 text-sm mb-1 uppercase">{row.title}</div>
                                                <div className="space-y-0.5 mb-2">
                                                    {row.itemSummary.map((line: string, i: number) => (
                                                        <div key={i} className="text-[10px] text-gray-500 font-medium leading-tight">{line}</div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800">{row.debit ? formatCurrency(row.debit) : ''}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-800">{row.credit ? formatCurrency(row.credit) : ''}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">
                                                {formatCurrency(Math.abs(row.balance))} {row.balance >= 0 ? 'Dr' : 'Cr'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                
                                <tfoot className="bg-gray-50 font-black border-t-2 border-gray-200 sticky bottom-0 print:table-footer-group">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-5 text-right text-gray-400 uppercase tracking-widest text-[10px]">Net Movement & Account Position</td>
                                        <td className="px-6 py-5 text-right">{formatCurrency(ledgerData.totalDebit)}</td>
                                        <td className="px-6 py-5 text-right">{formatCurrency(ledgerData.totalCredit)}</td>
                                        <td className="px-6 py-5 text-right text-brand-600 text-lg">
                                            {formatCurrency(Math.abs(ledgerData.finalBalance))} {ledgerData.finalBalance >= 0 ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-200 bg-white border border-gray-100 rounded-[2rem] shadow-inner py-40">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Users className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400">Search and select a party to generate statement</h3>
                </div>
            )}
        </div>
    );
};

const ReceivableAgingReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const parties = useMemo(() => db.getParties().filter(p => p.balance > 0), []);
    const transactions = useMemo(() => db.getTransactions(), []);

    const agingData = useMemo(() => {
        const now = new Date();
        const results = parties.map(p => {
            const partyTxs = transactions.filter(t => t.partyId === p.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let credits = partyTxs
                .filter(t => ['PAYMENT_IN', 'SALE_RETURN', 'PURCHASE'].includes(t.type))
                .reduce((s, t) => {
                    if (t.type === 'PURCHASE') return s - t.totalAmount;
                    return s + t.totalAmount;
                }, 0);
            const buckets = { b0_7: 0, b8_14: 0, b15_30: 0, b31_90: 0, b91plus: 0 };
            partyTxs
                .filter(t => (t.type === 'SALE' || t.type === 'BALANCE_ADJUSTMENT' || t.type === 'PAYMENT_OUT' || t.type === 'PURCHASE_RETURN' || t.type === 'STOCK_ADJUSTMENT') && t.totalAmount > 0)
                .forEach(sale => {
                    let unpaid = sale.totalAmount;
                    if (credits > 0) { const paid = Math.min(unpaid, credits); unpaid -= paid; credits -= paid; }
                    if (unpaid > 0) {
                        const days = Math.floor((now.getTime() - new Date(sale.date).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 7) buckets.b0_7 += unpaid;
                        else if (days <= 14) buckets.b8_14 += unpaid;
                        else if (days <= 30) buckets.b15_30 += unpaid;
                        else if (days <= 90) buckets.b31_90 += unpaid;
                        else buckets.b91plus += unpaid;
                    }
                });
            return { party: p, total: p.balance, ...buckets };
        });
        const totals = results.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            b0_7: acc.b0_7 + curr.b0_7,
            b8_14: acc.b8_14 + curr.b8_14,
            b15_30: acc.b15_30 + curr.b15_30,
            b31_90: acc.b31_90 + curr.b31_90,
            b91plus: acc.b91plus + curr.b91plus
        }), { total: 0, b0_7: 0, b8_14: 0, b15_30: 0, b31_90: 0, b91plus: 0 });
        return { results, totals };
    }, [parties, transactions]);

    const filteredResults = useMemo(() => 
        agingData.results.filter(r => r.party.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [agingData.results, searchTerm]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <div><h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Receivable Aging</h2></div>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold" placeholder="Search party..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                        <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase border-b border-gray-100 sticky top-0 z-10">
                            <tr><th className="px-10 py-5">Party Name</th><th className="px-8 py-5 text-right">Total Balance</th><th className="px-8 py-5 text-center">0-7 Days</th><th className="px-8 py-5 text-center">1 Week+</th><th className="px-8 py-5 text-center">15 Days+</th><th className="px-8 py-5 text-center">1 Month+</th><th className="px-8 py-5 text-center">3 Months+</th><th className="px-8 py-5 text-center">Info</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredResults.map(r => (
                                <tr key={r.party.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-10 py-6"><div className="font-bold text-gray-800">{r.party.name}</div></td>
                                    <td className="px-8 py-6 text-right font-black text-gray-900">{formatCurrency(r.total)}</td>
                                    <td className="px-8 py-6 text-center">{r.b0_7 > 0 ? formatCurrency(r.b0_7) : '-'}</td>
                                    <td className="px-8 py-6 text-center">{r.b8_14 > 0 ? formatCurrency(r.b8_14) : '-'}</td>
                                    <td className="px-8 py-6 text-center">{r.b15_30 > 0 ? formatCurrency(r.b15_30) : '-'}</td>
                                    <td className="px-8 py-6 text-center">{r.b31_90 > 0 ? formatCurrency(r.b31_90) : '-'}</td>
                                    <td className="px-8 py-6 text-center">{r.b91plus > 0 ? formatCurrency(r.b91plus) : '-'}</td>
                                    <td className="px-8 py-6 text-center"><ChevronRight className="w-5 h-5 text-gray-300" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AllPartiesReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const parties = useMemo(() => db.getParties(), []);
    const totals = useMemo(() => {
        return parties.reduce((acc, p) => {
            if (p.balance > 0) acc.debit += p.balance;
            else if (p.balance < 0) acc.credit += Math.abs(p.balance);
            return acc;
        }, { debit: 0, credit: 0 });
    }, [parties]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-black uppercase tracking-tight">All Party Balances</h2>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b border-gray-100">
                        <tr><th className="px-6 py-4">Party Name</th><th className="px-6 py-4 text-right">Receivable (DR)</th><th className="px-6 py-4 text-right">Payable (CR)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {parties.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                <td className="px-6 py-4 text-right font-black text-emerald-600">{p.balance > 0 ? formatCurrency(p.balance) : '-'}</td>
                                <td className="px-6 py-4 text-right font-black text-red-600">{p.balance < 0 ? formatCurrency(Math.abs(p.balance)) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-black border-t-2 border-gray-200">
                        <tr>
                            <td className="px-6 py-5 text-gray-400 uppercase tracking-widest text-[10px]">Net Movement Positions</td>
                            <td className="px-6 py-5 text-right text-emerald-600 text-lg">{formatCurrency(totals.debit)}</td>
                            <td className="px-6 py-5 text-right text-red-600 text-lg">{formatCurrency(totals.credit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const StockReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const products = useMemo(() => db.getProducts().filter(p => p.type !== 'service'), []);
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-black uppercase">Stock Valuation</h2>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px]">
                        <tr><th className="px-6 py-4">Item</th><th className="px-6 py-4 text-center">Stock</th><th className="px-6 py-4 text-right">Buy Price</th><th className="px-6 py-4 text-right">Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-bold">{p.name}</td>
                                <td className="px-6 py-4 text-center font-black">{p.stock}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(p.purchasePrice)}</td>
                                <td className="px-6 py-4 text-right font-black">{formatCurrency(p.stock * p.purchasePrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ReplenishmentReport: React.FC<{ onBack: () => void, onConvert?: (items: TransactionItem[]) => void }> = ({ onBack, onConvert }) => {
    const products = useMemo(() => db.getProducts().filter(p => p.type !== 'service' && p.stock < (p.minStockLevel || 5)), []);
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-black uppercase">Restock Assistant</h2>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px]">
                        <tr><th className="px-6 py-4">Item</th><th className="px-6 py-4 text-center">In Stock</th><th className="px-6 py-4 text-center">Threshold</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {products.map(p => (
                            <tr key={p.id} className="text-red-600 font-bold">
                                <td className="px-6 py-4">{p.name}</td>
                                <td className="px-6 py-4 text-center">{p.stock}</td>
                                <td className="px-6 py-4 text-center">{p.minStockLevel || 5}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AllTransactionsReport: React.FC<{ onBack: () => void, onEdit?: (t: Transaction) => void }> = ({ onBack, onEdit }) => {
    const transactions = useMemo(() => 
        db.getTransactions().filter(t => t.type !== 'QUOTATION' && t.type !== 'PURCHASE_ORDER'), 
    []);
    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                <h2 className="text-xl font-black uppercase">Master Ledger</h2>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 flex-1 overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-400 font-black text-[9px] uppercase sticky top-0">
                            <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Ref</th><th className="px-6 py-4">Type</th><th className="px-6 py-4 Party">Party</th><th className="px-6 py-4 text-right">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">{formatNepaliDate(t.date)}</td>
                                    <td className="px-6 py-4 font-mono text-[10px]">#{t.id.slice(-8)}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black uppercase">{t.type}</span></td>
                                    <td className="px-6 py-4 font-bold">{t.partyName}</td>
                                    <td className="px-6 py-4 text-right font-black">{formatCurrency(t.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const HeroProductsReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString(); });
    const [endDate, setEndDate] = useState(new Date().toISOString());

    const heroData = useMemo(() => {
        const txs = db.getTransactions().filter(t => new Date(t.date) >= new Date(startDate) && new Date(t.date) <= new Date(endDate));
        const prods = db.getProducts();
        const pMap = new Map(prods.map(p => [p.id, p]));

        const productStats: Record<string, { name: string, volume: number, revenue: number, cogs: number, profit: number }> = {};

        txs.forEach(t => {
            if (t.type === 'SALE' || t.type === 'SALE_RETURN') {
                const factor = t.type === 'SALE' ? 1 : -1;
                t.items?.forEach(item => {
                    if (!productStats[item.productId]) {
                        productStats[item.productId] = { name: item.productName, volume: 0, revenue: 0, cogs: 0, profit: 0 };
                    }
                    const stats = productStats[item.productId];
                    stats.volume += (item.quantity * factor);
                    stats.revenue += (item.amount * factor);
                    
                    const p = pMap.get(item.productId);
                    if (p && p.type !== 'service') {
                        let qty = item.quantity;
                        if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                            qty = item.quantity / p.conversionRatio;
                        }
                        stats.cogs += (qty * p.purchasePrice * factor);
                    }
                });
            }
        });

        return Object.values(productStats)
            .map(s => ({ ...s, profit: s.revenue - s.cogs }))
            .sort((a, b) => b.profit - a.profit);
    }, [startDate, endDate]);

    const totals = useMemo(() => {
        return heroData.reduce((acc, curr) => ({
            volume: acc.volume + curr.volume,
            revenue: acc.revenue + curr.revenue,
            profit: acc.profit + curr.profit
        }), { volume: 0, revenue: 0, profit: 0 });
    }, [heroData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-all border border-gray-100">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                            <Trophy className="w-7 h-7 text-brand-500" />
                            Hero Products Analysis
                        </h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Top Performing Stock Performance</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} /></div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                    <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Items Sold (Vol)</p>
                    <p className="text-2xl font-black">{totals.volume.toLocaleString()}</p>
                    <p className="text-[10px] text-brand-600 font-bold uppercase mt-1">Movement count</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cumulative Sales</p>
                    <p className="text-2xl font-black">{formatCurrency(totals.revenue)}</p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Gross Revenue</p>
                </div>
                <div className="bg-brand-600 p-6 rounded-3xl shadow-lg shadow-brand-500/20 text-white">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Net Period Profit</p>
                    <p className="text-2xl font-black">{formatCurrency(totals.profit)}</p>
                    <p className="text-[10px] text-white/80 font-bold uppercase mt-1">Earnings from sales</p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 px-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-brand-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Performance Ranking</span>
                    </div>
                    <button onClick={() => window.print()} className="p-2 text-gray-400 hover:text-brand-600 transition-colors no-print">
                        <Printer className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5">#</th>
                                <th className="px-8 py-5">Product Identity</th>
                                <th className="px-8 py-5 text-center">Volume Sold</th>
                                <th className="px-8 py-5 text-right">Revenue</th>
                                <th className="px-8 py-5 text-right">Direct Profit</th>
                                <th className="px-8 py-5 text-center">Margin %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {heroData.map((s, idx) => {
                                const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
                                return (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6 font-bold text-gray-400">{idx + 1}</td>
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-gray-800">{s.name}</div>
                                        </td>
                                        <td className="px-8 py-6 text-center font-black text-gray-600">{s.volume.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-right font-bold text-gray-700">{formatCurrency(s.revenue)}</td>
                                        <td className="px-8 py-6 text-right font-black text-brand-600">{formatCurrency(s.profit)}</td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${margin >= 20 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {margin.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {heroData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <BarChart3 className="w-12 h-12" />
                                            <p className="font-black uppercase text-xs tracking-widest">No sales data recorded for this period</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;