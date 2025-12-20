
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { Transaction, Party, Product, BusinessProfile, TransactionItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { 
  ArrowLeft, 
  Printer,
  FileSpreadsheet,
  Search,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  Banknote,
  Wallet,
  Users,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  Calculator,
  Filter,
  PieChart,
  Percent,
  DollarSign,
  AlertCircle,
  Package,
  Trash2,
  ShoppingCart,
  Zap,
  Plus,
  Save,
  RefreshCw,
  Clock,
  History
} from 'lucide-react';
import { exportToExcel, printData, transformProductsForExport, transformTransactionsForExport, transformPartiesForExport } from '../services/exportService';
import { useToast } from './Toast';

type ReportType = 
  | 'DASHBOARD'
  | 'SALES' 
  | 'PURCHASE' 
  | 'SALES_RETURN' 
  | 'PURCHASE_RETURN' 
  | 'DAY_BOOK' 
  | 'ALL_TRANSACTIONS' 
  | 'PROFIT_LOSS'
  | 'PARTY_STATEMENT'
  | 'ALL_PARTY_REPORT'
  | 'PARTY_AGING'
  | 'ITEM_DETAILS'
  | 'ITEM_LIST'
  | 'LOW_STOCK'
  | 'STOCK_QUANTITY'
  | 'OUT_OF_STOCK';

interface ReportsProps {
  targetReport?: string | null;
  onConsumeTarget?: () => void;
  onConvertToPurchase?: (items: TransactionItem[]) => void;
}

const Reports: React.FC<ReportsProps> = ({ targetReport, onConsumeTarget, onConvertToPurchase }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('DASHBOARD');

  useEffect(() => {
    if (targetReport) {
      setActiveReport(targetReport as ReportType);
      if (onConsumeTarget) onConsumeTarget();
    }
  }, [targetReport, onConsumeTarget]);

  const renderContent = () => {
    switch (activeReport) {
      case 'DASHBOARD':
        return <ReportsDashboard onNavigate={setActiveReport} />;
      case 'SALES':
        return <TransactionReport title="Sales Report" type="SALE" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PURCHASE':
        return <TransactionReport title="Purchase Report" type="PURCHASE" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'SALES_RETURN':
        return <TransactionReport title="Sales Return Report" type="SALE_RETURN" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PURCHASE_RETURN':
        return <TransactionReport title="Purchase Return Report" type="PURCHASE_RETURN" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'DAY_BOOK':
        return <DayBookReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'ALL_TRANSACTIONS':
        return <TransactionReport title="All Transactions" type="ALL" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PROFIT_LOSS':
        return <ProfitLossReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PARTY_STATEMENT':
        return <PartyStatementReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'ALL_PARTY_REPORT':
        return <AllPartiesReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PARTY_AGING':
        return <PartyAgingReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'STOCK_QUANTITY':
      case 'ITEM_LIST':
        return <StockReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'LOW_STOCK':
        return <StockReport filter="low" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'OUT_OF_STOCK':
        return <ReplenishmentReport onBack={() => setActiveReport('DASHBOARD')} onConvert={onConvertToPurchase} />;
      default:
        return <ReportsDashboard onNavigate={setActiveReport} />;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-full mx-auto h-full flex flex-col">
      {renderContent()}
    </div>
  );
};

// 1. Dashboard
const ReportsDashboard: React.FC<{ onNavigate: (r: ReportType) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('All Reports');
  const [searchTerm, setSearchTerm] = useState('');

  const sections = [
    {
      title: 'Transaction Report',
      category: 'Transactions',
      items: [
        { id: 'SALES', label: 'Sales', desc: 'View your sales data on a given time' },
        { id: 'PURCHASE', label: 'Purchase', desc: 'View your purchase data on a given time' },
        { id: 'SALES_RETURN', label: 'Sales Return', desc: 'View your sales return data on a given time' },
        { id: 'PURCHASE_RETURN', label: 'Purchase Return', desc: 'View your purchase return data on a given time' },
        { id: 'DAY_BOOK', label: 'Day Book', desc: 'View all of your daily transactions', highlight: true },
        { id: 'ALL_TRANSACTIONS', label: 'All Transactions', desc: 'View all party transactions in a given time' },
        { id: 'PROFIT_LOSS', label: 'Profit And Loss', desc: 'View your profit & loss in a given time' },
      ]
    },
    {
      title: 'Party Report',
      category: 'Parties',
      items: [
        { id: 'PARTY_STATEMENT', label: 'Party Statement', desc: 'Check the transactions of certain party' },
        { id: 'ALL_PARTY_REPORT', label: 'All Party Statement', desc: 'Print or download balance list of all parties' },
        { id: 'PARTY_AGING', label: 'Receivable Aging', desc: 'Track overdue payments by date buckets (1wk to 4mo+)', highlight: true },
      ]
    },
    {
      title: 'Inventory Report',
      category: 'Inventory',
      items: [
        { id: 'ITEM_LIST', label: 'Item List Report', desc: 'Detailed list of all items' },
        { id: 'LOW_STOCK', label: 'Low Stock Summary', desc: 'Quick view of items running low' },
        { id: 'OUT_OF_STOCK', label: 'Restock / Auto Order', desc: 'Calculate buy amount needed to replenish stock', highlight: true },
        { id: 'STOCK_QUANTITY', label: 'Stock Quantity Report', desc: 'View current stock levels' },
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => {
    // Filter by Tab
    if (activeTab !== 'All Reports' && section.category !== activeTab && activeTab !== 'Income Expense' && activeTab !== 'Business Status') {
       return false;
    }
    // Filter by Search presence
    return section.items.length > 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h1 className="text-xl font-bold text-gray-800">Browse Various Reports</h1>
         <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
               type="text" 
               placeholder="Search reports..."
               className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      {/* Filters Pills */}
      <div className="flex flex-wrap gap-2">
         {['All Reports', 'Transactions', 'Parties', 'Inventory', 'Income Expense', 'Business Status'].map((f) => (
           <button 
             key={f} 
             onClick={() => setActiveTab(f)}
             className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
               activeTab === f 
                 ? 'bg-brand-500 text-white shadow-sm' 
                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
             }`}
           >
             {f}
           </button>
         ))}
      </div>

      {filteredSections.length > 0 ? (
        filteredSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-gray-600 font-semibold mb-4 text-lg">{section.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as ReportType)}
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all text-left flex flex-col h-full group relative"
                >
                  <div className="flex justify-between items-start w-full mb-2">
                     <h4 className="font-bold text-gray-800 group-hover:text-brand-600 transition-colors">{item.label}</h4>
                     {item.highlight && (
                        <span className="text-xs text-brand-500 font-medium flex items-center">
                           View Report <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                     )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-gray-400">
           <p>No reports found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

// 2. Generic Transaction Report
const TransactionReport: React.FC<{ title: string, type: Transaction['type'] | 'ALL', onBack: () => void }> = ({ title, type, onBack }) => {
  const [transactions, setTransactions] = useState<(Transaction & { profit: number })[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesMetrics, setSalesMetrics] = useState<{cogs: number, grossProfit: number, margin: number, expense: number, netProfit: number} | null>(null);

  useEffect(() => {
    const products = db.getProducts();
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));

    const allData = db.getTransactions();
    let data = allData;
    
    if (type !== 'ALL') {
      data = data.filter(t => t.type === type);
    } else {
        data = data.filter(t => t.type !== 'EXPENSE');
    }

    if (startDate) {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      data = data.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate); end.setHours(23,59,59,999);
      data = data.filter(t => new Date(t.date) <= end);
    }

    const processedData = data.map(t => {
        let cost = 0;
        if (['SALE', 'SALE_RETURN', 'QUOTATION'].includes(t.type)) {
            t.items?.forEach(item => {
                const product = productMap.get(item.productId);
                if (product && product.type !== 'service') {
                    let qty = item.quantity;
                    if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) {
                        qty = item.quantity / product.conversionRatio;
                    }
                    cost += qty * product.purchasePrice;
                }
            });
        }
        
        let profit = 0;
        if (t.type === 'SALE' || t.type === 'QUOTATION') {
            profit = t.totalAmount - cost;
        } else if (t.type === 'SALE_RETURN') {
            profit = cost - t.totalAmount;
        }

        return { ...t, profit };
    });

    setTransactions(processedData);

    if (type === 'SALE' || type === 'ALL') {
        let cogs = 0;
        let salesRevenue = 0;

        processedData.filter(t => t.type === 'SALE').forEach(t => {
            salesRevenue += t.totalAmount;
            t.items?.forEach(item => {
                const product = productMap.get(item.productId);
                if (product && product.type !== 'service') {
                    let qty = item.quantity;
                    if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) {
                        qty = item.quantity / product.conversionRatio;
                    }
                    cogs += qty * product.purchasePrice;
                }
            });
        });

        let expenses = allData.filter(t => t.type === 'EXPENSE');
        if (startDate) {
             const start = new Date(startDate); start.setHours(0,0,0,0);
             expenses = expenses.filter(t => new Date(t.date) >= start);
        }
        if (endDate) {
             const end = new Date(endDate); end.setHours(23,59,59,999);
             expenses = expenses.filter(t => new Date(t.date) <= end);
        }
        const totalExpense = expenses.reduce((sum, t) => sum + t.totalAmount, 0);

        const grossProfit = salesRevenue - cogs;
        const margin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;
        const netProfit = grossProfit - totalExpense;

        setSalesMetrics({
            cogs,
            grossProfit,
            margin,
            expense: totalExpense,
            netProfit
        });
    } else {
        setSalesMetrics(null);
    }

  }, [type, startDate, endDate]);

  const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.profit, 0);

  const handleExport = () => {
    const data = transactions.map(t => ({
        ...transformTransactionsForExport([t])[0],
        'Bill Profit': t.profit
    }));
    exportToExcel(data, title.replace(/ /g, '_'));
  };

  const handlePrint = () => {
    const columns = ['Date', 'Ref No', 'Party', 'Type', 'Amount', 'Profit'];
    const rows = transactions.map(t => [
      formatNepaliDate(t.date),
      t.id,
      t.partyName,
      t.type.replace('_', ' '),
      formatCurrency(t.totalAmount),
      ['SALE', 'SALE_RETURN'].includes(t.type) ? formatCurrency(t.profit) : '-'
    ]);
    printData(title, columns, rows);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
       <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
             <div className="w-32">
                 <NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From Date" />
             </div>
             <div className="w-32">
                 <NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To Date" />
             </div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Export Excel">
                <FileSpreadsheet className="w-5 h-5" />
             </button>
             <button onClick={handlePrint} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Print">
                <Printer className="w-5 h-5" />
             </button>
          </div>
       </div>

       {salesMetrics && (
           <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50 border-b border-gray-200">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-blue-600">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Cost of Goods</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(salesMetrics.cogs)}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Gross Profit</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(salesMetrics.grossProfit)}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-purple-600">
                        <Percent className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Margin</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">{salesMetrics.margin.toFixed(1)}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-orange-600">
                        <Banknote className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Total Expense</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(salesMetrics.expense)}</div>
                </div>
                <div className={`bg-white p-3 rounded-lg border shadow-sm ${salesMetrics.netProfit >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${salesMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        <Wallet className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Net Profit</span>
                    </div>
                    <div className={`text-lg font-bold ${salesMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(salesMetrics.netProfit)}</div>
                </div>
           </div>
       )}

       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                   <th className="px-4 py-3">Date</th>
                   <th className="px-4 py-3">Ref No</th>
                   <th className="px-4 py-3">Party</th>
                   <th className="px-4 py-3">Type</th>
                   <th className="px-4 py-3 text-right">Amount</th>
                   <th className="px-4 py-3 text-right">Profit/Loss</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3">{formatNepaliDate(t.date)}</td>
                     <td className="px-4 py-3 text-gray-500 font-mono">#{t.id}</td>
                     <td className="px-4 py-3 font-medium">{t.partyName}</td>
                     <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                           t.type.includes('SALE') ? 'bg-emerald-50 text-emerald-600' :
                           t.type.includes('PURCHASE') ? 'bg-blue-50 text-blue-600' :
                           'bg-gray-100 text-gray-600'
                        }`}>
                           {t.type.replace('_', ' ')}
                        </span>
                     </td>
                     <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(t.totalAmount)}</td>
                     <td className={`px-4 py-3 text-right font-bold ${t.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {['SALE', 'SALE_RETURN', 'QUOTATION'].includes(t.type) ? formatCurrency(t.profit) : '-'}
                     </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                   <tr><td colSpan={6} className="text-center py-8 text-gray-400">No records found</td></tr>
                )}
             </tbody>
             <tfoot className="border-t border-gray-200 bg-gray-50 font-bold">
                <tr>
                   <td colSpan={4} className="px-4 py-3 text-right">Total</td>
                   <td className="px-4 py-3 text-right">{formatCurrency(totalAmount)}</td>
                   <td className={`px-4 py-3 text-right ${totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(totalProfit)}
                   </td>
                </tr>
             </tfoot>
          </table>
       </div>
    </div>
  );
};

// 3. Day Book Report
const DayBookReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [date, setDate] = useState(new Date().toISOString());
  const [transactions, setTransactions] = useState<(Transaction & { profit: number })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(db.getProducts());
  }, []);

  useEffect(() => {
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));

    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);

    const data = db.getTransactions().filter(t => {
       const tDate = new Date(t.date);
       return tDate >= start && tDate <= end;
    });

    const processed = data.map(t => {
        let cost = 0;
        if (['SALE', 'SALE_RETURN'].includes(t.type)) {
            t.items?.forEach(item => {
                const p = productMap.get(item.productId);
                if (p && p.type !== 'service') {
                    let qty = item.quantity;
                    if (item.unit && p.secondaryUnit && item.unit === p.secondaryUnit && p.conversionRatio) {
                        qty = item.quantity / p.conversionRatio;
                    }
                    cost += qty * p.purchasePrice;
                }
            });
        }
        
        let profit = 0;
        if (t.type === 'SALE') profit = t.totalAmount - cost;
        else if (t.type === 'SALE_RETURN') profit = cost - t.totalAmount;

        return { ...t, profit };
    });

    setTransactions(processed);
  }, [date, products]);

  const summary = useMemo(() => {
      const sales = transactions.filter(t => t.type === 'SALE').reduce((s, t) => s + t.totalAmount, 0);
      const purchase = transactions.filter(t => t.type === 'PURCHASE').reduce((s, t) => s + t.totalAmount, 0);
      const payIn = transactions.filter(t => t.type === 'PAYMENT_IN').reduce((s, t) => s + t.totalAmount, 0);
      const payOut = transactions.filter(t => t.type === 'PAYMENT_OUT').reduce((s, t) => s + t.totalAmount, 0);
      const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.totalAmount, 0);
      const dailyProfit = transactions.reduce((sum, t) => sum + t.profit, 0) - expense;

      return { sales, purchase, payIn, payOut, expense, profit: dailyProfit };
  }, [transactions]);

  const handleExport = () => {
    const data = transactions.map(t => {
       const isIn = t.type === 'SALE' || t.type === 'PAYMENT_IN' || t.type === 'PURCHASE_RETURN';
       const isOut = t.type === 'PURCHASE' || t.type === 'PAYMENT_OUT' || t.type === 'EXPENSE' || t.type === 'SALE_RETURN';
       return {
           Time: new Date(t.date).toLocaleTimeString(),
           Particulars: t.partyName,
           Type: t.type,
           'In Amount': isIn ? t.totalAmount : 0,
           'Out Amount': isOut ? t.totalAmount : 0,
           'Bill Profit': t.profit || 0
       };
    });
    exportToExcel(data, `DayBook_${formatNepaliDate(date)}`);
  };

  const handlePrint = () => {
    const columns = ['Time', 'Particulars', 'Type', 'In Amount', 'Out Amount', 'Profit'];
    const rows = transactions.map(t => {
       const isIn = t.type === 'SALE' || t.type === 'PAYMENT_IN' || t.type === 'PURCHASE_RETURN';
       const isOut = t.type === 'PURCHASE' || t.type === 'PAYMENT_OUT' || t.type === 'EXPENSE' || t.type === 'SALE_RETURN';
       return [
           new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
           t.partyName,
           t.type,
           isIn ? formatCurrency(t.totalAmount) : '-',
           isOut ? formatCurrency(t.totalAmount) : '-',
           ['SALE', 'SALE_RETURN'].includes(t.type) ? formatCurrency(t.profit) : '-'
       ];
    });
    printData(`Day Book - ${formatNepaliDate(date)}`, columns, rows);
  };

  const SummaryCard = ({ label, value, color, icon: Icon }: any) => (
      <div className={`p-3 rounded-lg border flex flex-col justify-between h-full bg-white border-gray-200`}>
          <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md bg-${color}-50 text-${color}-600`}>
                  <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
          </div>
          <div className={`text-lg font-bold text-${color}-700`}>{formatCurrency(value)}</div>
      </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
       <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Day Book</h2>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-40">
                  <NepaliDatePicker value={date} onChange={setDate} />
              </div>
              <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Export Excel">
                <FileSpreadsheet className="w-5 h-5" />
              </button>
              <button onClick={handlePrint} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Print">
                <Printer className="w-5 h-5" />
              </button>
          </div>
       </div>
       
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-gray-50 border-b border-gray-100">
          <SummaryCard label="Total Sales" value={summary.sales} color="emerald" icon={ShoppingBag} />
          <SummaryCard label="Purchase" value={summary.purchase} color="blue" icon={ShoppingBag} />
          <SummaryCard label="Payment In" value={summary.payIn} color="indigo" icon={TrendingDown} />
          <SummaryCard label="Payment Out" value={summary.payOut} color="orange" icon={TrendingUp} />
          <SummaryCard label="Expenses" value={summary.expense} color="red" icon={Banknote} />
          <SummaryCard label="Net Profit" value={summary.profit} color={summary.profit >= 0 ? 'emerald' : 'red'} icon={Wallet} />
       </div>

       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                   <th className="px-4 py-3">Time</th>
                   <th className="px-4 py-3">Particulars</th>
                   <th className="px-4 py-3">Type</th>
                   <th className="px-4 py-3 text-right">In Amount</th>
                   <th className="px-4 py-3 text-right">Out Amount</th>
                   <th className="px-4 py-3 text-right">Profit</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {transactions.map(t => {
                   const isIn = t.type === 'SALE' || t.type === 'PAYMENT_IN';
                   const isOut = t.type === 'PURCHASE' || t.type === 'PAYMENT_OUT' || t.type === 'EXPENSE';
                   const isReturnIn = t.type === 'PURCHASE_RETURN'; 
                   const isReturnOut = t.type === 'SALE_RETURN'; 

                   const time = new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                   return (
                    <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{time}</td>
                        <td className="px-4 py-3">
                           <div className="font-medium text-gray-800">{t.partyName}</div>
                           <div className="text-xs text-gray-400">#{t.id}</div>
                        </td>
                        <td className="px-4 py-3 text-xs uppercase text-gray-500">{t.type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{(isIn || isReturnIn) ? formatCurrency(t.totalAmount) : '-'}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{(isOut || isReturnOut) ? formatCurrency(t.totalAmount) : '-'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${t.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {['SALE', 'SALE_RETURN'].includes(t.type) ? formatCurrency(t.profit) : '-'}
                        </td>
                    </tr>
                   );
                })}
                 {transactions.length === 0 && (
                   <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions for this day</td></tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

// 4. Profit & Loss Report
const ProfitLossReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    salesReturns: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    expensesByCategory: [] as { category: string; amount: number }[]
  });

  useEffect(() => {
    setProfile(db.getBusinessProfile());
    const products: Product[] = db.getProducts();
    let transactions = db.getTransactions();

    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        transactions = transactions.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        transactions = transactions.filter(t => new Date(t.date) <= end);
    }

    let totalSales = 0;
    let salesReturns = 0;
    let cogs = 0;
    const expenseMap = new Map<string, number>();
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));

    transactions.forEach(t => {
       if (t.type === 'SALE') {
          totalSales += t.totalAmount;
          t.items?.forEach(item => {
             const product = productMap.get(item.productId);
             if (product && product.type !== 'service') {
                let qty = item.quantity;
                if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) {
                    qty = item.quantity / product.conversionRatio;
                }
                cogs += (qty * product.purchasePrice);
             }
          });
       } else if (t.type === 'SALE_RETURN') {
          salesReturns += t.totalAmount;
          t.items?.forEach(item => {
             const product = productMap.get(item.productId);
             if (product && product.type !== 'service') {
                let qty = item.quantity;
                if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) {
                    qty = item.quantity / product.conversionRatio;
                }
                cogs -= (qty * product.purchasePrice);
             }
          });
       } else if (t.type === 'EXPENSE') {
          const cat = t.category || 'General';
          expenseMap.set(cat, (expenseMap.get(cat) || 0) + t.totalAmount);
       }
    });

    const expensesByCategory = Array.from(expenseMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
    
    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.amount, 0);
    const netSales = totalSales - salesReturns;
    const grossProfit = netSales - cogs;
    const netProfit = grossProfit - totalExpenses;

    setMetrics({
        totalSales,
        salesReturns,
        netSales,
        cogs,
        grossProfit,
        totalExpenses,
        netProfit,
        expensesByCategory
    });
  }, [startDate, endDate]);

  const handleExport = () => {
    const data = [
        { Item: 'Total Sales', Amount: metrics.totalSales },
        { Item: 'Sales Return', Amount: metrics.salesReturns },
        { Item: 'Net Sales', Amount: metrics.netSales },
        { Item: 'COGS', Amount: metrics.cogs },
        { Item: 'Gross Profit', Amount: metrics.grossProfit },
        { Item: '--- Operating Expenses ---', Amount: '' },
        ...metrics.expensesByCategory.map(e => ({ Item: e.category, Amount: e.amount })),
        { Item: 'Total Expenses', Amount: metrics.totalExpenses },
        { Item: 'Net Profit', Amount: metrics.netProfit }
    ];
    exportToExcel(data, 'ProfitAndLoss');
  };

  const getPercent = (val: number, total: number) => {
      if(!total) return '0%';
      return ((val/total)*100).toFixed(1) + '%';
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full max-w-5xl mx-auto w-full print:hidden">
       {/* Header */}
       <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Profit & Loss Statement</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <div className="w-32">
                 <NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From Date" />
             </div>
             <div className="w-32">
                 <NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To Date" />
             </div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Export Excel">
                <FileSpreadsheet className="w-5 h-5" />
             </button>
             <button onClick={() => window.print()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Print">
                <Printer className="w-5 h-5" />
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Net Sales</p>
                  <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(metrics.netSales)}</h3>
                  <p className="text-xs text-emerald-500 mt-1">Gross Revenue</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-500 mb-1">Gross Profit</p>
                  <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.grossProfit)}</h3>
                  <p className="text-xs text-blue-500 mt-1">{getPercent(metrics.grossProfit, metrics.netSales)} of Sales</p>
              </div>
              <div className={`bg-white p-5 rounded-xl border shadow-sm ${metrics.netProfit >= 0 ? 'border-emerald-100' : 'border-red-100'}`}>
                  <p className="text-sm font-medium text-gray-500 mb-1">Net Profit</p>
                  <h3 className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(metrics.netProfit)}
                  </h3>
                  <p className={`text-xs mt-1 ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {getPercent(metrics.netProfit, metrics.netSales)} Net Margin
                  </p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left: Trading Account */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-fit">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 font-bold text-gray-700">
                      Trading Account (Income)
                  </div>
                  <div className="p-6 space-y-4">
                      {/* Revenue */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Revenue from Operations</h4>
                          <div className="flex justify-between items-center text-sm py-1">
                              <span className="text-gray-600">Total Sales</span>
                              <span className="font-medium text-gray-900">{formatCurrency(metrics.totalSales)}</span>
                          </div>
                          {metrics.salesReturns > 0 && (
                              <div className="flex justify-between items-center text-sm py-1 text-red-500">
                                  <span>Less: Sales Return</span>
                                  <span>({formatCurrency(metrics.salesReturns)})</span>
                              </div>
                          )}
                          <div className="flex justify-between items-center text-sm py-2 border-t border-gray-100 mt-1 font-bold">
                              <span className="text-gray-800">Net Sales</span>
                              <span className="text-emerald-600">{formatCurrency(metrics.netSales)}</span>
                          </div>
                      </div>

                      {/* COGS */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 mt-2">Cost of Goods Sold</h4>
                          <div className="flex justify-between items-center text-sm py-1">
                              <span className="text-gray-600">Cost of Sales</span>
                              <span className="font-medium text-red-500">({formatCurrency(metrics.cogs)})</span>
                          </div>
                      </div>

                      {/* Gross Profit Line */}
                      <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center mt-4">
                          <div>
                              <span className="font-bold text-blue-900 block">Gross Profit</span>
                              <span className="text-xs text-blue-700">Net Sales - COGS</span>
                          </div>
                          <span className="font-bold text-xl text-blue-700">{formatCurrency(metrics.grossProfit)}</span>
                      </div>
                  </div>
              </div>

              {/* Right: Expenses & Net Profit */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-fit">
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 font-bold text-gray-700">
                      Operating Expenses
                  </div>
                  <div className="p-6">
                      <div className="space-y-3 mb-6">
                          {metrics.expensesByCategory.length === 0 ? (
                              <p className="text-center text-gray-400 py-4 text-sm">No expenses recorded for this period.</p>
                          ) : (
                              metrics.expensesByCategory.map((item, idx) => (
                                  <div key={idx} className="relative">
                                      <div className="flex justify-between text-sm mb-1 z-10 relative">
                                          <span className="text-gray-600 font-medium">{item.category}</span>
                                          <span className="text-gray-900">{formatCurrency(item.amount)}</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-red-400 rounded-full"
                                            style={{ width: `${(item.amount / metrics.totalExpenses) * 100}%` }}
                                          ></div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>

                      <div className="flex justify-between items-center text-sm py-3 border-t border-gray-100 font-bold mb-4">
                          <span className="text-gray-800">Total Operating Expenses</span>
                          <span className="text-red-600">({formatCurrency(metrics.totalExpenses)})</span>
                      </div>

                      <div className={`p-4 rounded-lg flex justify-between items-center ${metrics.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          <div>
                              <span className={`font-bold block ${metrics.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                                  {metrics.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                              </span>
                              <span className={`text-xs ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                  Gross Profit - Expenses
                              </span>
                          </div>
                          <span className={`font-bold text-2xl ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {formatCurrency(metrics.netProfit)}
                          </span>
                      </div>
                  </div>
              </div>

          </div>
       </div>
    </div>

    {/* Print View for P&L */}
    <div className="hidden print:block fixed inset-0 bg-white z-[200] p-8">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold uppercase">{profile?.name || 'Company Name'}</h1>
            <p className="text-sm">{profile?.address}</p>
            <h2 className="text-lg font-bold mt-4 underline decoration-double">PROFIT & LOSS STATEMENT</h2>
            <p className="text-xs mt-1">From: {startDate || 'Beginning'} To: {endDate || 'Today'}</p>
        </div>

        <table className="w-full text-sm border border-gray-400 mb-6">
            <tbody>
                <tr className="bg-gray-100 font-bold">
                    <td className="p-2 border border-gray-400" colSpan={2}>Trading Account</td>
                </tr>
                <tr>
                    <td className="p-2 border border-gray-400">Total Sales</td>
                    <td className="p-2 border border-gray-400 text-right">{formatCurrency(metrics.totalSales)}</td>
                </tr>
                <tr>
                    <td className="p-2 border border-gray-400">Less: Sales Return</td>
                    <td className="p-2 border border-gray-400 text-right">({formatCurrency(metrics.salesReturns)})</td>
                </tr>
                <tr className="font-semibold">
                    <td className="p-2 border border-gray-400">Net Sales</td>
                    <td className="p-2 border border-gray-400 text-right">{formatCurrency(metrics.netSales)}</td>
                </tr>
                <tr>
                    <td className="p-2 border border-gray-400">Less: Cost of Goods Sold</td>
                    <td className="p-2 border border-gray-400 text-right">({formatCurrency(metrics.cogs)})</td>
                </tr>
                <tr className="bg-gray-100 font-bold text-base">
                    <td className="p-2 border border-gray-400">GROSS PROFIT</td>
                    <td className="p-2 border border-gray-400 text-right">{formatCurrency(metrics.grossProfit)}</td>
                </tr>
            </tbody>
        </table>

        <table className="w-full text-sm border border-gray-400">
            <tbody>
                <tr className="bg-gray-100 font-bold">
                    <td className="p-2 border border-gray-400" colSpan={2}>Operating Expenses</td>
                </tr>
                {metrics.expensesByCategory.map((e, i) => (
                    <tr key={i}>
                        <td className="p-2 border border-gray-400">{e.category}</td>
                        <td className="p-2 border border-gray-400 text-right">{formatCurrency(e.amount)}</td>
                    </tr>
                ))}
                <tr className="font-semibold">
                    <td className="p-2 border border-gray-400">Total Expenses</td>
                    <td className="p-2 border border-gray-400 text-right">({formatCurrency(metrics.totalExpenses)})</td>
                </tr>
                <tr className="bg-gray-100 font-bold text-lg">
                    <td className="p-2 border border-gray-400">NET PROFIT / (LOSS)</td>
                    <td className="p-2 border border-gray-400 text-right">{formatCurrency(metrics.netProfit)}</td>
                </tr>
            </tbody>
        </table>
    </div>
    </>
  );
};

// 5. Party Statement Report (Ledger Style)
const PartyStatementReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Searchable Party State
  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const partyWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setParties(db.getParties());
    setProducts(db.getProducts());
  }, []);

  useEffect(() => {
    if (selectedPartyId) {
      // Get all historical data for the party to calculate BF correctly
      let data = db.getTransactions().filter(t => t.partyId === selectedPartyId);
      // Sort by date ascending for proper running balance
      setTransactions(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } else {
      setTransactions([]);
    }
  }, [selectedPartyId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (partyWrapperRef.current && !partyWrapperRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derived Business Analysis Memo (UI only)
  const analysisMetrics = useMemo(() => {
    if (!selectedPartyId || transactions.length === 0) return { cogs: 0, profit: 0 };
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));
    let totalCogs = 0;
    let totalProfit = 0;

    transactions.forEach(t => {
        let billCost = 0;
        if (['SALE', 'SALE_RETURN', 'QUOTATION'].includes(t.type)) {
            t.items?.forEach(item => {
                const product = productMap.get(item.productId);
                if (product && product.type !== 'service') {
                    let qty = item.quantity;
                    if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) {
                        qty = item.quantity / product.conversionRatio;
                    }
                    billCost += qty * product.purchasePrice;
                }
            });
        }
        if (t.type === 'SALE' || t.type === 'QUOTATION') {
            totalCogs += billCost;
            totalProfit += (t.totalAmount - billCost);
        } else if (t.type === 'SALE_RETURN') {
            totalCogs -= billCost;
            totalProfit -= (t.totalAmount - billCost);
        }
    });
    return { cogs: totalCogs, profit: totalProfit };
  }, [transactions, products, selectedPartyId]);

  // Ledger Processing Logic with BF calculation
  const { bfBalance, ledgerRows } = useMemo(() => {
    let bf = 0;
    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const rows: any[] = [];
    let runningBalance = 0;

    transactions.forEach(t => {
      let debit = 0;
      let credit = 0;

      if (['SALE', 'PAYMENT_OUT', 'PURCHASE_RETURN'].includes(t.type)) {
        debit = t.totalAmount;
      } else if (['PURCHASE', 'PAYMENT_IN', 'SALE_RETURN'].includes(t.type)) {
        credit = t.totalAmount;
      } else if (t.type === 'BALANCE_ADJUSTMENT') {
        if (t.totalAmount >= 0) debit = t.totalAmount;
        else credit = Math.abs(t.totalAmount);
      }

      const txDate = new Date(t.date);
      
      if (start && txDate < start) {
        // Contribute to Opening Balance (Brought Forward)
        bf += (debit - credit);
      } else {
        // Within or after period
        if (!end || txDate <= end) {
            // First time reaching visible range, initialize running balance from calculated BF
            if (rows.length === 0) runningBalance = bf;
            
            runningBalance += (debit - credit);
            rows.push({
                ...t,
                debit,
                credit,
                balance: Math.abs(runningBalance),
                indicator: runningBalance >= 0 ? 'Dr' : 'Cr'
            });
        }
      }
    });

    return { bfBalance: bf, ledgerRows: rows };
  }, [transactions, startDate, endDate]);

  const selectedParty = parties.find(p => p.id === selectedPartyId);

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(partySearchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(partySearchTerm))
  );

  const handlePartySelect = (p: Party) => {
    setSelectedPartyId(p.id);
    setPartySearchTerm(p.name);
    setShowPartyDropdown(false);
  };

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % filteredParties.length);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + filteredParties.length) % filteredParties.length);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredParties.length > 0) {
            handlePartySelect(filteredParties[highlightedIndex]);
        }
    }
  };

  const handleExport = () => {
    const data = [
      { Date: '-', Type: '-', Voucher: '-', Debit: 0, Credit: 0, Balance: `${Math.abs(bfBalance)} ${bfBalance >= 0 ? 'Dr' : 'Cr'}`, Narration: 'Opening Balance / B.F' },
      ...ledgerRows.map(row => ({
        Date: formatNepaliDate(row.date),
        Type: row.type,
        Voucher: row.id,
        Debit: row.debit || 0,
        Credit: row.credit || 0,
        Balance: `${row.balance} ${row.indicator}`,
        Narration: row.notes || ''
      }))
    ];
    exportToExcel(data, `Ledger_${selectedParty?.name || 'Party'}`);
  };

  const handlePrint = () => {
    if (!selectedParty) return;
    const profile = db.getBusinessProfile();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRowsHtml = ledgerRows.map(row => {
      const itemsHtml = row.items?.map((item: any) => 
        `<div style="font-size: 10px; color: #555; margin-left: 10px;">${item.productName} &nbsp; ${item.quantity} pcs @ ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}</div>`
      ).join('') || '';

      const summaryHtml = row.items?.length > 0 ? 
        `<div style="font-size: 10px; border-top: 1px dashed #ccc; margin-top: 4px; padding-top: 2px;">**** Total Qty. = ${row.items.reduce((s:any, i:any) => s + i.quantity, 0)} : Amt. = ${formatCurrency(row.totalAmount)}</div>` : '';

      return `
        <tr>
          <td>${formatNepaliDate(row.date)}</td>
          <td>${row.type.substring(0, 4)}</td>
          <td>${row.id.slice(-6)}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: bold; color: #2563eb;">${row.type.replace('_', ' ')}</div>
            ${itemsHtml}
            ${summaryHtml}
          </td>
          <td style="text-align: right;">${row.debit > 0 ? formatCurrency(row.debit) : ''}</td>
          <td style="text-align: right;">${row.credit > 0 ? formatCurrency(row.credit) : ''}</td>
          <td style="text-align: right; font-weight: bold;">${formatCurrency(row.balance)} <small style="color: #666;">${row.indicator}</small></td>
          <td>${row.notes || ''}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Party Statement - ${selectedParty.name}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 0; margin: 0; }
            .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .company-name { font-size: 24px; font-bold; color: #1e3a8a; text-transform: capitalize; }
            .address-bar { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; table-layout: fixed; }
            th { background-color: #0284c7; color: white; padding: 10px 8px; font-size: 13px; border: 1px solid #075985; text-align: center; }
            td { padding: 6px 8px; font-size: 12px; border: 1px solid #cbd5e1; vertical-align: top; word-wrap: break-word; }
            .opening-row { background-color: #fffbeb; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer-note { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${profile.name}</div>
            <div class="address-bar">${profile.address}</div>
            <div class="address-bar">${profile.phone}</div>
          </div>
          
          <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 16px; font-weight: bold;">Statement for: ${selectedParty.name}</div>
              <div style="font-size: 12px;">Contact: ${selectedParty.phone || 'N/A'}</div>
            </div>
            <div style="text-align: right; font-size: 12px;">
              Period: ${startDate ? formatNepaliDate(startDate) : 'Beginning'} - ${endDate ? formatNepaliDate(endDate) : 'Today'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Date</th>
                <th style="width: 50px;">Type</th>
                <th style="width: 70px;">Vch/Bill No</th>
                <th style="width: 250px; text-align: left;">Account</th>
                <th style="width: 100px; text-align: right;">Debit(Rs.)</th>
                <th style="width: 100px; text-align: right;">Credit(Rs.)</th>
                <th style="width: 110px; text-align: right;">Balance(Rs.)</th>
                <th style="width: 100px;">Short Narration</th>
              </tr>
            </thead>
            <tbody>
              <tr class="opening-row">
                <td colspan="3"></td>
                <td colspan="3" style="text-align: left;">Opening Balance / B.F</td>
                <td style="text-align: right;">${formatCurrency(Math.abs(bfBalance))} ${bfBalance >= 0 ? 'Dr' : 'Cr'}</td>
                <td></td>
              </tr>
              ${tableRowsHtml}
            </tbody>
          </table>
          <div class="footer-note">Generated by AA Pro Business Solutions</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
       <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">Party Ledger Statement</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
             <div className="w-48 relative" ref={partyWrapperRef}>
                <div className="relative">
                   <input
                      type="text"
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      placeholder="Search Party..."
                      value={partySearchTerm}
                      onChange={(e) => {
                          setPartySearchTerm(e.target.value);
                          setShowPartyDropdown(true);
                          setHighlightedIndex(0);
                      }}
                      onKeyDown={handlePartyKeyDown}
                      onFocus={() => setShowPartyDropdown(true)}
                   />
                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                   {partySearchTerm && (
                       <button 
                         onClick={() => { setPartySearchTerm(''); setSelectedPartyId(''); }} 
                         className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                       >
                           <X className="w-4 h-4" />
                       </button>
                   )}
                </div>

                {showPartyDropdown && (
                    <div className="absolute top-full left-0 w-[300px] bg-white border border-gray-200 rounded-lg shadow-xl z-[60] mt-1 max-h-60 overflow-y-auto">
                        {filteredParties.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center italic">No parties found.</div>
                        ) : (
                            filteredParties.map((p, index) => (
                                <div 
                                    key={p.id}
                                    className={`p-2.5 border-b border-gray-50 last:border-0 cursor-pointer flex justify-between items-center group ${highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onClick={() => handlePartySelect(p)}
                                >
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                                        <div className="text-[10px] text-gray-500">{p.phone || 'No Phone'}</div>
                                    </div>
                                    <div className={`text-[10px] px-1.5 py-0.5 rounded ${p.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {p.type.substring(0,4)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
             </div>
             <div className="w-32">
                 <NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From Date" />
             </div>
             <div className="w-32">
                 <NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To Date" />
             </div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" disabled={!selectedPartyId}>
                <FileSpreadsheet className="w-5 h-5" />
             </button>
             <button onClick={handlePrint} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50" disabled={!selectedPartyId}>
                <Printer className="w-5 h-5" />
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-auto bg-gray-50/30">
          {selectedPartyId ? (
            <div className="p-4">
              {/* Analysis Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden">
                 <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 text-base">{selectedParty?.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{selectedParty?.phone} | {selectedParty?.address || 'No Address'}</p>
                 </div>
                 <div className="p-4 bg-white rounded-xl border border-blue-50 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-blue-600">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Cost of Goods</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(analysisMetrics.cogs)}</div>
                 </div>
                 <div className={`p-4 rounded-xl border shadow-sm ${analysisMetrics.profit >= 0 ? 'bg-white border-emerald-50' : 'bg-white border-red-50'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${analysisMetrics.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Profit (Estimated)</span>
                    </div>
                    <div className={`text-lg font-bold ${analysisMetrics.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(analysisMetrics.profit)}</div>
                 </div>
                 <div className="p-4 bg-white rounded-xl border border-gray-200 text-right flex flex-col justify-center shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Closing Balance</p>
                    <p className={`text-xl font-bold ${selectedParty!.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                       {formatCurrency(Math.abs(selectedParty!.balance))}
                       <span className="text-[10px] ml-1 font-normal text-gray-400">{selectedParty!.balance >= 0 ? 'Dr' : 'Cr'}</span>
                    </p>
                 </div>
              </div>

              {/* Ledger Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                 <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#0284c7] text-white font-bold">
                        <tr>
                           <th className="px-4 py-3 border border-[#075985]">Date</th>
                           <th className="px-2 py-3 border border-[#075985]">Type</th>
                           <th className="px-2 py-3 border border-[#075985]">Vch No</th>
                           <th className="px-4 py-3 border border-[#075985] text-left">Account (Details)</th>
                           <th className="px-4 py-3 border border-[#075985] text-right">Debit(Rs.)</th>
                           <th className="px-4 py-3 border border-[#075985] text-right">Credit(Rs.)</th>
                           <th className="px-4 py-3 border border-[#075985] text-right">Balance(Rs.)</th>
                           <th className="px-4 py-3 border border-[#075985]">Narration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr className="bg-amber-50/30 font-bold italic">
                           <td colSpan={3}></td>
                           <td className="px-4 py-2 border-r border-gray-100">Opening Balance / B.F</td>
                           <td></td>
                           <td className="border-r border-gray-100"></td>
                           <td className="px-4 py-2 text-right border-r border-gray-100">
                              {formatCurrency(Math.abs(bfBalance))} {bfBalance >= 0 ? 'Dr' : 'Cr'}
                           </td>
                           <td></td>
                        </tr>
                        {ledgerRows.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50 align-top">
                             <td className="px-4 py-3 border-r border-gray-100 whitespace-nowrap">{formatNepaliDate(row.date)}</td>
                             <td className="px-2 py-3 border-r border-gray-100 uppercase text-[10px] font-bold text-gray-400">{row.type.substring(0,4)}</td>
                             <td className="px-2 py-3 border-r border-gray-100 font-mono text-[10px]">#{row.id.slice(-6)}</td>
                             <td className="px-4 py-3 border-r border-gray-100">
                                <div className="font-bold text-blue-600 mb-1">{row.type.replace('_', ' ')}</div>
                                {row.items?.map((item: any, i: number) => (
                                   <div key={i} className="text-[10px] text-gray-500 pl-2 border-l border-gray-200 ml-1 mb-0.5">
                                      {item.productName} <span className="mx-1 opacity-50">•</span> {item.quantity} x {formatCurrency(item.rate)} = {formatCurrency(item.amount)}
                                   </div>
                                ))}
                                {row.items?.length > 0 && (
                                   <div className="text-[10px] text-gray-400 border-t border-dashed mt-1 pt-0.5 font-mono">
                                      **** Total Qty. = {row.items.reduce((s:any, i:any) => s + i.quantity, 0)} : Amt. = {formatCurrency(row.totalAmount)}
                                   </div>
                                )}
                             </td>
                             <td className="px-4 py-3 border-r border-gray-100 text-right font-medium">{row.debit > 0 ? formatCurrency(row.debit) : ''}</td>
                             <td className="px-4 py-3 border-r border-gray-100 text-right font-medium">{row.credit > 0 ? formatCurrency(row.credit) : ''}</td>
                             <td className="px-4 py-3 border-r border-gray-100 text-right font-bold text-gray-900">
                                {formatCurrency(row.balance)}
                                <span className="text-[10px] ml-1 font-normal text-gray-400">{row.indicator}</span>
                             </td>
                             <td className="px-4 py-3 text-gray-500 italic max-w-xs">{row.notes || '-'}</td>
                          </tr>
                        ))}
                        {ledgerRows.length === 0 && (
                          <tr><td colSpan={8} className="text-center py-20 text-gray-400 flex flex-col items-center gap-2">
                             <Search className="w-10 h-10 opacity-20" />
                             No transactions found for this period.
                          </td></tr>
                        )}
                    </tbody>
                 </table>
              </div>
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 py-32">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 opacity-30" />
                </div>
                <div className="text-center">
                    <p className="font-bold text-gray-600">No Party Selected</p>
                    <p className="text-sm">Please search and select a party to view the ledger statement.</p>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

// 6. All Parties Report
const AllPartiesReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setParties(db.getParties());
  }, []);

  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalReceivable = parties.reduce((sum, p) => p.balance > 0 ? sum + p.balance : sum, 0);
  const totalPayable = parties.reduce((sum, p) => p.balance < 0 ? sum + Math.abs(p.balance) : sum, 0);

  const handleExport = () => {
    const data = transformPartiesForExport(filteredParties);
    exportToExcel(data, 'All_Parties_Balance');
  };

  const handlePrint = () => {
    const columns = ['Name', 'Type', 'Phone', 'Balance', 'Status'];
    const rows = filteredParties.map(p => [
      p.name,
      p.type,
      p.phone || '-',
      formatCurrency(Math.abs(p.balance)),
      p.balance >= 0 ? 'To Receive' : 'To Give'
    ]);
    printData('All Party Balances', columns, rows);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
       <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">All Party Statement</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                   type="text" 
                   className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                   placeholder="Search party..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
             </button>
             <button onClick={handlePrint} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <Printer className="w-5 h-5" />
             </button>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b border-gray-100">
          <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
             <p className="text-xs text-gray-500 uppercase font-bold">Total To Receive (Dr)</p>
             <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceivable)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
             <p className="text-xs text-gray-500 uppercase font-bold">Total To Give (Cr)</p>
             <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPayable)}</p>
          </div>
       </div>

       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                   <th className="px-4 py-3">Party Name</th>
                   <th className="px-4 py-3">Type</th>
                   <th className="px-4 py-3">Phone</th>
                   <th className="px-4 py-3 text-right">Balance</th>
                   <th className="px-4 py-3 text-center">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {filteredParties.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                     <td className="px-4 py-3 capitalize text-gray-500">{p.type}</td>
                     <td className="px-4 py-3 text-gray-500">{p.phone || '-'}</td>
                     <td className={`px-4 py-3 text-right font-bold ${p.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(p.balance))}
                     </td>
                     <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                           {p.balance >= 0 ? 'RECEIVABLE' : 'PAYABLE'}
                        </span>
                     </td>
                  </tr>
                ))}
                {filteredParties.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No parties found</td></tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

// 7. Party Aging Report (Bucketed Receivables)
const PartyAgingReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [agingData, setAgingData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const now = new Date();

  useEffect(() => {
    const parties = db.getParties().filter(p => p.balance > 0);
    const transactions = db.getTransactions();

    const data = parties.map(party => {
       const partyTxns = transactions
         .filter(t => t.partyId === party.id && ['SALE', 'PAYMENT_IN', 'SALE_RETURN', 'BALANCE_ADJUSTMENT'].includes(t.type))
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

       // Calculate Buckets using FIFO (simulated)
       let remainingBalance = party.balance;
       const buckets = { current: 0, w1: 0, d15: 0, d30: 0, d60: 0, d90: 0, d120: 0 };

       // Simple bucket approach: group balance by oldest bills
       // In a real FIFO, you'd subtract payments from oldest bills. 
       // For this report, we'll assign the remaining balance to buckets based on transaction age.
       for (let i = partyTxns.length - 1; i >= 0 && remainingBalance > 0; i--) {
          const t = partyTxns[i];
          if (['SALE', 'BALANCE_ADJUSTMENT'].includes(t.type) && t.totalAmount > 0) {
             const amt = Math.min(remainingBalance, t.totalAmount);
             const ageDays = Math.floor((now.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
             
             if (ageDays >= 120) buckets.d120 += amt;
             else if (ageDays >= 90) buckets.d90 += amt;
             else if (ageDays >= 60) buckets.d60 += amt;
             else if (ageDays >= 30) buckets.d30 += amt;
             else if (ageDays >= 15) buckets.d15 += amt;
             else if (ageDays >= 7) buckets.w1 += amt;
             else buckets.current += amt;

             remainingBalance -= amt;
          }
       }
       
       // Handle any leftover (opening balances usually fall in oldest bucket)
       if (remainingBalance > 0) buckets.d120 += remainingBalance;

       return { ...party, buckets };
    });

    setAgingData(data);
  }, []);

  const filtered = agingData.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const totals = useMemo(() => {
    return filtered.reduce((acc, d) => {
        acc.total += d.balance;
        acc.current += d.buckets.current;
        acc.w1 += d.buckets.w1;
        acc.d15 += d.buckets.d15;
        acc.d30 += d.buckets.d30;
        acc.d60 += d.buckets.d60;
        acc.d90 += d.buckets.d90;
        acc.d120 += d.buckets.d120;
        return acc;
    }, { total: 0, current: 0, w1: 0, d15: 0, d30: 0, d60: 0, d90: 0, d120: 0 });
  }, [filtered]);

  const handleExport = () => {
    const exportFormatted = filtered.map(d => ({
        'Party Name': d.name,
        'Total Due': d.balance,
        'Current': d.buckets.current,
        '1 Week+': d.buckets.w1,
        '15 Days+': d.buckets.d15,
        '30 Days+': d.buckets.d30,
        '60 Days+': d.buckets.d60,
        '90 Days+': d.buckets.d90,
        '120 Days+': d.buckets.d120
    }));
    exportToExcel(exportFormatted, 'Receivable_Aging_Report');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
       <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h2 className="text-xl font-bold text-gray-800">Aged Receivables Report</h2>
                <p className="text-xs text-gray-500">Classification of dues by time period</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                   type="text" 
                   className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none w-64"
                   placeholder="Search party..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
             </button>
             <button onClick={() => window.print()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <Printer className="w-5 h-5" />
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-auto bg-gray-50/30">
          <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
             <thead className="sticky top-0 z-10 font-bold uppercase tracking-wider text-[10px]">
                <tr className="bg-gray-800 text-white">
                   <th className="px-4 py-4 border-r border-gray-700">Party Name</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right">Total Due</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right bg-emerald-600">Current</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right bg-emerald-700">1 Wk +</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right bg-yellow-600">15 Days +</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right bg-orange-500">30 Days +</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right bg-orange-600">60 Days +</th>
                   <th className="px-4 py-4 border-r border-gray-700 text-right bg-red-600">90 Days +</th>
                   <th className="px-4 py-4 text-right bg-red-700">120 Days +</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                     <td className="px-4 py-3 border-r border-gray-50 font-bold text-gray-800">{d.name}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right font-black text-blue-600">{formatCurrency(d.balance)}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right bg-emerald-50/30">{d.buckets.current > 0 ? formatCurrency(d.buckets.current) : '-'}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right bg-emerald-100/30">{d.buckets.w1 > 0 ? formatCurrency(d.buckets.w1) : '-'}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right bg-yellow-50/30 font-medium">{d.buckets.d15 > 0 ? formatCurrency(d.buckets.d15) : '-'}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right bg-orange-50/30 font-bold">{d.buckets.d30 > 0 ? formatCurrency(d.buckets.d30) : '-'}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right bg-orange-100/30 font-bold">{d.buckets.d60 > 0 ? formatCurrency(d.buckets.d60) : '-'}</td>
                     <td className="px-4 py-3 border-r border-gray-50 text-right bg-red-50/30 font-black text-red-600">{d.buckets.d90 > 0 ? formatCurrency(d.buckets.d90) : '-'}</td>
                     <td className="px-4 py-3 text-right bg-red-100/30 font-black text-red-700 animate-pulse">{d.buckets.d120 > 0 ? formatCurrency(d.buckets.d120) : '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-20 text-center text-gray-400">No receivable balances found.</td></tr>
                )}
             </tbody>
             <tfoot className="sticky bottom-0 bg-gray-900 text-white font-black text-xs uppercase">
                <tr>
                   <td className="px-4 py-4 border-r border-gray-800">Total Company Credit</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right text-blue-400">{formatCurrency(totals.total)}</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right">{formatCurrency(totals.current)}</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right">{formatCurrency(totals.w1)}</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right">{formatCurrency(totals.d15)}</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right">{formatCurrency(totals.d30)}</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right">{formatCurrency(totals.d60)}</td>
                   <td className="px-4 py-4 border-r border-gray-800 text-right">{formatCurrency(totals.d90)}</td>
                   <td className="px-4 py-4 text-right text-red-400">{formatCurrency(totals.d120)}</td>
                </tr>
             </tfoot>
          </table>
       </div>
    </div>
  );
};

// 8. Stock Report
const StockReport: React.FC<{ filter?: 'low', onBack: () => void }> = ({ filter, onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let data = db.getProducts();
    if (filter === 'low') {
      data = data.filter(p => p.type !== 'service' && p.stock < (p.minStockLevel || 5));
    }
    setProducts(data);
  }, [filter]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalStockValue = filteredProducts.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);

  const handleExport = () => {
    const data = transformProductsForExport(filteredProducts);
    exportToExcel(data, filter === 'low' ? 'Low_Stock_Report' : 'Full_Stock_Report');
  };

  const handlePrint = () => {
    const columns = ['Item Name', 'Category', 'Stock', 'Unit', 'Value (Purchase)'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.category || 'General',
      p.stock,
      p.unit,
      formatCurrency(p.stock * p.purchasePrice)
    ]);
    printData(filter === 'low' ? 'Low Stock Report' : 'Stock Quantity Report', columns, rows);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
       <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{filter === 'low' ? 'Low Stock Summary' : 'Stock Quantity Report'}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                   type="text" 
                   className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                   placeholder="Search items..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
             </button>
             <button onClick={handlePrint} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                <Printer className="w-5 h-5" />
             </button>
          </div>
       </div>

       <div className="p-4 bg-gray-50 border-b border-gray-100">
          <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm w-fit min-w-[200px]">
             <p className="text-xs text-gray-500 uppercase font-bold">Total Inventory Value (Cost)</p>
             <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalStockValue)}</p>
          </div>
       </div>

       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                   <th className="px-4 py-3">Item Name</th>
                   <th className="px-4 py-3">Category</th>
                   <th className="px-4 py-3 text-center">Stock</th>
                   <th className="px-4 py-3 text-center">Unit</th>
                   <th className="px-4 py-3 text-right">Buy Price</th>
                   <th className="px-4 py-3 text-right">Total Value</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                     <td className="px-4 py-3 text-gray-500">{p.category || 'General'}</td>
                     <td className={`px-4 py-3 text-center font-bold ${p.stock < (p.minStockLevel || 5) ? 'text-red-500' : 'text-gray-700'}`}>{p.stock}</td>
                     <td className="px-4 py-3 text-center text-xs uppercase text-gray-400">{p.unit}</td>
                     <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(p.purchasePrice)}</td>
                     <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(p.stock * p.purchasePrice)}</td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

// 9. Replenishment Report (Upgraded to Auto-Order Manager)
interface OrderDraftItem extends TransactionItem {
    currentStock: number;
    threshold: number;
}

const ReplenishmentReport: React.FC<{ onBack: () => void, onConvert?: (items: TransactionItem[]) => void }> = ({ onBack, onConvert }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderDraftItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const { addToast } = useToast();

  useEffect(() => {
    const allProducts = db.getProducts();
    setProducts(allProducts);
    
    // Check for saved draft first
    const savedDraft = db.getReplenishmentDraft();
    if (savedDraft && savedDraft.length > 0) {
        setOrderItems(savedDraft);
    } else {
        // Auto-populate with out of stock items if no draft
        generateInitialOrder(allProducts);
    }
  }, []);

  const generateInitialOrder = (allProducts: Product[]) => {
      const initialOrder = allProducts
        .filter(p => p.type !== 'service' && p.stock < (p.minStockLevel || 5))
        .map(p => {
            const threshold = p.minStockLevel || 5;
            // Suggested quantity: Order enough to double the threshold or at least 10
            const suggestQty = Math.max(10, threshold * 2) - p.stock;
            
            return {
                productId: p.id,
                productName: p.name,
                quantity: Math.ceil(suggestQty),
                unit: p.unit,
                rate: p.purchasePrice,
                amount: Math.ceil(suggestQty) * p.purchasePrice,
                currentStock: p.stock,
                threshold: threshold
            };
        });
    setOrderItems(initialOrder);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowProductSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdateQty = (idx: number, qty: number) => {
      const newItems = [...orderItems];
      const q = Math.max(0, qty);
      newItems[idx] = { 
          ...newItems[idx], 
          quantity: q, 
          amount: q * newItems[idx].rate 
      };
      setOrderItems(newItems);
  };

  const handleRemove = (idx: number) => {
      setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleAddProduct = (p: Product) => {
      if (orderItems.some(i => i.productId === p.id)) return;
      
      const newItem: OrderDraftItem = {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unit: p.unit,
          rate: p.purchasePrice,
          amount: p.purchasePrice,
          currentStock: p.stock,
          threshold: p.minStockLevel || 0
      };
      setOrderItems([...orderItems, newItem]);
      setShowProductSearch(false);
      setSearchTerm('');
  };

  const handleSaveDraft = () => {
      db.updateReplenishmentDraft(orderItems);
      addToast('Draft saved successfully', 'success');
  };

  const handleRefreshFromInventory = () => {
      setIsRefreshing(true);
      setTimeout(() => {
          const allProducts = db.getProducts();
          generateInitialOrder(allProducts);
          setIsRefreshing(false);
          addToast('Inventory re-scanned. Order list updated.', 'info');
      }, 600);
  };

  const handleExport = () => {
    const data = orderItems.map((item, idx) => ({
        'S.N.': idx + 1,
        'Item Details': item.productName,
        'Current Stock': item.currentStock,
        'Threshold': item.threshold,
        'Order Quantity': item.quantity,
        'Unit': item.unit,
        'Buy Rate': item.rate,
        'Estimated Subtotal': item.amount
    }));
    exportToExcel(data, 'Auto_Order_Sheet');
  };

  const handlePrint = () => {
    const columns = ['S.N.', 'Item Details', 'Stock', 'Order Qty', 'Unit', 'Rate', 'Total'];
    const rows = orderItems.map((item, idx) => [
        idx + 1,
        item.productName,
        item.currentStock,
        item.quantity,
        item.unit,
        formatCurrency(item.rate),
        formatCurrency(item.amount)
    ]);
    printData('Purchase Replenishment Order Sheet', columns, rows);
  };

  const handleConvert = () => {
      if (orderItems.length === 0) return;
      if (onConvert) {
          onConvert(orderItems.map(({ currentStock, threshold, ...rest }) => rest));
          db.clearReplenishmentDraft();
      }
  };

  const totalOrderValue = orderItems.reduce((sum, i) => sum + i.amount, 0);
  const filteredSearch = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
       {/* Header */}
       <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-500" />
                Auto-Order Manager
            </h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block mr-2">
                 <p className="text-[10px] text-gray-500 uppercase font-bold">Est. Purchase Total</p>
                 <p className="text-lg font-bold text-brand-600">{formatCurrency(totalOrderValue)}</p>
             </div>
             
             <div className="flex items-center gap-2 pr-2 border-r border-gray-200">
                <button 
                   onClick={handleRefreshFromInventory}
                   className="p-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-all border border-gray-200"
                   title="Check Inventory for Fresh Order"
                >
                   <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                   onClick={handleSaveDraft}
                   disabled={orderItems.length === 0}
                   className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                   title="Save Edited Draft"
                >
                   <Save className="w-5 h-5" />
                </button>
                <button 
                   onClick={handleExport}
                   disabled={orderItems.length === 0}
                   className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                   title="Export to Excel"
                >
                   <FileSpreadsheet className="w-5 h-5" />
                </button>
                <button 
                   onClick={handlePrint}
                   disabled={orderItems.length === 0}
                   className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                   title="Print Order Sheet"
                >
                   <Printer className="w-5 h-5" />
                </button>
             </div>

             <button 
                onClick={handleConvert}
                disabled={orderItems.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all active:scale-95"
             >
                <Zap className="w-4 h-4 fill-current" />
                <span className="hidden md:inline">Convert to Purchase Bill</span>
                <span className="md:hidden">Bill</span>
             </button>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
          
          {/* Instruction & Search */}
          <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3 text-sm text-gray-600">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p>Listing items below <b>reorder thresholds</b>. Adjust quantities and convert to a purchase bill.</p>
             </div>
             
             <div className="relative w-full sm:w-80" ref={searchWrapperRef}>
                <input 
                    type="text"
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Search additional items..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowProductSearch(true); }}
                    onFocus={() => setShowProductSearch(true)}
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                
                {showProductSearch && searchTerm && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                        {filteredSearch.map(p => (
                            <div 
                                key={p.id}
                                className="p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                onClick={() => handleAddProduct(p)}
                            >
                                <div>
                                    <div className="font-bold text-sm text-gray-800">{p.name}</div>
                                    <div className="text-xs text-gray-500">Stock: {p.stock} {p.unit}</div>
                                </div>
                                <Plus className="w-4 h-4 text-brand-500" />
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>

          {/* Items Table */}
          <div className="flex-1 overflow-auto p-4">
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                      <tr>
                         <th className="px-6 py-4">Item Details</th>
                         <th className="px-6 py-4 text-center">Status</th>
                         <th className="px-6 py-4 text-center">Order Qty</th>
                         <th className="px-6 py-4 text-right">Buy Price</th>
                         <th className="px-6 py-4 text-right">Subtotal</th>
                         <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {orderItems.map((item, idx) => (
                        <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4">
                              <div className="font-bold text-gray-800">{item.productName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {item.productId}</div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                 <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${item.currentStock < item.threshold ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                                    STOCK: {item.currentStock}
                                 </span>
                                 <span className="text-[9px] text-gray-400 uppercase mt-1">Threshold: {item.threshold}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                 <input 
                                    type="number"
                                    min="0"
                                    className="w-20 border border-gray-300 rounded-lg p-1.5 text-center font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                                 />
                                 <span className="text-xs text-gray-400 uppercase">{item.unit}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right text-gray-600">
                              {formatCurrency(item.rate)}
                           </td>
                           <td className="px-6 py-4 text-right font-bold text-gray-900">
                              {formatCurrency(item.amount)}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => handleRemove(idx)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      ))}
                      {orderItems.length === 0 && (
                        <tr>
                           <td colSpan={6} className="text-center py-24 text-gray-400">
                              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p className="font-medium">All items are above their reorder levels.</p>
                              <p className="text-xs mt-1">Great job on stock management!</p>
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Reports;
