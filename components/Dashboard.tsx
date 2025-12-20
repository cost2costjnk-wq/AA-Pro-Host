
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Reminder, Transaction, Product } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate, adToBs, bsToAd, BS_MONTHS, getBsMonthDays } from '../services/nepaliDateService';
import { 
  Bell, Package, AlertTriangle, AlertCircle, Calendar, Trash2, 
  ArrowUpRight, ArrowDownLeft, 
  Users, ShoppingCart, Plus, TrendingUp, Wallet, CheckCircle2, Search, Filter, Clock,
  X, RefreshCw, Database, Cloud, FileJson, Loader2, ArrowRight, CloudUpload, PieChart as PieChartIcon,
  ShieldCheck, HardDrive
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { getDirectoryHandle, verifyPermission } from '../services/backupStorage';
import { cloudService } from '../services/cloudService';
import { autoBackupService } from '../services/autoBackupService';
import { useToast } from './Toast';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [activeTab, setActiveTab] = useState<'payments' | 'stock' | 'personal'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

  // Sync Modal States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [chartView]);

  const loadDashboardData = () => {
    const txs = db.getTransactions();
    setTransactions(txs);
    setProducts(db.getProducts());
    setReminders(db.getAllReminders());
    generateChartData(txs);
  };

  const generateChartData = (txs: Transaction[]) => {
      let data: any[] = [];
      const today = new Date();
      const salesTransactions = txs.filter(t => t.type === 'SALE');

      if (chartView === 'daily') {
          for (let i = 29; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              const dateStr = d.toISOString().split('T')[0];
              const bs = adToBs(d);
              const label = `${BS_MONTHS[bs.month - 1].substring(0, 3)} ${bs.day}`;
              const sales = salesTransactions
                  .filter(t => t.date.startsWith(dateStr))
                  .reduce((acc, t) => acc + t.totalAmount, 0);
              data.push({ name: label, sales });
          }
      } else if (chartView === 'monthly') {
          const currentBs = adToBs(today);
          let viewYear = currentBs.year;
          let viewMonth = currentBs.month;
          const buckets = [];
          for(let i=0; i<12; i++) {
              buckets.unshift({ year: viewYear, month: viewMonth });
              viewMonth--;
              if(viewMonth < 1) { viewMonth = 12; viewYear--; }
          }
          buckets.forEach(bucket => {
              const daysInMonth = getBsMonthDays(bucket.year, bucket.month - 1);
              const startAD = bsToAd(bucket.year, bucket.month, 1);
              const endAD = bsToAd(bucket.year, bucket.month, daysInMonth);
              startAD.setHours(0,0,0,0);
              endAD.setHours(23,59,59,999);
              const label = `${BS_MONTHS[bucket.month - 1].substring(0, 3)} ${bucket.year}`;
              const sales = salesTransactions
                  .filter(t => {
                      const tDate = new Date(t.date);
                      return tDate >= startAD && tDate <= endAD;
                  })
                  .reduce((acc, t) => acc + t.totalAmount, 0);
              data.push({ name: label, sales });
          });
      }
      setChartData(data);
  };

  // Pie Chart Data Calculation
  const pieData = useMemo(() => {
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));

    const totalSales = transactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.totalAmount, 0);
    
    let totalCogs = 0;
    transactions.filter(t => t.type === 'SALE').forEach(t => {
        t.items?.forEach(item => {
            const p = productMap.get(item.productId);
            if (p && p.type !== 'service') {
                totalCogs += (item.quantity * p.purchasePrice);
            }
        });
    });

    const netProfit = Math.max(0, (totalSales - totalCogs) - totalExpenses);
    const stockValue = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);

    return [
      { name: 'Total Sales', value: totalSales, color: '#10b981' },
      { name: 'Net Profit', value: netProfit, color: '#3b82f6' },
      { name: 'Stock Value', value: stockValue, color: '#f59e0b' }
    ];
  }, [transactions, products]);

  const scanLocalPath = async () => {
    try {
        const handle = await getDirectoryHandle();
        if (!handle) return;
        const hasPermission = await verifyPermission(handle, false);
        if (!hasPermission) return;

        const backups: any[] = [];
        // @ts-ignore
        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name.includes('AAPro')) {
                const fileHandle = entry as FileSystemFileHandle;
                const file = await fileHandle.getFile();
                backups.push({
                    id: entry.name,
                    name: entry.name,
                    handle: fileHandle,
                    date: new Date(file.lastModified)
                });
            }
        }
        setLocalBackups(backups.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5));
    } catch (e) {
        console.error("Path scan failed", e);
    }
  };

  const handleManualSync = async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setIsSyncing(true);
      addToast('Syncing system state...', 'info');
      try {
          const localSuccess = await autoBackupService.performLocalBackup();
          const config = db.getCloudConfig();
          let cloudMsg = "";
          if (config.googleClientId) {
              const fileName = `AAPro_Manual_${db.getBusinessProfile().name.replace(/\s+/g, '_')}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
              const content = JSON.stringify(db.getBackupData(), null, 2);
              const res = await cloudService.uploadBackup(fileName, content);
              if (res.success) cloudMsg = " & Cloud Sync Complete";
          }

          if (localSuccess) {
              addToast(`Manual backup saved to path${cloudMsg}`, 'success');
              scanLocalPath();
          } else {
              addToast('Local path backup failed. Check permissions in Settings.', 'error');
          }
      } catch (err) {
          addToast('Sync failed. Check connection and folder access.', 'error');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleRestore = async (backup: any) => {
      if (!window.confirm(`RESTORE DATA: This will replace all current data with the state from ${backup.name}. Continue?`)) return;
      
      try {
          const file = await backup.handle.getFile();
          const json = JSON.parse(await file.text());
          const result = await db.restoreData(json);
          if (result.success) {
              addToast('Data integrity restored successfully!', 'success');
              setTimeout(() => window.location.reload(), 1000);
          } else {
              addToast(result.message || 'Restoration failed', 'error');
          }
      } catch (err) {
          addToast('Error reading backup file', 'error');
      }
  };

  const handleDeleteReminder = (id: string) => {
     db.deleteManualReminder(id);
     setReminders(db.getAllReminders());
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if(newReminder.title) {
        db.addManualReminder({
            id: Date.now().toString(),
            title: newReminder.title,
            date: new Date(newReminder.date).toISOString(),
            type: 'manual',
            priority: 'medium'
        });
        setShowReminderModal(false);
        setNewReminder({ title: '', date: new Date().toISOString().split('T')[0] });
        setReminders(db.getAllReminders());
    }
  };

  const itemsToShow = (searchTerm: string) => {
      const term = searchTerm.toLowerCase();
      if (activeTab === 'stock') {
          return products.filter(p => p.type !== 'service' && (!term || p.name.toLowerCase().includes(term)) && p.stock < (p.minStockLevel || 5))
            .map(p => ({ id: p.id, title: p.name, subtitle: `Stock: ${p.stock} ${p.unit}`, type: 'stock', priority: p.stock < 1 ? 'high' : 'medium' }));
      }
      if (activeTab === 'payments') {
          return reminders.filter(r => ['system_due', 'party_due', 'party_deadline'].includes(r.type || '') && (!term || r.title.toLowerCase().includes(term)))
            .map(r => ({ id: r.id, title: r.title, subtitle: r.amount ? `Dues: Rs. ${formatCurrency(r.amount)}` : formatNepaliDate(r.date), type: 'payment', priority: r.priority || 'medium' }));
      }
      if (activeTab === 'personal') {
          return reminders.filter(r => r.type === 'manual' && (!term || r.title.toLowerCase().includes(term)))
            .map(r => ({ id: r.id, title: r.title, subtitle: `Due: ${formatNepaliDate(r.date)}`, type: 'manual', priority: r.priority || 'medium' }));
      }
      return [];
  };

  const filteredItems = itemsToShow(searchTerm);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
       {/* Analytics Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Main Sales Area Chart */}
           <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[420px]">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-emerald-600" />
                       Sales Performance
                   </h3>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                       {(['daily', 'monthly'] as const).map((view) => (
                           <button key={view} onClick={() => setChartView(view)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${chartView === view ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                               {view}
                           </button>
                       ))}
                   </div>
               </div>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} dy={10} interval={chartView === 'daily' ? 3 : 0} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} tickFormatter={(val) => `k ${(val/1000).toFixed(0)}`} />
                        <Tooltip cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [formatCurrency(value), 'Sales']} />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
           </div>

           {/* Business Health Pie Chart */}
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[420px] flex flex-col">
               <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                   <PieChartIcon className="w-5 h-5 text-blue-500" />
                   Health Composition
               </h3>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                          >
                              {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)} 
                            contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold' }} 
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center" 
                            iconType="circle" 
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px', textTransform: 'uppercase' }} 
                          />
                      </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-2 pt-4 border-t border-gray-50 flex justify-between">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Revenue</p>
                    <p className="text-xs font-bold text-emerald-600">Stable</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inventory</p>
                    <p className="text-xs font-bold text-orange-500">Solid</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capital</p>
                    <p className="text-xs font-bold text-blue-600">Active</p>
                  </div>
               </div>
           </div>

           {/* Alerts Column */}
           <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[420px] flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-500" />
                      Alerts
                  </h3>
                  <button onClick={() => setShowReminderModal(true)} className="text-[10px] font-black uppercase bg-brand-500 text-white px-2 py-1 rounded shadow-sm hover:bg-brand-600 transition-colors">
                      Add New
                  </button>
              </div>

              <div className="flex border-b border-gray-100 bg-white">
                  {['payments', 'stock', 'personal'].map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab as any); setSearchTerm(''); }} className={`flex-1 py-3 text-[9px] font-black uppercase text-center border-b-2 transition-colors ${activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab.replace('personal', 'manual')}
                    </button>
                  ))}
              </div>

              <div className="p-3 border-b border-gray-50">
                  <div className="relative">
                      <input type="text" className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Filter..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-brand-200 transition-all shadow-sm">
                            <div className={`shrink-0 mt-0.5 p-2 rounded-lg ${item.type === 'stock' ? 'bg-red-50 text-red-600' : item.type === 'payment' ? (item.priority === 'high' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-orange-50 text-orange-600') : 'bg-blue-50 text-blue-600'}`}>
                                {item.type === 'stock' ? <Package className="w-3.5 h-3.5" /> : item.type === 'payment' ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-xs font-bold text-gray-800 truncate">{item.title}</h4>
                                    <button onClick={() => handleDeleteReminder(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                                </div>
                                <div className={`text-[10px] mt-0.5 font-medium ${item.priority === 'high' ? 'text-red-600' : 'text-gray-500'}`}>
                                    <span>{item.subtitle}</span>
                                </div>
                            </div>
                        </div>
                      ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-10 opacity-50">
                       <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500" />
                       <p className="font-bold">Clear</p>
                    </div>
                  )}
              </div>
           </div>
       </div>
       
       {/* Data Integrity Utilities (Organized) */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <button 
             onClick={() => { setShowSyncModal(true); scanLocalPath(); }} 
             className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between hover:bg-indigo-100 transition-all group shadow-sm active:scale-[0.99]"
           >
               <div className="flex items-center gap-5">
                  <div className="bg-white p-4 rounded-2xl text-indigo-600 shadow-md group-hover:scale-110 transition-transform"><RefreshCw className="w-8 h-8" /></div>
                  <div className="text-left">
                    <span className="font-black text-indigo-900 uppercase text-xs tracking-widest block mb-1">Database Sync</span>
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">CLOUD & PATH MANAGEMENT</span>
                  </div>
               </div>
               <ArrowRight className="w-6 h-6 text-indigo-300 group-hover:translate-x-1 transition-transform" />
           </button>

           <button 
             onClick={handleManualSync}
             disabled={isSyncing}
             className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between hover:bg-emerald-100 transition-all group shadow-sm active:scale-[0.99] disabled:opacity-50"
           >
               <div className="flex items-center gap-5">
                  <div className="bg-white p-4 rounded-2xl text-emerald-600 shadow-md group-hover:scale-110 transition-transform">
                      {isSyncing ? <Loader2 className="w-8 h-8 animate-spin" /> : <CloudUpload className="w-8 h-8" />}
                  </div>
                  <div className="text-left">
                    <span className="font-black text-emerald-900 uppercase text-xs tracking-widest block mb-1">Quick Backup</span>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">IMMEDIATE SYSTEM SNAPSHOT</span>
                  </div>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" /> Secure
               </div>
           </button>
       </div>

       {/* Sync / Restore Modal */}
       {showSyncModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-indigo-100 dark:border-indigo-900/30">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
                    <Database className="absolute -right-4 -top-4 w-32 h-32 opacity-10 rotate-12" />
                    <div className="relative z-10">
                        <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><RefreshCw className="w-6 h-6" /> Cloud Sync & Recovery</h3>
                        <p className="text-indigo-100 text-xs font-medium mt-1">Protect your data with path-based backups and instant restores.</p>
                    </div>
                    <button onClick={() => setShowSyncModal(false)} className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            disabled={isSyncing}
                            onClick={handleManualSync}
                            className="flex flex-col items-center justify-center p-6 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800/40 rounded-2xl hover:bg-indigo-100 transition-all group active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
                            ) : (
                                <Cloud className="w-10 h-10 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="font-black text-indigo-900 dark:text-indigo-300 uppercase text-xs">Sync Now</span>
                            <span className="text-[10px] text-indigo-500 mt-1">PUSH TO CLOUD & PATH</span>
                        </button>
                        <div className="flex flex-col p-6 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-2xl">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">System Status</span>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Auto Backup:</span><span className={db.getCloudConfig().autoBackup ? 'text-emerald-600' : 'text-red-400'}>{db.getCloudConfig().autoBackup ? 'ACTIVE' : 'OFF'}</span></div>
                                <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Last Sync:</span><span className="text-gray-800 dark:text-gray-200">{db.getCloudConfig().lastBackup ? formatNepaliDate(db.getCloudConfig().lastBackup) : 'Never'}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Backups in Path</h4>
                            <button onClick={scanLocalPath} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Refresh List</button>
                        </div>
                        {localBackups.length > 0 ? (
                            <div className="space-y-2">
                                {localBackups.map((backup, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-indigo-300 transition-all group shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                                                <FileJson className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate max-w-[200px]">{backup.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{backup.date.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRestore(backup)}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2"
                                        >
                                            Restore <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl text-center">
                                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-medium">No valid AAPro backups found in configured path.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <p className="text-[10px] text-gray-400 leading-tight pr-10 italic">* Integrity Restore replaces all local data. Sync pushes current state to Google Drive and your Local Backup Path.</p>
                    <button onClick={() => onNavigate('settings')} className="text-[10px] font-black text-indigo-600 uppercase whitespace-nowrap hover:underline">Change Path</button>
                </div>
             </div>
          </div>
       )}

       {showReminderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
             <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg text-gray-800 uppercase flex items-center gap-2"><Plus className="w-5 h-5 text-brand-500" /> New Reminder</h3>
                    <button onClick={() => setShowReminderModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddReminder} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Title / Details</label>
                        <input autoFocus required className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Call Rajesh for payment" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Reminder Date</label>
                        <input type="date" required className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowReminderModal(false)} className="px-5 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-8 py-2.5 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 shadow-lg shadow-brand-600/20 active:scale-95 transition-all">Create</button>
                    </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Dashboard;
