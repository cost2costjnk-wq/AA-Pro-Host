
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Company } from '../types';
import { Building2, Plus, ArrowRight, Loader2, RefreshCw, FolderOpen, Cloud, Database, X, ChevronRight, AlertCircle, FileJson, CheckCircle } from 'lucide-react';
import { getDirectoryHandle, verifyPermission } from '../services/backupStorage';
import { cloudService } from '../services/cloudService';
import { useToast } from './Toast';

interface CompanySelectorProps {
  onSelect: () => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ onSelect }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Restore States
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreSource, setRestoreSource] = useState<'path' | 'cloud'>('path');
  const [foundBackups, setFoundBackups] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningError, setScanningError] = useState('');

  const { addToast } = useToast();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const list = await db.getCompanies();
      setCompanies(list);
    } catch (e) {
      console.error("Failed to load companies", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    try {
        setSwitchingId(id);
        await db.switchCompany(id);
        onSelect();
    } catch (e) {
        console.error("Failed to switch company", e);
        setSwitchingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    
    setCreating(true);
    try {
      const company = await db.createCompany(newCompanyName);
      await handleSelect(company.id);
    } catch (e) {
      console.error("Failed to create company", e);
      setCreating(false);
    }
  };

  const scanBackupFolder = async () => {
      setRestoreSource('path');
      setIsScanning(true);
      setScanningError('');
      setFoundBackups([]);
      try {
          const handle = await getDirectoryHandle();
          if (!handle) {
              setScanningError('No backup folder specified. Please set one in Settings > Auto Backups.');
              setIsScanning(false);
              return;
          }

          const hasPermission = await verifyPermission(handle, false);
          if (!hasPermission) {
              setScanningError('Permission to access the backup folder was denied.');
              setIsScanning(false);
              return;
          }

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
          setFoundBackups(backups.sort((a, b) => b.date.getTime() - a.date.getTime()));
      } catch (err) {
          setScanningError('Failed to scan directory. The path might be inaccessible.');
      } finally {
          setIsScanning(false);
      }
  };

  const scanCloudBackups = async () => {
      setRestoreSource('cloud');
      setIsScanning(true);
      setScanningError('');
      setFoundBackups([]);
      
      const config = db.getCloudConfig();
      if (!config.googleClientId) {
          setScanningError('Google Client ID is not configured. Please login and set it in Settings.');
          setIsScanning(false);
          return;
      }

      try {
          const files = await cloudService.listBackups();
          setFoundBackups(files.map(f => ({
              id: f.id,
              name: f.name,
              date: new Date(f.modifiedTime)
          })));
      } catch (err: any) {
          if (err.message.includes('Google Drive not configured')) {
              cloudService.requestToken();
              setScanningError('Initializing Google Authentication. Please try again after logging in.');
          } else {
              setScanningError(err.message || 'Failed to fetch from Google Drive');
          }
      } finally {
          setIsScanning(false);
      }
  };

  const handleRestore = async (backup: any) => {
      const sourceLabel = restoreSource === 'path' ? 'local folder' : 'Google Drive';
      if (!window.confirm(`Restore "${backup.name}" from ${sourceLabel}? Current local data will be replaced.`)) return;
      
      try {
          let json;
          if (restoreSource === 'path') {
              const file = await backup.handle.getFile();
              json = JSON.parse(await file.text());
          } else {
              addToast('Downloading from cloud...', 'info');
              json = await cloudService.downloadFile(backup.id);
          }
          
          const result = await db.restoreData(json);
          if (result.success) {
              addToast('System restored successfully!', 'success');
              setTimeout(() => window.location.reload(), 1500);
          } else {
              addToast(result.message || 'Restoration failed', 'error');
          }
      } catch (err) {
          addToast('Error processing backup file', 'error');
      }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="bg-brand-500 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Database className="w-24 h-24 rotate-12" />
           </div>
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <Building2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-2xl font-black mb-1 uppercase tracking-tight">Business Hub</h1>
           <p className="text-brand-100 text-xs font-bold uppercase tracking-widest opacity-80">Select Workspace</p>
        </div>

        <div className="p-6">
           {showCreate ? (
             <form onSubmit={handleCreate} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div>
                   <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">New Company Name</label>
                   <input 
                     autoFocus
                     type="text" 
                     className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold transition-all"
                     placeholder="e.g. Acme Traders Pvt Ltd"
                     value={newCompanyName}
                     onChange={e => setNewCompanyName(e.target.value)}
                   />
                </div>
                <div className="flex gap-3">
                   <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-200">Cancel</button>
                   <button type="submit" disabled={creating || !newCompanyName.trim()} className="flex-1 py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm hover:bg-brand-600 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/30">
                     {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Workspace'}
                   </button>
                </div>
             </form>
           ) : (
             <div className="space-y-6">
               <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {companies.map(company => (
                    <button key={company.id} onClick={() => handleSelect(company.id)} className="w-full text-left p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg transition-all group bg-white dark:bg-gray-800 active:scale-[0.98]">
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors"><Building2 className="w-5 h-5" /></div>
                             <div>
                                <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{company.name}</h3>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mt-0.5">ID: {company.id.substring(0,8)}</p>
                             </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-colors" />
                       </div>
                    </button>
                  ))}
               </div>
               
               <div className="space-y-2">
                 <button onClick={() => setShowCreate(true)} className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-2xl font-bold text-sm hover:border-brand-500 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Create New Business
                 </button>
                 
                 <div className="flex gap-2">
                    <button onClick={() => { setShowRestoreModal(true); scanBackupFolder(); }} className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-100 transition-all flex items-center justify-center gap-2 border border-blue-100">
                        <FolderOpen className="w-3.5 h-3.5" /> Restore Path
                    </button>
                    <button onClick={() => { setShowRestoreModal(true); scanCloudBackups(); }} className="flex-1 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-orange-100 transition-all flex items-center justify-center gap-2 border border-orange-100">
                        <Cloud className="w-3.5 h-3.5" /> Cloud Sync
                    </button>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>

      {showRestoreModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className={`p-6 text-white flex justify-between items-center ${restoreSource === 'path' ? 'bg-blue-600' : 'bg-orange-600'}`}>
                    <div>
                        <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                            {restoreSource === 'path' ? <RefreshCw className="w-6 h-6" /> : <Cloud className="w-6 h-6" />}
                            {restoreSource === 'path' ? 'Path Recovery' : 'Cloud Recovery'}
                        </h3>
                        <p className="text-white/80 text-xs font-medium mt-1">Listing AAPro system backups from your {restoreSource === 'path' ? 'local path' : 'Google Drive'}.</p>
                    </div>
                    <button onClick={() => setShowRestoreModal(false)} className="p-2 hover:bg-white/20 rounded-full"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {isScanning ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                            <p className="text-sm font-bold uppercase tracking-widest">Accessing storage...</p>
                        </div>
                    ) : scanningError ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 p-6 rounded-2xl text-center">
                            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                            <p className="text-red-700 dark:text-red-400 font-bold mb-4">{scanningError}</p>
                            <button onClick={() => setShowRestoreModal(false)} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm">Close</button>
                        </div>
                    ) : foundBackups.length > 0 ? (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Backups Discovered</h4>
                            {foundBackups.map((backup) => (
                                <button key={backup.id} onClick={() => handleRestore(backup)} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-brand-50 border border-gray-100 dark:border-gray-600 rounded-2xl group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-brand-500 border border-gray-100"><FileJson className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800 dark:text-white truncate max-w-[200px]">{backup.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">{backup.date.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="bg-brand-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><RefreshCw className="w-4 h-4" /></div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center text-gray-400">
                            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">No valid backups found</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 flex justify-end">
                    <button onClick={restoreSource === 'path' ? scanBackupFolder : scanCloudBackups} className="px-6 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-bold text-sm shadow-sm border border-gray-200 flex items-center gap-2 hover:bg-gray-50">
                        <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} /> Refresh List
                    </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default CompanySelector;
