
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
import AIAssistant from './components/AIAssistant';
import CompanySelector from './components/CompanySelector';
import ServiceCenter from './components/ServiceCenter';
import CashDrawerManager from './components/CashDrawer';
import LoginPage from './components/LoginPage';
import { Transaction } from './types';
import { db } from './services/db';
import { authService } from './services/authService';
import { autoBackupService } from './services/autoBackupService';
import { Loader2, RefreshCw, X, Database } from 'lucide-react';
import { useToast } from './components/Toast';

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [companySelected, setCompanySelected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [showPos, setShowPos] = useState<Transaction['type'] | null>(null);
  const [showOverlay, setShowOverlay] = useState<Transaction['type'] | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [overlayEditingTransaction, setOverlayEditingTransaction] = useState<Transaction | null>(null);
  
  const [refreshKey, setRefreshKey] = useState(0);

  const { addToast } = useToast();

  useEffect(() => {
    setIsLoggedIn(authService.isAuthenticated());

    const initApp = async () => {
      const activeId = localStorage.getItem('active_company_id');
      if (activeId) {
        await db.init(activeId);
        if (db.getActiveCompanyId()) {
           setCompanySelected(true);
           setIsDbReady(true);
           autoBackupService.start();
        } else {
           localStorage.removeItem('active_company_id');
           setIsDbReady(true);
        }
      } else {
        setIsDbReady(true);
      }
    };
    initApp();

    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    const handleLogout = () => { setCompanySelected(false); autoBackupService.stop(); };
    
    window.addEventListener('db-updated', handleUpdate);
    window.addEventListener('db-logout', handleLogout);
    
    return () => {
       window.removeEventListener('db-updated', handleUpdate);
       window.removeEventListener('db-logout', handleLogout);
       autoBackupService.stop();
    }
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Only trigger if Alt is pressed
      if (e.altKey) {
        const key = e.key.toLowerCase();
        
        if (key === 's') { // Alt + S: New Sale
          e.preventDefault();
          setEditingTransaction(null);
          setShowPos('SALE');
        } else if (key === 'p') { // Alt + P: New Purchase
          e.preventDefault();
          setEditingTransaction(null);
          setShowPos('PURCHASE');
        } else if (key === 'i') { // Alt + I: Payment In
          e.preventDefault();
          setOverlayEditingTransaction(null);
          setShowOverlay('PAYMENT_IN');
        } else if (key === 'o') { // Alt + O: Payment Out
          e.preventDefault();
          setOverlayEditingTransaction(null);
          setShowOverlay('PAYMENT_OUT');
        } else if (key === 'e') { // Alt + E: New Expense
          e.preventDefault();
          setOverlayEditingTransaction(null);
          setShowOverlay('EXPENSE');
        } else if (key === 'd') { // Alt + D: Dashboard
          e.preventDefault();
          setActiveTab('dashboard');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  const handleEdit = (t: Transaction) => { 
    if (['PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE'].includes(t.type)) {
        setOverlayEditingTransaction(t);
        setShowOverlay(t.type);
    } else {
        setEditingTransaction(t); 
        setShowPos(t.type); 
    }
  };

  const handleConvertTransaction = (t: Transaction) => {
      const targetType = t.type === 'QUOTATION' ? 'SALE' : 'PURCHASE';
      setEditingTransaction({
          ...t,
          type: targetType,
          id: '', 
          date: new Date().toISOString(),
      });
      setShowPos(targetType);
  };

  const handleAutoOrderConvert = (items: any[]) => {
      setEditingTransaction({
          id: '',
          date: new Date().toISOString(),
          type: 'PURCHASE',
          partyId: '',
          partyName: '',
          items: items,
          totalAmount: items.reduce((s, i) => s + i.amount, 0)
      } as Transaction);
      setShowPos('PURCHASE');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'parties': return <Parties />;
      case 'inventory': return <Inventory refreshKey={refreshKey} onNavigateToRestock={() => setActiveTab('purchase-auto-order')} />;
      case 'pricelist': return <PriceList />;
      case 'service-center': return <ServiceCenter />;
      case 'cash-drawer': return <CashDrawerManager />;
      case 'settings': return <Settings />;

      // Sales Group
      case 'sales-invoices': 
        return <TransactionList type="SALE" onNew={() => { setEditingTransaction(null); setShowPos('SALE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-payment-in':
        return <TransactionList type="PAYMENT_IN" onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('PAYMENT_IN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-quotations':
        return <TransactionList type="QUOTATION" onNew={() => { setEditingTransaction(null); setShowPos('QUOTATION'); }} refreshKey={refreshKey} onEdit={handleEdit} onConvert={handleConvertTransaction} />;
      case 'sales-return':
        return <TransactionList type="SALE_RETURN" onNew={() => { setEditingTransaction(null); setShowPos('SALE_RETURN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;

      // Purchase Group
      case 'purchase-bills':
        return <TransactionList type="PURCHASE" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-payment-out':
        return <TransactionList type="PAYMENT_OUT" onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('PAYMENT_OUT'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-orders':
        return <TransactionList type="PURCHASE_ORDER" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE_ORDER'); }} refreshKey={refreshKey} onEdit={handleEdit} onConvert={handleConvertTransaction} />;
      case 'purchase-return':
        return <TransactionList type="PURCHASE_RETURN" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE_RETURN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-auto-order':
        return <Reports targetReport="OUT_OF_STOCK" onConsumeTarget={() => {}} onConvertToPurchase={handleAutoOrderConvert} />;

      // Expense & Accounts
      case 'expense':
        return <ExpenseList onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('EXPENSE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'manage-accounts':
        return <ManageAccounts />;
      case 'reports':
        return <Reports />;

      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  if (!isLoggedIn) return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  if (!isDbReady) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>;
  if (!companySelected) return <CompanySelector onSelect={() => setCompanySelected(true)} />;

  return (
    <div key={refreshKey} className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <div className="print:hidden">
        <Sidebar isOpen={sidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
      </div>
      
      <div id="main-app-container" className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="print:hidden">
            <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        
        <main className="flex-1 overflow-y-auto relative">{renderContent()}</main>
        
        <div className="print:hidden">
            <AIAssistant />
        </div>
      </div>

      {showPos && <PosForm type={showPos} initialData={editingTransaction} onClose={() => setShowPos(null)} onSave={() => { setShowPos(null); setRefreshKey(prev => prev + 1); }} />}

      {showOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] print:hidden">
          {(showOverlay === 'PAYMENT_IN' || showOverlay === 'PAYMENT_OUT') && <PaymentForm type={showOverlay as 'PAYMENT_IN' | 'PAYMENT_OUT'} initialData={overlayEditingTransaction} onClose={() => setShowOverlay(null)} onSave={() => { setShowOverlay(null); setRefreshKey(prev => prev + 1); }} />}
          {showOverlay === 'EXPENSE' && <ExpenseForm initialData={overlayEditingTransaction} onClose={() => setShowOverlay(null)} onSave={() => { setShowOverlay(null); setRefreshKey(prev => prev + 1); }} />}
        </div>
      )}
    </div>
  );
};

export default App;
