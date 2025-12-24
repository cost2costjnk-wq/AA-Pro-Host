
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { BusinessProfile, DatabaseConfig, CloudConfig, User, UserRole, ActionLevel } from '../types';
import DataImport from './DataImport';
import DbViewer from './DbViewer';
import { saveDirectoryHandle, getDirectoryHandle } from '../services/backupStorage';
import { 
  Save, Building2, Database, RefreshCw, 
  HardDrive, Info, 
  Search, Clock, Image as ImageIcon, 
  Trash2, Plus, Archive, Folder, FolderOpen, Lock, Shield, PieChart, BarChart2, Camera, CalendarDays, ArrowRight, CheckCircle2, Loader2, X, Users, UserPlus, ShieldAlert, CheckCircle,
  Tag, ShoppingCart, Banknote, Receipt, FileBarChart, Wrench, RotateCcw, ClipboardList, Keyboard, Settings as SettingsIcon, LayoutDashboard, Building,
  Package, ChevronDown, Eye, ShieldCheck, Download, UploadCloud
} from 'lucide-react';
import { useToast } from './Toast';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const MODULE_CATEGORIES = [
  {
    name: 'General',
    modules: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'shortcut-keys', label: 'Keyboard Shortcuts', icon: Keyboard },
    ]
  },
  {
    name: 'Operations',
    modules: [
      { id: 'parties', label: 'Parties', icon: Users },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'pricelist', label: 'Price List', icon: ClipboardList },
      { id: 'service-center', label: 'Service Center', icon: Wrench },
      { id: 'warranty-return', label: 'Warranty Return', icon: RotateCcw },
    ]
  },
  {
    name: 'Sales Group',
    modules: [
      { id: 'sales-invoices', label: 'Sales Invoices', icon: Tag },
      { id: 'sales-payment-in', label: 'Payment In', icon: Banknote },
      { id: 'sales-quotations', label: 'Quotations', icon: Archive },
      { id: 'sales-return', label: 'Sales Return', icon: RotateCcw },
    ]
  },
  {
    name: 'Purchase Group',
    modules: [
      { id: 'purchase-bills', label: 'Purchase Bills', icon: ShoppingCart },
      { id: 'purchase-payment-out', label: 'Payment Out', icon: Banknote },
      { id: 'purchase-auto-order', label: 'Auto Order', icon: RefreshCw },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: Archive },
      { id: 'purchase-return', label: 'Purchase Return', icon: RotateCcw },
    ]
  },
  {
    name: 'Accounts & Reports',
    modules: [
      { id: 'cash-drawer', label: 'Cash Drawer', icon: Banknote },
      { id: 'expense', label: 'Expenses', icon: Receipt },
      { id: 'manage-accounts', label: 'Manage Accounts', icon: Building },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
      { id: 'receivable-aging', label: 'Receivable Aging', icon: Clock },
    ]
  },
  {
    name: 'System Utilities',
    modules: [
      { id: 'system-backup', label: 'Database Backup', icon: Download },
      { id: 'system-restore', label: 'Database Restore', icon: UploadCloud },
    ]
  }
];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SALESMAN: [
    'dashboard:view', 'parties:view', 'parties:edit', 'inventory:view', 'service-center:view', 'service-center:edit',
    'warranty-return:view', 'warranty-return:edit', 'pricelist:view', 'sales-invoices:view', 'sales-invoices:edit',
    'sales-payment-in:view', 'sales-payment-in:edit', 'sales-quotations:view', 'sales-quotations:edit', 'sales-return:view', 'sales-return:edit',
    'shortcut-keys:view', 'system-backup:view', 'system-backup:edit'
  ],
  ACCOUNTANT: [
    'dashboard:view', 'reports:view', 'cash-drawer:view', 'cash-drawer:edit', 'expense:view', 'expense:edit',
    'manage-accounts:view', 'manage-accounts:edit', 'parties:view', 'sales-payment-in:view', 'sales-payment-in:edit',
    'purchase-payment-out:view', 'purchase-payment-out:edit', 'receivable-aging:view', 'system-backup:view', 'system-backup:edit'
  ],
  DATA_ENTRY: [
    'inventory:view', 'inventory:edit', 'parties:view', 'parties:edit', 'pricelist:view', 'purchase-bills:view', 'purchase-bills:edit',
    'purchase-payment-out:view', 'purchase-payment-out:edit', 'purchase-auto-order:view', 'purchase-auto-order:edit',
    'purchase-orders:view', 'purchase-orders:edit', 'purchase-return:view', 'purchase-return:edit', 'system-backup:view', 'system-backup:edit'
  ],
  ADMIN: [],
  SUPER_ADMIN: []
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'database' | 'fiscal_year' | 'local_backup' | 'import' | 'db-browser' | 'security'>('profile');
  const [profile, setProfile] = useState<BusinessProfile>({ name: '', address: '', pan: '', phone: '', email: '', logoUrl: '' });
  const [backupConfig, setBackupConfig] = useState<CloudConfig>({ enabled: false, autoBackup: false, backupSchedules: ["18:00"], googleClientId: "" });
  const [authCreds, setAuthCreds] = useState({ username: '', password: '', confirmPassword: '' });
  const [storageStats, setStorageStats] = useState<{usage: number, quota: number, percent: number} | null>(null);
  const [recordCounts, setRecordCounts] = useState<{table: string, count: number}[]>([]);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState('18:00');
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({ name: '', email: '', password: '', role: 'SALESMAN', permissions: [] });
  const [showCloseWizard, setShowCloseWizard] = useState(false);
  const [nextYearName, setNextYearName] = useState('2081/82');
  const [isClosing, setIsClosing] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const isAdmin = authService.getUserRole() === 'ADMIN' || authService.isSuperAdmin();

  useEffect(() => {
    refreshAllData();
    checkBackupHandle();
  }, []);

  const refreshAllData = async () => {
    setProfile(db.getBusinessProfile());
    setBackupConfig(db.getCloudConfig());
    setUsers(db.getUsers());
    const creds = authService.getStoredCredentials();
    setAuthCreds({ username: creds.username, password: creds.password, confirmPassword: creds.password });

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined && estimate.quota !== undefined) {
        setStorageStats({ usage: estimate.usage, quota: estimate.quota, percent: (estimate.usage / estimate.quota) * 100 });
      }
    }

    const tables = await db.listTables();
    const counts = await Promise.all(tables.map(async t => ({ table: t, count: (await db.getTableData(t)).length })));
    setRecordCounts(counts);
  };

  const checkBackupHandle = async () => {
    const handle = await getDirectoryHandle();
    if (handle) setBackupPath(handle.name);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.email || !editingUser.password) {
        addToast('All fields are required', 'error');
        return;
    }
    if (editingUser.id) {
        db.updateUser(editingUser as User);
        addToast('Staff member updated', 'success');
    } else {
        db.addUser({ ...editingUser, id: Date.now().toString(), createdAt: new Date().toISOString() } as User);
        addToast('New staff member added', 'success');
    }
    setShowUserModal(false);
    setUsers(db.getUsers());
  };

  const handleDeleteUser = (id: string) => {
      if (window.confirm('Delete this user access?')) {
          db.deleteUser(id);
          setUsers(db.getUsers());
          addToast('Access revoked', 'success');
      }
  };

  const handleRoleChange = (role: UserRole) => {
      setEditingUser({ ...editingUser, role, permissions: DEFAULT_ROLE_PERMISSIONS[role] || [] });
  };

  const togglePermission = (moduleId: string, action: ActionLevel) => {
      const permString = `${moduleId}:${action}`;
      const current = editingUser.permissions || [];
      const updated = current.includes(permString) 
        ? current.filter(p => p !== permString)
        : [...current, permString];
      setEditingUser({ ...editingUser, permissions: updated });
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
      addToast('Folder selection cancelled or failed.', 'error');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { addToast('Logo size should be less than 500KB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (event) => setProfile({ ...profile, logoUrl: event.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateBusinessProfile(profile);
    addToast('Company profile and logo updated!', 'success');
  };

  const handleSaveBackup = () => {
    db.updateCloudConfig(backupConfig);
    addToast('Backup configurations updated successfully', 'success');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCreds.password !== authCreds.confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (authCreds.password.length < 6) { addToast('Password should be at least 6 characters long', 'error'); return; }
    authService.updateCredentials(authCreds.username, authCreds.password);
    addToast('Security credentials updated successfully!', 'success');
  };

  const handlePerformCloseYear = async () => {
      setIsClosing(true);
      try {
          const result = await db.closeAndStartNewYear(nextYearName);
          if (result.success) {
              addToast(`Financial Year ${nextYearName} initialized.`, 'success');
              setTimeout(() => window.location.reload(), 1500);
          } else {
              addToast(result.message || 'Closing failed', 'error');
              setIsClosing(false);
          }
      } catch (err) {
          addToast('Internal error during year-end process', 'error');
          setIsClosing(false);
      }
  };

  const addSchedule = () => {
    if (backupConfig.backupSchedules.includes(newScheduleTime)) return;
    setBackupConfig({ ...backupConfig, backupSchedules: [...backupConfig.backupSchedules, newScheduleTime].sort() });
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings & Utilities</h1>
        <div className="text-xs text-gray-400 font-mono">Build v2.9.1-STABLE</div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
        {[
          { id: 'profile', label: 'Profile', icon: Building2 },
          { id: 'users', label: 'Staff Management', icon: Users, adminOnly: true },
          { id: 'fiscal_year', label: 'Financial Year', icon: CalendarDays, adminOnly: true },
          { id: 'database', label: 'System Storage', icon: Database, adminOnly: true },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'local_backup', label: 'Local Backups', icon: Archive, customAccess: 'system-backup:view' },
          { id: 'import', label: 'Restore Data', icon: RefreshCw, customAccess: 'system-restore:view' },
          { id: 'db-browser', label: 'Data Explorer', icon: Search, customAccess: 'system-restore:delete' }
        ]
        .filter(tab => {
          if (isAdmin) return true;
          if (tab.adminOnly) return false;
          if (tab.customAccess) {
            const [mod, act] = tab.customAccess.split(':');
            return authService.can(mod, act as any);
          }
          return true;
        })
        .map(tab => (
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
                            {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="w-12 h-12 text-gray-300" />}
                         </div>
                         <button type="button" onClick={() => logoInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-brand-500 text-white p-2.5 rounded-2xl shadow-xl hover:bg-brand-600 transition-all active:scale-90"><Camera className="w-5 h-5" /></button>
                      </div>
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
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

            {activeTab === 'users' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="border-b border-gray-100 dark:border-gray-700 pb-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Staff Management</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage individual staff accounts and granular action-level module access.</p>
                        </div>
                        <button onClick={() => { setEditingUser({ name: '', email: '', password: '', role: 'SALESMAN', permissions: DEFAULT_ROLE_PERMISSIONS['SALESMAN'] }); setShowUserModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-600 shadow-md transition-all active:scale-95"><UserPlus className="w-4 h-4" /> Create Staff Account</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {users.map(user => (
                            <div key={user.id} className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Shield className="w-12 h-12" /></div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-lg uppercase">{user.name.substring(0,1)}</div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${user.role === 'SALESMAN' ? 'bg-emerald-50 text-emerald-600' : user.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{user.role}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
                                <p className="text-xs text-gray-400 truncate mb-6">{user.email}</p>
                                <div className="space-y-2 mb-6">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Permission Coverage</p>
                                    <p className="text-[11px] font-bold text-gray-500">{user.permissions?.length || 0} granular actions defined</p>
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4">
                                    <button onClick={() => { setEditingUser(user); setShowUserModal(true); }} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> Edit Permissions</button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showUserModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                                <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{editingUser.id ? 'Manage Staff Account' : 'Register New Staff'}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure identity and granular access control matrix.</p>
                                    </div>
                                    <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                
                                <form onSubmit={handleSaveUser} className="flex-1 overflow-hidden flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                            <div className="lg:col-span-4 space-y-6">
                                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Login Credentials</h4>
                                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Employee Name</label><input required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" placeholder="e.g. Rahul Sharma" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Login Email</label><input required type="email" className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Security Password</label><input required type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} /></div>
                                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Role Template</label><select className="w-full p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl outline-none font-bold text-indigo-700 dark:text-indigo-300" value={editingUser.role} onChange={e => handleRoleChange(e.target.value as UserRole)}><option value="SALESMAN">Salesman</option><option value="ACCOUNTANT">Accountant</option><option value="DATA_ENTRY">Data Entry</option></select></div>
                                            </div>

                                            <div className="lg:col-span-8 space-y-6">
                                                <div className="flex justify-between items-center border-b border-indigo-50 pb-2"><h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Granular Permission Matrix</h4><span className="text-[10px] font-bold text-gray-400 uppercase">{editingUser.permissions?.length || 0} Actions Allowed</span></div>
                                                <div className="space-y-8">
                                                    {MODULE_CATEGORIES.map((cat) => (
                                                        <div key={cat.name} className="space-y-4">
                                                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{cat.name}</h5>
                                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-gray-100 dark:bg-gray-800 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                                        <tr>
                                                                            <th className="p-3">Module</th>
                                                                            <th className="p-3 text-center">View</th>
                                                                            <th className="p-3 text-center">Modify</th>
                                                                            <th className="p-3 text-center">Delete</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                        {cat.modules.map((mod) => (
                                                                            <tr key={mod.id} className="hover:bg-white dark:hover:bg-gray-800 transition-colors">
                                                                                <td className="p-3 flex items-center gap-2"><mod.icon className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs font-bold text-gray-700 dark:text-gray-300">{mod.label}</span></td>
                                                                                <td className="p-3 text-center"><input type="checkbox" checked={editingUser.permissions?.includes(`${mod.id}:view`)} onChange={() => togglePermission(mod.id, 'view')} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" /></td>
                                                                                <td className="p-3 text-center"><input type="checkbox" checked={editingUser.permissions?.includes(`${mod.id}:edit`)} onChange={() => togglePermission(mod.id, 'edit')} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" /></td>
                                                                                <td className="p-3 text-center"><input type="checkbox" checked={editingUser.permissions?.includes(`${mod.id}:delete`)} onChange={() => togglePermission(mod.id, 'delete')} className="w-4 h-4 rounded text-red-600 focus:ring-red-500" /></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-4"><button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-3 text-gray-500 font-bold uppercase text-xs tracking-widest">Discard</button><button type="submit" className="px-12 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/30 hover:bg-brand-700 active:scale-95 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{editingUser.id ? 'Save Changes' : 'Create Staff Member'}</button></div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Storage Analysis</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Database statistics and record counts.</p>
                  </div>
                  <button onClick={refreshAllData} className="p-2 text-gray-400 hover:text-brand-500 transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                {storageStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                      <HardDrive className="w-8 h-8 text-emerald-600 mb-4" />
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Local Usage</h3>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatBytes(storageStats.usage)}</p>
                      <div className="mt-4 h-2 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.max(1, storageStats.percent)}%` }}></div>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                      <PieChart className="w-8 h-8 text-blue-600 mb-4" />
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Available</h3>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatBytes(storageStats.quota)}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-800">
                      <BarChart2 className="w-8 h-8 text-orange-600 mb-4" />
                      <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Tables</h3>
                      <p className="text-2xl font-black text-orange-700 dark:text-orange-400">{recordCounts.length} Total</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleSaveSecurity} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Lock className="w-5 h-5 text-brand-500" /> Account Security</h2>
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
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm Password</label>
                    <input type="password" required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white font-medium" value={authCreds.confirmPassword} onChange={e => setAuthCreds({...authCreds, confirmPassword: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-start pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" className="px-8 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-xl font-bold hover:bg-black dark:hover:bg-gray-600 transition-all active:scale-95 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Update Credentials
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'local_backup' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Archive className="w-5 h-5 text-brand-500" /> Local Backup Configuration</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure automated snapshots to your physical hardware path.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Destination Folder</h3>
                    <p className="text-xs text-gray-500 mb-6">Backup files will be stored in this directory. Browser permission is required for write access.</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono truncate text-gray-600">
                        {backupPath || 'No folder selected'}
                      </div>
                      <button onClick={handlePickDirectory} className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all">
                        <FolderOpen className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-white">Auto Backup Schedule</h3>
                      <button onClick={() => setBackupConfig({...backupConfig, autoBackup: !backupConfig.autoBackup})} className={`w-12 h-6 rounded-full transition-all relative ${backupConfig.autoBackup ? 'bg-brand-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${backupConfig.autoBackup ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {backupConfig.backupSchedules.map((time, idx) => (
                        <div key={idx} className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold flex items-center gap-2">
                          {time}
                          <button onClick={() => setBackupConfig({...backupConfig, backupSchedules: backupConfig.backupSchedules.filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <input type="time" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs p-1" value={newScheduleTime} onChange={e => setNewScheduleTime(e.target.value)} />
                        <button onClick={addSchedule} className="p-1 text-brand-600 hover:bg-brand-50 rounded"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={handleSaveBackup} className="px-8 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2"><Save className="w-4 h-4" /> Save Configuration</button>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <DataImport onBack={() => setActiveTab('profile')} />
              </div>
            )}

            {activeTab === 'db-browser' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
                <DbViewer />
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
