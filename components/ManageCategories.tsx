import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { authService } from '../services/authService';
import { Category } from '../types';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Layers, 
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useToast } from './Toast';

const ManageCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category>>({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const { addToast } = useToast();
  const canEdit = authService.can('categories', 'edit');
  const canDelete = authService.can('categories', 'delete');

  const loadCategories = () => {
    setCategories(db.getCategories());
  };

  useEffect(() => {
    loadCategories();
    window.addEventListener('db-updated', loadCategories);
    return () => window.removeEventListener('db-updated', loadCategories);
  }, []);

  // Escape key handler for local modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (editingCategory.name) {
      const categoryToSave: Category = {
          id: editingCategory.id || Date.now().toString(),
          name: editingCategory.name,
          description: editingCategory.description || ''
      };

      if (editingCategory.id) {
          await db.updateCategory(categoryToSave);
      } else {
          await db.addCategory(categoryToSave);
      }
      
      setShowModal(false);
      resetForm();
      addToast(`Category "${categoryToSave.name}" saved successfully`, 'success');
    }
  };

  const handleEdit = (cat: Category) => {
    if (!canEdit) return;
    setEditingCategory({ ...cat });
    setShowModal(true);
  };

  const handleDelete = async (cat: Category) => {
    if (!canDelete) return;
    
    // Check if any products are using this category
    const products = db.getProducts();
    const isUsed = products.some(p => p.category === cat.name);
    
    if (isUsed) {
        addToast(`Cannot delete "${cat.name}" because it is currently assigned to products.`, 'error');
        return;
    }

    if (window.confirm(`Are you sure you want to delete the category "${cat.name}"?`)) {
      await db.deleteCategory(cat.id);
      addToast('Category removed successfully', 'success');
    }
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCategory({ name: '', description: '' });
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <Layers className="w-8 h-8 text-brand-500" />
                Product Categories
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Classify your items for better reporting and filters</p>
        </div>
        {canEdit && (
            <button onClick={openNewModal} className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-brand-500/20 active:scale-95">
                <Plus className="w-4 h-4" /> Add Category
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center bg-gray-50/50 dark:bg-gray-900/50 px-6">
             <Search className="w-4 h-4 text-gray-400" />
             <input 
                type="text" 
                placeholder="Search categories..." 
                className="ml-3 bg-transparent border-none outline-none text-sm w-full dark:text-white placeholder-gray-400" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
             />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="px-8 py-4">Category Name</th>
                    <th className="px-8 py-4">Description</th>
                    <th className="px-8 py-4 text-center">Items Count</th>
                    <th className="px-8 py-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCategories.map(cat => {
                const count = db.getProducts().filter(p => p.category === cat.name).length;
                return (
                  <tr key={cat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 group transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 flex items-center justify-center font-black text-xs">
                              {cat.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white text-base">{cat.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                        <p className="text-gray-500 dark:text-gray-400 text-xs italic">{cat.description || 'No description provided.'}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-bold">
                            {count} Items
                        </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {canEdit && <button onClick={() => handleEdit(cat)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><Pencil className="w-4.5 h-4.5" /></button>}
                        {canDelete && <button onClick={() => handleDelete(cat)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredCategories.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center gap-3 bg-gray-50/50 dark:bg-gray-900/10">
                <Layers className="w-12 h-12 text-gray-200 dark:text-gray-700 opacity-30" />
                <p className="font-black uppercase tracking-[0.2em] text-xs text-gray-400">No categories found</p>
            </div>
        )}
      </div>

      {showModal && canEdit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col">
            <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {editingCategory.id ? 'Modify Category' : 'Create Category'}
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Classification Hierarchy</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Category Name</label>
                    <input 
                        required 
                        autoFocus
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" 
                        value={editingCategory.name} 
                        onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} 
                        placeholder="e.g. Electronics, Grocery, Services..."
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Description (Optional)</label>
                    <textarea 
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all resize-none h-32" 
                        value={editingCategory.description} 
                        onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} 
                        placeholder="Brief summary of this category..."
                    />
                </div>

                <div className="pt-6 flex justify-end gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Discard</button>
                    <button type="submit" className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-brand-500/40 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Save Category
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCategories;