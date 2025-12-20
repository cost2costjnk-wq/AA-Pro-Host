
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Company } from '../types';
import { Building2, Plus, ArrowRight, Loader2 } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        
        <div className="bg-brand-500 p-8 text-center text-white">
           <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Building2 className="w-8 h-8 text-white" />
           </div>
           <h1 className="text-2xl font-bold mb-1">Welcome to AA Pro</h1>
           <p className="text-brand-100 text-sm">Select a company to manage</p>
        </div>

        <div className="p-6">
           {showCreate ? (
             <form onSubmit={handleCreate} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                   <input 
                     autoFocus
                     type="text" 
                     className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                     placeholder="e.g. My Business Pvt Ltd"
                     value={newCompanyName}
                     onChange={e => setNewCompanyName(e.target.value)}
                   />
                </div>
                <div className="flex gap-3">
                   <button 
                     type="button" 
                     onClick={() => setShowCreate(false)}
                     className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit" 
                     disabled={creating || !newCompanyName.trim()}
                     className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Company'}
                   </button>
                </div>
             </form>
           ) : (
             <div className="space-y-3">
               <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => handleSelect(company.id)}
                      disabled={switchingId !== null}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all group bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-wait"
                    >
                       <div className="flex justify-between items-center">
                          <div>
                             <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{company.name}</h3>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ID: {company.id.substring(0,8)}</p>
                          </div>
                          {switchingId === company.id ? (
                              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                          ) : (
                              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-colors" />
                          )}
                       </div>
                    </button>
                  ))}
               </div>
               
               <button 
                 onClick={() => setShowCreate(true)}
                 disabled={switchingId !== null}
                 className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl font-medium hover:border-brand-500 hover:text-brand-500 dark:hover:text-brand-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 <Plus className="w-5 h-5" />
                 Create New Company
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CompanySelector;
