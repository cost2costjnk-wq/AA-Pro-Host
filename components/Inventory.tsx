
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { formatCurrency } from '../services/formatService';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  FileSpreadsheet, 
  Printer, 
  Package, 
  ChevronDown, 
  Check,
  X,
  AlertTriangle,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { exportToExcel, printData, transformProductsForExport } from '../services/exportService';
import { useToast } from './Toast';

interface InventoryProps {
  triggerAdd?: number;
  refreshKey?: number;
  onNavigateToRestock?: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ triggerAdd, refreshKey, onNavigateToRestock }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', 
    category: '', 
    type: 'goods', 
    stock: 0, 
    minStockLevel: 5,
    purchasePrice: 0, 
    salePrice: 0, 
    unit: 'pcs' 
  });
  
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const { addToast } = useToast();

  useEffect(() => {
    setProducts(db.getProducts());
  }, [showModal, refreshKey]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      openNewProductModal();
    }
  }, [triggerAdd]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openNewProductModal = () => {
    setNewProduct({ name: '', category: '', type: 'goods', stock: 0, minStockLevel: 5, purchasePrice: 0, salePrice: 0, unit: 'pcs' });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setNewProduct({ ...product });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
      addToast('Item deleted successfully', 'success');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name) {
      const productToSave: Product = {
        id: newProduct.id || Date.now().toString(),
        name: newProduct.name,
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

      if (newProduct.id) {
        db.updateProduct(productToSave);
        addToast('Product updated successfully', 'success');
      } else {
        db.addProduct(productToSave);
        addToast('New product added successfully', 'success');
      }
      setShowModal(false);
      setProducts(db.getProducts());
    } else {
        addToast('Product Name is required', 'error');
    }
  };

  const uniqueCategories = Array.from(new Set(products.map(p => p.category || 'General'))).filter(c => typeof c === 'string') as string[];
  const categoriesList = ['All Categories', ...uniqueCategories];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || (p.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(p => p.type !== 'service' && p.stock < (p.minStockLevel || 5)).length;

  const handleExportExcel = () => {
    const data = transformProductsForExport(products);
    exportToExcel(data, 'Inventory_Report');
  };

  const handlePrint = () => {
    const data = transformProductsForExport(products);
    const columns = ['Name', 'Category', 'Stock', 'Unit', 'Buy Price', 'Sell Price'];
    const rows = data.map(d => [d['Name'], d['Category'], d['Stock'], d['Unit'], formatCurrency(d['Purchase Price'] as number), formatCurrency(d['Sale Price'] as number)]);
    printData('Inventory Report', columns, rows);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-500" />
            Inventory Master
          </h1>
          <p className="text-sm text-gray-500">Manage products, services and stock thresholds</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {lowStockCount > 0 && onNavigateToRestock && (
              <button 
                onClick={onNavigateToRestock}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all animate-pulse shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">{lowStockCount} Low Items</span>
                <ChevronDown className="-rotate-90 w-3 h-3" />
              </button>
            )}
            <button onClick={handleExportExcel} className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={openNewProductModal} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-bold">
                <Plus className="w-4 h-4" /> Add Item
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
           <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                 type="text" 
                 placeholder="Search items by name or category..." 
                 className="ml-2 bg-transparent border-none outline-none text-sm w-full"
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="relative">
              <select 
                 className="appearance-none h-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                 value={selectedCategory}
                 onChange={e => setSelectedCategory(e.target.value)}
              >
                 {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                 <tr>
                    <th className="px-6 py-3">Item Details</th>
                    <th className="px-6 py-3 text-center">Stock</th>
                    <th className="px-6 py-3 text-center">Threshold</th>
                    <th className="px-6 py-3 text-right">Purchase</th>
                    <th className="px-6 py-3 text-right">Sales</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {filteredProducts.map(p => {
                    const isLow = p.type !== 'service' && p.stock < (p.minStockLevel || 5);
                    const isOut = p.type !== 'service' && p.stock <= 0;

                    return (
                        <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                           <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{p.name}</div>
                              <div className="text-[10px] text-gray-400 uppercase flex items-center gap-2">
                                 {p.category} <span className="opacity-30">|</span> {p.unit}
                                 {p.type === 'service' && <span className="bg-blue-50 text-blue-600 px-1 rounded">Service</span>}
                              </div>
                           </td>
                           <td className={`px-6 py-4 text-center font-black text-lg ${p.type === 'service' ? 'text-gray-300' : (isLow ? 'text-red-500' : 'text-emerald-600')}`}>
                              {p.type === 'service' ? '-' : p.stock}
                           </td>
                           <td className="px-6 py-4 text-center text-gray-400 font-medium">
                              {p.type === 'service' ? '-' : p.minStockLevel || 0}
                           </td>
                           <td className="px-6 py-4 text-right text-gray-600 font-mono">{formatCurrency(p.purchasePrice)}</td>
                           <td className="px-6 py-4 text-right font-bold text-gray-900 font-mono">{formatCurrency(p.salePrice)}</td>
                           <td className="px-6 py-4 text-center">
                              {p.type !== 'service' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isOut ? 'bg-red-50 text-red-600 border-red-100' : 
                                    isLow ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                    {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
                                </span>
                              )}
                           </td>
                           <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Pencil className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                    );
                 })}
                 {filteredProducts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-20 text-gray-400">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-10" />
                        No items found.
                    </td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {showModal && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                     <Package className="w-6 h-6 text-brand-500" />
                     {newProduct.id ? 'Edit Item Details' : 'Register New Item'}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
               </div>

               <form onSubmit={handleSave} className="space-y-6">
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Product/Service Name</label>
                        <input 
                            required 
                            autoFocus
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" 
                            placeholder="e.g. Wireless Gaming Mouse" 
                            value={newProduct.name}
                            onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        />
                    </div>
                    
                    <div ref={categoryWrapperRef} className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Category</label>
                        <div className="relative">
                            <input 
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none pr-8 font-medium" 
                                placeholder="Select or type..." 
                                value={newProduct.category}
                                onChange={e => {
                                    setNewProduct({...newProduct, category: e.target.value});
                                    setShowCategoryDropdown(true);
                                }}
                                onFocus={() => setShowCategoryDropdown(true)}
                            />
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {showCategoryDropdown && (
                            <div className="absolute z-20 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                {uniqueCategories.filter(c => c.toLowerCase().includes((newProduct.category || '').toLowerCase())).map(cat => (
                                    <div key={cat} className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer" onClick={() => {setNewProduct({...newProduct, category: cat}); setShowCategoryDropdown(false);}}>{cat}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Item Type</label>
                        <select 
                        className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium"
                        value={newProduct.type}
                        onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}
                        >
                        <option value="goods">Goods (Stockable)</option>
                        <option value="service">Service (No Stock)</option>
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Primary Unit</label>
                        <input className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} placeholder="pcs, kg, etc" />
                    </div>

                    {newProduct.type !== 'service' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Current Stock</label>
                                <input type="number" step="any" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Min Threshold</label>
                                <input type="number" step="any" className="w-full border border-orange-300 bg-orange-50/20 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-bold" value={newProduct.minStockLevel} onChange={e => setNewProduct({...newProduct, minStockLevel: Number(e.target.value)})} title="Warn if stock falls below this value" />
                            </div>
                        </>
                    )}
                 </div>

                 <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing & Margins</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">BUY PRICE (COST)</label>
                            <input type="number" className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-brand-600 mb-1">RETAIL SALE PRICE</label>
                            <input type="number" className="w-full border border-brand-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono font-bold" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 mb-1">WHOLESALE PRICE</label>
                            <input type="number" className="w-full border border-blue-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-mono" value={newProduct.wholesalePrice || ''} onChange={e => setNewProduct({...newProduct, wholesalePrice: Number(e.target.value)})} />
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">Cancel</button>
                    <button type="submit" className="px-10 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition-all">Save Product</button>
                 </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Inventory;
