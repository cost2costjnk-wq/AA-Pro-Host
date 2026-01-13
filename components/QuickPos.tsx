
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product, TransactionItem, Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, 
  FileText, ChevronRight, X, Package, Pencil, 
  ChevronUp, ChevronDown, Tag, Percent, DollarSign,
  Grid, User, Info, CheckCircle, Calculator,
  // Added ArrowRight to imports
  ArrowRight
} from 'lucide-react';
import { useToast } from './Toast';

interface QuickPosProps {
  onNavigate: (tab: string) => void;
}

const QuickPos: React.FC<QuickPosProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart State
  const [cartItems, setCartItems] = useState<TransactionItem[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState(''); 
  const [pricingMode, setPricingMode] = useState<'retail' | 'wholesale' | 'cost'>('retail');

  // Billing Extras State
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  const [showTax, setShowTax] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(0); 
  
  const [showCharges, setShowCharges] = useState(false);
  const [extraCharges, setExtraCharges] = useState<number>(0);

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', category: '', type: 'goods', stock: 0, purchasePrice: 0, salePrice: 0, unit: 'pcs' 
  });

  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const allProducts = db.getProducts();
    setProducts(allProducts);
    setFilteredProducts(allProducts);
    const allParties = db.getParties();
    setParties(allParties);

    const uniqueCats = Array.from(new Set(allProducts.map(p => p.category || 'General')));
    setCategories(['All Categories', ...uniqueCats]);
    
    if (!selectedPartyId && allParties.length > 0) {
        const cashParty = allParties.find(p => p.id === '1');
        setSelectedPartyId(cashParty ? cashParty.id : allParties[0].id);
    }
  };

  useEffect(() => {
    let result = products;
    if (selectedCategory !== 'All Categories') result = result.filter(p => (p.category || 'General') === selectedCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term)));
    }
    setFilteredProducts(result);
  }, [selectedCategory, searchTerm, products]);

  const handlePricingModeChange = (mode: 'retail' | 'wholesale' | 'cost') => {
      setPricingMode(mode);
      if (cartItems.length > 0) {
          const updatedCart = cartItems.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return item;
              const newRate = mode === 'retail' ? product.salePrice : (mode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : product.purchasePrice);
              return { ...item, rate: newRate, amount: item.quantity * newRate };
          });
          setCartItems(updatedCart);
          addToast(`Prices updated to ${mode}.`, 'info');
      }
  };

  const addToCart = (product: Product) => {
    const rate = pricingMode === 'retail' ? product.salePrice : (pricingMode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : product.purchasePrice);
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1, amount: (item.quantity + 1) * item.rate } : item);
      } else {
        return [...prev, { productId: product.id, productName: product.name, quantity: 1, rate: rate, amount: rate }];
      }
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0 || !selectedPartyId) {
        if (!selectedPartyId) addToast("Please select a partner node.", 'error');
        else addToast("Order is empty.", 'error');
        return;
    }
    const party = parties.find(p => p.id === selectedPartyId);
    const subTotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subTotal - discountAmount) * (taxRate / 100);
    const totalAmount = (subTotal - discountAmount) + taxAmount + extraCharges;

    db.addTransaction({
      id: Date.now().toString(), date: new Date().toISOString(), type: 'SALE', partyId: selectedPartyId, partyName: party?.name || 'Unknown', items: cartItems, subTotal, discount: discountAmount, tax: taxAmount, extraCharges, totalAmount
    });

    setCartItems([]); setDiscountAmount(0); setTaxRate(0); setExtraCharges(0); setShowDiscount(false); setShowTax(false); setShowCharges(false); setMobileCartExpanded(false);
    addToast('Order confirmed and inventory adjusted.', 'success');
  };

  const subTotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = Math.max(0, subTotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount + extraCharges;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans">
      
      {/* Left: Product Browser */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileCartExpanded ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Subheader Toolbar */}
        <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className="p-3 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-2xl"><Grid className="w-6 h-6" /></div>
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Express Point</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Retail Grid View</p>
                </div>
            </div>

            <div className="flex-1 max-w-xl relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                <input type="text" placeholder="Search by name, SKU or category..." className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-brand-500/10 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
                    {(['retail', 'wholesale', 'cost'] as const).map(mode => (
                        <button key={mode} onClick={() => handlePricingModeChange(mode)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${pricingMode === mode ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-brand-50 dark:border-brand-900' : 'text-gray-400 hover:text-gray-600'}`}>
                            {mode}
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowAddModal(true)} className="p-4 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-600 active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
            </div>
        </div>

        {/* Categories Bar */}
        <div className="px-6 py-4 flex gap-3 overflow-x-auto whitespace-nowrap custom-scrollbar bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100'}`}>
                    {cat}
                </button>
            ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredProducts.map(p => {
                    const price = pricingMode === 'retail' ? p.salePrice : (pricingMode === 'wholesale' ? (p.wholesalePrice || p.salePrice) : p.purchasePrice);
                    return (
                        <div key={p.id} onClick={() => addToCart(p)} className="group bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-transparent hover:border-brand-200 dark:hover:border-brand-900 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col active:scale-[0.97]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center font-black text-xs text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors uppercase">{p.name.substring(0, 2)}</div>
                                <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${p.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>Stock: {p.stock}</div>
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm line-clamp-2 mb-4 h-10 leading-tight group-hover:text-brand-600 transition-colors">{p.name}</h3>
                            <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
                                <div className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(price)}</div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-brand-500"><Plus className="w-4 h-4" /></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {filteredProducts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale py-32">
                    <ShoppingBag className="w-24 h-24 mb-6" />
                    <p className="text-xl font-black uppercase tracking-[0.2em] text-gray-500">Empty Catalog Node</p>
                </div>
            )}
        </div>
      </div>

      {/* Right: Cart Panel */}
      <div className={`
        lg:w-[420px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl z-[40] border-l border-gray-100 dark:border-gray-800 transition-all duration-300
        lg:relative lg:h-auto
        fixed bottom-0 left-0 right-0
        ${mobileCartExpanded ? 'top-0 h-full rounded-none' : 'h-auto max-h-[85vh] rounded-t-[3rem]'}
      `}>
        
        {/* Cart Header */}
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20"><FileText className="w-5 h-5" /></div>
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Cart</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{cartItems.length} items staged</p>
                </div>
            </div>
            <button onClick={() => setCartItems([])} className="text-[10px] font-black uppercase text-red-500 hover:opacity-70 transition-all tracking-widest">Clear All</button>
        </div>

        {/* Customer Select */}
        <div className="px-8 py-6 bg-white dark:bg-gray-900">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Linked Partner Node</label>
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <select className="w-full pl-11 pr-10 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl text-sm font-bold outline-none appearance-none focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" value={selectedPartyId} onChange={e => setSelectedPartyId(e.target.value)}>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
        </div>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
            {cartItems.map(item => (
                <div key={item.productId} className="py-6 border-b border-gray-50 dark:border-gray-800 last:border-0 flex gap-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug truncate" title={item.productName}>{item.productName}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase mt-1">Rate: {formatCurrency(item.rate)}</p>
                        
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border dark:border-gray-700">
                                <button onClick={() => item.quantity > 1 ? setCartItems(cartItems.map(i => i.productId === item.productId ? {...i, quantity: i.quantity - 1, amount: (i.quantity - 1) * i.rate} : i)) : setCartItems(cartItems.filter(i => i.productId !== item.productId))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-400"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="w-10 text-center font-black text-sm flex items-center justify-center dark:text-white">{item.quantity}</span>
                                <button onClick={() => setCartItems(cartItems.map(i => i.productId === item.productId ? {...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.rate} : i))} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors text-brand-500"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                            <button onClick={() => setCartItems(cartItems.filter(i => i.productId !== item.productId))} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-between">
                        <div className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(item.amount)}</div>
                    </div>
                </div>
            ))}
            {cartItems.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20 grayscale">
                    <Calculator className="w-12 h-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Staging Area Idle</p>
                </div>
            )}
        </div>

        {/* Footer: Totals & Checkout */}
        <div className="p-8 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-6">
            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => setShowDiscount(!showDiscount)}>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Discount</span>
                        {!showDiscount && <Plus className="w-3 h-3 text-gray-300 group-hover:text-red-400" />}
                    </div>
                    {showDiscount ? <input type="number" className="w-24 p-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-right font-black text-red-500 outline-none focus:ring-2 focus:ring-red-500/10 text-xs" value={discountAmount} onChange={e => setDiscountAmount(Number(e.target.value))} onClick={e => e.stopPropagation()} autoFocus /> : <span className="font-bold text-red-500">-{formatCurrency(discountAmount)}</span>}
                </div>
            </div>

            <div className="pt-6 border-t-2 border-dashed border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Payable</p>
                    <h4 className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</h4>
                </div>
                <button onClick={handleCheckout} disabled={cartItems.length === 0} className="px-12 py-5 bg-brand-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-500/40 hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center gap-3">
                    Confirm <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>

      </div>

    </div>
  );
};

export default QuickPos;
