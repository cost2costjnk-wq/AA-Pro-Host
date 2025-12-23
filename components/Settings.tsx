import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { BusinessProfile, DatabaseConfig, CloudConfig, User, UserRole } from '../types';
import DataImport from './DataImport';
import DbViewer from './DbViewer';
import { saveDirectoryHandle, getDirectoryHandle } from '../services/backupStorage';
import { 
  Save, Building2, Database, RefreshCw, 
  HardDrive, Info, 
  Search, Clock, Image as ImageIcon, 
  Trash2, Plus, Archive, Folder, FolderOpen, Lock, Shield, PieChart, BarChart2, Camera, CalendarDays, ArrowRight, CheckCircle2, Loader2, X, Users, UserPlus, ShieldAlert, CheckCircle,
  Tag, ShoppingCart, Banknote, Receipt, FileBarChart, Wrench, RotateCcw, ClipboardList, Keyboard, Settings as SettingsIcon, LayoutDashboard, Building,
  // Added missing icons
  Package, ChevronDown
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
  }
];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SALESMAN: [
    'dashboard', 'parties', 'inventory', 'service-center', 
    'warranty-return', 'pricelist', 'sales-invoices', 
    'sales-payment-in', 'sales-quotations', 'sales-return', 
    'shortcut-keys'
  ],
  ACCOUNTANT: [
    'dashboard', 'reports', 'cash-drawer', 'expense', 
    'manage-accounts', 'parties', 'sales-payment-in', 
    'purchase-payment-out', 'receivable-aging'
  ],
  DATA_ENTRY: [
    'inventory', 'parties', 'pricelist', 'purchase-bills', 
    'purchase-payment-out', 'purchase-auto-order', 
    'purchase-orders', 'purchase-return'
  ],
  ADMIN: [], // Not used for restriction
  SUPER_ADMIN: [] // Not used for restriction
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'database' | 'fiscal_year' | 'local_backup' | 'import' | 'db-browser' | 'security'>('profile');
  
  const [profile, setProfile] = useState<BusinessProfile>({ name: '', address: '', pan: '', phone: '', email: '', logoUrl: '' });
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({ mode: 'local' });
  const [backupConfig, setBackupConfig] = useState<CloudConfig>({ enabled: false, autoBackup: false, backupSchedules: ["18:00"], googleClientId: "" });

  const [authCreds, setAuthCreds] = useState({ username: '', password: '', confirmPassword: '' });
  const [storageStats, setStorageStats] = useState<{usage: number, quota: number, percent: number} | null>(null);
  const [recordCounts, setRecordCounts] = useState<{table: string, count: number}[]>([]);
  
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState('18:00');

  // Staff Management States
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({ name: '', email: '', password: '', role: 'SALESMAN', permissions: [] });

  // Fiscal Year States
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
    setDbConfig(db.getDatabaseConfig());
    setBackupConfig(db.getCloudConfig());
    setUsers(db.getUsers());
    
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
        db.addUser({
            ...editingUser,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        } as User);
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
      setEditingUser({
          ...editingUser,
          role,
          permissions: DEFAULT_ROLE_PERMISSIONS[role] || []
      });
  };

  const togglePermission = (moduleId: string) => {
      const current = editingUser.permissions || [];
      const updated = current.includes(moduleId) 
        ? current.filter(id => id !== moduleId)
        : [...current, moduleId];
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
      console.error(e);
      addToast('Folder selection cancelled or failed.', 'error');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { addToast('Logo size should be less than 500KB', 'error'); return; }
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
              addToast(`Financial Year ${nextYearName} initialized with carry-forward balances and active repairs.`, 'success');
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
    const newSchedules = [...backupConfig.backupSchedules, newScheduleTime].sort();
    setBackupConfig({ ...backupConfig, backupSchedules: newSchedules });
  };

  const removeSchedule = (time: string) => {
    setBackupConfig({ ...backupConfig, backupSchedules: backupConfig.backupSchedules.filter(s => s !== time) });
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings & Utilities
        </h1>
        <div className="text-xs text-gray-400 font-mono">Build v2.8.0-RBAC</div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
        {[
          { id: 'profile', label: 'Profile', icon: Building2 },
          { id: 'users', label: 'Staff Management', icon: Users, adminOnly: true },
          { id: 'fiscal_year', label: 'Financial Year', icon: CalendarDays, adminOnly: true },
          { id: 'database', label: 'System Storage', icon: Database, adminOnly: true },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'local_backup', label: 'Local Backups', icon: Archive, adminOnly: true },
          { id: 'import', label: 'Restore Data', icon: RefreshCw, adminOnly: true },
          { id: 'db-browser', label: 'Data Explorer', icon: Search, adminOnly: true }
        ]
        .filter(tab => !tab.adminOnly || isAdmin)
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
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Staff & Permissions</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage individual staff accounts and manually control module access.</p>
                        </div>
                        <button onClick={() => { setEditingUser({ name: '', email: '', password: '', role: 'SALESMAN', permissions: DEFAULT_ROLE_PERMISSIONS['SALESMAN'] }); setShowUserModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-600 shadow-md transition-all active:scale-95">
                            <UserPlus className="w-4 h-4" /> Create Staff Account
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {users.map(user => (
                            <div key={user.id} className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Shield className="w-12 h-12" />
                                </div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-lg uppercase">
                                        {user.name.substring(0,1)}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                                            user.role === 'SALESMAN' ? 'bg-emerald-50 text-emerald-600' :
                                            user.role === 'ACCOUNTANT' ? 'bg-blue-50 text-blue-600' :
                                            'bg-orange-50 text-orange-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                        {user.permissions && user.permissions.length > 0 && (
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Custom Access</span>
                                        )}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{user.name}</h3>
                                <p className="text-xs text-gray-400 truncate mb-6">{user.email}</p>
                                
                                <div className="space-y-2 mb-6">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Key Modules Allowed</p>
                                    <div className="flex flex-wrap gap-1">
                                        {(user.permissions || []).slice(0, 5).map(p => (
                                            <span key={p} className="bg-gray-50 dark:bg-gray-800 text-[9px] px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                                                {p.replace('-', ' ')}
                                            </span>
                                        ))}
                                        {(user.permissions || []).length > 5 && (
                                            <span className="text-[9px] px-2 py-0.5 text-gray-400 font-bold">+{(user.permissions || []).length - 5} more</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4">
                                    <button onClick={() => { setEditingUser(user); setShowUserModal(true); }} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5">
                                        <ShieldAlert className="w-3 h-3" /> Edit Permissions
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="col-span-full py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem]">
                                <Users className="w-12 h-12 text-gray-100 dark:text-gray-800" />
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No staff accounts created yet</p>
                            </div>
                        )}
                    </div>

                    {showUserModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{editingUser.id ? 'Manage Staff Account' : 'Register New Staff'}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure credentials and module-level accessibility.</p>
                                    </div>
                                    <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                
                                <form onSubmit={handleSaveUser} className="flex-1 overflow-hidden flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                            {/* Column 1: Basic Info */}
                                            <div className="lg:col-span-4 space-y-6">
                                                <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Basic Credentials</h4>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Employee Name</label>
                                                    <input required className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" placeholder="e.g. Rahul Sharma" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Login Email</label>
                                                    <input required type="email" className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" placeholder="staff@business.com" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Secret Password</label>
                                                    <input required type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-bold" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">System Role Template</label>
                                                    <div className="relative">
                                                        <select className="w-full p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl outline-none font-bold text-indigo-700 dark:text-indigo-300 appearance-none" value={editingUser.role} onChange={e => handleRoleChange(e.target.value as UserRole)}>
                                                            <option value="SALESMAN">Salesman</option>
                                                            <option value="ACCOUNTANT">Accountant</option>
                                                            <option value="DATA_ENTRY">Data Entry</option>
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-indigo-400 pointer-events-none" />
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 italic mt-2">* Selecting a role resets permissions to template defaults. You can customize them after selection.</p>
                                                </div>
                                            </div>

                                            {/* Column 2: Permissions Editor */}
                                            <div className="lg:col-span-8 space-y-6">
                                                <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                                                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Module Access Control</h4>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{editingUser.permissions?.length || 0} Modules Active</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {MODULE_CATEGORIES.map((cat) => (
                                                        <div key={cat.name} className="space-y-3">
                                                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{cat.name}</h5>
                                                            <div className="space-y-1">
                                                                {cat.modules.map((mod) => {
                                                                    const isActive = editingUser.permissions?.includes(mod.id);
                                                                    const Icon = mod.icon;
                                                                    return (
                                                                        <label 
                                                                            key={mod.id} 
                                                                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                                                isActive 
                                                                                ? 'bg-brand-50 border-brand-100 text-brand-700 shadow-sm' 
                                                                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-gray-300'}`} />
                                                                                <span className="text-xs font-bold">{mod.label}</span>
                                                                            </div>
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                                                checked={isActive}
                                                                                onChange={() => togglePermission(mod.id)}
                                                                            />
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-4">
                                        <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-3 text-gray-500 font-bold uppercase text-xs tracking-widest">Discard</button>
                                        <button type="submit" className="px-12 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            {editingUser.id ? 'Save Changes' : 'Create Staff Member'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'fiscal_year' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                    <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-indigo-500" />
                            Financial Year Management
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Close your current period and carry forward opening balances.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-7">
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-tight mb-4">Year End Closing</h3>
                                    <p className="text-indigo-700 dark:text-indigo-300 text-sm leading-relaxed mb-8">
                                        This utility creates a fresh workspace for the next financial year. 
                                        It automatically calculates final balances for all parties, accounts, and stock, 
                                        then injects them as <b>Opening Balances</b> in the new year.
                                    </p>
                                    <ul className="space-y-3 mb-10">
                                        {[
                                            'Auto-Carry Party Balances',
                                            'Auto-Carry Cash & Bank Levels',
                                            'Auto-Carry Closing Stock',
                                            'Preserve Active Warranty Returns',
                                            'Carry Forward Pending Repairs',
                                            'Archives current year for audits'
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-xs font-bold text-indigo-800 dark:text-indigo-200">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                    <button 
                                        onClick={() => setShowCloseWizard(true)}
                                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
                                    >
                                        Close Current Year <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <CalendarDays className="absolute bottom-0 right-0 w-64 h-64 text-indigo-500/10 -mb-16 -mr-16 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                        </div>

                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Pro Accounting Tip</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
                                    "Ongoing repairs and open warranty returns are now automatically carried forward to the new year workspace, ensuring service continuity."
                                </p>
                            </div>
                        </div>
                    </div>

                    {showCloseWizard && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                                <div className="p-10 text-center">
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <RefreshCw className={`w-8 h-8 ${isClosing ? 'animate-spin' : ''}`} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Initialize New Year</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm px-4">
                                        Please enter the identifier for the next financial period. All current balances and active repairs will be migrated.
                                    </p>
                                </div>

                                <div className="px-10 pb-6">
                                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 text-center">Next Financial Year Name</label>
                                    <input 
                                        autoFocus
                                        disabled={isClosing}
                                        type="text" 
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-center text-xl font-black text-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                        value={nextYearName}
                                        onChange={e => setNextYearName(e.target.value)}
                                        placeholder="e.g. 2081/82"
                                    />
                                </div>

                                <div className="px-10 pb-10 flex flex-col gap-3">
                                    <button 
                                        disabled={isClosing || !nextYearName.trim()}
                                        onClick={handlePerformCloseYear}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        {isClosing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Start New Year Now</>}
                                    </button>
                                    <button 
                                        disabled={isClosing}
                                        onClick={() => setShowCloseWizard(false)}
                                        className="w-full py-4 text-gray-400 dark:text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors"
                                    >
                                        I'm not ready yet, Go back
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'local_backup' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
                 <div className="border-b border-gray-100 dark:border-gray-700 pb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-500" /> Automated Path Backups</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Secure your business data in a specific folder on this device.</p>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FolderOpen className="w-4 h-4" /> 1. Storage Path</h3>
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
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> 2. Schedule</h3>
                            
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 mb-6 shadow-sm">
                               <div>
                                  <p className="text-sm font-bold text-gray-800 dark:text-white">Enable Auto-Backup</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">Daily Scheduled Trigger</p>
                               </div>
                               <button 
                                 onClick={() => setBackupConfig({...backupConfig, autoBackup: !backupConfig.autoBackup})}
                                 className={`w-12 h-6 rounded-full relative transition-colors ${backupConfig.autoBackup ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                               >
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${backupConfig.autoBackup ? 'left-7' : 'left-1'}`}></div>
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
                                    {backupConfig.backupSchedules.map(time => (
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
                    <button onClick={handleSaveBackup} className="px-10 py-4 bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-3">
                        <Save className="w-5 h-5" /> Save Backup Plan
                    </button>
                 </div>
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

            {activeTab === 'import' && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><RefreshCw className="w-5 h-5 text-brand-500" /> Restore Points</h2>
                  </div>
                  <DataImport onBack={() => setActiveTab('profile')} />
               </div>
            )}

            {activeTab === 'db-browser' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <DbViewer />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;