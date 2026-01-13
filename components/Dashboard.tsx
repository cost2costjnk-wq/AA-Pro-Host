
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Reminder, Transaction, Product, ServiceJob } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate, adToBs, bsToAd, BS_MONTHS, getBsMonthDays } from '../services/nepaliDateService';
import { 
  Bell, Package, Trash2, 
  Plus, TrendingUp, Wallet, Search, Clock,
  X, RefreshCw, Loader2, ArrowRight, PieChart as PieChartIcon,
  ShieldCheck, Sparkles, History, Calendar, Upload, FileJson, Database, Wrench, Activity,
  ShieldAlert, Building2, CheckCircle2, AlertCircle,
  CalendarDays
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { getDirectoryHandle, verifyPermission } from '../services/backupStorage';
import { autoBackupService } from '../services/autoBackupService';
import { useToast } from './Toast';
import NepaliDatePicker from './NepaliDatePicker';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
  const [profile, setProfile] = useState(db.getBusinessProfile());
  
  const [activeTab, setActiveTab] = useState<'payments' | 'stock' | 'personal'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

  // Backup States
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [latestBackupForCurrentYear, setLatestBackupForCurrentYear] = useState<any | null>(null);
  
  // Restore Target States
  const [pendingRestoreData, setPendingRestoreData] = useState<any | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreYearName, setRestoreYearName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dashboardFileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  
  const canBackup = authService.can('system-backup', 'edit');
  const canRestore = authService.can('system-restore', 'edit');
  const canModifyReminders = authService.can('dashboard', 'edit');

  const loadDashboardData = () => {
    try {
        const txs = db.getTransactions() || [];
        setTransactions(txs);
        setProducts(db.getProducts() || []);
        setReminders(db.getAllReminders() || []);
        setServiceJobs(db.getServiceJobs() || []);
        setProfile(db.getBusinessProfile());
        generateChartData(txs);
    } catch (e) {
        console.error("Dashboard load failed", e);
    }
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('db-updated', loadDashboardData);
    return () => window.removeEventListener('db-updated', loadDashboardData);
  }, [chartView]);

  // Escape key handler for local modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRestoreConfirm) { setShowRestoreConfirm(false); return; }
        if (showBackupModal) { setShowBackupModal(false); return; }
        if (showReminderModal) { setShowReminderModal(false); return; }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showRestoreConfirm, showBackupModal, showReminderModal]);

  const generateChartData = (txs: Transaction[]) => {
      if (!Array.isArray(txs)) return;
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
                  .filter(t => t.date && t.date.startsWith(dateStr))
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
                      if (!t.date) return false;
                      const tDate = new Date(t.date);
                      return tDate >= startAD && tDate <= endAD;
                  })
                  .reduce((acc, t) => acc + t.totalAmount, 0);
              data.push({ name: label, sales });
          });
      }
      setChartData(data);
  };

  const pieData = useMemo(() => {
    const safeProds = Array.isArray(products) ? products : [];
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    
    const productMap = new Map<string, Product>();
    safeProds.forEach(p => productMap.set(p.id, p));

    const totalSales = safeTxs.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = safeTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.totalAmount, 0);
    
    let totalCogs = 0;
    safeTxs.filter(t => t.type === 'SALE').forEach(t => {
        t.items?.forEach(item => {
            const p = productMap.get(item.productId);
            if (p && p.type !== 'service') {
                totalCogs += (item.quantity * p.purchasePrice);
            }
        });
    });

    const netProfit = Math.max(0, (totalSales - totalCogs) - totalExpenses);
    const stockValue = safeProds.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);

    return [
      { name: 'Total Sales', value: totalSales, color: '#10b981' },
      { name: 'Net Profit', value: netProfit, color: '#3b82f6' },
      { name: 'Stock Value', value: stockValue, color: '#f59e0b' }
    ];
  }, [transactions, products]);

  const servicePieData = useMemo(() => {
    const safeJobs = Array.isArray(serviceJobs) ? serviceJobs : [];
    const pending = safeJobs.filter(j => j.status === 'PENDING').length;
    const inProcess = safeJobs.filter(j => j.status === 'IN_PROGRESS').length;
    const completed = safeJobs.filter(j => j.status === 'COMPLETED').length;

    return [
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'In Process', value: inProcess, color: '#3b82f6' },
      { name: 'Completed', value: completed, color: '#10b981' }
    ];
  }, [serviceJobs]);

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
                const content = JSON.parse(await file.text());
                
                if (content.profile?.name === profile.name) {
                    backups.push({
                        id: entry.name,
                        name: entry.name,
                        handle: fileHandle,
                        date: new Date(file.lastModified),
                        companyName: content.profile?.name || 'Unknown'
                    });
                }
            }
        }
        const sorted = backups.sort((a, b) => b.date.getTime() - a.date.getTime());
        setLocalBackups(sorted.slice(0, 8));
        setLatestBackupForCurrentYear(sorted[0] || null);
    } catch (e) {
        console.error("Path scan failed", e);
    }
  };

  const handleManualBackup = async (e?: React.MouseEvent) => {
      if (!canBackup) { addToast('Permission denied', 'error'); return; }
      if (e) e.stopPropagation();
      setIsSyncing(true);
      addToast('Creating point-in-time point...', 'info');
      try {
          const success = await autoBackupService.performLocalBackup();
          if (success) {
              addToast(`Point created successfully`, 'success');
              scanLocalPath();
          } else {
              addToast('Failed to write to folder.', 'error');
          }
      } catch (err) {
          addToast('Backup engine error.', 'error');
      } finally {
          setIsSyncing(false);
      }
  };

  const startRestore = async (backup: any) => {
      if (!canRestore) { addToast('Permission denied', 'error'); return; }
      try {
          const file = await backup.handle.getFile();
          const json = JSON.parse(await file.text());
          setPendingRestoreData(json);
          setRestoreYearName(json.profile?.name || '');
          setShowRestoreConfirm(true);
      } catch (err) {
          addToast('Error reading file', 'error');
      }
  };

  const confirmRestore = async () => {
      if (!pendingRestoreData) return;
      try {
          const result = await db.restoreData(pendingRestoreData);
          if (result.success) {
              addToast('Data restored!', 'success');
              setTimeout(() => window.location.reload(), 1000);
          } else {
              addToast(result.message || 'Restoration failed', 'error');
          }
      } catch (err) {
          addToast('Integrity error', 'error');
      }
  };

  const handleDeleteReminder = (id: string) => {
     if (!authService.can('dashboard', 'delete')) { addToast('Permission denied', 'error'); return; }
     db.deleteManualReminder(id);
     setReminders(db.getAllReminders() || []);
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
        setReminders(db.getAllReminders() || []);
    }
  };

  const filteredItems = useMemo(() => {
      const term = searchTerm.toLowerCase();
      const safeProds = Array.isArray(products) ? products : [];
      const safeReminders = Array.isArray(reminders) ? reminders : [];

      if (activeTab === 'stock') {
          return safeProds.filter(p => p.type !== 'service' && (!term || p.name.toLowerCase().includes(term)) && p.stock < (p.minStockLevel || 5))
            .map(p => ({ id: p.id, title: p.name, subtitle: `Stock: ${p.stock} ${p.unit}`, type: 'stock', priority: p.stock < 1 ? 'high' : 'medium' }));
      }
      if (activeTab === 'payments') {
          return safeReminders.filter(r => ['system_due', 'party_due', 'party_deadline'].includes(r.type || '') && (!term || r.title.toLowerCase().includes(term)))
            .map(r => ({ id: r.id, title: r.title, subtitle: r.amount ? `Dues: Rs. ${formatCurrency(r.amount)}` : formatNepaliDate(r.date), type: 'payment', priority: r.priority || 'medium' }));
      }
      if (activeTab === 'personal') {
          return safeReminders.filter(r => r.type === 'manual' && (!term || r.title.toLowerCase().includes(term)))
            .map(r => ({ id: r.id, title: r.title, subtitle: `Due: ${formatNepaliDate(r.date)}`, type: 'manual', priority: r.priority || 'medium' }));
      }
      return [];
  }, [activeTab, searchTerm, products, reminders]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
       <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 px-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <TrendingUp className="w-40 h-40" />
          </div>
          
          <div className="flex items-center gap-6 z-10">
            <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-[1.5rem] flex items-center justify-center shadow-inner">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{profile.name}</h1>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> 
                Live Dashboard • {db.getActiveCompanyId()?.slice(-8)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 z-10">
             <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Today's Date (BS)</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-600">
                  <CalendarDays className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-black text-gray-700 dark:text-gray-200">{formatNepaliDate(new Date().toISOString())}</span>
                </div>
             </div>
             <button onClick={() => onNavigate('settings')} className="p-3.5 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-300 hover:text-brand-600 rounded-2xl transition-all border border-gray-100 dark:border-gray-600 hover:shadow-md active:scale-95">
                <History className="w-6 h-6" />
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[420px]">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-emerald-600" />
                       Sales Performance
                   </h3>
                   <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                       {(['daily', 'monthly'] as const).map((view) => (
                           <button key={view} onClick={() => setChartView(view)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${chartView === view ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                               {view}
                           </button>
                       ))}
                   </div>
               </div>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'white', color: '#111827' }} />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
           </div>

           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[420px] flex flex-col">
               <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                   <PieChartIcon className="w-5 h-5 text-blue-500" />
                   Health Composition
               </h3>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                              {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" />
                      </PieChart>
                  </ResponsiveContainer>
               </div>
           </div>

           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[420px] flex flex-col">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <Wrench className="w-5 h-5 text-orange-500" />
                       Service Status
                   </h3>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 rounded-full border border-brand-100 dark:border-brand-800">
                       <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></span>
                       <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase">Live</span>
                   </div>
               </div>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie 
                            data={servicePieData} 
                            cx="50%" 
                            cy="45%" 
                            innerRadius={55} 
                            outerRadius={80} 
                            paddingAngle={8} 
                            dataKey="value" 
                            stroke="none"
                            animationBegin={200}
                          >
                              {servicePieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                          </Pie>
                          <Tooltip />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center" 
                            iconType="rect" 
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{value}</span>}
                          />
                      </PieChart>
                  </ResponsiveContainer>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm min-h-[420px] flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-500" />
                      Alerts & Reminders
                  </h3>
                  {canModifyReminders && (
                    <button onClick={() => setShowReminderModal(true)} className="text-[10px] font-black uppercase bg-brand-500 text-white px-2 py-1 rounded shadow-sm hover:bg-brand-600 transition-colors">
                        Add New Reminder
                    </button>
                  )}
              </div>

              <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  {['payments', 'stock', 'personal'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-[9px] font-black uppercase text-center border-b-2 transition-all ${activeTab === tab ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50/20 dark:bg-brand-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                        {tab.replace('personal', 'manual')}
                    </button>
                  ))}
              </div>

              <div className="p-3 border-b border-gray-50 dark:border-gray-700 flex gap-3">
                  <div className="relative flex-1">
                      <input type="text" className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none dark:text-white" placeholder="Filter alerts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-200 dark:hover:border-brand-500 transition-all shadow-sm">
                        <div className={`shrink-0 mt-0.5 p-2.5 rounded-xl ${item.type === 'stock' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : item.type === 'payment' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                            {item.type === 'stock' ? <Package className="w-4 h-4" /> : item.type === 'payment' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">{item.title}</h4>
                            <div className={`text-[11px] mt-1 font-medium ${item.priority === 'high' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                <span>{item.subtitle}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {canModifyReminders && (
                                <button onClick={() => handleDeleteReminder(item.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             )}
                        </div>
                    </div>
                  ))}
              </div>
           </div>

           {/* Backup Card */}
           <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
               <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-brand-600" />
                      Local Backup Status
                  </h3>
               </div>
               <div className="p-6 space-y-6 flex-1">
                   {latestBackupForCurrentYear ? (
                       <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-start gap-3">
                           <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                           <div>
                               <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400">System is Secure</p>
                               <p className="text-[10px] text-emerald-700 dark:text-emerald-500 font-medium uppercase mt-1">Last Point: {latestBackupForCurrentYear.date.toLocaleString()}</p>
                           </div>
                       </div>
                   ) : (
                       <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl flex items-start gap-3">
                           <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                           <div>
                               <p className="text-sm font-bold text-orange-900 dark:text-orange-400">Path Not Verified</p>
                               <p className="text-[10px] text-orange-700 dark:text-orange-500 font-medium uppercase mt-1">Configure backup folder in settings</p>
                           </div>
                       </div>
                   )}

                   <div className="space-y-3">
                       <button 
                           onClick={handleManualBackup}
                           disabled={isSyncing || !canBackup}
                           className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                       >
                           {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                           Create Restore Point
                       </button>
                       <button 
                           onClick={() => onNavigate('settings')}
                           className="w-full py-3 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-gray-100 dark:border-gray-600"
                       >
                           <Activity className="w-4 h-4" />
                           Backup Settings
                       </button>
                   </div>
               </div>
           </div>
       </div>

       {/* Reminder Modal */}
       {showReminderModal && (
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
               <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                       <h3 className="font-black text-gray-800 dark:text-white uppercase tracking-tight">New Reminder</h3>
                       <button onClick={() => setShowReminderModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
                   </div>
                   <form onSubmit={handleAddReminder} className="p-8 space-y-6">
                       <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reminder Title</label>
                           <input required autoFocus className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white" value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} placeholder="e.g. Call client for payment" />
                       </div>
                       <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Date (BS)</label>
                           <NepaliDatePicker value={newReminder.date} onChange={d => setNewReminder({...newReminder, date: d})} />
                       </div>
                       <button type="submit" className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-500/30 hover:bg-brand-700 active:scale-[0.98] transition-all">Save Reminder</button>
                   </form>
               </div>
           </div>
       )}

       {/* Restore Confirm Modal */}
       {showRestoreConfirm && (
           <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
               <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                   <div className="p-10 text-center">
                       <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                           <ShieldAlert className="w-10 h-10" />
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">System Restore</h3>
                       <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Restore snapshot for <b>{restoreYearName}</b>?</p>
                       <p className="text-[10px] text-red-500 font-bold uppercase mt-4">Warning: Current local data will be replaced.</p>
                       
                       <div className="mt-8 space-y-3">
                           <button onClick={confirmRestore} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-[0.98]">Confirm Restore</button>
                           <button onClick={() => setShowRestoreConfirm(false)} className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors">Cancel</button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default Dashboard;
