
import React, { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { IssuedLicense } from '../types';
import { 
  Key, Plus, Copy, ShieldCheck, Database, 
  Users, Package, TrendingUp, Zap, Server, 
  Lock, ArrowRight, CheckCircle, Smartphone,
  LayoutGrid, Activity, LogOut, Terminal, 
  Fingerprint, ShieldAlert, Globe, Radio,
  User, Phone, Trash2, Search, X, Loader2, Calendar, Clock
} from 'lucide-react';
import { useToast } from './Toast';
import { formatCurrency } from '../services/formatService';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'licenses'>('overview');
  const [generatedKey, setGeneratedKey] = useState('');
  const [issuedLicenses, setIssuedLicenses] = useState<IssuedLicense[]>([]);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newLicenseData, setNewLicenseData] = useState({
    clientName: '',
    contactNumber: '',
    deviceId: '',
    duration: 365
  });
  
  const [stats, setStats] = useState({
    companies: 0,
    totalProducts: 0,
    totalParties: 0,
    totalSales: 0
  });

  const { addToast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const companies = await db.getCompanies();
    const products = db.getProducts();
    const parties = db.getParties();
    const sales = db.getTransactions().filter(t => t.type === 'SALE').reduce((s, t) => s + t.totalAmount, 0);
    const licenses = await db.getGlobalIssuedLicenses();

    setStats({
      companies: companies.length,
      totalProducts: products.length,
      totalParties: parties.length,
      totalSales: sales
    });
    setIssuedLicenses(licenses);
  };

  const handleGenerateAndIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicenseData.deviceId || !newLicenseData.clientName) {
        addToast('Device ID and Client Name are required', 'error');
        return;
    }

    const key = subscriptionService.createNewLicenseKey(newLicenseData.deviceId.trim(), newLicenseData.duration);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + newLicenseData.duration);

    const license: IssuedLicense = {
        id: Date.now().toString(),
        clientName: newLicenseData.clientName,
        contactNumber: newLicenseData.contactNumber,
        deviceId: newLicenseData.deviceId.trim(),
        licenseKey: key,
        issuedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    await db.addGlobalIssuedLicense(license);
    setGeneratedKey(key);
    setShowIssueModal(false);
    loadAllData();
    addToast(`Bound license (${newLicenseData.duration} days) generated!`, 'success');
  };

  const handleDeleteLicense = async (id: string) => {
      if (window.confirm('Delete this license record from registry? This does not deactivate the client offline node.')) {
          await db.deleteGlobalIssuedLicense(id);
          loadAllData();
          addToast('Record removed from registry', 'info');
      }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    addToast('Key copied to clipboard!', 'info');
  };

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex overflow-hidden">
      <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-900">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                 <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h1 className="text-xl font-black text-white tracking-tighter uppercase">AA Pro</h1>
                 <p className="text-[10px] text-brand-400 font-black tracking-widest uppercase">Master Control</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
           <button 
             onClick={() => setActiveTab('overview')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${activeTab === 'overview' ? 'bg-slate-900 text-brand-400 border-slate-800' : 'text-slate-500 hover:text-white border-transparent'}`}
           >
              <LayoutGrid className="w-5 h-5" /> Portal Overview
           </button>
           <button 
             onClick={() => setActiveTab('licenses')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${activeTab === 'licenses' ? 'bg-slate-900 text-brand-400 border-slate-800' : 'text-slate-500 hover:text-white border-transparent'}`}
           >
              <Fingerprint className="w-5 h-5" /> License Registry
           </button>
        </nav>

        <div className="p-6 mt-auto">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
               <LogOut className="w-4 h-4" /> Terminate Session
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="h-48 bg-gradient-to-b from-brand-900/20 to-transparent absolute top-0 left-0 right-0 pointer-events-none" />

        <div className="p-8 lg:p-12 max-w-6xl mx-auto relative z-10 space-y-12">
           
           <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                 <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                    {activeTab === 'overview' ? 'Authorized System Admin' : 'License Registry & Vault'}
                 </h2>
                 <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Primary Node • v2.8.0 Secure</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setShowIssueModal(true)} className="px-6 py-3 bg-brand-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Generate New Bound Key
                 </button>
              </div>
           </header>

           {activeTab === 'overview' && (
               <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                    {[
                        { label: 'Workspaces', val: stats.companies, icon: Server, color: 'blue' },
                        { label: 'Master Inventory', val: `${stats.totalProducts} SKU`, icon: Package, color: 'emerald' },
                        { label: 'Active Licenses', val: issuedLicenses.length, icon: Fingerprint, color: 'purple' },
                        { label: 'Network Value', val: formatCurrency(stats.totalSales), icon: TrendingUp, color: 'orange' }
                    ].map((s, i) => (
                        <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl group hover:border-brand-500/30 transition-all">
                        <div className={`w-12 h-12 rounded-2xl bg-${s.color}-500/10 flex items-center justify-center mb-4 text-${s.color}-500`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                        <p className="text-2xl font-black text-white mt-1">{s.val}</p>
                        </div>
                    ))}
                </div>
               </>
           )}

           {activeTab === 'licenses' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-950 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-800">
                              <tr>
                                  <th className="px-8 py-5">Client & Contact</th>
                                  <th className="px-8 py-5">Node Signature (Device ID)</th>
                                  <th className="px-8 py-5">Issued Key</th>
                                  <th className="px-8 py-5">Expiry</th>
                                  <th className="px-8 py-5 text-center">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                              {issuedLicenses.map((lic) => (
                                  <tr key={lic.id} className="hover:bg-slate-900/80 transition-all group">
                                      <td className="px-8 py-5">
                                          <div className="font-bold text-white">{lic.clientName}</div>
                                          <div className="text-[10px] text-slate-500 font-bold mt-1">{lic.contactNumber}</div>
                                      </td>
                                      <td className="px-8 py-5">
                                          <code className="text-[10px] font-mono text-brand-400 bg-brand-500/5 px-2 py-1 rounded border border-brand-500/20">{lic.deviceId}</code>
                                      </td>
                                      <td className="px-8 py-5">
                                          <div className="flex items-center gap-2 group/key">
                                              <code className="text-xs font-mono font-black text-slate-300">{lic.licenseKey}</code>
                                              <button onClick={() => copyToClipboard(lic.licenseKey)} className="p-1.5 bg-slate-800 rounded-lg opacity-0 group-hover/key:opacity-100 transition-all hover:bg-slate-700">
                                                  <Copy className="w-3.5 h-3.5 text-white" />
                                              </button>
                                          </div>
                                      </td>
                                      <td className="px-8 py-5">
                                          <div className={`text-[10px] font-black uppercase ${new Date(lic.expiresAt) > new Date() ? 'text-emerald-500' : 'text-red-500'}`}>
                                              {new Date(lic.expiresAt).toLocaleDateString()}
                                          </div>
                                      </td>
                                      <td className="px-8 py-5 text-center">
                                          <button onClick={() => handleDeleteLicense(lic.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
               </div>
           )}
        </div>
      </main>

      {showIssueModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-10 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Generate Bound Key</h3>
                        <p className="text-slate-500 text-sm mt-1">Bind a new subscription to a physical device.</p>
                    </div>
                    <button onClick={() => setShowIssueModal(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
                </div>

                <form onSubmit={handleGenerateAndIssue} className="p-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                                <input required className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-white font-bold transition-all" placeholder="Acme Store" value={newLicenseData.clientName} onChange={e => setNewLicenseData({...newLicenseData, clientName: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                                <input required className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-white font-bold transition-all" placeholder="+977-98..." value={newLicenseData.contactNumber} onChange={e => setNewLicenseData({...newLicenseData, contactNumber: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-brand-400 uppercase tracking-widest">Device Node Signature (From Client)</label>
                        <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-600/50" />
                            <input required className="w-full pl-12 pr-4 py-4 bg-brand-500/5 border border-brand-500/20 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-brand-400 font-mono font-black transition-all" placeholder="NODE-XXXX-XXXXXX" value={newLicenseData.deviceId} onChange={e => setNewLicenseData({...newLicenseData, deviceId: e.target.value.toUpperCase()})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Key Validity Period</label>
                        <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                            <select 
                                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-white font-bold appearance-none cursor-pointer"
                                value={newLicenseData.duration}
                                onChange={e => setNewLicenseData({...newLicenseData, duration: parseInt(e.target.value)})}
                            >
                                <option value={7}>One Week (Demo)</option>
                                <option value={30}>One Month</option>
                                <option value={90}>3 Months (Quarterly)</option>
                                <option value={180}>6 Months (Half Year)</option>
                                <option value={365}>Yearly Subscription</option>
                                <option value={36500}>Lifetime Access</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-4">
                        <button type="submit" className="w-full py-5 bg-brand-500 hover:bg-brand-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                            <Fingerprint className="w-5 h-5" /> Generate & Issue Key
                        </button>
                    </div>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
