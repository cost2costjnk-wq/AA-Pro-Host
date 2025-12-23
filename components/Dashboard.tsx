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
  ShieldCheck, Sparkles, History, Calendar, Upload, FileJson, Database, Wrench, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { getDirectoryHandle, verifyPermission } from '../services/backupStorage';
import { autoBackupService } from '../services/autoBackupService';
import { useToast } from './Toast';

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
  
  const [activeTab, setActiveTab] = useState<'payments' | 'stock' | 'personal'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

  // Backup States
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [latestBackup, setLatestBackup] = useState<any | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dashboardFileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const userRole = authService.getUserRole();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  useEffect(() => {
    loadDashboardData();
  }, [chartView]);

  const loadDashboardData = () => {
    const txs = db.getTransactions();
    setTransactions(txs);
    setProducts(db.getProducts());
    setReminders(db.getAllReminders());
    setServiceJobs(db.getServiceJobs());
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

  const servicePieData = useMemo(() => {
    const pending = serviceJobs.filter(j => j.status === 'PENDING').length;
    const inProcess = serviceJobs.filter(j => j.status === 'IN_PROGRESS').length;
    const completed = serviceJobs.filter(j => j.status === 'COMPLETED').length;

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
                backups.push({
                    id: entry.name,
                    name: entry.name,
                    handle: fileHandle,
                    date: new Date(file.lastModified)
                });
            }
        }
        const sorted = backups.sort((a, b) => b.date.getTime() - a.date.getTime());
        setLocalBackups(sorted.slice(0, 5));
        if (sorted.length > 0) setLatestBackup(sorted[0]);
        else setLatestBackup(null);
    } catch (e) {
        console.error("Path scan failed", e);
    }
  };

  const handleManualBackup = async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setIsSyncing(true);
      addToast('Creating backup...', 'info');
      try {
          const success = await autoBackupService.performLocalBackup();
          if (success) {
              addToast(`System backed up to local path`, 'success');
              scanLocalPath();
          } else {
              addToast('Backup failed. Check permissions in Settings.', 'error');
          }
      } catch (err) {
          addToast('Backup failed.', 'error');
      } finally {
          setIsSyncing(false);
      }
  };

  const handleRestore = async (backup: any) => {
      if (!window.confirm(`RESTORE DATA: Replace all local data with state from ${backup.name}?`)) return;
      try {
          const file = await backup.handle.getFile();
          const json = JSON.parse(await file.text());
          const result = await db.restoreData(json);
          if (result.success) {
              addToast('Integrity restored!', 'success');
              setTimeout(() => window.location.reload(), 1000);
          } else {
              addToast(result.message || 'Restoration failed', 'error');
          }
      } catch (err) {
          addToast('Error reading backup', 'error');
      }
  };

  const handleFileUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Restore system from file "${file.name}"? This will overwrite all current data.`)) {
        if (e.target) e.target.value = '';
        return;
    }

    try {
        const text = await file.text();
        const json = JSON.parse(text);
        
        // Basic validation
        if (!json.transactions || !json.products || !json.parties) {
            throw new Error("Invalid backup file format.");
        }

        const result = await db.restoreData(json);
        if (result.success) {
            addToast('System restored successfully!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            addToast(result.message || 'Restoration failed', 'error');
        }
    } catch (err: any) {
        addToast(err.message || 'Failed to parse backup file', 'error');
    } finally {
        if (e.target) e.target.value = '';
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

  const filteredItems = useMemo(() => {
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
  }, [activeTab, searchTerm, products, reminders]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Sales Performance Chart */}
           <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[420px]">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-emerald-600" />
                       Sales Performance
                   </h3>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                       {(['daily', 'monthly'] as const).map((view) => (
                           <button key={view} onClick={() => setChartView(view)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${chartView === view ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
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
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
           </div>

           {/* Health Composition Chart */}
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[420px] flex flex-col">
               <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
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

           {/* Service Center Distribution Chart */}
           <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[420px] flex flex-col">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <Wrench className="w-5 h-5 text-orange-500" />
                       Service Status
                   </h3>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 rounded-full border border-brand-100">
                       <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></span>
                       <span className="text-[9px] font-black text-brand-600 uppercase">Live</span>
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
                            formatter={(value) => <span className="text-[10px] font-bold uppercase text-gray-500">{value}</span>}
                          />
                      </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-50 flex justify-center gap-6">
                   <div className="text-center">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Pending</p>
                       <p className="text-sm font-black text-orange-600">{serviceJobs.filter(j => j.status === 'PENDING').length}</p>
                   </div>
                   <div className="text-center">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Process</p>
                       <p className="text-sm font-black text-blue-600">{serviceJobs.filter(j => j.status === 'IN_PROGRESS').length}</p>
                   </div>
                   <div className="text-center">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Done</p>
                       <p className="text-sm font-black text-brand-600">{serviceJobs.filter(j => j.status === 'COMPLETED').length}</p>
                   </div>
               </div>
           </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Alerts & Reminders */}
           <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[420px] flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-500" />
                      Alerts & Reminders
                  </h3>
                  <button onClick={() => setShowReminderModal(true)} className="text-[10px] font-black uppercase bg-brand-500 text-white px-2 py-1 rounded shadow-sm hover:bg-brand-600 transition-colors">
                      Add New Reminder
                  </button>
              </div>

              <div className="flex border-b border-gray-100 bg-white">
                  {['payments', 'stock', 'personal'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-[9px] font-black uppercase text-center border-b-2 transition-all ${activeTab === tab ? 'border-brand-500 text-brand-600 bg-brand-50/20' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab.replace('personal', 'manual')}
                    </button>
                  ))}
              </div>

              <div className="p-3 border-b border-gray-50 flex gap-3">
                  <div className="relative flex-1">
                      <input type="text" className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Filter alerts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-brand-200 transition-all shadow-sm">
                        <div className={`shrink-0 mt-0.5 p-2.5 rounded-xl ${item.type === 'stock' ? 'bg-red-50 text-red-600' : item.type === 'payment' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                            {item.type === 'stock' ? <Package className="w-4 h-4" /> : item.type === 'payment' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-sm font-bold text-gray-800 truncate">{item.title}</h4>
                            <div className={`text-[11px] mt-1 font-medium ${item.priority === 'high' ? 'text-red-600' : 'text-gray-500'}`}>
                                <span>{item.subtitle}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={() => handleDeleteReminder(item.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg group-hover:opacity-100 transition-all opacity-0"><Trash2 className="w-4 h-4" /></button>
                             <div className={`w-2 h-2 rounded-full ${item.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-gray-200'}`}></div>
                        </div>
                    </div>
                  ))}
                  {filteredItems.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                          <Activity className="w-12 h-12 opacity-10 mb-2" />
                          <p className="text-sm font-medium">No alerts for this section</p>
                      </div>
                  )}
              </div>
           </div>

           {/* Backup & Restore Column - Hidden for staff roles */}
           <div className="space-y-6">
                {isAdmin ? (
                    <>
                        <button onClick={() => { setShowBackupModal(true); scanLocalPath(); }} className="w-full bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between hover:bg-indigo-100 transition-all group shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="bg-white p-4 rounded-2xl text-indigo-600 shadow-md group-hover:scale-110 transition-transform"><History className="w-8 h-8" /></div>
                                <div className="text-left">
                                    <span className="font-black text-indigo-900 uppercase text-xs tracking-widest block mb-1">Local Backups</span>
                                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">RESTORE FROM HISTORY</span>
                                </div>
                            </div>
                            <ArrowRight className="w-6 h-6 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button onClick={() => dashboardFileInputRef.current?.click()} className="w-full bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between hover:bg-blue-100 transition-all group shadow-sm active:scale-[0.99]">
                            <input type="file" accept=".json" ref={dashboardFileInputRef} className="hidden" onChange={handleFileUploadRestore} />
                            <div className="flex items-center gap-5">
                                <div className="bg-white p-4 rounded-2xl text-blue-600 shadow-md group-hover:scale-110 transition-transform"><Database className="w-8 h-8" /></div>
                                <div className="text-left">
                                    <span className="font-black text-blue-900 uppercase text-xs tracking-widest block mb-1">Restore Data</span>
                                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">UPLOAD BACKUP FILE</span>
                                </div>
                            </div>
                            <Upload className="w-6 h-6 text-blue-300 group-hover:-translate-y-1 transition-transform" />
                        </button>

                        <button onClick={handleManualBackup} disabled={isSyncing} className="w-full bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between hover:bg-emerald-100 transition-all group shadow-sm active:scale-[0.99] disabled:opacity-50">
                            <div className="flex items-center gap-5">
                                <div className="bg-white p-4 rounded-2xl text-emerald-600 shadow-md group-hover:scale-110 transition-transform">
                                    {isSyncing ? <Loader2 className="w-8 h-8 animate-spin" /> : <RefreshCw className="w-8 h-8" />}
                                </div>
                                <div className="text-left">
                                    <span className="font-black text-emerald-900 uppercase text-xs tracking-widest block mb-1">Quick Backup</span>
                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">IMMEDIATE SNAPSHOT</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                                <ShieldCheck className="w-3 h-3" /> Secure
                            </div>
                        </button>
                    </>
                ) : (
                    <div className="bg-gray-100/50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                        <Activity className="w-12 h-12 text-gray-300 mb-4" />
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Workspace Insights</h4>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Additional analytics are restricted based on your staff role.</p>
                    </div>
                )}
           </div>
       </div>

       {showBackupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><History className="w-6 h-6" /> System Restore Center</h3>
                        <p className="text-indigo-100 text-xs font-medium mt-1">Manage local points and external backup files.</p>
                    </div>
                    <button onClick={() => setShowBackupModal(false)} className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button disabled={isSyncing} onClick={handleManualBackup} className="flex flex-col items-center justify-center p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all group disabled:opacity-50">
                            {isSyncing ? <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" /> : <RefreshCw className="w-10 h-10 text-emerald-600 mb-3 group-hover:scale-110" />}
                            <span className="font-black text-emerald-900 uppercase text-xs">Create Backup</span>
                        </button>
                        
                        <div>
                            <input 
                                type="file" 
                                accept=".json" 
                                ref={fileInputRef} 
                                className="hidden"
                                onChange={handleFileUploadRestore} 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:bg-blue-100 transition-all group"
                            >
                                <Upload className="w-10 h-10 text-blue-600 mb-3 group-hover:scale-110" />
                                <span className="font-black text-blue-900 uppercase text-xs">Upload & Restore</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock className="w-3 h-3" /> Current Status</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Auto Backup:</span><span className="text-emerald-600 uppercase">{db.getCloudConfig().autoBackup ? 'Active' : 'Disabled'}</span></div>
                            <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Last Point:</span><span className="text-gray-800">{db.getCloudConfig().lastBackup ? formatNepaliDate(db.getCloudConfig().lastBackup) : 'Never'}</span></div>
                        </div>
                    </div>

                    {latestBackup && (
                        <div className="bg-brand-50 border-2 border-brand-200 p-5 rounded-3xl animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Most Recent Point</h4>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-500 shadow-sm border border-brand-100"><FileJson className="w-6 h-6" /></div>
                                    <div className="text-left overflow-hidden">
                                        <p className="font-black text-gray-900 truncate max-w-[180px]">{latestBackup.name}</p>
                                        <p className="text-xs text-gray-500 font-medium">{latestBackup.date.toLocaleString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleRestore(latestBackup)} className="px-6 py-3 bg-brand-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-2">
                                    Quick Restore <RefreshCw className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
          </div>
       )}

       {showReminderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
             <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg text-gray-800 uppercase flex items-center gap-2"><Plus className="w-5 h-5 text-brand-500" /> New Reminder</h3>
                    <button onClick={() => setShowReminderModal(false)} className="text-gray-400 hover:text-gray-600"><X className="text-gray-500 w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddReminder} className="space-y-4">
                    <input autoFocus required className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none" value={newReminder.title} onChange={e => setNewReminder({...newReminder, title: e.target.value})} placeholder="Title..." />
                    <input type="date" required className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none" value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} />
                    <button type="submit" className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold">Create</button>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Dashboard;