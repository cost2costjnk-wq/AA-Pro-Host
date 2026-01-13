
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Parties from './components/Parties';
import Inventory from './components/Inventory';
import ManageCategories from './components/ManageCategories';
import PriceList from './components/PriceList';
import PriceMarkupManager from './components/PriceMarkupManager';
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
import Calculator from './components/Calculator';
import { Transaction } from './types';
import { db } from './services/db';
import { authService } from './services/authService';
import { Loader2 } from 'lucide-react';
import { useToast } from './components/Toast';

const App: React.FC = () => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(authService.isAuthenticated());
  const [companySelected, setCompanySelected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [targetReport, setTargetReport] = useState<string | null>(null);
  
  const [showPos, setShowPos] = useState<Transaction['type'] | null>(null);
  const [showOverlay, setShowOverlay] = useState<Transaction['type'] | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [overlayEditingTransaction, setOverlayEditingTransaction] = useState<Transaction | null>(null);
  
  const [showCalculator, setShowCalculator] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { addToast } = useToast();

  useEffect(() => {
    const initApp = async () => {
      if (!isLoggedIn) {
          setIsDbReady(true);
          return;
      }

      const activeId = localStorage.getItem('active_company_id');
      
      try {
        await db.init(activeId || 'main');
        if (activeId) {
          setCompanySelected(true);
        }
      } catch (e) {
        console.error("Initialization failed", e);
        if (activeId) localStorage.removeItem('active_company_id');
      }
      
      setIsDbReady(true);
    };
    initApp();

    const handleDbUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('db-updated', handleDbUpdate);
    return () => window.removeEventListener('db-updated', handleDbUpdate);
  }, [isLoggedIn]);

  // Master Keyboard Control Hub
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // MASTER ESCAPE KEY: Close any active form or overlay instantly
      if (e.key === 'Escape') {
        const isAnyFormOpen = showPos || showOverlay || showCalculator || editingTransaction || overlayEditingTransaction;
        if (isAnyFormOpen) {
          setShowPos(null);
          setShowOverlay(null);
          setShowCalculator(false);
          setEditingTransaction(null);
          setOverlayEditingTransaction(null);
          addToast('Action cancelled', 'info');
        }
      }

      // Alt Key Shortcuts
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd': setActiveTab('dashboard'); break;
          case 's': setShowPos('SALE'); break;
          case 'p': setShowPos('PURCHASE'); break;
          case 'e': setShowOverlay('EXPENSE'); break;
          case 'i': setShowOverlay('PAYMENT_IN'); break;
          case 'o': setShowOverlay('PAYMENT_OUT'); break;
          case 'l': 
            setTargetReport('PARTY_STATEMENT');
            setActiveTab('reports'); 
            break;
          case 'c': setShowCalculator(prev => !prev); break;
        }
      }
    };

    // Use capturing phase (true) to ensure the listener works across entire DOM
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showPos, showOverlay, showCalculator, editingTransaction, overlayEditingTransaction]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'parties': return <Parties />;
      case 'inventory': return <Inventory refreshKey={refreshKey} />;
      case 'categories': return <ManageCategories />;
      case 'pricing-engine': return <PriceMarkupManager />;
      case 'pricelist': return <PriceList />;
      case 'service-center': return <ServiceCenter />;
      case 'warranty-return': return <WarrantyManager />;
      case 'manage-accounts': return <ManageAccounts />;
      case 'cash-drawer': return <CashDrawerManager />;
      case 'shortcut-keys': return <ShortcutGuide />;
      case 'admin-dashboard': return <AdminDashboard />;
      case 'settings': return <Settings />;
      case 'reports': return (
        <Reports 
          targetReport={targetReport} 
          onConsumeTarget={() => setTargetReport(null)}
          onEditTransaction={(t) => { setEditingTransaction(t); setShowPos(t.type); }} 
        />
      );
      
      // Sales Group
      case 'sales-invoices': return <TransactionList type="SALE" onNew={() => setShowPos('SALE')} onEdit={(t) => { setEditingTransaction(t); setShowPos('SALE'); }} refreshKey={refreshKey} />;
      case 'sales-quotations': return <TransactionList type="QUOTATION" onNew={() => setShowPos('QUOTATION')} onEdit={(t) => { setEditingTransaction(t); setShowPos('QUOTATION'); }} refreshKey={refreshKey} />;
      case 'sales-return': return <TransactionList type="SALE_RETURN" onNew={() => setShowPos('SALE_RETURN')} onEdit={(t) => { setEditingTransaction(t); setShowPos('SALE_RETURN'); }} refreshKey={refreshKey} />;
      case 'sales-payment-in': return <TransactionList type="PAYMENT_IN" onNew={() => setShowOverlay('PAYMENT_IN')} onEdit={(t) => { setOverlayEditingTransaction(t); setShowOverlay('PAYMENT_IN'); }} refreshKey={refreshKey} />;
      
      // Purchase Group
      case 'purchase-bills': return <TransactionList type="PURCHASE" onNew={() => setShowPos('PURCHASE')} onEdit={(t) => { setEditingTransaction(t); setShowPos('PURCHASE'); }} refreshKey={refreshKey} />;
      case 'purchase-orders': return <TransactionList type="PURCHASE_ORDER" onNew={() => setShowPos('PURCHASE_ORDER')} onEdit={(t) => { setEditingTransaction(t); setShowPos('PURCHASE_ORDER'); }} refreshKey={refreshKey} />;
      case 'purchase-return': return <TransactionList type="PURCHASE_RETURN" onNew={() => setShowPos('PURCHASE_RETURN')} onEdit={(t) => { setEditingTransaction(t); setShowPos('PURCHASE_RETURN'); }} refreshKey={refreshKey} />;
      case 'purchase-payment-out': return <TransactionList type="PAYMENT_OUT" onNew={() => setShowOverlay('PAYMENT_OUT')} onEdit={(t) => { setOverlayEditingTransaction(t); setShowOverlay('PAYMENT_OUT'); }} refreshKey={refreshKey} />;
      
      case 'expense': return <ExpenseList onNew={() => setShowOverlay('EXPENSE')} onEdit={(t) => { setOverlayEditingTransaction(t); setShowOverlay('EXPENSE'); }} refreshKey={refreshKey} />;
      
      default: return <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest">Module Selection Required</div>;
    }
  };

  if (!isLoggedIn) return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  if (!isDbReady) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>;
  if (!companySelected) return <CompanySelector onSelect={() => setCompanySelected(true)} />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} onNavigate={setActiveTab} />
        
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          {renderContent()}
        </main>
      </div>

      {showPos && (
        <PosForm 
          type={showPos} 
          initialData={editingTransaction}
          onClose={() => { setShowPos(null); setEditingTransaction(null); }} 
          onSave={() => { setShowPos(null); setEditingTransaction(null); db.refreshLocalCaches(); }} 
        />
      )}

      {showOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           {showOverlay === 'EXPENSE' ? (
             <ExpenseForm 
               initialData={overlayEditingTransaction}
               onClose={() => { setShowOverlay(null); setOverlayEditingTransaction(null); }}
               onSave={() => { setShowOverlay(null); setOverlayEditingTransaction(null); db.refreshLocalCaches(); }}
             />
           ) : (
             <PaymentForm 
               type={showOverlay as 'PAYMENT_IN' | 'PAYMENT_OUT'}
               initialData={overlayEditingTransaction}
               onClose={() => { setShowOverlay(null); setOverlayEditingTransaction(null); }}
               onSave={() => { setShowOverlay(null); setOverlayEditingTransaction(null); db.refreshLocalCaches(); }}
             />
           )}
        </div>
      )}

      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
};

export default App;
