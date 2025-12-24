
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Product } from '../types';
import { formatCurrency } from '../services/formatService';
import { 
  Plus, Search, Pencil, Trash2, FileSpreadsheet, Package, ChevronDown, X, AlertTriangle, Printer, FileDown
} from 'lucide-react';
import { exportToExcel, transformProductsForExport } from '../services/exportService';
import { generatePdf } from '../services/pdfService';
import { useToast } from './Toast';

interface InventoryProps {
  triggerAdd?: number;
  refreshKey?: number;
  onNavigateToRestock?: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ triggerAdd, refreshKey, onNavigateToRestock }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', category: '', type: 'goods', stock: 0, minStockLevel: 5, purchasePrice: 0, salePrice: 0, wholesalePrice: 0, unit: 'pcs' });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const { addToast } = useToast();

  const canEdit = authService.can('inventory', 'edit');
  const canDelete = authService.can('inventory', 'delete');

  useEffect(() => {
    setProducts(db.getProducts());
  }, [showModal, refreshKey]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && canEdit) {
      openNewProductModal();
    }
  }, [triggerAdd]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) setShowCategoryDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openNewProductModal = () => {
    setNewProduct({ name: '', category: '', type: 'goods', stock: 0, minStockLevel: 5, purchasePrice: 0, salePrice: 0, wholesalePrice: 0, unit: 'pcs' });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    if (!canEdit) return;
    setNewProduct({ ...product });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!canDelete) return;
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
      if (newProduct.id) db.updateProduct(productToSave);
      else db.addProduct(productToSave);
      setShowModal(false);
      setProducts(db.getProducts());
      addToast('Product saved successfully', 'success');
    }
  };

  const handlePdfDownload = () => {
      const columns = ['Item Name', 'Category', 'Stock', 'Unit', 'Retail Price', 'Wholesale Price'];
      const rows = filteredProducts.map(p => [
          p.name,
          p.category || 'General',
          p.type === 'service' ? '-' : p.stock,
          p.unit,
          formatCurrency(p.salePrice),
          formatCurrency(p.wholesalePrice || 0)
      ]);
      generatePdf('Current Inventory Stock List', columns, rows, 'Inventory_Report');
      addToast('PDF download started', 'success');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || (p.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package className="w-6 h-6 text-brand-500" /> Inventory Master</h1>
          <p className="text-sm text-gray-500">Manage products, services and stock thresholds</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button onClick={openNewProductModal} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-bold">
                  <Plus className="w-4 h-4" /> Add Item
              </button>
            )}
            <button onClick={handlePdfDownload} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-blue-50 shadow-sm" title="Download PDF">
                <FileDown className="w-4 h-4" /> 
                <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => exportToExcel(transformProductsForExport(products), 'Inventory_Report')} className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm">
                <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
           <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search items..." className="ml-2 bg-transparent border-none outline-none text-sm w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3">Item Details</th>
                  <th className="px-6 py-3 text-center">Stock</th>
                  <th className="px-6 py-3 text-right">Purchase</th>
                  <th className="px-6 py-3 text-right">Retail</th>
                  <th className="px-6 py-3 text-right">Wholesale</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                 {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                       <td className="px-6 py-4"><div className="font-bold text-gray-900">{p.name}</div><div className="text-[10px] text-gray-400 uppercase">{p.category}</div></td>
                       <td className={`px-6 py-4 text-center font-black text-lg ${p.stock < (p.minStockLevel || 5) ? 'text-red-500' : 'text-emerald-600'}`}>{p.type === 'service' ? '-' : p.stock}</td>
                       <td className="px-6 py-4 text-right text-gray-600 font-mono">{formatCurrency(p.purchasePrice)}</td>
                       <td className="px-6 py-4 text-right font-bold text-gray-900 font-mono">{formatCurrency(p.salePrice)}</td>
                       <td className="px-6 py-4 text-right font-bold text-blue-600 font-mono">{formatCurrency(p.wholesalePrice || 0)}</td>
                       <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {canEdit && <button onClick={() => handleEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>}
                             {canDelete && <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {showModal && canEdit && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Package className="w-6 h-6 text-brand-500" /> {newProduct.id ? 'Edit Item' : 'New Item'}</h2><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"><X className="w-6 h-6" /></button></div>
               <form onSubmit={handleSave} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Product Name</label><input required autoFocus className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                    <div ref={categoryWrapperRef} className="relative"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Category</label><input className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Type</label><select className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-medium" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}><option value="goods">Goods</option><option value="service">Service</option></select></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Unit</label><input className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} /></div>
                    {newProduct.type !== 'service' && <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Stock</label><input type="number" step="any" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-bold" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} /></div>}
                    {newProduct.type !== 'service' && <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Min Stock Level</label><input type="number" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" value={newProduct.minStockLevel} onChange={e => setNewProduct({...newProduct, minStockLevel: Number(e.target.value)})} /></div>}
                 </div>
                 <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">Purchase Price</label><input type="number" step="any" className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none font-mono" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} /></div>
                    <div><label className="block text-[10px] font-bold text-brand-600 mb-1 uppercase tracking-wider">Retail Price</label><input type="number" step="any" className="w-full border border-brand-200 rounded-xl p-2.5 text-sm outline-none font-mono font-bold" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})} /></div>
                    <div><label className="block text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wider">Wholesale Price</label><input type="number" step="any" className="w-full border border-blue-200 rounded-xl p-2.5 text-sm outline-none font-mono font-bold" value={newProduct.wholesalePrice} onChange={e => setNewProduct({...newProduct, wholesalePrice: Number(e.target.value)})} /></div>
                 </div>
                 <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-600 font-medium">Cancel</button><button type="submit" className="px-10 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg">Save Item</button></div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Inventory;
