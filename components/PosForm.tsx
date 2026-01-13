import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../services/db';
import { Party, Product, Transaction, TransactionItem, Account, CashNoteCount, Denomination } from '../types';
import { formatCurrency } from '../services/formatService';
import NepaliDatePicker from './NepaliDatePicker';
import { 
  Plus, Trash2, Save, X, ChevronDown, Search, 
  Tag, Percent, DollarSign, Package, UserPlus, 
  Banknote, Sparkles, Check, ShoppingBag, 
  User, Layers
} from 'lucide-react';
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
  hsnCode: string;
  quantity: number | '';
  unit: string;
  rate: number | '';
  discountAmount: number | '';
  amount: number;
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

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [quickProduct, setQuickProduct] = useState<Partial<Product>>({ name: '', hsnCode: '', salePrice: 0, purchasePrice: 0, stock: 0, unit: 'pcs' });

  const [items, setItems] = useState<UILineItem[]>([
    { id: '1', productId: '', productName: '', hsnCode: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }
  ]);

  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(0);

  // Cash Modal State
  const [showCashModal, setShowCashModal] = useState(false);
  const [receivedNotes, setReceivedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
  const [returnedNotes, setReturnedNotes] = useState<CashNoteCount[]>(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
  
  const inputsRef = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);

  const { addToast } = useToast();
  const isPurchase = type === 'PURCHASE' || type === 'PURCHASE_ORDER' || type === 'PURCHASE_RETURN';

  // --- Keyboard Shortcuts (Ctrl + S) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleFinalSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedPartyId, paymentMode, invoiceNo, invoiceDate, receivedNotes, returnedNotes, showCashModal]);

  // --- Auto-scroll effect for Dropdowns ---
  useEffect(() => {
    if (showProductDropdown && productDropdownRef.current) {
        const highlightedEl = productDropdownRef.current.querySelector(`[data-index="${highlightedProductIndex}"]`);
        if (highlightedEl) highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedProductIndex, showProductDropdown]);

  useEffect(() => {
    if (showPartyDropdown && partyDropdownRef.current) {
        const highlightedEl = partyDropdownRef.current.querySelector(`[data-index="${highlightedPartyIndex}"]`);
        if (highlightedEl) highlightedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedPartyIndex, showPartyDropdown]);

  useEffect(() => {
    const allParties = db.getParties();
    setParties(allParties);
    setProducts(db.getProducts());
    setAccounts(db.getAccounts());
    if (initialData) loadInitialData(initialData, allParties);
    else {
        setInvoiceNo(getNextInvoiceNo());
        if (type === 'SALE') {
            const cashAcc = db.getAccounts().find(a => a.type === 'Cash' && a.isDefault);
            if (cashAcc) setPaymentMode(cashAcc.id);
        }
    }
  }, [initialData, type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) setShowProductDropdown(false);
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) setShowPartyDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setInvoiceNo(data.id);
      setNotes(data.notes || '');
      if (data.accountId) setPaymentMode(data.accountId);
      else if (data.paymentMode === 'Credit') setPaymentMode('Credit');
      
      if (data.items) {
          const uiItems: UILineItem[] = data.items.map((item, idx) => ({
              id: idx.toString(),
              productId: item.productId,
              productName: item.productName,
              hsnCode: item.hsnCode || '',
              quantity: item.quantity,
              unit: item.unit || '',
              rate: item.rate,
              discountAmount: item.discount || '',
              amount: item.amount
          }));
          uiItems.push({ id: Date.now().toString(), productId: '', productName: '', hsnCode: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 });
          setItems(uiItems);
      }

      if (data.cashBreakdown) {
          setReceivedNotes(data.cashBreakdown.received);
          setReturnedNotes(data.cashBreakdown.returned);
      }
  };

  const calculateRowTotal = (item: UILineItem): number => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discountAmount) || 0;
    return (qty * rate) - discount;
  };

  // Add useMemo to dependencies (it's from 'react')
  const filteredProducts = useMemo(() => {
    const term = (productSearchTerm || '').toLowerCase();
    return products.filter(p => (p.name && p.name.toLowerCase().includes(term)) || (p.hsnCode && p.hsnCode.toLowerCase().includes(term))).slice(0, 15);
  }, [products, productSearchTerm]);

  // Add useMemo to dependencies
  const filteredParties = useMemo(() => {
    const term = (partySearchTerm || '').toLowerCase();
    return parties.filter(p => p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term)));
  }, [parties, partySearchTerm]);

  const handleFieldChange = (index: number, field: keyof UILineItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    if (field === 'productName') {
        item.productName = value; 
        setProductSearchTerm(value); 
        setShowProductDropdown(true); 
        setHighlightedProductIndex(0);
        if (value === '') { item.productId = ''; item.hsnCode = ''; item.unit = ''; item.rate = ''; }
    } else {
        // @ts-ignore
        item[field] = value === '' ? '' : value;
    }
    item.amount = calculateRowTotal(item);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleProductSelect = (index: number, product: Product) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    item.productId = product.id; 
    item.productName = product.name; 
    item.hsnCode = product.hsnCode || '';
    item.unit = product.unit; 
    
    if (isPurchase) {
        item.rate = product.purchasePrice;
    } else {
        if (pricingMode === 'retail') item.rate = product.salePrice;
        else if (pricingMode === 'wholesale') item.rate = product.wholesalePrice || product.salePrice;
        else if (pricingMode === 'cost') item.rate = product.purchasePrice;
    }

    item.amount = calculateRowTotal(item);
    newItems[index] = item;
    setItems(newItems);
    setProductSearchTerm(''); 
    setShowProductDropdown(false); 
    setTimeout(() => focusField(index, 'quantity'), 10);
  };

  const handlePartySelect = (party: Party) => {
    setSelectedPartyId(party.id);
    setPartySearchTerm(party.name);
    setShowPartyDropdown(false);
    setTimeout(() => focusField(0, 'productName'), 10);
  };

  const addNewRow = () => {
      const newId = Date.now().toString();
      setItems(prev => [...prev, { id: newId, productId: '', productName: '', hsnCode: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }]);
      setTimeout(() => focusField(items.length, 'productName'), 50);
  };

  const focusField = (rowIndex: number, fieldName: string) => {
      const key = `${rowIndex}-${fieldName}`;
      const el = inputsRef.current.get(key);
      if (el) { el.focus(); if (el instanceof HTMLInputElement) el.select(); }
      setFocusedRowIndex(rowIndex);
  };

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
      if (showPartyDropdown) {
          const count = filteredParties.length;
          const totalOptions = count + 1;

          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightedPartyIndex(p => (p + 1) % totalOptions);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightedPartyIndex(p => (p - 1 + totalOptions) % totalOptions);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              if (highlightedPartyIndex < count) {
                  handlePartySelect(filteredParties[highlightedPartyIndex]);
              } else {
                  setQuickParty({ name: partySearchTerm, phone: '', address: '' });
                  setShowAddPartyModal(true);
                  setShowPartyDropdown(false);
              }
          } else if (e.key === 'Escape') {
              setShowPartyDropdown(false);
          }
      }
  };

  const handleKeyDownInGrid = (e: React.KeyboardEvent, index: number, field: string) => {
      if (field === 'productName' && showProductDropdown) {
          const count = filteredProducts.length;
          const totalOptions = count + 1;

          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightedProductIndex(p => (p + 1) % totalOptions);
          } else if (e.key === 'ArrowUp') {
              setHighlightedProductIndex(p => (p - 1 + totalOptions) % totalOptions);
          } else if (e.key === 'Enter') {
              e.preventDefault();
              if (highlightedProductIndex < count) {
                  handleProductSelect(index, filteredProducts[highlightedProductIndex]);
              } else {
                  setQuickProduct({ name: productSearchTerm, hsnCode: '', stock: 0, salePrice: 0, purchasePrice: 0, unit: 'pcs' });
                  setShowAddProductModal(true);
                  setShowProductDropdown(false);
              }
              return;
          } else if (e.key === 'Escape') {
              setShowProductDropdown(false);
              return;
          }
      }

      if (e.key === 'Enter') {
          e.preventDefault();
          if (field === 'productName') focusField(index, 'quantity');
          else if (field === 'quantity') focusField(index, 'rate');
          else if (field === 'rate') focusField(index, 'discountAmount');
          else if (field === 'discountAmount') {
              if (index === items.length - 1) addNewRow();
              else focusField(index + 1, 'productName');
          }
      }
  };

  const handleSaveQuickParty = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickParty.name) return;
      const party: Party = { id: Date.now().toString(), name: quickParty.name, phone: quickParty.phone, address: quickParty.address, type: isPurchase ? 'supplier' : 'customer', balance: 0 };
      await db.addParty(party);
      setParties(db.getParties());
      handlePartySelect(party);
      setShowAddPartyModal(false);
      addToast(`Partner "${party.name}" registered.`, 'success');
  };

  const handleSaveQuickProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickProduct.name) return;
      const product: Product = { id: Date.now().toString(), name: quickProduct.name, hsnCode: quickProduct.hsnCode, stock: Number(quickProduct.stock), salePrice: Number(quickProduct.salePrice), purchasePrice: Number(quickProduct.purchasePrice), unit: quickProduct.unit || 'pcs', type: 'goods', category: 'General' };
      await db.addProduct(product);
      setProducts(db.getProducts());
      handleProductSelect(focusedRowIndex, product);
      setShowAddProductModal(false);
      addToast(`Item "${product.name}" added.`, 'success');
  };

  const handleFinalSave = async () => {
      const validItems = items.filter(i => i.productName && i.productName.trim() !== '');
      if (!selectedPartyId) { addToast('Please select a party', 'error'); return; }
      if (validItems.length === 0) { addToast('Please add at least one item', 'error'); return; }

      const account = accounts.find(a => a.id === paymentMode);
      const isCash = account?.type === 'Cash';
      const grandTotalVal = validItems.reduce((sum, item) => sum + item.amount, 0);
      const netCashVal = receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0) - returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);

      if (isCash && Math.abs(netCashVal - grandTotalVal) > 0.1 && !showCashModal) {
          setShowCashModal(true);
          addToast('Physical cash mismatch.', 'error');
          return;
      }

      const party = parties.find(p => p.id === selectedPartyId);
      const subTotal = grandTotalVal;

      const txData: Transaction = {
          id: invoiceNo, 
          date: invoiceDate, 
          type: type, 
          partyId: selectedPartyId, 
          partyName: party?.name || 'Unknown',
          items: validItems.map(i => ({ 
              productId: i.productId || `custom-${Date.now()}`, 
              productName: i.productName, 
              hsnCode: i.hsnCode, 
              quantity: Number(i.quantity), 
              unit: i.unit, 
              rate: Number(i.rate), 
              discount: Number(i.discountAmount), 
              amount: i.amount 
          })),
          subTotal: subTotal, 
          totalAmount: subTotal, 
          notes: notes, 
          paymentMode: isCash ? 'Cash' : 'Bank',
          accountId: paymentMode === 'Credit' ? undefined : paymentMode,
          cashBreakdown: isCash ? { received: receivedNotes, returned: returnedNotes } : undefined
      };

      if (initialData) {
          await db.updateTransaction(initialData.id, txData);
          addToast('Entry updated.', 'success');
          onSave(); 
      } else {
          await db.addTransaction(txData);
          addToast('Entry recorded.', 'success');
          
          // Continuous Data Entry Mode: Clear form but keep open
          setItems([{ id: Date.now().toString(), productId: '', productName: '', hsnCode: '', quantity: '', unit: '', rate: '', discountAmount: '', amount: 0 }]);
          setSelectedPartyId('');
          setPartySearchTerm('');
          setNotes('');
          
          const currentNo = parseInt(invoiceNo);
          if (!isNaN(currentNo)) setInvoiceNo((currentNo + 1).toString());
          
          setReceivedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
          setReturnedNotes(DENOMINATIONS.map(d => ({ denomination: d, count: 0 })));
          setShowCashModal(false);
          
          if (partyInputRef.current) partyInputRef.current.focus();
      }
  };

  const handleAutoSuggest = () => {
      const drawer = db.getCashDrawer();
      const currentTotal = items.reduce((sum, item) => sum + item.amount, 0);
      const receivedSum = receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0);
      
      let diff = 0;
      if (type === 'SALE') diff = receivedSum - currentTotal;
      else if (type === 'PURCHASE') diff = currentTotal;

      if (diff <= 0) return;
      const suggestions: CashNoteCount[] = [];
      const tempAvailable = new Map(drawer.notes.map(n => [n.denomination, n.count]));
      if (type === 'SALE') receivedNotes.forEach(rn => tempAvailable.set(rn.denomination, (tempAvailable.get(rn.denomination) || 0) + rn.count));

      for (const d of DENOMINATIONS) {
          const avail = tempAvailable.get(d) || 0;
          if (avail > 0 && diff >= d) {
              const count = Math.min(Math.floor(diff / d), avail);
              suggestions.push({ denomination: d, count });
              diff -= (count * d);
          } else suggestions.push({ denomination: d, count: 0 });
      }
      setReturnedNotes(suggestions);
  };

  const grandTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const selectedAccount = accounts.find(a => a.id === paymentMode);
  const isCashAccount = selectedAccount?.type === 'Cash';

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col h-screen animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
         <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"><X className="w-6 h-6" /></button>
            <div className="h-10 w-px bg-gray-100 dark:bg-gray-800 hidden md:block" />
            <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <ShoppingBag className={`w-6 h-6 ${isPurchase ? 'text-blue-500' : 'text-brand-500'}`} />
                    {initialData ? 'Update' : 'New'} {type.replace('_', ' ')}
                </h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Ref No: {invoiceNo || '--'}</p>
            </div>
            
            {!isPurchase && (
                <div className="hidden xl:flex items-center ml-4 bg-gray-50 dark:bg-gray-800 rounded-2xl p-1 border border-gray-100 dark:border-gray-700">
                    <button onClick={() => setPricingMode('retail')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pricingMode === 'retail' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm border border-brand-50' : 'text-gray-400'}`}>
                        <Tag className="w-3 h-3" /> Retail
                    </button>
                    <button onClick={() => setPricingMode('wholesale')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pricingMode === 'wholesale' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm border border-brand-50' : 'text-gray-400'}`}>
                        <Percent className="w-3 h-3" /> Wholesale
                    </button>
                    <button onClick={() => setPricingMode('cost')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${pricingMode === 'cost' ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm border border-orange-50' : 'text-gray-400'}`}>
                        <DollarSign className="w-3 h-3" /> Cost
                    </button>
                </div>
            )}
         </div>

         <div className="flex items-center gap-6">
            <div className="text-right">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Payable</span>
                <span className={`block text-3xl font-black ${isPurchase ? 'text-blue-600' : 'text-brand-500'}`}>{formatCurrency(grandTotal)}</span>
            </div>
            <button onClick={handleFinalSave} className={`flex items-center gap-2 px-8 py-4 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 ${isPurchase ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'}`}>
                <Save className="w-5 h-5" /> {initialData ? 'Update' : 'Commit'} Entry (Ctrl+S)
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-6">
         <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-10">
               <div className="md:col-span-5 relative group">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Customer / Vendor Identity</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                    <input ref={partyInputRef} type="text" className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none dark:text-white transition-all" placeholder="Search partner node..." value={partySearchTerm} onChange={(e) => { setPartySearchTerm(e.target.value); setShowPartyDropdown(true); setSelectedPartyId(''); setHighlightedPartyIndex(0); }} onFocus={() => setShowPartyDropdown(true)} onKeyDown={handlePartyKeyDown} />
                  </div>
                  {showPartyDropdown && (
                      <div ref={partyDropdownRef} className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[60] mt-2 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredParties.map((p, idx) => (
                            <div key={p.id} data-index={idx} className={`p-4 border-b dark:border-gray-700 last:border-0 cursor-pointer flex justify-between items-center transition-colors ${highlightedPartyIndex === idx ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => handlePartySelect(p)}>
                                <div><span className="font-bold block text-gray-900 dark:text-white">{p.name}</span><span className="text-[10px] text-gray-400 font-bold uppercase">{p.phone || 'No Phone'}</span></div>
                                <div className="text-right">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${p.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{formatCurrency(Math.abs(p.balance))} {p.balance >= 0 ? 'Dr' : 'Cr'}</span>
                                </div>
                            </div>
                        ))}
                        <div data-index={filteredParties.length} className={`p-4 cursor-pointer flex items-center gap-2 text-brand-600 font-black border-t dark:border-gray-700 uppercase text-[10px] tracking-widest ${highlightedPartyIndex === filteredParties.length ? 'bg-brand-50' : 'hover:bg-gray-50'}`} onClick={() => { setQuickParty({ name: partySearchTerm, phone: '', address: '' }); setShowAddPartyModal(true); setShowPartyDropdown(false); }}>
                            <Plus className="w-4 h-4" /> Register "{partySearchTerm || 'New Partner'}"
                        </div>
                      </div>
                  )}
               </div>

               <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Entry Date (BS)</label>
                  <NepaliDatePicker value={invoiceDate} onChange={setInvoiceDate} />
               </div>

               <div className="md:col-span-4">
                   <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Settlement Node</label>
                   <div className="flex gap-2">
                       <div className="relative flex-1">
                           <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                           <select className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-brand-500/10 transition-all outline-none appearance-none dark:text-white" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                              <option value="Credit">CREDIT ACCOUNT (LEAVE DUES)</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.name.toUpperCase()} ({formatCurrency(a.balance)})</option>)}
                           </select>
                           <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                       </div>
                       {isCashAccount && (
                           <button onClick={() => setShowCashModal(true)} className={`px-4 rounded-2xl border transition-all ${receivedNotes.some(n => n.count > 0) || returnedNotes.some(n => n.count > 0) ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-300 hover:text-brand-500'}`}>
                               <Banknote className="w-6 h-6" />
                           </button>
                       )}
                   </div>
               </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
               <div className="grid grid-cols-[50px_minmax(300px,2fr)_150px_100px_80px_120px_120px_150px_50px] gap-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 px-8 py-5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] sticky top-0 z-10">
                  <div className="text-center">#</div>
                  <div>Inventory Item Search</div>
                  <div className="text-center">HSN Code</div>
                  <div className="text-center">Quantity</div>
                  <div className="text-center">Unit</div>
                  <div className="text-right">Unit Price</div>
                  <div className="text-right">Discount</div>
                  <div className="text-right pr-4">Total Amount</div>
                  <div></div>
               </div>

               <div className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                  {items.map((item, index) => (
                        <div key={item.id} className={`grid grid-cols-[50px_minmax(300px,2fr)_150px_100px_80px_120px_120px_150px_50px] gap-2 items-center px-4 py-2 rounded-2xl border transition-all ${focusedRowIndex === index ? 'bg-brand-50/20 dark:bg-brand-900/10 border-brand-100 dark:border-brand-800' : 'bg-white dark:bg-gray-800 border-transparent'}`}>
                           <div className="text-center text-[10px] font-black text-gray-300">{index + 1}</div>
                           <div className="relative group">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                              <input ref={(el) => { if (el) inputsRef.current.set(`${index}-productName`, el); }} type="text" className="w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-white transition-all" placeholder="Enter SKU or name..." value={item.productName} onChange={e => handleFieldChange(index, 'productName', e.target.value)} onFocus={() => { setFocusedRowIndex(index); setShowProductDropdown(true); setProductSearchTerm(item.productName); }} onKeyDown={e => handleKeyDownInGrid(e, index, 'productName')} />
                              {showProductDropdown && focusedRowIndex === index && (
                                 <div ref={productDropdownRef} className="absolute top-full left-0 w-full min-w-[450px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Catalog Item</span></div>
                                    <div className="max-h-80 overflow-y-auto scroll-smooth custom-scrollbar">
                                        {filteredProducts.map((p, idx) => {
                                              const currentRate = isPurchase ? p.purchasePrice : (pricingMode === 'wholesale' ? (p.wholesalePrice || p.salePrice) : (pricingMode === 'cost' ? p.purchasePrice : p.salePrice));
                                              return (
                                                  <div key={p.id} data-index={idx} className={`p-4 border-b last:border-0 dark:border-gray-700 cursor-pointer flex justify-between items-center transition-colors ${highlightedProductIndex === idx ? 'bg-brand-50 dark:bg-brand-900/30 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => handleProductSelect(index, p)}>
                                                     <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center justify-center font-black text-[10px] text-gray-400">{p.name.substring(0, 2).toUpperCase()}</div>
                                                        <div>
                                                            <div className={`font-black text-sm transition-colors ${highlightedProductIndex === idx ? 'text-brand-700 dark:text-brand-400 font-bold' : 'text-gray-900 dark:text-white'}`}>{p.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">HSN: {p.hsnCode || '--'} • Stock: {p.stock} {p.unit}</div>
                                                        </div>
                                                     </div>
                                                     <div className="text-right">
                                                         <div className="font-black text-gray-900 dark:text-white">{formatCurrency(currentRate)}</div>
                                                         <div className="text-[9px] text-brand-500 font-black uppercase tracking-tighter">{isPurchase ? 'Cost' : pricingMode} Price</div>
                                                     </div>
                                                  </div>
                                              );
                                        })}
                                    </div>
                                    <div data-index={filteredProducts.length} className={`p-4 cursor-pointer flex items-center gap-2 text-brand-600 font-black border-t dark:border-gray-700 uppercase text-[10px] tracking-widest ${highlightedProductIndex === filteredProducts.length ? 'bg-brand-50' : 'hover:bg-gray-50'}`} onClick={() => { setQuickProduct({ name: productSearchTerm, hsnCode: '', stock: 0, salePrice: 0, purchasePrice: 0, unit: 'pcs' }); setShowAddProductModal(true); setShowProductDropdown(false); }}>
                                        <Plus className="w-4 h-4" /> Add "{productSearchTerm || 'New SKU'}"
                                    </div>
                                 </div>
                              )}
                           </div>
                           <div><input type="text" className="w-full py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-center font-mono font-bold dark:text-white" value={item.hsnCode} onChange={e => handleFieldChange(index, 'hsnCode', e.target.value)} placeholder="HSN" /></div>
                           <div><input ref={(el) => { if (el) inputsRef.current.set(`${index}-quantity`, el); }} type="number" min="0" className="w-full py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-center font-black dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20" value={item.quantity} onChange={e => handleFieldChange(index, 'quantity', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'quantity')} /></div>
                           <div><div className="h-11 flex items-center justify-center text-[10px] text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl font-black uppercase tracking-tighter">{item.unit || '-'}</div></div>
                           <div><input ref={(el) => { if (el) inputsRef.current.set(`${index}-rate`, el); }} type="number" className="w-full py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-right font-black dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 px-3" value={item.rate} onChange={e => handleFieldChange(index, 'rate', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'rate')} /></div>
                           <div><input ref={(el) => { if (el) inputsRef.current.set(`${index}-discountAmount`, el); }} type="number" className="w-full py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-right font-bold text-red-500 outline-none focus:ring-2 focus:ring-red-500/10 px-3" placeholder="Dis." value={item.discountAmount} onChange={e => handleFieldChange(index, 'discountAmount', e.target.value)} onKeyDown={e => handleKeyDownInGrid(e, index, 'discountAmount')} /></div>
                           <div className="text-right pr-6 font-black text-gray-900 dark:text-white text-base">{formatCurrency(item.amount)}</div>
                           <div className="flex justify-center"><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></div>
                        </div>
                  ))}
               </div>

               <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 p-6 px-10 flex items-center justify-between">
                  <button onClick={addNewRow} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add Row (Enter)
                  </button>
                  <div className="flex items-center gap-12">
                      <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Units</span>
                          <span className="text-lg font-black text-gray-700 dark:text-gray-300">{totalQty.toLocaleString()}</span>
                      </div>
                      <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
                      <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Gross Snapshot</span>
                          <span className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(grandTotal)}</span>
                      </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {showAddPartyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <form onSubmit={handleSaveQuickParty} className="bg-white dark:bg-gray-800 rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="bg-brand-600 p-10 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><UserPlus className="w-7 h-7" /> New Partner</h3>
                        <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1">Quick Registration</p>
                    </div>
                    <button type="button" onClick={() => setShowAddPartyModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-10 space-y-6">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Legal Name</label><input required className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" placeholder="Enter full name..." value={quickParty.name} onChange={e => setQuickParty({...quickParty, name: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Mobile Number</label><input className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" placeholder="98XXXXXXXX" value={quickParty.phone} onChange={e => setQuickParty({...quickParty, phone: e.target.value})} /></div>
                    <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all mt-4">Save & Select</button>
                </div>
            </form>
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <form onSubmit={handleSaveQuickProduct} className="bg-white dark:bg-gray-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="bg-brand-600 p-10 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3"><Package className="w-7 h-7" /> Quick SKU</h3>
                        <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1">Catalog Entry</p>
                    </div>
                    <button type="button" onClick={() => setShowAddProductModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-10 space-y-8">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Item Title</label><input required className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" placeholder="e.g. Laptop Charger" value={quickProduct.name} onChange={e => setQuickProduct({...quickProduct, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">HSN Code</label><input className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" value={quickProduct.hsnCode} onChange={e => setQuickProduct({...quickProduct, hsnCode: e.target.value})} /></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Unit</label><input className="w-full p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white uppercase" placeholder="PCS" value={quickProduct.unit} onChange={e => setQuickProduct({...quickProduct, unit: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-2">Retail Price</label><input type="number" required className="w-full p-4 bg-brand-50/30 dark:bg-brand-900/10 border border-brand-100 rounded-2xl font-black text-brand-700 dark:text-brand-400 outline-none" value={quickProduct.salePrice} onChange={e => setQuickProduct({...quickProduct, salePrice: Number(e.target.value)})} /></div>
                        <div><label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Cost Price</label><input type="number" required className="w-full p-4 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 rounded-2xl font-black text-blue-700 dark:text-blue-400 outline-none" value={quickProduct.purchasePrice} onChange={e => setQuickProduct({...quickProduct, purchasePrice: Number(e.target.value)})} /></div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-brand-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all mt-4">Register & Select</button>
                </div>
            </form>
        </div>
      )}

      {showCashModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
              <div className="bg-white dark:bg-gray-900 rounded-[3.5rem] w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-brand-600 p-10 text-white flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote className="w-40 h-40 rotate-12" /></div>
                      <div className="relative z-10">
                          <h3 className="text-3xl font-black flex items-center gap-3 uppercase tracking-tight"><Banknote className="w-8 h-8" /> Physical Drawer Sync</h3>
                          <p className="text-brand-100 text-[10px] mt-1 font-black uppercase tracking-[0.2em]">Verify exact currency flow</p>
                      </div>
                      <button onClick={() => setShowCashModal(false)} className="relative z-10 p-3 hover:bg-white/20 rounded-full transition-colors"><X className="w-7 h-7" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 bg-gray-50/50 dark:bg-gray-900/50">
                      <div className="space-y-6">
                          <div className="flex justify-between items-center border-b dark:border-gray-800 pb-4">
                              <h4 className="font-black text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Notes Received (IN)</h4>
                              <div className="text-2xl font-black text-brand-600">{formatCurrency(receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0))}</div>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                              {receivedNotes.map((n, i) => (
                                  <div key={n.denomination} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${n.count > 0 ? 'bg-white dark:bg-gray-800 border-brand-500 shadow-md ring-4 ring-brand-500/5' : 'bg-transparent border-gray-100 dark:border-gray-800'}`}>
                                      <div className="flex items-center gap-4">
                                          <div className={`w-14 h-9 rounded-xl flex items-center justify-center font-black text-xs ${n.denomination >= 500 ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>{n.denomination}</div>
                                          <X className="w-3 h-3 text-gray-300" />
                                      </div>
                                      <input type="number" min="0" className="w-24 p-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" value={n.count || ''} onChange={e => {const val = parseInt(e.target.value) || 0; setReceivedNotes(prev => prev.map((item, idx) => idx === i ? {...item, count: val} : item));}} />
                                      <span className="w-28 text-right font-black text-gray-400 text-sm">{formatCurrency(n.denomination * n.count)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div className="flex justify-between items-center border-b dark:border-gray-800 pb-4">
                              <h4 className="font-black text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">Notes Disbursed (OUT)</h4>
                              <div className="flex flex-col items-end">
                                  <div className="text-2xl font-black text-red-500">{formatCurrency(returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0))}</div>
                                  <button type="button" onClick={handleAutoSuggest} className="text-[8px] bg-brand-500 text-white px-4 py-1.5 rounded-full font-black mt-2 shadow-lg shadow-brand-500/30 flex items-center gap-1.5 transition-all uppercase tracking-tighter hover:scale-105 active:scale-95"><Sparkles className="w-3 h-3" /> Auto-Suggest Change</button>
                              </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                              {returnedNotes.map((n, i) => (
                                  <div key={n.denomination} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${n.count > 0 ? 'bg-white dark:bg-gray-800 border-red-500 shadow-md ring-4 ring-red-500/5' : 'bg-transparent border-gray-100 dark:border-gray-800'}`}>
                                      <div className="flex items-center gap-4">
                                          <div className={`w-14 h-9 rounded-xl flex items-center justify-center font-black text-xs ${n.denomination >= 500 ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>{n.denomination}</div>
                                          <X className="w-3 h-3 text-gray-300" />
                                      </div>
                                      <input type="number" min="0" className="w-24 p-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl text-center font-black outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" value={n.count || ''} onChange={e => {const val = parseInt(e.target.value) || 0; setReturnedNotes(prev => prev.map((item, idx) => idx === i ? {...item, count: val} : item));}} />
                                      <span className="w-28 text-right font-black text-gray-400 text-sm">{formatCurrency(n.denomination * n.count)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-10 border-t dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row justify-between items-center gap-8">
                      <div className="flex items-center gap-12">
                          <div className="text-center sm:text-left">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Invoice Total</p>
                              <div className="text-2xl font-black dark:text-white">{formatCurrency(grandTotal)}</div>
                          </div>
                          <div className="h-10 w-px bg-gray-100 dark:bg-gray-800" />
                          <div className="text-center sm:text-left">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Net Physical Verified</p>
                              <div className={`text-2xl font-black ${Math.abs((receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0) - returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0)) - grandTotal) < 0.1 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                  {formatCurrency(receivedNotes.reduce((s, n) => s + (n.denomination * n.count), 0) - returnedNotes.reduce((s, n) => s + (n.denomination * n.count), 0))}
                              </div>
                          </div>
                      </div>
                      <button type="button" onClick={() => setShowCashModal(false)} className="w-full sm:w-auto px-16 py-5 bg-brand-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-500/40 hover:bg-brand-700 transition-all flex items-center justify-center gap-3 active:scale-95"><Check className="w-5 h-5" /> Finalize Breakdown</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PosForm;