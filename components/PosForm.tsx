
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Party, Product, Transaction, TransactionItem, Account, CashNoteCount, Denomination, CashDrawer } from '../types';
import { formatCurrency } from '../services/formatService';
import NepaliDatePicker from './NepaliDatePicker';
import { Plus, Trash2, Save, X, Zap, ChevronDown, Search, AlertCircle, Check, Tag, TrendingUp, DollarSign, Banknote, RotateCcw, Sparkles, ShoppingCart, Percent, ArrowRight } from 'lucide-react';
import { useToast } from './Toast';

const DENOMINATIONS: Denomination[] = [1000, 500, 100, 50, 20, 10, 5, 2, 1];

interface PosFormProps {
  type: Transaction['type'];
  initialData?: Transaction | null;
  onClose: () => void;
  onSave: () => void;
}

interface UILineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number | '';
  unit: string;
  rate: number | '';
  discountAmount: number | '';
  amount: number;
}

interface PriceUpdateInfo {
    productId: string;
    productName: string;
    oldPurchasePrice: number;
    newPurchasePrice: number;
    newSalePrice: number;
    newWholesalePrice: number;
}

const PosForm: React.FC<PosFormProps> = ({ type, initialData, onClose, onSave }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString());
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('Credit');
  const [pricingMode, setPricingMode] = useState<'retail' | 'wholesale' | 'cost'>('retail');

  const [partySearchTerm, setPartySearchTerm] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [highlightedPartyIndex, setHighlightedPartyIndex] = useState(0);

  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [quickParty, setQuickParty] = useState({ name: '', phone: '', address: '' });

  const [showPriceUpdateModal, setShowPriceUpdateModal] = useState(false);
  const [itemsToUpdatePrices, setItemsToUpdatePrices] = useState<PriceUpdateInfo[]>([]);

  // Cash Breakdown State
  const [showCashModal, setShowCashModal] = useState(false);
  const [receivedNotes, setReceivedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
  const [returnedNotes, setReturnedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));

  const [items, setItems] = useState<UILineItem[]>([
    { id: '1', productId: '', productName: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }
  ]);

  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0);
  
  const inputsRef = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);

  const { addToast } = useToast();

  useEffect(() => {
    const allParties = db.getParties();
    setParties(allParties);
    setProducts(db.getProducts());
    setAccounts(db.getAccounts());

    if (initialData) {
        loadInitialData(initialData, allParties);
    } else {
        setInvoiceNo(getNextInvoiceNo());
    }
  }, [initialData, type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowProductDropdown(false);
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) setShowPartyDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form Shortcut Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleFinalSave();
      }
      if (e.key === 'Escape') {
        if (!showCashModal && !showAddPartyModal && !showPriceUpdateModal) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedPartyId, invoiceNo, invoiceDate, paymentMode, showCashModal, showAddPartyModal, showPriceUpdateModal]);

  const getNextInvoiceNo = () => {
      const transactions = db.getTransactions().filter(t => t.type === type);
      let maxSeq = 0;
      transactions.forEach(t => {
          const num = parseInt(t.id);
          if (!isNaN(num) && num < 100000000) if (num > maxSeq) maxSeq = num;
      });
      return (maxSeq + 1).toString();
  };

  const loadInitialData = (data: Transaction, allParties: Party[]) => {
      setSelectedPartyId(data.partyId);
      const party = allParties.find(p => p.id === data.partyId);
      setPartySearchTerm(party ? party.name : data.partyName);
      setInvoiceDate(data.date);
      
      const isConversion = data.id === '' || (data.type !== type);
      if (isConversion) {
          setInvoiceNo(getNextInvoiceNo());
      } else {
          setInvoiceNo(data.id);
      }

      setNotes(data.notes || '');
      
      if (data.accountId) setPaymentMode(data.accountId);
      else if (data.paymentMode === 'Credit') setPaymentMode('Credit');
      else {
         const acc = db.getAccounts().find(a => a.type === data.paymentMode) || db.getAccounts().find(a => a.isDefault);
         setPaymentMode(acc ? acc.id : 'Credit');
      }

      if (data.items) {
          const uiItems: UILineItem[] = data.items.map((item, idx) => ({
              id: idx.toString(),
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit || '',
              rate: item.rate,
              discountAmount: item.discount || '',
              amount: item.amount
          }));
          uiItems.push({ id: Date.now().toString(), productId: '', productName: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 });
          setItems(uiItems);
      }

      if (data.cashBreakdown) {
          setReceivedNotes(data.cashBreakdown.received);
          setReturnedNotes(data.cashBreakdown.returned);
      }
  };

  const handlePricingModeChange = (mode: 'retail' | 'wholesale' | 'cost') => {
      setPricingMode(mode);
      const updatedItems = items.map(item => {
          if (!item.productId) return item;
          const product = products.find(p => p.id === item.productId);
          if (!product) return item;

          let newRate = mode === 'retail' ? product.salePrice : (mode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : product.purchasePrice);
          
          if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) {
              newRate = parseFloat((newRate / product.conversionRatio).toFixed(2));
          }

          return {
              ...item,
              rate: newRate,
              amount: (Number(item.quantity) || 0) * newRate - (Number(item.discountAmount) || 0)
          };
      });
      setItems(updatedItems);
      addToast(`Switched to ${mode} pricing mode. All rates updated.`, 'info');
  };

  const handleQuickCashSale = () => {
    const walkIn = parties.find(p => p.id === '1' || p.name.toLowerCase().includes('walk-in'));
    if (walkIn) { setSelectedPartyId(walkIn.id); setPartySearchTerm(walkIn.name); setShowPartyDropdown(false); }
  };

  const handlePartySelect = (party: Party) => { setSelectedPartyId(party.id); setPartySearchTerm(party.name); setShowPartyDropdown(false); };

  const openQuickAddParty = () => { setQuickParty({ name: partySearchTerm, phone: '', address: '' }); setShowAddPartyModal(true); setShowPartyDropdown(false); };

  const handleSaveQuickParty = () => {
      if (!quickParty.name) return;
      const newId = Date.now().toString();
      const newParty: Party = { id: newId, name: quickParty.name, phone: quickParty.phone, address: quickParty.address, type: type.includes('PURCHASE') ? 'supplier' : 'customer', balance: 0 };
      db.addParty(newParty);
      setParties(db.getParties());
      setSelectedPartyId(newId);
      setPartySearchTerm(newParty.name);
      setShowAddPartyModal(false);
      addToast(`Added new party: ${newParty.name}`, 'success');
  };

  const calculateRowTotal = (item: UILineItem): number => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discountAmount) || 0;
    return (qty * rate) - discount;
  };

  const getFilteredProducts = () => {
    if (!productSearchTerm) return [];
    const term = productSearchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || (p.id.includes(term))).slice(0, 10);
  };

  const getFilteredParties = () => {
      if (!partySearchTerm && !showPartyDropdown) return [];
      const term = partySearchTerm.toLowerCase();
      return parties.filter(p => p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term)));
  };

  const handleFieldChange = (index: number, field: keyof UILineItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    if (field === 'productName') {
        item.productName = value; setProductSearchTerm(value); setShowProductDropdown(true); setHighlightedProductIndex(0);
        if (value === '') { item.productId = ''; item.unit = ''; item.rate = ''; }
    } else if (field === 'unit') {
        item.unit = value;
        const product = products.find(p => p.id === item.productId);
        if (product) {
            let baseRate = pricingMode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : (pricingMode === 'cost' ? product.purchasePrice : product.salePrice);
            if (value === product.secondaryUnit && product.conversionRatio) item.rate = parseFloat((baseRate / product.conversionRatio).toFixed(2));
            else item.rate = baseRate;
        }
    } else {
        // @ts-ignore
        item[field] = value === '' ? '' : Number(value);
    }
    item.amount = calculateRowTotal(item);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleProductSelect = (index: number, product: Product) => {
    const newItems = [...items];
    const item = newItems[index];
    item.productId = product.id; item.productName = product.name; item.unit = product.unit; item.quantity = 1;
    item.rate = pricingMode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : (pricingMode === 'cost' ? product.purchasePrice : product.salePrice);
    item.amount = calculateRowTotal(item);
    newItems[index] = item;
    setItems(newItems);
    setProductSearchTerm(''); setShowProductDropdown(false); focusField(index, 'quantity');
  };

  const removeItem = (index: number) => {
      if (items.length <= 1) setItems([{ id: Date.now().toString(), productId: '', productName: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }]);
      else setItems(items.filter((_, i) => i !== index));
  };

  const addNewRow = () => {
      const newId = Date.now().toString();
      setItems(prev => [...prev, { id: newId, productId: '', productName: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }]);
      setTimeout(() => focusField(items.length, 'productName'), 50);
  };

  const focusField = (rowIndex: number, fieldName: string) => {
      const key = `${rowIndex}-${fieldName}`;
      const el = inputsRef.current.get(key);
      if (el) { el.focus(); if (el instanceof HTMLInputElement) el.select(); }
      setFocusedRowIndex(rowIndex);
  };

  const handleKeyDownInGrid = (e: React.KeyboardEvent, index: number, field: string) => {
      if (field === 'productName' && showProductDropdown) {
          const filtered = getFilteredProducts();
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedProductIndex(prev => (prev + 1) % filtered.length); return; }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedProductIndex(prev => (prev - 1 + filtered.length) % filtered.length); return; }
          if (e.key === 'Enter') { e.preventDefault(); if (filtered.length > 0) handleProductSelect(index, filtered[highlightedProductIndex]); return; }
          if (e.key === 'Escape') { setShowProductDropdown(false); return; }
      }
      if (e.key === 'Enter') {
          e.preventDefault();
          if (field === 'productName') focusField(index, 'quantity');
          else if (field === 'quantity') {
              const hasDual = items[index].productId && products.find(p => p.id === items[index].productId)?.secondaryUnit;
              if (hasDual) focusField(index, 'unit'); else focusField(index, 'rate');
          }
          else if (field === 'unit') focusField(index, 'rate');
          else if (field === 'rate') focusField(index, 'discountAmount');
          else if (field === 'discountAmount') {
              if (index === items.length - 1) { if (items[index].productName) addNewRow(); }
              else focusField(index + 1, 'productName');
          }
      }
  };

  const handleApplyPriceUpdates = () => {
      itemsToUpdatePrices.forEach(update => {
          const product = db.getProducts().find(p => p.id === update.productId);
          if (product) {
              db.updateProduct({
                  ...product,
                  purchasePrice: update.newPurchasePrice,
                  salePrice: update.newSalePrice,
                  wholesalePrice: update.newWholesalePrice
              });
          }
      });
      addToast('Product prices updated successfully', 'success');
      handleFinalSave(true);
  };

  const handleFinalSave = (skipPriceCheck = false) => {
      const validItems = items.filter(i => i.productName.trim() !== '');
      if (!selectedPartyId) { addToast('Please select a party', 'error'); return; }
      if (validItems.length === 0) { addToast('Please add at least one item', 'error'); return; }

      if (type === 'PURCHASE' && !skipPriceCheck) {
          const updateList: PriceUpdateInfo[] = [];
          validItems.forEach(item => {
              if (!item.productId) return;
              const product = products.find(p => p.id === item.productId);
              if (product) {
                  let purchaseRate = Number(item.rate);
                  if (item.unit && product.secondaryUnit && item.unit === product.secondaryUnit && product.conversionRatio) purchaseRate *= product.conversionRatio;
                  if (purchaseRate > product.purchasePrice) {
                      updateList.push({ 
                          productId: product.id, 
                          productName: product.name, 
                          oldPurchasePrice: product.purchasePrice, 
                          newPurchasePrice: purchaseRate, 
                          newSalePrice: product.salePrice, 
                          newWholesalePrice: product.wholesalePrice || product.salePrice 
                      });
                  }
              }
          });
          if (updateList.length > 0) { 
              setItemsToUpdatePrices(updateList); 
              setShowPriceUpdateModal(true); 
              return; 
          }
      }

      const party = parties.find(p => p.id === selectedPartyId);
      const subTotal = validItems.reduce((sum, i) => sum + i.amount, 0);

      let accountId = undefined;
      let paymentModeStr = paymentMode;
      if (paymentMode !== 'Credit') {
          const acc = accounts.find(a => a.id === paymentMode);
          if (acc) { accountId = acc.id; paymentModeStr = acc.type === 'Cash' ? 'Cash' : 'Bank'; }
      }

      const txData: Transaction = {
          id: invoiceNo, date: invoiceDate, type: type, partyId: selectedPartyId, partyName: party?.name || 'Unknown',
          items: validItems.map(i => ({ productId: i.productId || `custom-${Date.now()}`, productName: i.productName, quantity: Number(i.quantity), unit: i.unit, rate: Number(i.rate), discount: Number(i.discountAmount), amount: i.amount })),
          subTotal: subTotal, totalAmount: subTotal, notes: notes, paymentMode: paymentModeStr, accountId: accountId,
          cashBreakdown: (paymentModeStr === 'Cash') ? { received: receivedNotes, returned: returnedNotes } : undefined
      };

      const isActuallyEditing = initialData && initialData.id === invoiceNo && initialData.type === type;

      if (isActuallyEditing) { 
          db.updateTransaction(initialData!.id, txData); 
          onSave(); 
      }
      else {
          db.addTransaction(txData);
          if (type === 'SALE') {
              addToast('Sale saved. Ready for next.', 'success');
              setItems([{ id: Date.now().toString(), productId: '', productName: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }]);
              setSelectedPartyId(''); setPartySearchTerm(''); setNotes(''); setPaymentMode('Credit'); setPricingMode('retail'); setInvoiceNo(getNextInvoiceNo());
              setReceivedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
              setReturnedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
              setTimeout(() => partyInputRef.current?.focus(), 100);
          } else { 
              onSave(); 
          }
      }
  };

  const grandTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const receivedSum = receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);
  const returnedSum = returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);
  const actualPaid = receivedSum - returnedSum;

  const getTitle = () => {
      if (type === 'SALE') return 'Sale';
      if (type === 'PURCHASE') return 'Purchase';
      return type.replace('_', ' ');
  };

  const isCashPayment = accounts.find(a => a.id === paymentMode)?.type === 'Cash';

  const handleAutoSuggestChange = () => {
      const drawer = db.getCashDrawer();
      let changeNeeded = receivedSum - grandTotal;
      if (changeNeeded <= 0) {
          setReturnedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
          return;
      }

      const availableNotesMap = new Map<Denomination, number>();
      drawer.notes.forEach(n => availableNotesMap.set(n.denomination, n.count));
      receivedNotes.forEach(n => {
          const current = availableNotesMap.get(n.denomination) || 0;
          availableNotesMap.set(n.denomination, current + n.count);
      });

      const suggestions: CashNoteCount[] = [];
      
      for (const denom of DENOMINATIONS) {
          const availableCount = availableNotesMap.get(denom) || 0;
          if (availableCount > 0 && changeNeeded >= denom) {
              const countToGive = Math.min(Math.floor(changeNeeded / denom), availableCount);
              suggestions.push({ denomination: denom, count: countToGive });
              changeNeeded -= (countToGive * denom);
          } else {
              suggestions.push({ denomination: denom, count: 0 });
          }
      }

      setReturnedNotes(suggestions);
      if (changeNeeded > 0) {
          addToast(`Warning: Only ${formatCurrency(receivedSum - grandTotal - changeNeeded)} in physical notes available in drawer. Still short: ${formatCurrency(changeNeeded)}`, 'info');
      } else {
          addToast('Auto-suggested change from available drawer notes.', 'success');
      }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-screen">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X className="w-6 h-6" /></button>
            <div>
               <h2 className="text-xl font-bold text-gray-800">{initialData && initialData.id === invoiceNo ? 'Edit' : 'New'} {getTitle()}</h2>
               <p className="text-xs text-gray-500">Press <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> to move, <kbd className="bg-gray-100 px-1 rounded">Ctrl+S</kbd> to save</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            {(type === 'SALE' || type === 'QUOTATION') && (
                <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200 mr-4 shadow-inner">
                    <button 
                        onClick={() => handlePricingModeChange('retail')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pricingMode === 'retail' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Tag className="w-3 h-3" /> Retail
                    </button>
                    <button 
                        onClick={() => handlePricingModeChange('wholesale')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pricingMode === 'wholesale' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Percent className="w-3 h-3" /> Wholesale
                    </button>
                    <button 
                        onClick={() => handlePricingModeChange('cost')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pricingMode === 'cost' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <DollarSign className="w-3 h-3" /> Cost
                    </button>
                </div>
            )}
            <div className="text-right mr-4 hidden md:block">
                <span className="block text-xs text-gray-500 uppercase tracking-wider">Total Amount</span>
                <span className="block text-xl font-bold text-brand-600">{formatCurrency(grandTotal)}</span>
            </div>
            <button onClick={() => handleFinalSave()} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 shadow-md transition-all active:scale-95"><Save className="w-5 h-5" />{initialData || type !== 'SALE' ? 'Save Invoice' : 'Save & New'}</button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
         <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6">
               <div className="md:col-span-5 relative" ref={partyDropdownRef}>
                  <div className="flex justify-between mb-1.5">
                     <label className="text-sm font-bold text-gray-700">Party</label>
                     {type === 'SALE' && <button onClick={handleQuickCashSale} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1"><Zap className="w-3 h-3" /> Quick Cash</button>}
                  </div>
                  <div className="relative">
                      <input ref={partyInputRef} autoFocus={!initialData} type="text" className="w-full pl-9 pr-8 p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Search Party..." value={partySearchTerm} onChange={(e) => { setPartySearchTerm(e.target.value); setShowPartyDropdown(true); setSelectedPartyId(''); }} onFocus={() => setShowPartyDropdown(true)} />
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                  {showPartyDropdown && (
                      <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-20 mt-1 max-h-60 overflow-y-auto">
                          {getFilteredParties().length === 0 ? (
                                 <div className="p-1"><button onClick={openQuickAddParty} className="w-full text-left p-2.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-md text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" />Create "{partySearchTerm}"</button></div>
                          ) : (
                              getFilteredParties().map((p, index) => (
                                      <div key={p.id} className={`p-2.5 border-b border-gray-50 last:border-0 cursor-pointer flex justify-between items-center group hover:bg-blue-50`} onClick={() => handlePartySelect(p)}>
                                          <div><div className="font-bold text-gray-800 text-sm">{p.name}</div><div className="text-xs text-gray-500">{p.phone || 'No Phone'}</div></div>
                                          <div className={`text-xs px-2 py-0.5 rounded ${p.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{p.type}</div>
                                      </div>
                              ))
                          )}
                      </div>
                  )}
               </div>
               <div className="md:col-span-3"><label className="block text-sm font-bold text-gray-700 mb-1.5">Invoice Date</label><NepaliDatePicker value={invoiceDate} onChange={setInvoiceDate} /></div>
               <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1.5">Invoice No</label><input type="text" className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono outline-none" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
               <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-1.5">Payment</label>
                   <div className="flex gap-1">
                       <select className="flex-1 p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                          <option value="Credit">Credit (Due)</option>
                          <optgroup label="Paid Now">
                             {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </optgroup>
                       </select>
                       {isCashPayment && (
                           <button 
                             onClick={() => setShowCashModal(true)}
                             className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${receivedSum > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'}`}
                             title="Cash Note Breakdown"
                           >
                               <Banknote className="w-5 h-5" />
                           </button>
                       )}
                   </div>
               </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
               <div className="grid grid-cols-[40px_minmax(250px,2fr)_100px_80px_100px_100px_120px_40px] gap-2 bg-gray-50 border-b border-gray-200 px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                  <div className="text-center">#</div><div>Product Name</div><div>Quantity</div><div>Unit</div><div>Rate</div><div>Discount</div><div className="text-right">Amount</div><div></div>
               </div>
               <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                  {items.map((item, index) => (
                        <div key={item.id} className={`grid grid-cols-[40px_minmax(250px,2fr)_100px_80px_100px_100px_120px_40px] gap-2 items-start px-2 py-1.5 rounded-lg border ${focusedRowIndex === index ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-transparent'}`}>
                           <div className="flex items-center justify-center h-9 text-gray-400 font-medium text-sm">{index + 1}</div>
                           <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                              <input ref={(el) => { if (el) inputsRef.current.set(`${index}-productName`, el); }} type="text" className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm outline-none" placeholder="Search Item..." value={item.productName} onChange={e => handleFieldChange(index, 'productName', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'productName')} onFocus={() => { setFocusedRowIndex(index); setShowProductDropdown(true); setProductSearchTerm(item.productName); }} />
                              {showProductDropdown && focusedRowIndex === index && (
                                 <div ref={dropdownRef} className="absolute top-full left-0 w-[400px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 mt-1 max-h-60 overflow-y-auto">
                                    {getFilteredProducts().map((p, idx) => (
                                          <div key={p.id} className={`p-2.5 border-b border-gray-50 last:border-0 cursor-pointer flex justify-between items-center group hover:bg-blue-50`} onClick={() => handleProductSelect(index, p)}>
                                             <div><div className="font-bold text-gray-800 text-sm">{p.name}</div><div className="text-xs text-gray-500 flex gap-2 mt-0.5"><span>Stock: {p.stock} {p.unit}</span></div></div>
                                             <div className="text-right font-bold text-brand-600 text-sm">{formatCurrency((type.includes('SALE')) ? (pricingMode === 'wholesale' ? (p.wholesalePrice || p.salePrice) : (pricingMode === 'cost' ? p.purchasePrice : p.salePrice)) : p.purchasePrice)}</div>
                                          </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                           <div><input ref={(el) => { if (el) inputsRef.current.set(`${index}-quantity`, el); }} type="number" min="0" className="w-full p-2 border border-gray-300 rounded-md text-sm text-center" placeholder="Qty" value={item.quantity} onChange={e => handleFieldChange(index, 'quantity', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'quantity')} onFocus={(e) => {setFocusedRowIndex(index); e.target.select();}} /></div>
                           <div><div className="h-9 flex items-center justify-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md">{item.unit || '-'}</div></div>
                           <div><input ref={(el) => { if (el) inputsRef.current.set(`${index}-rate`, el); }} type="number" className="w-full p-2 border border-gray-300 rounded-md text-sm text-right" placeholder="Rate" value={item.rate} onChange={e => handleFieldChange(index, 'rate', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'rate')} onFocus={(e) => {setFocusedRowIndex(index); e.target.select();}} /></div>
                           <div><input ref={(el) => { if (el) inputsRef.current.set(`${index}-discountAmount`, el); }} type="number" className="w-full p-2 border border-gray-300 rounded-md text-sm text-right" placeholder="Dis." value={item.discountAmount} onChange={e => handleFieldChange(index, 'discountAmount', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'discountAmount')} onFocus={(e) => {setFocusedRowIndex(index); e.target.select();}} /></div>
                           <div className="h-9 flex items-center justify-end px-2 font-bold text-gray-800 text-sm">{formatCurrency(item.amount)}</div>
                           <div className="flex items-center justify-center h-9">{items.length > 1 && <button onClick={() => removeItem(index)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>}</div>
                        </div>
                  ))}
                  <div className="px-2 pt-2"><button onClick={addNewRow} className="flex items-center gap-1 text-sm text-brand-600 font-medium hover:bg-brand-50 px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /> Add Line Item</button></div>
               </div>
               <div className="bg-gray-50 border-t border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">Internal Notes</label><textarea className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none" rows={2} placeholder="Add details..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
                   <div className="flex flex-col gap-2 justify-center md:items-end">
                       <div className="flex justify-between w-full md:w-64 text-sm"><span className="text-gray-600">Sub Total:</span><span className="font-bold text-gray-900">{formatCurrency(grandTotal)}</span></div>
                       <div className="flex justify-between w-full md:w-64 text-lg border-t border-gray-200 pt-2 mt-1"><span className="font-bold text-gray-800">Grand Total:</span><span className="font-bold text-brand-600">{formatCurrency(grandTotal)}</span></div>
                   </div>
               </div>
            </div>
         </div>
      </div>

      {/* Price Update Reconciliation Modal */}
      {showPriceUpdateModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="bg-orange-600 p-6 text-white flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><TrendingUp className="w-6 h-6" /> Cost Reconciliation</h3>
                          <p className="text-orange-100 text-sm mt-1">Some items in this bill have a higher cost than recorded.</p>
                      </div>
                      <button onClick={() => setShowPriceUpdateModal(false)} className="text-white hover:opacity-70"><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-3 text-sm text-orange-800">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <p>We detected cost increases. Would you like to update your <b>Master Price List</b> with these new rates before saving this bill?</p>
                      </div>

                      <div className="space-y-2">
                        {itemsToUpdatePrices.map((item, idx) => (
                            <div key={item.productId} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-gray-800">{item.productName}</span>
                                    <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded-full font-bold uppercase">Price Spike Detected</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Old Cost</p>
                                        <p className="font-bold text-gray-600">{formatCurrency(item.oldPurchasePrice)}</p>
                                    </div>
                                    <div className="bg-orange-100/50 p-3 rounded-xl border border-orange-200 shadow-sm">
                                        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">New Cost</p>
                                        <p className="font-black text-orange-700 flex items-center gap-2">
                                            {formatCurrency(item.newPurchasePrice)}
                                            <TrendingUp className="w-4 h-4" />
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-1">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">New Sales Price</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold" 
                                            value={item.newSalePrice}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setItemsToUpdatePrices(prev => prev.map((up, i) => i === idx ? { ...up, newSalePrice: val } : up));
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">New Wholesale</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold" 
                                            value={item.newWholesalePrice}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setItemsToUpdatePrices(prev => prev.map((up, i) => i === idx ? { ...up, newWholesalePrice: val } : up));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>

                  <div className="p-6 border-t bg-gray-50 flex gap-3">
                      <button 
                        onClick={() => handleFinalSave(true)}
                        className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm"
                      >
                          Save Without Updating Master
                      </button>
                      <button 
                        onClick={handleApplyPriceUpdates}
                        className="flex-1 py-3 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                      >
                          Update Master & Save Bill <ArrowRight className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Cash Breakdown Modal */}
      {showCashModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold flex items-center gap-2"><Banknote className="w-6 h-6" /> Cash Calculator</h3>
                          <p className="text-emerald-100 text-sm mt-1">Breakdown of notes received and returned as change.</p>
                      </div>
                      <button onClick={() => setShowCashModal(false)} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <h4 className="font-bold text-gray-800 border-b pb-2 flex justify-between items-center">
                              <span>RECEIVED FROM CUSTOMER</span>
                              <span className="text-emerald-600 font-black">{formatCurrency(receivedSum)}</span>
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                              {receivedNotes.map((note, idx) => (
                                  <div key={note.denomination} className={`flex items-center justify-between p-3 rounded-xl border ${note.count > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-7 rounded flex items-center justify-center font-bold text-xs ${note.denomination >= 500 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{note.denomination}</div>
                                          <X className="w-3 h-3 text-gray-300" />
                                      </div>
                                      <input type="number" min="0" className="w-16 p-1.5 border border-gray-300 rounded-lg text-center font-bold" value={note.count || ''} onChange={e => {
                                          const val = parseInt(e.target.value) || 0;
                                          setReceivedNotes(prev => prev.map((n, i) => i === idx ? { ...n, count: val } : n));
                                      }} />
                                      <span className="w-20 text-right font-bold text-gray-600">{formatCurrency(note.denomination * note.count)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="font-bold text-gray-800 border-b pb-2 flex justify-between items-center">
                              <span>GIVE BACK (CHANGE)</span>
                              <div className="flex items-center gap-2">
                                  {receivedSum > grandTotal && (
                                    <button 
                                        onClick={handleAutoSuggestChange}
                                        className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                    >
                                        <Sparkles className="w-3 h-3" /> Auto-Suggest
                                    </button>
                                  )}
                                  <span className="text-red-600 font-black">{formatCurrency(returnedSum)}</span>
                              </div>
                          </h4>
                          <div className="bg-gray-100 p-3 rounded-lg mb-4 flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500">REQUIRED CHANGE:</span>
                              <span className="font-black text-gray-800 text-lg">{formatCurrency(Math.max(0, receivedSum - grandTotal))}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                              {returnedNotes.map((note, idx) => (
                                  <div key={note.denomination} className={`flex items-center justify-between p-3 rounded-xl border ${note.count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-7 rounded flex items-center justify-center font-bold text-xs ${note.denomination >= 500 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{note.denomination}</div>
                                          <X className="w-3 h-3 text-gray-300" />
                                      </div>
                                      <input type="number" min="0" className="w-16 p-1.5 border border-gray-300 rounded-lg text-center font-bold" value={note.count || ''} onChange={e => {
                                          const val = parseInt(e.target.value) || 0;
                                          setReturnedNotes(prev => prev.map((n, i) => i === idx ? { ...n, count: val } : n));
                                      }} />
                                      <span className="w-20 text-right font-bold text-gray-600">{formatCurrency(note.denomination * note.count)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                      <div className="flex gap-8">
                         <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Bill Amount</p>
                            <p className="text-lg font-bold text-gray-800">{formatCurrency(grandTotal)}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Net Physical Paid</p>
                            <p className={`text-lg font-bold ${actualPaid === grandTotal ? 'text-emerald-600' : 'text-orange-500'}`}>{formatCurrency(actualPaid)}</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setReceivedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 }))); setReturnedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 }))); }} className="px-4 py-2 text-gray-500 flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Reset</button>
                        <button onClick={() => setShowCashModal(false)} className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">Done</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PosForm;
