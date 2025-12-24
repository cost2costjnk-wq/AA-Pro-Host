
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Parties from './components/Parties';
import Inventory from './components/Inventory';
import PriceList from './components/PriceList';
import TransactionList from './components/TransactionList';
import PosForm from './components/PosForm';
import PaymentForm from './components/PaymentForm';
import Settings from './components/Settings';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import Reports from './components/Reports';
import ManageAccounts from './components/ManageAccounts';
import CompanySelector from './components/CompanySelector';
import ServiceCenter from './components/ServiceCenter';
import WarrantyManager from './components/WarrantyManager';
import CashDrawerManager from './components/CashDrawer';
import LoginPage from './components/LoginPage';
import ShortcutGuide from './components/ShortcutGuide';
import AdminDashboard from './components/AdminDashboard';
import AIAssistant from './components/AIAssistant';
import { Transaction, TransactionItem } from './types';
import { db } from './services/db';
import { authService } from './services/authService';
import { autoBackupService } from './services/autoBackupService';
import { Loader2, RefreshCw, X, Database, ShieldAlert } from 'lucide-react';
import { useToast } from './components/Toast';

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(authService.isAuthenticated());
  const [companySelected, setCompanySelected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [showPos, setShowPos] = useState<Transaction['type'] | null>(null);
  const [showOverlay, setShowOverlay] = useState<Transaction['type'] | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [overlayEditingTransaction, setOverlayEditingTransaction] = useState<Transaction | null>(null);
  
  const [refreshKey, setRefreshKey] = useState(0);
  const [detectedBackup, setDetectedBackup] = useState<any | null>(null);

  const { addToast } = useToast();
  const isSuper = authService.isSuperAdmin();

  const setRoleBasedInitialTab = () => {
      const currentTab = activeTab;
      if (!authService.hasPermission(currentTab)) {
          const menuOrder = [
            'dashboard', 'parties', 'inventory', 'service-center', 'warranty-return', 
            'sales-invoices', 'purchase-bills', 'cash-drawer', 'expense', 'reports', 'settings'
          ];
          const firstAllowed = menuOrder.find(id => authService.hasPermission(id));
          if (firstAllowed) setActiveTab(firstAllowed);
      }
  };

  useEffect(() => {
    const initApp = async () => {
      if (!isLoggedIn) {
          setIsDbReady(true);
          return;
      }

      if (authService.isSuperAdmin()) {
          setIsDbReady(true);
          return;
      }

      let activeId = localStorage.getItem('active_company_id');
      
      if (!activeId && authService.getUserRole() === 'ADMIN') {
         const companies = await db.getCompanies();
         if (companies.length > 0) {
            activeId = companies[0].id;
            localStorage.setItem('active_company_id', activeId);
         }
      }

      if (activeId) {
        await db.init(activeId);
        if (db.getActiveCompanyId()) {
           setCompanySelected(true);
           setIsDbReady(true);
           autoBackupService.start();
           setRoleBasedInitialTab();
        } else {
           localStorage.removeItem('active_company_id');
           setCompanySelected(false);
           setIsDbReady(true);
        }
      } else {
        setCompanySelected(false);
        setIsDbReady(true);
      }
    };
    initApp();

    const handleUpdate = () => {
        setRefreshKey(prev => prev + 1);
    };
    const handleLogout = () => { 
        setCompanySelected(false); 
        setIsLoggedIn(false);
        autoBackupService.stop(); 
    };
    const handleBackupDetected = (e: any) => setDetectedBackup(e.detail);
    
    window.addEventListener('db-updated', handleUpdate);
    window.addEventListener('db-logout', handleLogout);
    window.addEventListener('new-backup-detected', handleBackupDetected);
    
    return () => {
       window.removeEventListener('db-updated', handleUpdate);
       window.removeEventListener('db-logout', handleLogout);
       window.removeEventListener('new-backup-detected', handleBackupDetected);
       autoBackupService.stop();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isSuper || !isLoggedIn) return;

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 's' && authService.hasPermission('sales-invoices')) { 
          e.preventDefault();
          setEditingTransaction(null);
          setShowPos('SALE');
        } else if (key === 'a' && authService.hasPermission('receivable-aging')) { 
          e.preventDefault();
          setActiveTab('receivable-aging');
        } else if (key === 'l' && authService.hasPermission('sales-invoices')) { 
          e.preventDefault();
          setActiveTab('sales-invoices');
        } else if (key === 'p' && authService.hasPermission('purchase-bills')) { 
          e.preventDefault();
          setEditingTransaction(null);
          setShowPos('PURCHASE');
        } else if (key === 'i' && authService.hasPermission('sales-payment-in')) { 
          e.preventDefault();
          setOverlayEditingTransaction(null);
          setShowOverlay('PAYMENT_IN');
        } else if (key === 'o' && authService.hasPermission('purchase-payment-out')) { 
          e.preventDefault();
          setOverlayEditingTransaction(null);
          setShowOverlay('PAYMENT_OUT');
        } else if (key === 'e' && authService.hasPermission('expense')) { 
          e.preventDefault();
          setOverlayEditingTransaction(null);
          setShowOverlay('EXPENSE');
        } else if (key === 'd' && authService.hasPermission('dashboard')) { 
          e.preventDefault();
          setActiveTab('dashboard');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isSuper, isLoggedIn]);

  const handlePerformSync = async () => {
    if (!detectedBackup) return;
    const confirmRestore = window.confirm(`Update Local System?\nA newer backup was found: ${detectedBackup.name}\n\nThis will update your local data. Continue?`);
    
    if (confirmRestore) {
        const result = await db.restoreData(detectedBackup.data);
        if (result.success) {
            addToast('System successfully synchronized!', 'success');
            setDetectedBackup(null);
            setRefreshKey(prev => prev + 1);
        } else {
            addToast('Synchronization failed.', 'error');
        }
    } else {
        setDetectedBackup(null);
    }
  };

  const handleEdit = (t: Transaction) => { 
    if (['PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE'].includes(t.type)) {
        setOverlayEditingTransaction(t);
        setShowOverlay(t.type);
    } else {
        setEditingTransaction(t); 
        setShowPos(t.type); 
    }
  };

  const handleAutoOrderConvert = (items: TransactionItem[]) => {
      setEditingTransaction({
          id: '',
          date: new Date().toISOString(),
          type: 'PURCHASE',
          partyId: '',
          partyName: '',
          items: items,
          totalAmount: items.reduce((s, i) => s + i.amount, 0),
          notes: 'Auto-generated from Restock Assistant'
      } as Transaction);
      setShowPos('PURCHASE');
  };

  const renderContent = () => {
    if (!authService.hasPermission(activeTab)) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Access Denied</h2>
                <p className="text-gray-500 mt-2 max-w-sm">Permissions missing for <b>{activeTab}</b>.</p>
                <button onClick={() => setActiveTab('dashboard')} className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest">Go Home</button>
            </div>
        );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'parties': return <Parties />;
      case 'inventory': return <Inventory refreshKey={refreshKey} onNavigateToRestock={() => setActiveTab('purchase-auto-order')} />;
      case 'pricelist': return <PriceList />;
      case 'service-center': return <ServiceCenter />;
      case 'warranty-return': return <WarrantyManager />;
      case 'cash-drawer': return <CashDrawerManager />;
      case 'settings': return <Settings />;
      case 'shortcut-keys': return <ShortcutGuide />;
      case 'sales-invoices': return <TransactionList type="SALE" onNew={() => { setEditingTransaction(null); setShowPos('SALE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-payment-in': return <TransactionList type="PAYMENT_IN" onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('PAYMENT_IN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-quotations': return <TransactionList type="QUOTATION" onNew={() => { setEditingTransaction(null); setShowPos('QUOTATION'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-return': return <TransactionList type="SALE_RETURN" onNew={() => { setEditingTransaction(null); setShowPos('SALE_RETURN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-bills': return <TransactionList type="PURCHASE" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-payment-out': return <TransactionList type="PAYMENT_OUT" onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('PAYMENT_OUT'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-orders': return <TransactionList type="PURCHASE_ORDER" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE_ORDER'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-return': return <TransactionList type="PURCHASE_RETURN" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE_RETURN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'expense': return <ExpenseList onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('EXPENSE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'manage-accounts': return <ManageAccounts />;
      case 'reports': return <Reports onEditTransaction={handleEdit} />;
      case 'purchase-auto-order': return <Reports targetReport="OUT_OF_STOCK" onConsumeTarget={() => {}} onEditTransaction={handleEdit} onConvertToPurchase={handleAutoOrderConvert} />;
      case 'receivable-aging': return <Reports targetReport="RECEIVABLE_AGING" onConsumeTarget={() => {}} onEditTransaction={handleEdit} />;
      case 'admin-dashboard': return <AdminDashboard />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  if (!isLoggedIn) return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  if (!isDbReady) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>;
  
  if (isSuper) return <AdminDashboard />;

  if (!companySelected) return <CompanySelector onSelect={() => setCompanySelected(true)} />;
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
      <div id="main-app-container" className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} onNavigate={setActiveTab} />
        <main className="flex-1 overflow-y-auto relative">{renderContent()}</main>
        <AIAssistant />
      </div>

      {detectedBackup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-bottom-10">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-brand-500 p-5 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                        <RefreshCw className="w-6 h-6 animate-spin-slow" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-black text-gray-900 text-sm uppercase">Newer Backup Found!</h4>
                        <p className="text-xs text-gray-500 mt-1">Local data from <b>{detectedBackup.date}</b> is available.</p>
                    </div>
                    <button onClick={() => setDetectedBackup(null)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
                <button onClick={handlePerformSync} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold">Sync & Restore Now</button>
            </div>
        </div>
      )}

      {showPos && <PosForm key={`pos-${showPos}`} type={showPos} initialData={editingTransaction} onClose={() => setShowPos(null)} onSave={() => { setShowPos(null); setRefreshKey(prev => prev + 1); }} />}

      {showOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          {(showOverlay === 'PAYMENT_IN' || showOverlay === 'PAYMENT_OUT') && <PaymentForm key={`pmt-${showOverlay}`} type={showOverlay as 'PAYMENT_IN' | 'PAYMENT_OUT'} initialData={overlayEditingTransaction} onClose={() => setShowOverlay(null)} onSave={() => { setShowOverlay(null); setRefreshKey(prev => prev + 1); }} />}
          {showOverlay === 'EXPENSE' && <ExpenseForm key="exp-form" initialData={overlayEditingTransaction} onClose={() => setShowOverlay(null)} onSave={() => { setShowOverlay(null); setRefreshKey(prev => prev + 1); }} />}
        </div>
      )}
    </div>
  );
};

export default App;
