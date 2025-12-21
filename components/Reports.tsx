
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { Transaction, Party, Product, BusinessProfile, TransactionItem, ServiceJob } from '../types';
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
  X,
  ChevronDown,
  PieChart,
  Percent,
  DollarSign,
  AlertCircle,
  Package,
  History,
  Wrench
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
      case 'DASHBOARD': return <ReportsDashboard onNavigate={setActiveReport} />;
      case 'SALES': return <TransactionReport title="Sales Report" type="SALE" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PURCHASE': return <TransactionReport title="Purchase Report" type="PURCHASE" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'SALES_RETURN': return <TransactionReport title="Sales Return Report" type="SALE_RETURN" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PURCHASE_RETURN': return <TransactionReport title="Purchase Return Report" type="PURCHASE_RETURN" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'DAY_BOOK': return <DayBookReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'ALL_TRANSACTIONS': return <TransactionReport title="All Transactions" type="ALL" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PROFIT_LOSS': return <ProfitLossReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PARTY_STATEMENT': return <PartyStatementReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'ALL_PARTY_REPORT': return <AllPartiesReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'PARTY_AGING': return <PartyAgingReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'STOCK_QUANTITY':
      case 'ITEM_LIST': return <StockReport onBack={() => setActiveReport('DASHBOARD')} />;
      case 'LOW_STOCK': return <StockReport filter="low" onBack={() => setActiveReport('DASHBOARD')} />;
      case 'OUT_OF_STOCK': return <ReplenishmentReport onBack={() => setActiveReport('DASHBOARD')} onConvert={onConvertToPurchase} />;
      default: return <ReportsDashboard onNavigate={setActiveReport} />;
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-full mx-auto h-full flex flex-col">
      {renderContent()}
    </div>
  );
};

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
    if (activeTab !== 'All Reports' && section.category !== activeTab) return false;
    return section.items.length > 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      <div className="flex flex-wrap gap-2">
         {['All Reports', 'Transactions', 'Parties', 'Inventory'].map((f) => (
           <button 
             key={f} 
             onClick={() => setActiveTab(f)}
             className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
               activeTab === f ? 'bg-brand-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
             }`}
           >
             {f}
           </button>
         ))}
      </div>
      {filteredSections.map((section, idx) => (
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
                         View <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                   )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

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
    
    if (type !== 'ALL') data = data.filter(t => t.type === type);
    else data = data.filter(t => t.type !== 'EXPENSE');

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
        if (t.type === 'SALE' || t.type === 'QUOTATION') profit = t.totalAmount - cost;
        else if (t.type === 'SALE_RETURN') profit = cost - t.totalAmount;
        return { ...t, profit };
    });
    setTransactions(processedData);

    if (type === 'SALE' || type === 'ALL') {
        let cogs = 0; let salesRevenue = 0;
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
        if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); expenses = expenses.filter(t => new Date(t.date) >= start); }
        if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); expenses = expenses.filter(t => new Date(t.date) <= end); }
        const totalExpense = expenses.reduce((sum, t) => sum + t.totalAmount, 0);
        const grossProfit = salesRevenue - cogs;
        const margin = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;
        const netProfit = grossProfit - totalExpense;
        setSalesMetrics({ cogs, grossProfit, margin, expense: totalExpense, netProfit });
    }
  }, [type, startDate, endDate]);

  const totalAmount = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalProfit = transactions.reduce((sum, t) => sum + t.profit, 0);

  const handleExport = () => {
    const data = transactions.map(t => ({ ...transformTransactionsForExport([t])[0], 'Bill Profit': t.profit }));
    exportToExcel(data, title.replace(/ /g, '_'));
  };

  const handlePrint = () => {
    const columns = ['Date', 'Ref No', 'Party', 'Type', 'Amount', 'Profit'];
    const rows = transactions.map(t => [formatNepaliDate(t.date), t.id, t.partyName, t.type.replace('_', ' '), formatCurrency(t.totalAmount), ['SALE', 'SALE_RETURN'].includes(t.type) ? formatCurrency(t.profit) : '-']);
    printData(title, columns, rows);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
       <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-32"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From" /></div>
             <div className="w-32"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To" /></div>
             <button onClick={handleExport} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></button>
             <button onClick={handlePrint} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Printer className="w-5 h-5" /></button>
          </div>
       </div>
       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr><th>Date</th><th>Ref No</th><th>Party</th><th>Type</th><th className="text-right">Amount</th><th className="text-right">Profit/Loss</th></tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3">{formatNepaliDate(t.date)}</td>
                     <td className="px-4 py-3 text-gray-500 font-mono">#{t.id}</td>
                     <td className="px-4 py-3 font-medium">{t.partyName}</td>
                     <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{t.type}</span></td>
                     <td className="px-4 py-3 text-right font-bold">{formatCurrency(t.totalAmount)}</td>
                     <td className={`px-4 py-3 text-right font-bold ${t.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{['SALE', 'SALE_RETURN', 'QUOTATION'].includes(t.type) ? formatCurrency(t.profit) : '-'}</td>
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
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);
    const data = db.getTransactions().filter(t => { const tDate = new Date(t.date); return tDate >= start && tDate <= end; });
    setTransactions(data);
  }, [date]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
       <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold text-gray-800">Day Book</h2></div>
          <div className="w-40"><NepaliDatePicker value={date} onChange={setDate} /></div>
       </div>
       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr><th>Time</th><th>Particulars</th><th>Type</th><th className="text-right">Amount</th></tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 font-medium">{t.partyName}</td>
                    <td className="px-4 py-3 text-xs uppercase text-gray-500">{t.type}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(t.totalAmount)}</td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

const ProfitLossReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [metrics, setMetrics] = useState<any>({ netSales: 0, grossProfit: 0, netProfit: 0, expenses: 0 });

  useEffect(() => {
    const products = db.getProducts();
    const productMap = new Map(products.map(p => [p.id, p]));
    let txs = db.getTransactions();
    if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); txs = txs.filter(t => new Date(t.date) >= s); }
    if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); txs = txs.filter(t => new Date(t.date) <= e); }
    let sales = 0; let cogs = 0; let exp = 0;
    txs.forEach(t => {
      if (t.type === 'SALE') { sales += t.totalAmount; t.items?.forEach(i => { const p = productMap.get(i.productId); if (p && p.type !== 'service') cogs += i.quantity * p.purchasePrice; }); }
      else if (t.type === 'EXPENSE') exp += t.totalAmount;
    });
    setMetrics({ netSales: sales, grossProfit: sales - cogs, netProfit: sales - cogs - exp, expenses: exp });
  }, [startDate, endDate]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full max-w-5xl mx-auto w-full">
       <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold text-gray-800">Profit & Loss</h2></div>
          <div className="flex gap-2">
            <div className="w-32"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="From" /></div>
            <div className="w-32"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="To" /></div>
          </div>
       </div>
       <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100"><p className="text-xs font-bold text-emerald-600 uppercase mb-1">Net Sales</p><h3 className="text-2xl font-black">{formatCurrency(metrics.netSales)}</h3></div>
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100"><p className="text-xs font-bold text-blue-600 uppercase mb-1">Gross Profit</p><h3 className="text-2xl font-black">{formatCurrency(metrics.grossProfit)}</h3></div>
          <div className="bg-gray-900 p-5 rounded-xl text-white"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Net Profit</p><h3 className="text-2xl font-black text-brand-400">{formatCurrency(metrics.netProfit)}</h3></div>
       </div>
    </div>
  );
};

const PartyStatementReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [bfBalance, setBfBalance] = useState(0);
  const partyWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setParties(db.getParties()); }, []);

  useEffect(() => {
    if (!selectedPartyId) { setLedgerRows([]); return; }
    const txs = db.getTransactions().filter(t => t.partyId === selectedPartyId);
    const jobs = db.getServiceJobs().filter(j => j.customerId === selectedPartyId);
    const rawRows: any[] = [];
    txs.forEach(t => {
      let debit = 0; let credit = 0;
      if (['SALE', 'PAYMENT_OUT', 'PURCHASE_RETURN'].includes(t.type)) debit = t.totalAmount;
      else if (['PURCHASE', 'PAYMENT_IN', 'SALE_RETURN'].includes(t.type)) credit = t.totalAmount;
      rawRows.push({ ...t, debit, credit, sortDate: new Date(t.date) });
    });
    jobs.forEach(job => {
        rawRows.push({ id: job.ticketNumber, date: job.date, type: 'SERVICE_BILL', debit: job.finalAmount, credit: 0, notes: `Repair: ${job.deviceModel}`, sortDate: new Date(job.date), isService: true });
        if (job.advanceAmount > 0) rawRows.push({ id: `ADV-${job.ticketNumber}`, date: job.date, type: 'PAYMENT_IN', debit: 0, credit: job.advanceAmount, notes: `Advance for ${job.ticketNumber}`, sortDate: new Date(job.date) });
    });
    rawRows.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    let running = 0;
    const final = rawRows.map(row => {
        running += (row.debit - row.credit);
        return { ...row, balance: Math.abs(running), indicator: running >= 0 ? 'Dr' : 'Cr' };
    });
    setLedgerRows(final);
  }, [selectedPartyId]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
       <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold text-gray-800">Combined Statement</h2></div>
          <div className="w-64 relative" ref={partyWrapperRef}>
             <input className="w-full p-2 border rounded-lg text-sm" placeholder="Select Party..." value={partySearchTerm} onChange={e => { setPartySearchTerm(e.target.value); setShowPartyDropdown(true); }} onFocus={() => setShowPartyDropdown(true)} />
             {showPartyDropdown && (
                <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                   {parties.filter(p => p.name.toLowerCase().includes(partySearchTerm.toLowerCase())).map(p => (
                      <div key={p.id} className="p-2 hover:bg-blue-50 cursor-pointer" onClick={() => { setSelectedPartyId(p.id); setPartySearchTerm(p.name); setShowPartyDropdown(false); }}>{p.name}</div>
                   ))}
                </div>
             )}
          </div>
       </div>
       <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-xs text-left border-collapse">
             <thead className="bg-[#0284c7] text-white"><tr><th className="p-3">Date</th><th>Type</th><th>Particulars</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead>
             <tbody className="divide-y">
                {ledgerRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 align-top">
                     <td className="p-3">{formatNepaliDate(row.date)}</td>
                     <td className="p-3 text-[10px] font-bold text-gray-400">{row.type}</td>
                     <td className="p-3">
                        <div className={`font-bold ${row.isService ? 'text-orange-600' : 'text-blue-600'}`}>{row.type.replace('_', ' ')}</div>
                        <div className="text-[10px] text-gray-500">{row.notes}</div>
                     </td>
                     <td className="p-3 text-right">{row.debit > 0 ? formatCurrency(row.debit) : ''}</td>
                     <td className="p-3 text-right">{row.credit > 0 ? formatCurrency(row.credit) : ''}</td>
                     <td className="p-3 text-right font-bold">{formatCurrency(row.balance)} {row.indicator}</td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

const AllPartiesReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const parties = db.getParties();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between"><button onClick={onBack} className="p-2 text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold">Party Balance List</h2></div>
      <div className="p-4"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3 text-right">Balance</th></tr></thead>
      <tbody>{parties.map(p => <tr key={p.id} className="border-b"><td className="p-3 font-medium">{p.name}</td><td className="p-3">{p.phone}</td><td className={`p-3 text-right font-bold ${p.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(p.balance)}</td></tr>)}</tbody></table></div>
    </div>
  );
};

const PartyAgingReport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const parties = db.getParties().filter(p => p.balance > 0);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between"><button onClick={onBack} className="p-2 text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold">Receivable Aging</h2></div>
      <div className="p-4"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-3">Name</th><th className="p-3 text-right">Balance</th><th className="p-3">Aging Status</th></tr></thead>
      <tbody>{parties.map(p => <tr key={p.id} className="border-b"><td className="p-3">{p.name}</td><td className="p-3 text-right font-bold">{formatCurrency(p.balance)}</td><td className="p-3"><span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs">Current</span></td></tr>)}</tbody></table></div>
    </div>
  );
};

const StockReport: React.FC<{ filter?: 'low', onBack: () => void }> = ({ filter, onBack }) => {
  let products = db.getProducts().filter(p => p.type !== 'service');
  if (filter === 'low') products = products.filter(p => p.stock < (p.minStockLevel || 5));
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between"><button onClick={onBack} className="p-2 text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold">{filter === 'low' ? 'Low Stock' : 'Stock Levels'}</h2></div>
      <div className="p-4"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-3">Item</th><th className="p-3">Stock</th><th className="p-3 text-right">Value (Cost)</th></tr></thead>
      <tbody>{products.map(p => <tr key={p.id} className="border-b"><td className="p-3 font-medium">{p.name}</td><td className={`p-3 font-bold ${p.stock < (p.minStockLevel || 5) ? 'text-red-500' : 'text-emerald-600'}`}>{p.stock} {p.unit}</td><td className="p-3 text-right">{formatCurrency(p.stock * p.purchasePrice)}</td></tr>)}</tbody></table></div>
    </div>
  );
};

const ReplenishmentReport: React.FC<{ onBack: () => void, onConvert?: (items: TransactionItem[]) => void }> = ({ onBack, onConvert }) => {
  const products = db.getProducts().filter(p => p.type !== 'service' && p.stock < (p.minStockLevel || 5));
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between"><button onClick={onBack} className="p-2 text-gray-500"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-xl font-bold text-gray-800">Restock Assistant</h2></div>
      <div className="p-4"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-3">Item</th><th className="p-3">Stock</th><th className="p-3">Required</th></tr></thead>
      <tbody>{products.map(p => <tr key={p.id} className="border-b"><td className="p-3">{p.name}</td><td className="p-3 text-red-500">{p.stock}</td><td className="p-3 font-black text-emerald-600">{Math.max(0, (p.minStockLevel || 5) - p.stock)}</td></tr>)}</tbody></table></div>
    </div>
  );
};

export default Reports;
