
import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Bell, 
  Moon, 
  Sun,
  Menu, 
  Calculator as CalculatorIcon, 
  ChevronDown,
  Keyboard,
  X,
  ArrowLeft,
  Building2,
  LogOut,
  ImageIcon
} from 'lucide-react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { useTheme } from './ThemeProvider';
import Calculator from './Calculator';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [profile, setProfile] = useState({ name: 'AA Pro', logoUrl: '' });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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

  const handleLogout = () => {
    authService.logout();
  };

  const handleSwitchCompany = () => {
    db.logout();
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
          <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400"
              autoFocus
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
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
            <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg w-64 lg:w-96 px-3 py-2 border border-transparent focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900 transition-all">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search or create anything..." 
                className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
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
