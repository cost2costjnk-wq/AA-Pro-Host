
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
import { Transaction, TransactionItem } from './types';
import { db } from './services/db';
import { authService } from './services/authService';
import { autoBackupService } from './services/autoBackupService';
import { Loader2 } from 'lucide-react';
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
  const [inventoryTrigger, setInventoryTrigger] = useState(0);
  const [partyTrigger, setPartyTrigger] = useState(0);
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  useEffect(() => {
    // Initial Auth check
    setIsLoggedIn(authService.isAuthenticated());

    const checkCompany = async () => {
      const activeId = localStorage.getItem('active_company_id');
      if (activeId) {
        await db.init(activeId);
        if (db.getActiveCompanyId()) {
           setCompanySelected(true);
           setIsDbReady(true);
           // Start background services
           autoBackupService.start();
        } else {
           localStorage.removeItem('active_company_id');
           setIsDbReady(true);
        }
      } else {
        setIsDbReady(true);
      }
    };
    checkCompany();

    const handleDbUpdate = () => setRefreshKey(prev => prev + 1);
    const handleDbLogout = () => { 
        setCompanySelected(false); 
        setActiveTab('dashboard'); 
        autoBackupService.stop();
    };
    
    window.addEventListener('db-updated', handleDbUpdate);
    window.addEventListener('db-logout', handleDbLogout);
    
    return () => {
       window.removeEventListener('db-updated', handleDbUpdate);
       window.removeEventListener('db-logout', handleDbLogout);
       autoBackupService.stop();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;
      if (e.altKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 's': e.preventDefault(); setShowPos('SALE'); setEditingTransaction(null); break;
          case 'p': e.preventDefault(); setShowPos('PURCHASE'); setEditingTransaction(null); break;
          case 'i': e.preventDefault(); setShowOverlay('PAYMENT_IN'); setOverlayEditingTransaction(null); break;
          case 'o': e.preventDefault(); setShowOverlay('PAYMENT_OUT'); setOverlayEditingTransaction(null); break;
          case 'c': e.preventDefault(); setShowPos('SALE_RETURN'); setEditingTransaction(null); break;
          case 'd': e.preventDefault(); setShowPos('PURCHASE_RETURN'); setEditingTransaction(null); break;
          case 'q': e.preventDefault(); setShowPos('QUOTATION'); setEditingTransaction(null); break;
          case 'e': e.preventDefault(); setShowOverlay('EXPENSE'); setOverlayEditingTransaction(null); break;
          case 'm': e.preventDefault(); setActiveTab('inventory'); setInventoryTrigger(prev => prev + 1); break;
          case 'n': e.preventDefault(); setActiveTab('parties'); setPartyTrigger(prev => prev + 1); break;
          case 'l': e.preventDefault(); setActiveTab('reports'); setReportTarget('PARTY_STATEMENT'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn]);

  const handlePosSave = () => { setShowPos(null); setEditingTransaction(null); setRefreshKey(prev => prev + 1); };
  const handleOverlaySave = () => { setShowOverlay(null); setOverlayEditingTransaction(null); setRefreshKey(prev => prev + 1); };
  const handleEdit = (transaction: Transaction) => { 
    if (['PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE'].includes(transaction.type)) {
        setOverlayEditingTransaction(transaction);
        setShowOverlay(transaction.type);
    } else {
        setEditingTransaction(transaction); 
        setShowPos(transaction.type); 
    }
  };

  const handleConvertTransaction = (transaction: Transaction, targetType: Transaction['type']) => {
    const converted: Transaction = { ...transaction, type: targetType, id: '', date: new Date().toISOString() };
    setEditingTransaction(converted);
    setShowPos(targetType);
  };

  const handleConvertToPurchase = (items: TransactionItem[]) => {
    const draft: Transaction = { id: '', date: new Date().toISOString(), type: 'PURCHASE', partyId: '', partyName: '', items: items, totalAmount: items.reduce((s, i) => s + i.amount, 0) };
    setEditingTransaction(draft);
    setShowPos('PURCHASE');
  };

  const handleClosePos = () => { setShowPos(null); setEditingTransaction(null); };
  const handleCloseOverlay = () => { setShowOverlay(null); setOverlayEditingTransaction(null); };
  const handleNavigateToRestock = () => { setActiveTab('reports'); setReportTarget('OUT_OF_STOCK'); };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'parties': return <Parties triggerAdd={partyTrigger} />;
      case 'inventory': return <Inventory triggerAdd={inventoryTrigger} refreshKey={refreshKey} onNavigateToRestock={handleNavigateToRestock} />;
      case 'pricelist': return <PriceList />;
      case 'service-center': return <ServiceCenter />;
      case 'cash-drawer': return <CashDrawerManager />;
      case 'sales-invoices': return <TransactionList key="sales" type="SALE" onNew={() => { setEditingTransaction(null); setShowPos('SALE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-payment-in': return <TransactionList key="payment-in" type="PAYMENT_IN" onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('PAYMENT_IN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'sales-quotations': return <TransactionList key="quotations" type="QUOTATION" onNew={() => { setEditingTransaction(null); setShowPos('QUOTATION'); }} refreshKey={refreshKey} onEdit={handleEdit} onConvert={(t) => handleConvertTransaction(t, 'SALE')} />;
      case 'sales-return': return <TransactionList key="sales-return" type="SALE_RETURN" onNew={() => { setEditingTransaction(null); setShowPos('SALE_RETURN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-bills': return <TransactionList key="purchase" type="PURCHASE" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-payment-out': return <TransactionList key="payment-out" type="PAYMENT_OUT" onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('PAYMENT_OUT'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'purchase-auto-order': return <Reports targetReport="OUT_OF_STOCK" onConsumeTarget={() => setReportTarget(null)} onConvertToPurchase={handleConvertToPurchase} />;
      case 'purchase-orders': return <TransactionList key="purchase-orders" type="PURCHASE_ORDER" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE_ORDER'); }} refreshKey={refreshKey} onEdit={handleEdit} onConvert={(t) => handleConvertTransaction(t, 'PURCHASE')} />;
      case 'purchase-return': return <TransactionList key="purchase-return" type="PURCHASE_RETURN" onNew={() => { setEditingTransaction(null); setShowPos('PURCHASE_RETURN'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'expense': return <ExpenseList onNew={() => { setOverlayEditingTransaction(null); setShowOverlay('EXPENSE'); }} refreshKey={refreshKey} onEdit={handleEdit} />;
      case 'reports': return <Reports targetReport={reportTarget} onConsumeTarget={() => setReportTarget(null)} onConvertToPurchase={handleConvertToPurchase} />;
      case 'manage-accounts': return <ManageAccounts />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  if (!isLoggedIn) return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  if (!isDbReady) return <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="w-10 h-10 animate-spin text-brand-500" /></div>;
  if (!companySelected) return <CompanySelector onSelect={() => setCompanySelected(true)} />;

  return (
    <div key={refreshKey} className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-200">
      <Sidebar isOpen={sidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
        <AIAssistant />
      </div>

      {showPos && <PosForm type={showPos} initialData={editingTransaction} onClose={handleClosePos} onSave={handlePosSave} />}

      {showOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          {(showOverlay === 'PAYMENT_IN' || showOverlay === 'PAYMENT_OUT') && <PaymentForm type={showOverlay as 'PAYMENT_IN' | 'PAYMENT_OUT'} initialData={overlayEditingTransaction} onClose={handleCloseOverlay} onSave={handleOverlaySave} />}
          {showOverlay === 'EXPENSE' && <ExpenseForm initialData={overlayEditingTransaction} onClose={handleCloseOverlay} onSave={handleOverlaySave} />}
        </div>
      )}
    </div>
  );
};

export default App;
