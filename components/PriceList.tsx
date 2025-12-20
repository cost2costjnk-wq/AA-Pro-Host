
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product } from '../types';
import { formatCurrency } from '../services/formatService';
import { Search, Printer, ListFilter } from 'lucide-react';

const PriceList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    setProducts(db.getProducts());
  }, []);

  const categories = ['All Categories', ...Array.from(new Set(products.map(p => p.category || 'General')))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || (p.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Price List</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
        >
          <Printer className="w-4 h-4" />
          Print List
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none">
        {/* Filters - Hidden on Print */}
        <div className="p-4 border-b border-gray-100 flex gap-4 print:hidden">
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
               className="h-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none outline-none cursor-pointer text-gray-700"
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
            <thead className="bg-gray-50 text-gray-600 font-medium print:bg-gray-100 print:text-black">
              <tr>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-center">Unit</th>
                <th className="px-6 py-3 text-center">Stock</th>
                <th className="px-6 py-3 text-right">Sales Price</th>
                <th className="px-6 py-3 text-right">Wholesale Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product, idx) => (
                <tr key={product.id} className="hover:bg-gray-50 group print:border-b print:border-gray-200">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {product.category || 'General'}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-500 uppercase text-xs">
                    {product.unit}
                  </td>
                  <td className={`px-6 py-4 text-center font-medium ${product.type === 'service' ? 'text-gray-400' : (product.stock < 5 ? 'text-red-500' : 'text-gray-700')}`}>
                    {product.type === 'service' ? 'N/A' : product.stock}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">
                    {formatCurrency(product.salePrice)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-blue-600">
                    {product.wholesalePrice ? formatCurrency(product.wholesalePrice) : '-'}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                 <tr><td colSpan={6} className="text-center py-8 text-gray-400">No items found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PriceList;
