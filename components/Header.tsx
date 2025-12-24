
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Search, 
  Bell, 
  Moon, 
  Sun,
  Menu, 
  ChevronDown,
  X,
  ArrowLeft,
  Building2,
  LogOut,
  Tag,
  ShoppingCart,
  Receipt,
  Wrench,
  RotateCcw,
  User,
  Hash,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { useTheme } from './ThemeProvider';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';

interface HeaderProps {
  onMenuClick: () => void;
  onNavigate: (tab: string) => void;
}

interface SearchResult {
    id: string;
    type: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'SERVICE' | 'WARRANTY';
    title: string;
    subtitle: string;
    date: string;
    amount?: number;
    tab: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onNavigate }) => {
  const [profile, setProfile] = useState({ name: 'AA Pro', logoUrl: '' });
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const data = db.getBusinessProfile();
    setProfile({ name: data.name || 'AA Pro', logoUrl: data.logoUrl || '' });
    
    const handleUpdate = () => {
        const data = db.getBusinessProfile();
        setProfile({ name: data.name || 'AA Pro', logoUrl: data.logoUrl || '' });
    };
    window.addEventListener('db-updated', handleUpdate);
    return () => window.removeEventListener('db-updated', handleUpdate);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const globalResults = useMemo(() => {
      if (!searchText.trim()) return [];
      const term = searchText.toLowerCase();
      const results: SearchResult[] = [];

      db.getTransactions().forEach(t => {
          const matches = t.id.toLowerCase().includes(term) || 
                          t.partyName.toLowerCase().includes(term) || 
                          (t.notes && t.notes.toLowerCase().includes(term));
          
          if (matches) {
              let tab = 'dashboard';
              if (t.type === 'SALE') tab = 'sales-invoices';
              else if (t.type === 'PURCHASE') tab = 'purchase-bills';
              else if (t.type === 'EXPENSE') tab = 'expense';
              else if (t.type === 'QUOTATION') tab = 'sales-quotations';
              else if (t.type === 'PURCHASE_ORDER') tab = 'purchase-orders';

              results.push({
                  id: t.id,
                  type: t.type as any,
                  title: `${t.type.replace('_', ' ')} #${t.id.slice(-6)}`,
                  subtitle: t.partyName,
                  date: t.date,
                  amount: t.totalAmount,
                  tab
              });
          }
      });

      db.getServiceJobs().forEach(j => {
          const matches = j.ticketNumber.toLowerCase().includes(term) || 
                          j.customerName.toLowerCase().includes(term) || 
                          j.deviceModel.toLowerCase().includes(term);
          if (matches) {
              results.push({
                  id: j.id,
                  type: 'SERVICE',
                  title: `Repair ${j.ticketNumber}`,
                  subtitle: `${j.customerName} - ${j.deviceModel}`,
                  date: j.date,
                  tab: 'service-center'
              });
          }
      });

      db.getWarrantyCases().forEach(w => {
          const matches = w.ticketNumber.toLowerCase().includes(term) || 
                          w.customerName.toLowerCase().includes(term) || 
                          w.items.some(i => i.productName.toLowerCase().includes(term) || i.serialNumber.toLowerCase().includes(term));
          if (matches) {
              results.push({
                  id: w.id,
                  type: 'WARRANTY',
                  title: `Warranty ${w.ticketNumber}`,
                  subtitle: `${w.customerName} (${w.items.length} items)`,
                  date: w.dateReceived,
                  tab: 'warranty-return'
              });
          }
      });

      return results.slice(0, 10);
  }, [searchText]);

  const handleResultClick = (result: SearchResult) => {
      onNavigate(result.tab);
      setSearchText('');
      setShowResults(false);
      setShowMobileSearch(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || globalResults.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % globalResults.length);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + globalResults.length) % globalResults.length);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        handleResultClick(globalResults[highlightedIndex]);
    } else if (e.key === 'Escape') {
        setShowResults(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  const handleSwitchCompany = () => {
    db.logout();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
        case 'SALE': return <Tag className="w-4 h-4 text-emerald-500" />;
        case 'PURCHASE': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
        case 'EXPENSE': return <Receipt className="w-4 h-4 text-red-500" />;
        case 'SERVICE': return <Wrench className="w-4 h-4 text-orange-500" />;
        case 'WARRANTY': return <RotateCcw className="w-4 h-4 text-purple-500" />;
        default: return <Hash className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 lg:px-8 justify-between transition-colors duration-200">
      {showMobileSearch ? (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 z-50 flex items-center px-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <button 
            onClick={() => setShowMobileSearch(false)}
            className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex flex-col relative">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search globally..." 
                className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 font-medium"
                autoFocus
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setShowResults(true); setHighlightedIndex(0); }}
                onKeyDown={handleKeyDown}
              />
            </div>
            {showResults && globalResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-b-xl mt-1 max-h-[60vh] overflow-auto z-[60]">
                    {globalResults.map((r, idx) => (
                        <div 
                            key={`${r.type}-${r.id}`}
                            className={`p-3 border-b dark:border-gray-700 flex items-center gap-3 cursor-pointer ${highlightedIndex === idx ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            onClick={() => handleResultClick(r)}
                        >
                            <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">{getResultIcon(r.type)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{r.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{r.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <button 
              onClick={onMenuClick}
              className="p-2 text-gray-500 dark:text-gray-400 rounded-lg lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:block relative" ref={searchWrapperRef}>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl w-64 lg:w-[400px] px-3 py-2 border-2 border-transparent focus-within:border-brand-500/50 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all shadow-sm">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Global search (Sales, Services, Warranty...)" 
                    className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400 font-medium"
                    value={searchText}
                    onChange={(e) => { setSearchText(e.target.value); setShowResults(true); setHighlightedIndex(0); }}
                    onFocus={() => setShowResults(true)}
                    onKeyDown={handleKeyDown}
                />
                </div>
                
                {showResults && searchText.trim() && (
                    <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl mt-2 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-2 border-b dark:border-gray-700 flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search Results</span>
                            <span className="text-[10px] text-brand-600 font-bold uppercase">{globalResults.length} found</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {globalResults.map((r, idx) => (
                                <div 
                                    key={`${r.type}-${r.id}`}
                                    data-index={idx}
                                    className={`px-4 py-3 border-b last:border-0 dark:border-gray-700 flex items-center justify-between cursor-pointer group transition-all ${highlightedIndex === idx ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                    onClick={() => handleResultClick(r)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-xl bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 group-hover:scale-110 transition-transform`}>
                                            {getResultIcon(r.type)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-black transition-colors ${highlightedIndex === idx ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                                {r.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <User className="w-3 h-3 text-gray-300" />
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[180px]">{r.subtitle}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {r.amount !== undefined && <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(r.amount)}</p>}
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{formatNepaliDate(r.date)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            <button 
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hidden sm:block"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <div 
                className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded-lg"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                 <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center border border-gray-100 dark:border-gray-600 shadow-sm overflow-hidden shrink-0">
                   {profile.logoUrl ? (
                      <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                   ) : (
                      <div className="w-full h-full bg-brand-50 text-brand-600 flex items-center justify-center text-[10px] font-black uppercase">
                        {profile.name.substring(0, 2)}
                      </div>
                   )}
                 </div>
                 <div className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[150px]">
                   {profile.name}
                 </div>
                 <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
              </div>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                     <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Current Company</p>
                        <p className="font-bold text-gray-800 dark:text-white truncate">{profile.name}</p>
                     </div>
                     <div className="p-1">
                        <button 
                          onClick={handleSwitchCompany}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                           <Building2 className="w-4 h-4" />
                           Switch Company
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                           <LogOut className="w-4 h-4" />
                           Log Out
                        </button>
                     </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
    </>
  );
};

export default Header;
