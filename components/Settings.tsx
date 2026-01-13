
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { BusinessProfile, DatabaseConfig, CloudConfig, User, UserRole, ActionLevel, Company } from '../types';
import DataImport from './DataImport';
import DbViewer from './DbViewer';
import { saveDirectoryHandle, getDirectoryHandle, verifyPermission } from '../services/backupStorage';
import { autoBackupService } from '../services/autoBackupService';
import { 
  Save, Building2, Database, RefreshCw, 
  HardDrive, Info, 
  Search, Clock, Image as ImageIcon, 
  Trash2, Plus, Archive, Folder, FolderOpen, Lock, Shield, PieChart, BarChart2, Camera, CalendarDays, ArrowRight, CheckCircle2, Loader2, X, Users, UserPlus, ShieldAlert, CheckCircle,
  Tag, ShoppingCart, Banknote, Receipt, FileBarChart, Wrench, RotateCcw, ClipboardList, Keyboard, Settings as SettingsIcon, LayoutDashboard, Building,
  Package, ChevronDown, Eye, ShieldCheck, Download, UploadCloud, AlertTriangle, History, Mail, UserCheck,
  Pencil,
  ArrowRightCircle,
  ShieldQuestion,
  FileCheck,
  AlertCircle,
  FileJson,
  Sparkles
} from 'lucide-react';
import { useToast } from './Toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'database' | 'local_backup' | 'import' | 'db-browser' | 'security'>('profile');
  const [profile, setProfile] = useState<BusinessProfile>({ name: '', address: '', pan: '', phone: '', email: '', logoUrl: '' });
  const [authCreds, setAuthCreds] = useState({ username: '', password: '', confirmPassword: '' });
  const [recordCounts, setRecordCounts] = useState<{table: string, count: number}[]>([]);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const isAdmin = authService.getUserRole() === 'ADMIN' || authService.isSuperAdmin();

  useEffect(() => {
    refreshAllData();
    checkBackupHandle();
  }, []);

  const refreshAllData = async () => {
    const prof = db.getBusinessProfile();
    setProfile(prof);
    setUsers(db.getUsers());
    const creds = authService.getStoredCredentials();
    setAuthCreds({ username: creds.username, password: creds.password, confirmPassword: creds.password });

    const tables = await db.listTables();
    const counts = await Promise.all(tables.map(async t => {
        const records = await db.getTableData(t);
        return { table: t, count: records.length };
    }));
    setRecordCounts(counts);
  };

  const checkBackupHandle = async () => {
    const handle = await getDirectoryHandle();
    if (handle) setBackupPath(handle.name);
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
      addToast('Folder selection failed.', 'error');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProfile({ ...profile, logoUrl: event.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateBusinessProfile(profile);
    addToast('Company profile updated!', 'success');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCreds.password !== authCreds.confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    authService.updateCredentials(authCreds.username, authCreds.password);
    addToast('Credentials updated!', 'success');
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'profile', label: 'Profile', icon: Building2 },
          { id: 'users', label: 'Staff', icon: Users, adminOnly: true },
          { id: 'database', label: 'Storage', icon: Database, adminOnly: true },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'local_backup', label: 'Local Path', icon: Archive },
          { id: 'import', label: 'Restore', icon: RefreshCw },
          { id: 'db-browser', label: 'Explorer', icon: Search }
        ]
        .filter(tab => isAdmin || !tab.adminOnly)
        .map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-2 ${
              activeTab === tab.id 
              ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-brand-200'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col md:flex-row gap-8">
                   <div className="shrink-0 relative">
                      <div className="w-40 h-40 rounded-3xl border-4 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                        {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-12 h-12 text-gray-300" />}
                      </div>
                      <button type="button" onClick={() => logoInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-brand-500 text-white p-2 rounded-xl shadow-lg"><Camera className="w-5 h-5" /></button>
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                   </div>
                   <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Business Name</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PAN/VAT</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" value={profile.pan} onChange={e => setProfile({...profile, pan: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                        <input type="text" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                      </div>
                   </div>
                </div>
                <button type="submit" className="px-8 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Save Profile</button>
              </form>
            )}
            
            {activeTab === 'security' && (
              <form onSubmit={handleSaveSecurity} className="space-y-6 max-w-md animate-in fade-in duration-300">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Username (Email)</label>
                    <input type="email" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border rounded-xl outline-none" value={authCreds.username} onChange={e => setAuthCreds({...authCreds, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">New Password</label>
                    <input type="password" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border rounded-xl outline-none" value={authCreds.password} onChange={e => setAuthCreds({...authCreds, password: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Confirm</label>
                    <input type="password" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border rounded-xl outline-none" value={authCreds.confirmPassword} onChange={e => setAuthCreds({...authCreds, confirmPassword: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="px-8 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Update Access</button>
              </form>
            )}

            {activeTab === 'local_backup' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="p-8 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] text-center">
                    <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase mb-2">Configured Storage Node</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">Database points will be secured to this directory on your machine.</p>
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm max-w-md mx-auto">
                        <Folder className="w-5 h-5 text-brand-500 shrink-0" />
                        <span className="flex-1 text-xs font-mono font-bold text-gray-600 dark:text-gray-400 truncate">{backupPath || 'Path not set'}</span>
                        <button onClick={handlePickDirectory} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><RefreshCw className="w-4 h-4" /></button>
                    </div>
                    <button onClick={handlePickDirectory} className="mt-8 px-10 py-4 bg-brand-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-95">Update Folder Access</button>
                </div>
              </div>
            )}
            
            {activeTab === 'import' && <DataImport onBack={() => setActiveTab('profile')} />}
            {activeTab === 'db-browser' && <DbViewer />}
            {activeTab === 'database' && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
                  {recordCounts.map(rc => (
                      <div key={rc.table} className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{rc.table}</h4>
                         <p className="text-2xl font-black text-gray-800 dark:text-white">{rc.count}</p>
                      </div>
                  ))}
               </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
