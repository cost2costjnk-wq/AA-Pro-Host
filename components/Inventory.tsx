
import { AlertCircle, AlertTriangle, Box, CheckCircle2, ChevronDown, Filter, Layers, Package, Pencil, Plus, Save, Search, Settings2, Trash2, TrendingUp, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { db } from '../services/db';
import { exportToExcel, transformProductsForExport } from '../services/exportService';
import { formatCurrency } from '../services/formatService';
import { Category, Product } from '../types';
import { useToast } from './Toast';

interface InventoryProps {
  triggerAdd?: number;
  refreshKey?: number;
  onNavigateToRestock?: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ triggerAdd, refreshKey, onNavigateToRestock }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', hsnCode: '', category: 'General', type: 'goods', stock: 0, minStockLevel: 5, 
    purchasePrice: 0, salePrice: 0, wholesalePrice: 0, unit: 'pcs' 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  
  const { addToast } = useToast();
  const canEdit = authService.can('inventory', 'edit');
  const canDelete = authService.can('inventory', 'delete');

  const loadData = () => {
    setProducts(db.getProducts());
    setAllCategories(db.getCategories());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-updated', loadData);
    return () => window.removeEventListener('db-updated', loadData);
  }, [showModal, refreshKey]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && canEdit) {
      openNewProductModal();
    }
  }, [triggerAdd]);

  // Analytics Calculations
  const analytics = useMemo(() => {
    const totalValue = products.reduce((s, p) => s + (p.stock * p.purchasePrice), 0);
    const lowStock = products.filter(p => p.type !== 'service' && p.stock > 0 && p.stock <= (p.minStockLevel || 5)).length;
    const outOfStock = products.filter(p => p.type !== 'service' && p.stock <= 0).length;
    return { totalValue, lowStock, outOfStock, totalSKU: products.length };
  }, [products]);

  // Extract and sort unique categories for the FILTER dropdown
  const filterCategories = useMemo(() => {
    const uniqueCats = Array.from(new Set(products.map(p => p.category || 'General'))) as string[];
    return ['All Categories', ...uniqueCats.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.hsnCode && p.hsnCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const pCat = p.category || 'General';
      const matchesCategory = selectedCategory === 'All Categories' || pCat === selectedCategory;
      
      let matchesStock = true;
      if (stockFilter === 'low') matchesStock = p.stock > 0 && p.stock <= (p.minStockLevel || 5);
      if (stockFilter === 'out') matchesStock = p.stock <= 0;
      
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  const openNewProductModal = () => {
    setNewProduct({ 
        name: '', hsnCode: '', category: 'General', type: 'goods', stock: 0, minStockLevel: 5, 
        purchasePrice: 0, salePrice: 0, wholesalePrice: 0, unit: 'pcs' 
    });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    if (!canEdit) return;
    setNewProduct({ ...product });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (window.confirm('This will permanently remove the item from your database. Continue?')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
      addToast('Item successfully removed from registry', 'success');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name) {
      const productToSave: Product = {
        id: newProduct.id || Date.now().toString(),
        name: newProduct.name,
        hsnCode: newProduct.hsnCode,
        category: newProduct.category || 'General',
        type: newProduct.type as 'goods' | 'service',
        stock: newProduct.type === 'service' ? 0 : Number(newProduct.stock),
        minStockLevel: newProduct.type === 'service' ? 0 : Number(newProduct.minStockLevel || 0),
        purchasePrice: Number(newProduct.purchasePrice),
        salePrice: Number(newProduct.salePrice),
        wholesalePrice: Number(newProduct.wholesalePrice),
        unit: newProduct.unit || 'pcs',
        secondaryUnit: newProduct.secondaryUnit,
        conversionRatio: newProduct.conversionRatio ? Number(newProduct.conversionRatio) : undefined
      };
      if (newProduct.id) db.updateProduct(productToSave);
      else db.addProduct(productToSave);
      setShowModal(false);
      addToast(`Product "${productToSave.name}" updated`, 'success');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
            <Package className="w-10 h-10 text-brand-500" /> 
            Inventory Suite
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Enterprise Asset Management & Valuation</p>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
                onClick={() => exportToExcel(transformProductsForExport(products), 'Master_Inventory')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
            >
                <Layers className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
            {canEdit && (
              <button 
                onClick={openNewProductModal} 
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all font-bold uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Register New SKU
              </button>
            )}
        </div>
      </div>

      {/* Analytics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl"><Box className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total SKU</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{analytics.totalSKU}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Unique Tracked Items</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Inventory Value</span>
            </div>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(analytics.totalValue)}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Asset Value (at Cost)</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm group hover:border-orange-200 transition-colors cursor-pointer" onClick={() => setStockFilter('low')}>
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl"><AlertTriangle className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Low Stock Alerts</span>
            </div>
            <p className="text-2xl font-black text-orange-600">{analytics.lowStock}</p>
            <p className="text-[10px] text-orange-400 font-bold uppercase mt-1">Requires Replenishment</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm group hover:border-red-200 transition-colors cursor-pointer" onClick={() => setStockFilter('out')}>
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl"><Box className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Out of Stock</span>
            </div>
            <p className="text-2xl font-black text-red-600">{analytics.outOfStock}</p>
            <p className="text-[10px] text-red-400 font-bold uppercase mt-1">Immediate Order Needed</p>
        </div>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] p-5 shadow-sm flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 relative w-full group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
           <input 
                type="text" 
                placeholder="Search Item Name, HSN, SKU or Category..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand-500/10 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all dark:text-white" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
           />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative min-w-[180px] flex-1 lg:flex-none group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                <select 
                    className="w-full pl-9 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                >
                    {filterCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                {(['all', 'low', 'out'] as const).map(f => (
                    <button 
                        key={f} 
                        onClick={() => setStockFilter(f)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${stockFilter === f ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-brand-50 dark:border-brand-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {f === 'all' ? 'All Items' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                    </button>
                ))}
            </div>
            
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-2xl text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {filteredProducts.length} Results
            </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
           <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-8 py-5">Product Identity</th>
                  <th className="px-8 py-5">HSN Code</th>
                  <th className="px-8 py-5 text-center">Stock Level</th>
                  <th className="px-8 py-5 text-right">Unit Price (Buy)</th>
                  <th className="px-8 py-5 text-right">Retail (Dr)</th>
                  <th className="px-8 py-5 text-right">Wholesale</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                 {filteredProducts.map(p => {
                    const isLow = p.type !== 'service' && p.stock > 0 && p.stock <= (p.minStockLevel || 5);
                    const isOut = p.type !== 'service' && p.stock <= 0;

                    return (
                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 group transition-all">
                           <td className="px-8 py-5">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 flex items-center justify-center font-black text-xs border border-brand-100 dark:border-brand-800">
                                    {p.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-black text-gray-900 dark:text-white text-base">{p.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.category}</span>
                                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                        <span className="text-[9px] font-bold text-brand-600 uppercase">{p.unit}</span>
                                    </div>
                                </div>
                             </div>
                           </td>
                           <td className="px-8 py-5">
                              <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                                {p.hsnCode || '--'}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <div className={`inline-flex flex-col items-center p-2 px-4 rounded-2xl border ${isOut ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : isLow ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'}`}>
                                <span className={`text-lg font-black ${isOut ? 'text-red-600 dark:text-red-400' : isLow ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                    {p.type === 'service' ? '∞' : p.stock}
                                </span>
                                <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isOut ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Good Stock'}
                                </span>
                              </div>
                           </td>
                           <td className="px-8 py-5 text-right">
                                <div className="text-sm font-bold text-gray-500 dark:text-gray-400 font-mono">{formatCurrency(p.purchasePrice)}</div>
                           </td>
                           <td className="px-8 py-5 text-right">
                                <div className="text-base font-black text-gray-900 dark:text-white font-mono">{formatCurrency(p.salePrice)}</div>
                           </td>
                           <td className="px-8 py-5 text-right">
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(p.wholesalePrice || 0)}</div>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                 {canEdit && (
                                    <button onClick={() => handleEdit(p)} className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-brand-600 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:border-brand-200 shadow-sm transition-all">
                                        <Pencil className="w-4.5 h-4.5" />
                                    </button>
                                 )}
                                 {canDelete && (
                                    <button onClick={() => handleDelete(p.id)} className="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-200 shadow-sm transition-all">
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>
      </div>

      {/* Advanced Data Entry Modal */}
      {showModal && canEdit && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-100 dark:border-gray-700">
               <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
                        <Settings2 className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            {newProduct.id ? 'Modify Registry' : 'Register New SKU'}
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Inventory Management Logic</p>
                    </div>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
               </div>

               <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                 <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Box className="w-3.5 h-3.5" /> Product Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-8">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Official Item Name</label>
                            <input required autoFocus className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Dell Latitude 5420 Laptop" />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">HSN/SAC Code</label>
                            <input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" value={newProduct.hsnCode} onChange={e => setNewProduct({...newProduct, hsnCode: e.target.value})} placeholder="e.g. 8471" />
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Type</label>
                            <select className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none dark:text-white" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}>
                                <option value="goods">Physical Goods</option>
                                <option value="service">Digital/Service</option>
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Category</label>
                            <select className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                                <option value="General">General</option>
                                {allCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Base Unit</label>
                            <input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} placeholder="PCS, KG, LTR, PKT" />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Pricing Strategy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-3xl">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Unit Cost (Buy)</label>
                            <input type="number" className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 rounded-2xl text-center font-mono font-bold" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-brand-600 uppercase tracking-widest text-center">Standard Retail</label>
                            <input type="number" className="w-full p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 rounded-2xl text-center font-mono font-black text-brand-700 dark:text-brand-400" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest text-center">Wholesale Rate</label>
                            <input type="number" className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl text-center font-mono font-black text-blue-700 dark:text-blue-400" value={newProduct.wholesalePrice} onChange={e => setNewProduct({...newProduct, wholesalePrice: Number(e.target.value)})} />
                        </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-gray-700 dark:hover:text-gray-300 transition-all">Discard</button>
                    <button type="submit" className="px-12 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-500/40 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Commit SKU
                    </button>
                 </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Inventory;
