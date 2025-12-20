
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product, TransactionItem, Party } from '../types';
import { formatCurrency } from '../services/formatService';
import { Search, Plus, Minus, Trash2, ShoppingBag, FileText, ChevronRight, X, Package, Pencil, ChevronUp, ChevronDown, Tag, Percent, DollarSign } from 'lucide-react';
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
  const [taxRate, setTaxRate] = useState<number>(0); // Percentage
  
  const [showCharges, setShowCharges] = useState(false);
  const [extraCharges, setExtraCharges] = useState<number>(0);

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', category: '', type: 'goods', stock: 0, purchasePrice: 0, salePrice: 0, unit: 'pcs' 
  });

  // Mobile Cart Toggle
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

    if (selectedCategory !== 'All Categories') {
      result = result.filter(p => (p.category || 'General') === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.category && p.category.toLowerCase().includes(term))
      );
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
          addToast(`Switched to ${mode} prices.`, 'info');
      }
  };

  const addToCart = (product: Product) => {
    const rate = pricingMode === 'retail' ? product.salePrice : (pricingMode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : product.purchasePrice);

    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, amount: (item.quantity + 1) * item.rate }
            : item
        );
      } else {
        return [...prev, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          rate: rate,
          amount: rate
        }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, amount: newQty * item.rate };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0 || !selectedPartyId) {
        if (!selectedPartyId) addToast("Please select a customer/party first.", 'error');
        else addToast("Cart is empty.", 'error');
        return;
    }

    const party = parties.find(p => p.id === selectedPartyId);
    
    const subTotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subTotal - discountAmount) * (taxRate / 100);
    const totalAmount = (subTotal - discountAmount) + taxAmount + extraCharges;

    db.addTransaction({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'SALE',
      partyId: selectedPartyId,
      partyName: party?.name || 'Unknown',
      items: cartItems,
      subTotal,
      discount: discountAmount,
      tax: taxAmount,
      extraCharges,
      totalAmount
    });

    setCartItems([]);
    setDiscountAmount(0);
    setTaxRate(0);
    setExtraCharges(0);
    setShowDiscount(false);
    setShowTax(false);
    setShowCharges(false);
    setMobileCartExpanded(false);
    
    addToast('Sale recorded successfully!', 'success');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name) {
      db.addProduct({
        id: Date.now().toString(),
        name: newProduct.name!,
        category: newProduct.category || 'General',
        type: newProduct.type || 'goods',
        stock: newProduct.type === 'service' ? 0 : Number(newProduct.stock),
        purchasePrice: Number(newProduct.purchasePrice),
        salePrice: Number(newProduct.salePrice),
        unit: newProduct.unit || 'pcs'
      });
      
      refreshData();
      setShowAddModal(false);
      setNewProduct({ name: '', category: '', type: 'goods', stock: 0, purchasePrice: 0, salePrice: 0, unit: 'pcs' });
      addToast('Item added successfully', 'success');
    }
  };

  const clearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      setCartItems([]);
      setDiscountAmount(0);
      setTaxRate(0);
      setExtraCharges(0);
    }
  };

  const subTotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const taxableAmount = Math.max(0, subTotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount + extraCharges;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* Left Side - Product Grid */}
      <div className={`flex-1 flex flex-col border-r border-gray-200 overflow-hidden ${mobileCartExpanded ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Quick POS</h2>
              {/* Pricing Mode Selector */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200 shadow-inner">
                  <button 
                      onClick={() => handlePricingModeChange('retail')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${pricingMode === 'retail' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      title="Retailer Price"
                  >
                      <Tag className="w-3 h-3" /> Retail
                  </button>
                  <button 
                      onClick={() => handlePricingModeChange('wholesale')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${pricingMode === 'wholesale' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      title="Wholesale Price"
                  >
                      <Percent className="w-3 h-3" /> Wholesale
                  </button>
                  <button 
                      onClick={() => handlePricingModeChange('cost')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 ${pricingMode === 'cost' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      title="Cost Price"
                  >
                      <DollarSign className="w-3 h-3" /> Cost
                  </button>
              </div>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
               onClick={() => setShowAddModal(true)}
               className="hidden sm:flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-sm font-medium hover:bg-brand-100"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Item</span>
            </button>
            <button 
               onClick={() => onNavigate('dashboard')}
               className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
               title="Close Quick POS"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 py-3 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-gray-100 bg-white">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-brand-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 pb-24 lg:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
               const colors = ['bg-emerald-100 text-emerald-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600'];
               const colorClass = colors[product.id.charCodeAt(0) % colors.length];
               const currentRate = pricingMode === 'retail' ? product.salePrice : (pricingMode === 'wholesale' ? (product.wholesalePrice || product.salePrice) : product.purchasePrice);

               return (
                <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col active:scale-95 duration-150 cursor-pointer" onClick={() => addToCart(product)}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center font-bold text-sm`}>
                      {product.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 uppercase tracking-wide truncate max-w-[60px]">{product.category || 'GEN'}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2 min-h-[2.5em]" title={product.name}>
                    {product.name}
                  </h3>
                  
                  <div className="flex flex-col gap-1 mt-auto">
                    <span className="text-xs text-gray-500">
                      {product.type === 'service' ? 'Service' : `Qty: ${product.stock}`}
                    </span>
                    <span className="font-bold text-gray-900">{formatCurrency(currentRate)}</span>
                  </div>
                </div>
               );
            })}
            
            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                <p>No products found</p>
                {searchTerm && <p className="text-xs mt-1">Try checking category spelling or add a new item.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className={`
        lg:w-96 bg-white flex flex-col shadow-xl z-20 border-l border-gray-100 transition-all duration-300
        lg:relative lg:h-auto
        fixed bottom-0 left-0 right-0
        ${mobileCartExpanded ? 'top-0 h-full' : 'h-auto max-h-[85vh]'}
      `}>
        
        {mobileCartExpanded && (
           <div className="lg:hidden p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="font-bold text-gray-800">Current Order</h3>
              <button onClick={() => setMobileCartExpanded(false)} className="p-2 bg-gray-100 rounded-full">
                 <ChevronDown className="w-5 h-5 text-gray-600" />
              </button>
           </div>
        )}

        <div className="hidden lg:flex p-4 border-b border-gray-100 bg-white items-center justify-between">
           <h3 className="font-bold text-gray-800">Billing Items ({cartItems.length})</h3>
           {cartItems.length > 0 && (
             <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 underline font-medium">
               Clear Items
             </button>
           )}
        </div>

        <div className={`flex-1 flex flex-col overflow-hidden ${!mobileCartExpanded ? 'hidden lg:flex' : 'flex'}`}>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <select 
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
                    value={selectedPartyId}
                    onChange={e => setSelectedPartyId(e.target.value)}
                >
                    {parties.length === 0 && <option value="">No parties found</option>}
                    {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                {parties.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please add a party from 'Parties' menu first.</p>
                )}
            </div>

            {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm max-w-[200px]">
                Select items to record a sale
                </p>
            </div>
            ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cartItems.map((item) => (
                <div key={item.productId} className="flex flex-col pb-4 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-gray-800 line-clamp-2 pr-2">{item.productName}</h4>
                        <div className="flex gap-2 shrink-0">
                        <button className="text-gray-400 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                        {item.quantity} {item.quantity > 1 ? 'PCS' : 'PC'} X {formatCurrency(item.rate)}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                        <button 
                            onClick={() => item.quantity > 1 ? updateQuantity(item.productId, -1) : removeFromCart(item.productId)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-gray-900"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button 
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-gray-900"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(item.amount)}</span>
                    </div>
                </div>
                ))}
            </div>
            )}

            {cartItems.length > 0 && (
            <div className="p-5 bg-white border-t border-gray-200">
                <div className="flex justify-between items-center mb-3 text-gray-600">
                <span className="text-sm">Sub Total</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subTotal)}</span>
                </div>

                <div className="space-y-2 mb-4">
                    {showDiscount && (
                    <div className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Discount (Rs)</span>
                            <input 
                            type="number" 
                            className="w-20 p-1 border border-gray-300 rounded text-right text-xs" 
                            value={discountAmount}
                            onChange={e => setDiscountAmount(Number(e.target.value))}
                            />
                        </div>
                        <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
                    </div>
                    )}

                    {showTax && (
                    <div className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Tax (%)</span>
                            <input 
                            type="number" 
                            className="w-12 p-1 border border-gray-300 rounded text-right text-xs" 
                            value={taxRate}
                            onChange={e => setTaxRate(Number(e.target.value))}
                            />
                        </div>
                        <span className="text-gray-700">+{formatCurrency(taxAmount)}</span>
                    </div>
                    )}

                    {showCharges && (
                    <div className="flex justify-between items-center text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Extra Charges</span>
                            <input 
                            type="number" 
                            className="w-20 p-1 border border-gray-300 rounded text-right text-xs" 
                            value={extraCharges}
                            onChange={e => setExtraCharges(Number(e.target.value))}
                            />
                        </div>
                        <span className="text-gray-700">+{formatCurrency(extraCharges)}</span>
                    </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 mb-6 text-xs font-medium text-emerald-600 select-none">
                    <button 
                    onClick={() => setShowDiscount(!showDiscount)} 
                    className={`flex items-center gap-1 hover:text-emerald-700 ${showDiscount ? 'opacity-100 font-bold' : 'opacity-80'}`}
                    >
                    <Plus className="w-3 h-3" /> Discount
                    </button>
                    <button 
                    onClick={() => setShowTax(!showTax)} 
                    className={`flex items-center gap-1 hover:text-emerald-700 ${showTax ? 'opacity-100 font-bold' : 'opacity-80'}`}
                    >
                    <Plus className="w-3 h-3" /> Tax
                    </button>
                    <button 
                    onClick={() => setShowCharges(!showCharges)} 
                    className={`flex items-center gap-1 hover:text-emerald-700 ${showCharges ? 'opacity-100 font-bold' : 'opacity-80'}`}
                    >
                    <Plus className="w-3 h-3" /> Additional Charges
                    </button>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-200 mb-4">
                <span className="font-bold text-gray-900 text-lg">Total Amount</span>
                <span className="font-bold text-emerald-600 text-xl">{formatCurrency(totalAmount)}</span>
                </div>

                <button 
                onClick={handleCheckout}
                className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                <span>Charge {formatCurrency(totalAmount)}</span>
                <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            )}
        </div>

        {!mobileCartExpanded && (
           <div className="lg:hidden p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between cursor-pointer" onClick={() => setMobileCartExpanded(true)}>
              <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{cartItems.length} Items</span>
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                 </div>
                 <span className="text-xl font-bold text-emerald-600">{formatCurrency(subTotal)}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setMobileCartExpanded(true); }}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg font-bold shadow-md"
              >
                View Order
              </button>
           </div>
        )}

      </div>

       {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
               <h2 className="text-lg font-bold flex items-center gap-2">
                 <Package className="w-5 h-5 text-brand-500" />
                 Add New Item
               </h2>
               <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Item Name</label>
                  <input required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Wireless Mouse" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                </div>
              </div>
              
              <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                  <div className="relative">
                    <input 
                      list="categories"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                      placeholder="Select or type category..." 
                      value={newProduct.category} 
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                    />
                    <datalist id="categories">
                      {categories.filter(c => c !== 'All Categories').map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Stock</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Unit</label>
                   <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}>
                     <option value="pcs">Pcs</option>
                     <option value="kg">Kg</option>
                     <option value="ltr">Ltr</option>
                     <option value="box">Box</option>
                   </select>
                </div>
                 <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Purchase Price</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} />
                </div>
              </div>
              
              <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sale Price</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})} />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-bold shadow-md shadow-brand-500/30">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickPos;
