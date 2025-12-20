
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Reminder, Transaction, Product } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate, adToBs, bsToAd, BS_MONTHS, getBsMonthDays } from '../services/nepaliDateService';
import { 
  Bell, Package, AlertTriangle, Calendar, Trash2, 
  ArrowUpRight, ArrowDownLeft, 
  Users, ShoppingCart, Plus, TrendingUp, Wallet, CheckCircle2, Search, Filter, Clock,
  X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  const [activeTab, setActiveTab] = useState<'payments' | 'stock' | 'personal'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stockFilter, setStockFilter] = useState<'out' | 'low' | 'custom'>('out');
  const [customStockLimit, setCustomStockLimit] = useState<number>(10);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    loadDashboardData();
  }, [chartView]);

  const loadDashboardData = () => {
    const transactions = db.getTransactions();
    setProducts(db.getProducts());
    setReminders(db.getAllReminders());
    generateChartData(transactions);
  };

  const generateChartData = (transactions: Transaction[]) => {
      let data: any[] = [];
      const today = new Date();
      const salesTransactions = transactions.filter(t => t.type === 'SALE');

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
      } else if (chartView === 'yearly') {
          const currentBs = adToBs(today);
          let viewYear = currentBs.year;
          for (let i = 4; i >= 0; i--) {
              const targetYear = viewYear - i;
              const startAD = bsToAd(targetYear, 1, 1);
              const daysInChaitra = getBsMonthDays(targetYear, 11);
              const endAD = bsToAd(targetYear, 12, daysInChaitra);
              startAD.setHours(0,0,0,0);
              endAD.setHours(23,59,59,999);
              const sales = salesTransactions
                  .filter(t => {
                      const tDate = new Date(t.date);
                      return tDate >= startAD && tDate <= endAD;
                  })
                  .reduce((acc, t) => acc + t.totalAmount, 0);
              data.push({ name: targetYear.toString(), sales });
          }
      }
      setChartData(data);
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

  const getFilteredItems = () => {
      const term = searchTerm.toLowerCase();

      if (activeTab === 'stock') {
          return products.filter(p => {
              if (p.type === 'service') return false;
              if (term && !p.name.toLowerCase().includes(term)) return false;
              if (stockFilter === 'out') return p.stock < 1;
              if (stockFilter === 'low') return p.stock < (p.minStockLevel || 5);
              if (stockFilter === 'custom') return p.stock < customStockLimit;
              return false;
          }).map(p => ({
              id: p.id,
              title: p.name,
              subtitle: `Stock: ${p.stock} ${p.unit} (Min: ${p.minStockLevel || 5})`,
              type: 'stock',
              priority: p.stock < 1 ? 'high' : 'medium'
          }));
      }

      if (activeTab === 'payments') {
          return reminders.filter(r => {
              const isPaymentType = ['system_due', 'party_due', 'party_deadline'].includes(r.type || '');
              if (!isPaymentType) return false;
              if (term && !r.title.toLowerCase().includes(term)) return false;
              return true;
          }).map(r => ({
              id: r.id,
              title: r.title,
              subtitle: r.amount ? `Dues: Rs. ${formatCurrency(r.amount)}` : formatNepaliDate(r.date),
              type: 'payment',
              priority: r.priority || 'medium',
              raw: r
          }));
      }

      if (activeTab === 'personal') {
          return reminders.filter(r => {
              const isPersonal = r.type === 'manual';
              if (!isPersonal) return false;
              if (term && !r.title.toLowerCase().includes(term)) return false;
              return true;
          }).map(r => ({
              id: r.id,
              title: r.title,
              subtitle: `Due: ${formatNepaliDate(r.date)}`,
              type: 'manual',
              priority: r.priority || 'medium',
              raw: r
          }));
      }

      return [];
  };

  const itemsToShow = getFilteredItems();

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Chart Section */}
           <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[400px]">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-emerald-600" />
                       Sales Performance
                   </h3>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                       {(['daily', 'monthly', 'yearly'] as const).map((view) => (
                           <button key={view} onClick={() => setChartView(view)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${chartView === view ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}>
                               {view}
                           </button>
                       ))}
                   </div>
               </div>
               <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} dy={10} interval={chartView === 'daily' ? 3 : 0} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} tickFormatter={(val) => `k ${(val/1000).toFixed(0)}`} />
                        <Tooltip cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [formatCurrency(value), 'Sales']} />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
           </div>

           {/* Reminders Card */}
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[400px] flex flex-col overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-500" />
                      Reminders & Alerts
                  </h3>
                  <button onClick={() => setShowReminderModal(true)} className="text-[10px] font-black uppercase bg-brand-500 text-white px-2 py-1 rounded shadow-sm hover:bg-brand-600 transition-colors">
                      Add New
                  </button>
              </div>

              <div className="flex border-b border-gray-100 bg-white">
                  <button onClick={() => { setActiveTab('payments'); setSearchTerm(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase text-center border-b-2 transition-colors ${activeTab === 'payments' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Payments Aging
                  </button>
                  <button onClick={() => { setActiveTab('stock'); setSearchTerm(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase text-center border-b-2 transition-colors ${activeTab === 'stock' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Stock Alerts
                  </button>
                  <button onClick={() => { setActiveTab('personal'); setSearchTerm(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase text-center border-b-2 transition-colors ${activeTab === 'personal' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                      Manual List
                  </button>
              </div>

              <div className="p-3 border-b border-gray-50">
                  <div className="relative">
                      <input type="text" className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Filter reminders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[350px]">
                  {itemsToShow.length > 0 ? (
                      itemsToShow.map((item) => (
                        <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-brand-200 hover:bg-brand-50/20 transition-all shadow-sm">
                            <div className={`shrink-0 mt-0.5 p-2 rounded-lg ${
                                item.type === 'stock' ? 'bg-red-50 text-red-600' : 
                                item.type === 'payment' ? (item.priority === 'high' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-orange-50 text-orange-600') :
                                'bg-blue-50 text-blue-600'
                            }`}>
                                {item.type === 'stock' ? <Package className="w-4 h-4" /> : 
                                 item.type === 'payment' ? <Clock className="w-4 h-4" /> :
                                 <Calendar className="w-4 h-4" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-gray-800 truncate" title={item.title}>{item.title}</h4>
                                    <button onClick={() => handleDeleteReminder(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className={`text-[11px] mt-0.5 font-medium flex items-center justify-between ${item.priority === 'high' ? 'text-red-600' : 'text-gray-500'}`}>
                                    <span>{item.subtitle}</span>
                                    {item.priority === 'high' && <AlertTriangle className="w-3 h-3 ml-1" />}
                                </div>
                            </div>
                        </div>
                      ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm py-20">
                       <CheckCircle2 className="w-12 h-12 mb-3 opacity-20 text-emerald-500" />
                       <p className="font-bold">No Alerts</p>
                       <p className="text-xs">Your dashboard is clean!</p>
                    </div>
                  )}
              </div>
           </div>
       </div>
       
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <button onClick={() => onNavigate('sales-invoices')} className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center gap-4 hover:bg-emerald-100 transition-all group shadow-sm">
               <div className="bg-white p-3 rounded-xl text-emerald-600 shadow-md group-hover:scale-110 transition-transform"><ArrowUpRight className="w-6 h-6" /></div>
               <span className="font-black text-emerald-900 uppercase text-xs tracking-wider">New Sale</span>
           </button>
           <button onClick={() => onNavigate('purchase-bills')} className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-center gap-4 hover:bg-blue-100 transition-all group shadow-sm">
               <div className="bg-white p-3 rounded-xl text-blue-600 shadow-md group-hover:scale-110 transition-transform"><ArrowDownLeft className="w-6 h-6" /></div>
               <span className="font-black text-blue-900 uppercase text-xs tracking-wider">New Purchase</span>
           </button>
           <button onClick={() => onNavigate('parties')} className="bg-purple-50 p-5 rounded-2xl border border-purple-100 flex items-center gap-4 hover:bg-purple-100 transition-all group shadow-sm">
               <div className="bg-white p-3 rounded-xl text-purple-600 shadow-md group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
               <span className="font-black text-purple-900 uppercase text-xs tracking-wider">Parties</span>
           </button>
           <button onClick={() => onNavigate('inventory')} className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex items-center gap-4 hover:bg-orange-100 transition-all group shadow-sm">
               <div className="bg-white p-3 rounded-xl text-orange-600 shadow-md group-hover:scale-110 transition-transform"><Package className="w-6 h-6" /></div>
               <span className="font-black text-orange-900 uppercase text-xs tracking-wider">Inventory</span>
           </button>
       </div>

       {showReminderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
