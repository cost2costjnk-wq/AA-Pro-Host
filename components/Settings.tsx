
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { BusinessProfile, DatabaseConfig, CloudConfig } from '../types';
import DataImport from './DataImport';
import DbViewer from './DbViewer';
import { saveDirectoryHandle, getDirectoryHandle, verifyPermission } from '../services/backupStorage';
import { 
  Save, Building2, MapPin, Hash, Phone, Mail, Database, RefreshCw, 
  CheckCircle, AlertCircle, HardDrive, FileSpreadsheet, Download, Info, 
  ShieldCheck, Activity, Search, Cloud, Clock, Image as ImageIcon, 
  Upload, Trash2, RotateCcw, Plus, X, Archive, ArrowRight, Layers, LogIn, 
  Folder, FolderOpen, Lock, Shield, PieChart, BarChart2, Camera, ExternalLink, Globe
} from 'lucide-react';
import { useToast } from './Toast';
import { formatCurrency } from '../services/formatService';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'database' | 'cloud' | 'import' | 'db-browser' | 'security'>('profile');
  
  const [profile, setProfile] = useState<BusinessProfile>({ name: '', address: '', pan: '', phone: '', email: '', logoUrl: '' });
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({ mode: 'local' });
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({ enabled: false, autoBackup: false, backupSchedules: ["18:00"], googleClientId: "" });

  const [authCreds, setAuthCreds] = useState({ username: '', password: '', confirmPassword: '' });
  const [storageStats, setStorageStats] = useState<{usage: number, quota: number, percent: number} | null>(null);
  const [recordCounts, setRecordCounts] = useState<{table: string, count: number}[]>([]);
  
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState('18:00');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    refreshAllData();
    checkBackupHandle();
  }, []);

  const refreshAllData = async () => {
    setProfile(db.getBusinessProfile());
    setDbConfig(db.getDatabaseConfig());
    setCloudConfig(db.getCloudConfig());
    
    const creds = authService.getStoredCredentials();
    setAuthCreds({ username: creds.username, password: creds.password, confirmPassword: creds.password });

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined && estimate.quota !== undefined) {
        setStorageStats({ 
            usage: estimate.usage, 
            quota: estimate.quota,
            percent: (estimate.usage / estimate.quota) * 100
        });
      }
    }

    const tables = await db.listTables();
    const counts = await Promise.all(tables.map(async t => ({
        table: t,
        count: (await db.getTableData(t)).length
    })));
    setRecordCounts(counts);
  };

  const checkBackupHandle = async () => {
    const handle = await getDirectoryHandle();
    if (handle) {
      setBackupPath(handle.name);
    }
  };

  const handlePickDirectory = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      if (handle) {
        await saveDirectoryHandle(handle);
        setBackupPath(handle.name);
        addToast(`Backup folder set to: ${handle.name}`, 'success');
      }
    } catch (e) {
      console.error(e);
      addToast('Folder selection cancelled or failed.', 'error');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      addToast('Logo size should be less than 500KB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setProfile({ ...profile, logoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateBusinessProfile(profile);
    addToast('Company profile and logo updated!', 'success');
  };

  const handleSaveCloud = () => {
    db.updateCloudConfig(cloudConfig);
    addToast('Backup configurations updated successfully', 'success');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCreds.password !== authCreds.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (authCreds.password.length < 6) {
      addToast('Password should be at least 6 characters long', 'error');
      return;
    }
    authService.updateCredentials(authCreds.username, authCreds.password);
    addToast('Security credentials updated successfully!', 'success');
  };

  const addSchedule = () => {
    if (cloudConfig.backupSchedules.includes(newScheduleTime)) return;
    const newSchedules = [...cloudConfig.backupSchedules, newScheduleTime].sort();
    setCloudConfig({ ...cloudConfig, backupSchedules: newSchedules });
  };

  const removeSchedule = (time: string) => {
    setCloudConfig({ ...cloudConfig, backupSchedules: cloudConfig.backupSchedules.filter(s => s !== time) });
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings & Utilities</h1>
        <div className="text-xs text-gray-400 font-mono">Build v2.5.0-AUTO</div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
        {[
          { id: 'profile', label: 'Company Profile', icon: Building2 },
          { id: 'database', label: 'System Storage', icon: Database },
          { id: 'security', label: 'Login & Security', icon: Shield },
          { id: 'cloud', label: 'Auto Backups', icon: Archive },
          { id: 'import', label: 'Restore Data', icon: RefreshCw },
          { id: 'db-browser', label: 'Data Explorer', icon: Search }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap border-2 ${
              activeTab === tab.id 
              ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-brand-200'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                   <h2 className="text-xl font-bold text-gray-800 dark:text-white">Company Configuration</h2>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Add your logo and details for professional invoices.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                   <div className="shrink-0 space-y-4">
                      <div className="relative group">
                         <div className="w-40 h-40 rounded-3xl border-4 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden shadow-inner">
                            {profile.logoUrl ? (
                               <img src={profile.logoUrl} alt="Company Logo" className="w-full h-full object-contain" />
                            ) : (
                               <ImageIcon className="w-12 h-12 text-gray-300" />
                            )}
                         </div>
                         <button 
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 bg-brand-500 text-white p-2.5 rounded-2xl shadow-xl hover:bg-brand-600 transition-all active:scale-90"
                         >
                            <Camera className="w-5 h-5" />
                         </button>
                      </div>
                      <div className="text-center">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company Logo</p>
                         <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                         {profile.logoUrl && (
                            <button type="button" onClick={() => setProfile({...profile, logoUrl: ''})} className="text-xs text-red-500 font-bold hover:underline mt-1">Remove Logo</button>
                         )}
                      </div>
                   </div>

                   <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Business Name</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">PAN/VAT Number</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white" value={profile.pan} onChange={e => setProfile({...profile, pan: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Phone</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Address</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} />
                      </div>
                   </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button type="submit" className="px-8 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2">
                       <Save className="w-4 h-4" /> Save Business Profile
                    </button>
                </div>
              </form>
            )}

            {activeTab === 'cloud' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
                 <div className="border-b border-gray-100 dark:border-gray-700 pb-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Automated Backups</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Secure your business data in a local folder and the cloud.</p>
                    </div>
                 </div>

                 {/* Local Path Section */}
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> 1. Local Storage Path</h3>
                            <div className="flex flex-col gap-4">
                               <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
                                  <Folder className="w-6 h-6 text-amber-500 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">Selected Folder</p>
                                      <p className="text-sm font-black text-gray-700 dark:text-white truncate">
                                        {backupPath || 'No folder selected yet'}
                                      </p>
                                  </div>
                               </div>
                               <button 
                                 onClick={handlePickDirectory}
                                 className="w-full py-4 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-center gap-2"
                               >
                                  <FolderOpen className="w-5 h-5" /> Select Local Backup Folder
                               </button>
                            </div>
                        </div>

                        {/* Google Drive Section */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border-2 border-indigo-50 dark:border-indigo-900/20 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><Cloud className="w-4 h-4" /> 2. Google Drive Integration</h3>
                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                                   <Globe className="w-3 h-3 text-indigo-600" />
                                   <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Cloud Enabled</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Google OAuth Client ID</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            type="password" 
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm dark:text-white"
                                            placeholder="••••.apps.googleusercontent.com"
                                            value={cloudConfig.googleClientId}
                                            onChange={e => setCloudConfig({...cloudConfig, googleClientId: e.target.value})}
                                        />
                                    </div>
                                    <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
                                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                                        <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                                            Don't have a Client ID? Go to <a href="https://console.cloud.google.com/" target="_blank" className="font-bold underline flex inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a>, enable Drive API, and create "Web Application" credentials. 
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> 3. Schedule & Toggles</h3>
                            
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6 shadow-sm">
                               <div>
                                  <p className="text-sm font-bold text-gray-800 dark:text-white">Enable Auto-Backup</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">Scheduled Trigger</p>
                               </div>
                               <button 
                                 onClick={() => setCloudConfig({...cloudConfig, autoBackup: !cloudConfig.autoBackup})}
                                 className={`w-12 h-6 rounded-full relative transition-colors ${cloudConfig.autoBackup ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                               >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${cloudConfig.autoBackup ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                           <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input 
                                        type="time" 
                                        className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-brand-500" 
                                        value={newScheduleTime} 
                                        onChange={e => setNewScheduleTime(e.target.value)} 
                                    />
                                    <button 
                                        onClick={addSchedule}
                                        className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-md"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                    {cloudConfig.backupSchedules.map(time => (
                                        <div key={time} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm group">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400"><Clock className="w-4 h-4" /></div>
                                                <span className="text-sm font-black text-gray-700 dark:text-white">{time}</span>
                                            </div>
                                            <button onClick={() => removeSchedule(time)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                           </div>
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={handleSaveCloud} className="px-10 py-4 bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-3">
                        <Save className="w-5 h-5" /> Save All Configurations
                    </button>
                 </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="border-b border-gray-100 dark:border-gray-700 pb-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Storage Analysis</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Deep look into your browser-based database (IndexedDB).</p>
                    </div>
                    <button onClick={refreshAllData} className="p-2 text-gray-400 hover:text-brand-500 transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                 </div>

                 {storageStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                            <HardDrive className="w-8 h-8 text-emerald-600 mb-4" />
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Database Usage</h3>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatBytes(storageStats.usage)}</p>
                            <div className="mt-4 h-2 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.max(1, storageStats.percent)}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                            <PieChart className="w-8 h-8 text-blue-600 mb-4" />
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Available Quota</h3>
                            <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatBytes(storageStats.quota)}</p>
                            <p className="text-[10px] text-blue-500 mt-2 font-medium">BROWSER-MANAGED ALLOCATION</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <BarChart2 className="w-8 h-8 text-orange-600 mb-4" />
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Table Count</h3>
                            <p className="text-2xl font-black text-orange-700 dark:text-orange-400">{recordCounts.length} Total</p>
                            <p className="text-[10px] text-orange-500 mt-2 font-medium">OFFLINE-FIRST SCHEMA</p>
                        </div>
                    </div>
                 )}

                 <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 font-bold text-gray-700 dark:text-white text-sm">Table Breakdown</div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {recordCounts.map(item => (
                            <div key={item.table} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-brand-400"></div>
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{item.table}</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-gray-400">{item.count} Records</span>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleSaveSecurity} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                   <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Lock className="w-5 h-5 text-brand-500" /> Account Security</h2>
                   <p className="text-sm text-gray-500 dark:text-gray-400">Change your system login email and password.</p>
                </div>
                
                <div className="space-y-5 max-w-md">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Login Email</label>
                    <input type="email" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white font-medium" value={authCreds.username} onChange={e => setAuthCreds({...authCreds, username: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                    <input type="password" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white font-medium" value={authCreds.password} onChange={e => setAuthCreds({...authCreds, password: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm New Password</label>
                    <input type="password" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white font-medium" value={authCreds.confirmPassword} onChange={e => setAuthCreds({...authCreds, confirmPassword: e.target.value})} />
                  </div>
                </div>

                <div className="flex justify-start pt-4 border-t border-gray-100 dark:border-gray-700">
                   <button type="submit" className="px-8 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-xl font-bold hover:bg-black dark:hover:bg-gray-600 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                     <Save className="w-4 h-4" /> Update Credentials
                   </button>
                </div>
              </form>
            )}

            {activeTab === 'import' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><RefreshCw className="w-5 h-5 text-brand-500" /> System Restore</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reload an existing backup or import new spreadsheet data.</p>
                  </div>
                  <DataImport onBack={() => setActiveTab('profile')} />
               </div>
            )}

            {activeTab === 'db-browser' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Search className="w-5 h-5 text-brand-500" /> Advanced Explorer</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Direct technical view of the system's underlying tables.</p>
                    </div>
                    <DbViewer />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
