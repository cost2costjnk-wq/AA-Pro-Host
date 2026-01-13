
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Company } from '../types';
import { Building2, Plus, Loader2, Database, ChevronRight, ShieldQuestion, ArrowRight, X, Clock } from 'lucide-react';
import { autoBackupService } from '../services/autoBackupService';
import { compressionService } from '../services/compressionService';
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
  
  const [pendingSwitch, setPendingSwitch] = useState<{ id: string, name: string } | null>(null);
  const [latestBackup, setLatestBackup] = useState<any | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

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

  const handleSelectRequest = async (id: string, name: string) => {
    setPendingSwitch({ id, name });
    const latest = await autoBackupService.getLatestBackupForCompany(name);
    setLatestBackup(latest);
  };

  const handleConfirmedSwitch = async (withBackup: boolean, restoreTarget?: any) => {
    if (!pendingSwitch) return;
    setIsSwitching(true);

    try {
      // 1. First, create a backup of the current active company before switching
      if (withBackup) {
          addToast('Securing active data node...', 'info');
          await autoBackupService.performLocalBackup();
      }

      // 2. Switch the active DB ID
      await db.switchCompany(pendingSwitch.id);
      localStorage.setItem('active_company_id', pendingSwitch.id);

      // 3. Auto Restore the latest found backup for the NEW company
      if (restoreTarget) {
          addToast('Restoring latest physical state...', 'info');
          const file = await restoreTarget.handle.getFile();
          let json: any;
          if (restoreTarget.name.endsWith('.gz')) {
              const buffer = new Uint8Array(await file.arrayBuffer());
              const text = await compressionService.decompress(buffer);
              json = JSON.parse(text);
          } else {
              const text = await file.text();
              json = JSON.parse(text);
          }
          await db.restoreData(json);
      }

      onSelect();
    } catch (e) {
      console.error("Switch reconciliation failed:", e);
      addToast('System error during state reconciliation', 'error');
    } finally {
      setIsSwitching(false);
      setPendingSwitch(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    
    setCreating(true);
    try {
      const company = await db.createCompany(newCompanyName);
      await db.switchCompany(company.id);
      localStorage.setItem('active_company_id', company.id);
      onSelect();
    } catch (e) {
      console.error("Failed to create company", e);
      setCreating(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="bg-brand-500 p-8 text-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Database className="w-24 h-24 rotate-12" />
           </div>
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              <Building2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-2xl font-black mb-1 uppercase tracking-tight">Business Entry</h1>
           <p className="text-brand-100 text-xs font-bold uppercase tracking-widest opacity-80">Local-First Management Suite</p>
        </div>

        <div className="p-6">
           {showCreate ? (
             <form onSubmit={handleCreate} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div>
                   <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">New Workspace Name</label>
                   <input 
                     autoFocus
                     type="text" 
                     className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold transition-all"
                     placeholder="e.g. My Retail Shop"
                     value={newCompanyName}
                     onChange={e => setNewCompanyName(e.target.value)}
                   />
                </div>
                <div className="flex gap-3">
                   <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">Cancel</button>
                   <button type="submit" disabled={creating || !newCompanyName.trim()} className="flex-1 py-4 bg-brand-500 text-white rounded-2xl font-bold text-sm hover:bg-brand-600 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/30 active:scale-95 transition-all">
                     {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Workspace'}
                   </button>
                </div>
             </form>
           ) : (
             <div className="space-y-6">
               <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {companies.length > 0 ? companies.map(company => (
                    <button key={company.id} onClick={() => handleSelectRequest(company.id, company.name)} className="w-full text-left p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg transition-all group bg-white dark:bg-gray-800 active:scale-[0.98]">
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                             <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors shadow-sm"><Building2 className="w-5 h-5" /></div>
                             <div>
                                <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{company.name}</h3>
                                <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mt-0.5">Workspace ID: {company.id.substring(0,8)}</p>
                             </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-brand-500 transition-colors" />
                       </div>
                    </button>
                  )) : (
                    <div className="py-10 text-center flex flex-col items-center">
                        <ArrowRight className="w-12 h-12 text-gray-200 mb-2 rotate-90" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No workspaces found.</p>
                    </div>
                  )}
               </div>
               
               <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                 <button onClick={() => setShowCreate(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-900/20 active:scale-95">
                    <Plus className="w-4 h-4" /> Initialize New Workspace
                 </button>
               </div>
             </div>
           )}
        </div>
      </div>

      {pendingSwitch && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
             <div className="p-10 text-center">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <ShieldQuestion className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Workspace Sync</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Entering <b>{pendingSwitch.name}</b>.</p>
                
                <div className="mt-8 space-y-4">
                    {latestBackup ? (
                        <button 
                            disabled={isSwitching}
                            onClick={() => handleConfirmedSwitch(true, latestBackup)}
                            className="w-full p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-3xl text-left hover:bg-emerald-100 transition-all group flex items-center justify-between"
                        >
                            <div>
                                <p className="font-bold text-emerald-900 dark:text-emerald-100">Restore Latest Snapshot</p>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> Found Point: {latestBackup.date.toLocaleString()}
                                </p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-2xl text-xs text-orange-600 font-bold uppercase tracking-widest text-center">
                            No physical backups found for this workspace
                        </div>
                    )}

                    <button 
                        disabled={isSwitching}
                        onClick={() => handleConfirmedSwitch(true)}
                        className="w-full p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl text-left hover:bg-blue-100 transition-all group flex items-center justify-between"
                    >
                        <div>
                            <p className="font-bold text-blue-900 dark:text-blue-100">Load Existing Node State</p>
                            <p className="text-[10px] text-blue-400 font-bold uppercase mt-1">Continue with current data in browser cache</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-blue-300 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                        disabled={isSwitching}
                        onClick={() => setPendingSwitch(null)}
                        className="mt-6 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors"
                    >
                        Abort Switch
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySelector;
