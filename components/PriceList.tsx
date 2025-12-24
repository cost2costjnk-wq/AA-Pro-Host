
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { formatCurrency } from '../services/formatService';
import { Search, FileDown, ListFilter } from 'lucide-react';
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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Price List</h1>
        <button
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md font-bold uppercase text-[10px] tracking-widest"
        >
          <FileDown className="w-4 h-4" />
          Download PDF Catalog
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items by name..."
              className="ml-2 bg-transparent border-none outline-none text-sm w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
             <select
               className="h-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none outline-none cursor-pointer text-gray-700 font-bold"
               value={selectedCategory}
               onChange={e => setSelectedCategory(e.target.value)}
             >
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-center">Unit</th>
                <th className="px-6 py-3 text-center">Stock</th>
                <th className="px-6 py-3 text-right">Retail Price</th>
                <th className="px-6 py-3 text-right">Wholesale Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 uppercase text-[10px] font-bold">
                    {product.category || 'General'}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-400 uppercase text-[10px] font-black">
                    {product.unit}
                  </td>
                  <td className={`px-6 py-4 text-center font-black ${product.type === 'service' ? 'text-gray-300' : (product.stock < 5 ? 'text-red-500' : 'text-emerald-600')}`}>
                    {product.type === 'service' ? '-' : product.stock}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-gray-900">
                    {formatCurrency(product.salePrice)}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-blue-600">
                    {product.wholesalePrice ? formatCurrency(product.wholesalePrice) : '-'}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                 <tr><td colSpan={6} className="text-center py-20 text-gray-400 font-bold uppercase text-xs tracking-widest opacity-30">No items found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PriceList;
