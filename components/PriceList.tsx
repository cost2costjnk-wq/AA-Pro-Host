
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { formatCurrency } from '../services/formatService';
// Added ChevronDown to the imported components from lucide-react
import { Search, FileDown, ListFilter, TrendingUp, ChevronDown } from 'lucide-react';
import { downloadPriceListPdf } from '../services/pdfService';
import { useToast } from './Toast';

const PriceList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const { addToast } = useToast();

  useEffect(() => {
    setProducts(db.getProducts());
  }, []);

  const categories = ['All Categories', ...Array.from(new Set(products.map(p => p.category || 'General')))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || (p.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownloadPdf = () => {
      downloadPriceListPdf(filteredProducts);
      addToast('Price list PDF generated successfully', 'success');
  };

  const calculateMargin = (p: Product) => {
      if (!p.purchasePrice || p.purchasePrice === 0) return 0;
      return ((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100;
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
                Price Intelligence
            </h1>
            <p className="text-sm text-gray-500 font-medium">Analyze margins and set standard market rates</p>
        </div>
        <button
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 font-black uppercase text-[10px] tracking-widest active:scale-95"
        >
          <FileDown className="w-4 h-4" />
          Export PDF Catalog
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 bg-gray-50/50 dark:bg-gray-950/20">
          <div className="flex items-center bg-white dark:bg-gray-900 rounded-2xl px-4 py-2.5 border border-gray-200 dark:border-gray-700 flex-1 max-w-xl shadow-inner focus-within:ring-2 focus-within:ring-brand-500/50 transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter items by name or SKU..."
              className="ml-3 bg-transparent border-none outline-none text-sm w-full dark:text-white placeholder-gray-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative group min-w-[200px]">
             <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
             <select
               className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-brand-500/10 transition-all dark:text-white"
               value={selectedCategory}
               onChange={e => setSelectedCategory(e.target.value)}
             >
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-8 py-5">Item Definition</th>
                <th className="px-8 py-5 text-center">Unit</th>
                <th className="px-8 py-5 text-right">Standard Cost</th>
                <th className="px-8 py-5 text-right">Retail Rate</th>
                <th className="px-8 py-5 text-right">Wholesale Rate</th>
                <th className="px-8 py-5 text-center">Profit Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredProducts.map((product) => {
                  const margin = calculateMargin(product);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 group transition-all">
                      <td className="px-8 py-5">
                        <div className="font-black text-gray-900 dark:text-white text-base">{product.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{product.category || 'General'}</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded-lg text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800">
                            {product.unit}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-gray-400 dark:text-gray-500 font-mono text-xs">
                        {formatCurrency(product.purchasePrice)}
                      </td>
                      <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white text-base">
                        {formatCurrency(product.salePrice)}
                      </td>
                      <td className="px-8 py-5 text-right font-black text-blue-600 dark:text-blue-400">
                        {product.wholesalePrice ? formatCurrency(product.wholesalePrice) : '-'}
                      </td>
                      <td className="px-8 py-5 text-center">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[11px] ${
                              margin > 25 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              margin > 10 ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-red-50 text-red-600 border-red-100'
                          }`}>
                              {margin.toFixed(1)}%
                          </div>
                      </td>
                    </tr>
                  );
              })}
              {filteredProducts.length === 0 && (
                 <tr>
                    <td colSpan={6} className="text-center py-32">
                        <div className="flex flex-col items-center gap-3 opacity-20 grayscale">
                            <TrendingUp className="w-16 h-16" />
                            <p className="font-black uppercase text-xs tracking-widest">No matching pricing nodes</p>
                        </div>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PriceList;
