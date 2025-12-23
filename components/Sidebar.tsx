import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Tag, 
  ShoppingCart, 
  Receipt, 
  FileBarChart, 
  ChevronDown,
  ShoppingBag,
  Circle,
  Settings,
  ClipboardList,
  Building2,
  X,
  Wrench,
  Zap,
  ClipboardCheck,
  Banknote,
  Keyboard,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { NavItem } from '../types';
import { authService } from '../services/authService';

interface SidebarProps {
  isOpen: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeTab, setActiveTab, onClose }) => {
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const isSuper = authService.isSuperAdmin();
  const userRole = authService.getUserRole();

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleNavigation = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };
  
  const menuItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'parties', label: 'Parties', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'service-center', label: 'Service Center', icon: Wrench },
    { id: 'warranty-return', label: 'Warranty Return', icon: RotateCcw },
    { id: 'pricelist', label: 'Price List', icon: ClipboardList },
    { 
      id: 'sales', 
      label: 'Sales', 
      icon: Tag, 
      subItems: [
        { id: 'sales-invoices', label: 'Sales Invoices' },
        { id: 'sales-payment-in', label: 'Payment In' },
        { id: 'sales-quotations', label: 'Quotations' },
        { id: 'sales-return', label: 'Sales Return' },
      ]
    },
    { 
      id: 'purchase', 
      label: 'Purchase', 
      icon: ShoppingCart, 
      subItems: [
         { id: 'purchase-bills', label: 'Purchase Bills' },
         { id: 'purchase-payment-out', label: 'Payment Out' },
         { id: 'purchase-auto-order', label: 'Auto Order (Restock)' },
         { id: 'purchase-orders', label: 'Purchase Orders' },
         { id: 'purchase-return', label: 'Purchase Return' },
      ]
    },
    { id: 'cash-drawer', label: 'Cash Drawer', icon: Banknote },
    { id: 'expense', label: 'Expense', icon: Receipt },
    { id: 'manage-accounts', label: 'Manage Accounts', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'shortcut-keys', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Filter items based on permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (isSuper || userRole === 'ADMIN') return true;
    if (item.subItems) {
      // If it has sub-items, check if at least one sub-item is allowed
      return item.subItems.some(sub => authService.hasPermission(sub.id));
    }
    return authService.hasPermission(item.id);
  });

  if (isSuper) {
    filteredMenuItems.push({ id: 'admin-dashboard', label: 'Admin Dashboard', icon: ShieldCheck });
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onMouseEnter={onClose}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl lg:shadow-none`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-500">
            <ShoppingBag className="w-8 h-8" />
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">AA Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3">
            Menu
          </div>

          <nav className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedMenus.includes(item.id);
              const isExactActive = activeTab === item.id;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (item.subItems) {
                        toggleMenu(item.id);
                      } else {
                        handleNavigation(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isExactActive 
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                        : (item.id === 'admin-dashboard' 
                           ? 'bg-brand-900 text-brand-100 hover:bg-brand-800' 
                           : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isExactActive ? 'text-white' : (item.id === 'admin-dashboard' ? 'text-brand-400' : 'text-gray-400 dark:text-gray-500')}`} />
                      {item.label}
                    </div>
                    {item.subItems && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isExactActive ? 'text-white' : 'text-gray-300 dark:text-gray-600'}`} />
                    )}
                  </button>
                  
                  {item.subItems && isExpanded && (
                    <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-gray-700 pl-2">
                      {item.subItems
                        .filter(sub => isSuper || userRole === 'ADMIN' || authService.hasPermission(sub.id))
                        .map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleNavigation(sub.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            activeTab === sub.id
                              ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-medium'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                           <Circle className={`w-2 h-2 ${activeTab === sub.id ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                           {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
           <div className="flex items-center gap-3 px-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isSuper ? 'bg-blue-500' : (userRole === 'ADMIN' ? 'bg-emerald-500' : 'bg-orange-500')}`}></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isSuper ? 'Super Admin' : (userRole === 'ADMIN' ? 'Owner Node' : `Role: ${userRole}`)}</span>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;