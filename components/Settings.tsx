
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { BusinessProfile, DatabaseConfig, CloudConfig, Company } from '../types';
import DataImport from './DataImport';
import DbViewer from './DbViewer';
import { cloudService } from '../services/cloudService';
import { saveDirectoryHandle } from '../services/backupStorage';
import { 
  Save, Building2, MapPin, Hash, Phone, Mail, Database, RefreshCw, 
  CheckCircle, AlertCircle, HardDrive, FileSpreadsheet, Download, Info, 
  ShieldCheck, Activity, Search, Cloud, Clock, Laptop, Image as ImageIcon, 
  Upload, Trash2, RotateCcw, Plus, X, Archive, ArrowRight, Layers, LogIn, 
  Folder, FolderOpen, Lock, Shield
} from 'lucide-react';
import { useToast } from './Toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'database' | 'cloud' | 'import' | 'db-browser' | 'security'>('profile');
  
  const [profile, setProfile] = useState<BusinessProfile>({ name: '', address: '', pan: '', phone: '', email: '', logoUrl: '' });
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({ mode: 'local' });
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({ enabled: false, autoBackup: false, backupSchedules: ["16:00"], googleClientId: "" });

  // Security State
  const [authCreds, setAuthCreds] = useState({ username: '', password: '', confirmPassword: '' });

  const [isSaved, setIsSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [integrityStatus, setIntegrityStatus] = useState<{status: 'idle' | 'scanning' | 'ok' | 'issues', message: string}>({status: 'idle', message: ''});
  const [storageStats, setStorageStats] = useState<{usage: number, quota: number} | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
    setProfile(db.getBusinessProfile());
    setDbConfig(db.getDatabaseConfig());
    setCloudConfig(db.getCloudConfig());
    
    const creds = authService.getStoredCredentials();
    setAuthCreds({ username: creds.username, password: creds.password, confirmPassword: creds.password });

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          setStorageStats({ usage: estimate.usage, quota: estimate.quota });
        }
      });
    }
  }, []);

  const handleProfileChange = (field: keyof BusinessProfile, value: string) => { setProfile(prev => ({ ...prev, [field]: value })); setIsSaved(false); };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateBusinessProfile(profile);
    setIsSaved(true);
    addToast('Company profile saved successfully', 'success');
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCreds.password !== authCreds.confirmPassword) {
      addToast('Passwords do not match!', 'error');
      return;
    }
    authService.updateCredentials(authCreds.username, authCreds.password);
    addToast('Security credentials updated. These will be required for next login.', 'success');
  };

  const handleBackup = async () => {
    try {
      const jsonString = cloudService.generateBackupData();
      const fileName = `aapro_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      addToast('Backup file downloaded', 'success');
    } catch (e) { addToast('Failed to generate backup', 'error'); }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'profile', label: 'Profile', icon: Building2 },
          { id: 'database', label: 'Database', icon: Database },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'cloud', label: 'Backup', icon: Cloud },
          { id: 'import', label: 'Import', icon: FileSpreadsheet },
          { id: 'db-browser', label: 'Explorer', icon: Search }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4 mb-4">
               <h2 className="text-lg font-semibold text-gray-800">Company Profile</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label><input type="text" required className="w-full p-2.5 border border-gray-300 rounded-lg outline-none" value={profile.name} onChange={e => handleProfileChange('name', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Address</label><input type="text" required className="w-full p-2.5 border border-gray-300 rounded-lg outline-none" value={profile.address} onChange={e => handleProfileChange('address', e.target.value)} /></div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-100"><button type="submit" className="px-6 py-2.5 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors shadow-sm">Save Profile</button></div>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleSaveSecurity} className="p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4 mb-4">
               <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Lock className="w-5 h-5 text-brand-500" /> Account Security</h2>
               <p className="text-sm text-gray-500">Change your login email and password.</p>
            </div>
            
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Login Email / Username</label>
                <input 
                  type="email" 
                  required 
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" 
                  value={authCreds.username} 
                  onChange={e => setAuthCreds({...authCreds, username: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" 
                  value={authCreds.password} 
                  onChange={e => setAuthCreds({...authCreds, password: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" 
                  value={authCreds.confirmPassword} 
                  onChange={e => setAuthCreds({...authCreds, confirmPassword: e.target.value})} 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
               <button type="submit" className="px-6 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-black transition-colors shadow-sm flex items-center gap-2">
                 <Save className="w-4 h-4" /> Update Credentials
               </button>
            </div>
          </form>
        )}

        {activeTab === 'cloud' && (
          <div className="p-6 space-y-6">
             <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Cloud className="w-5 h-5 text-blue-500" /> Backup Data</h2>
                <p className="text-sm text-gray-500">Download your entire business data as a secure JSON file.</p>
             </div>
             <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><Download className="w-8 h-8 text-emerald-600" /></div>
                <h3 className="font-bold text-emerald-900 text-xl mb-2">Manual Backup</h3>
                <p className="text-emerald-700 text-sm max-w-sm mx-auto mb-6">Create a point-in-time copy of your database. Keep this file safe as it contains all your private business information.</p>
                <button onClick={handleBackup} className="px-10 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20">Download Backup File</button>
             </div>
          </div>
        )}

        {activeTab === 'import' && (
           <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-brand-500" /> Import Data</h3>
              <DataImport onBack={() => setActiveTab('profile')} />
           </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
