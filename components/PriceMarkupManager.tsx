
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Product, Category } from '../types';
import { formatCurrency } from '../services/formatService';
import { Zap, ChevronDown, CheckCircle2, AlertTriangle, ArrowRight, Save, Info, RefreshCcw } from 'lucide-react';
import { useToast } from './Toast';

const PriceMarkupManager: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [retailMarkup, setRetailMarkup] = useState<number>(20);
    const [wholesaleMarkup, setWholesaleMarkup] = useState<number>(10);
    const [isApplying, setIsApplying] = useState(false);
    
    const { addToast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setProducts(db.getProducts());
        setCategories(db.getCategories());
    };

    const targetProducts = useMemo(() => {
        if (selectedCategory === 'All Categories') return products;
        return products.filter(p => (p.category || 'General') === selectedCategory);
    }, [products, selectedCategory]);

    const handleApply = async () => {
        if (targetProducts.length === 0) {
            addToast('No items found in selected category', 'error');
            return;
        }

        if (!window.confirm(`Update prices for ${targetProducts.length} items using ${retailMarkup}% retail and ${wholesaleMarkup}% wholesale markup? This cannot be undone.`)) {
            return;
        }

        setIsApplying(true);
        try {
            for (const p of targetProducts) {
                const cost = p.purchasePrice || 0;
                if (cost > 0) {
                    const newSale = cost * (1 + (retailMarkup / 100));
                    const newWholesale = cost * (1 + (wholesaleMarkup / 100));
                    
                    await db.updateProduct({
                        ...p,
                        salePrice: Math.round(newSale),
                        wholesalePrice: Math.round(newWholesale)
                    });
                }
            }
            addToast(`Successfully updated ${targetProducts.length} items.`, 'success');
            loadData();
        } catch (e) {
            addToast('Internal engine error during bulk update', 'error');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                        <Zap className="w-10 h-10 text-brand-500 fill-brand-500" /> 
                        Pricing Engine
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Bulk Price Generator & Margin Automator</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 shadow-sm space-y-8">
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Target Category Scope</label>
                            <div className="relative group">
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none group-focus-within:text-brand-500 transition-colors" />
                                <select 
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-brand-500/10 transition-all appearance-none dark:text-white"
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                >
                                    <option value="All Categories">PROCESS ENTIRE INVENTORY</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">Retail Markup (%)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        className="w-full p-5 bg-brand-50/30 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800 rounded-3xl text-3xl font-black text-brand-700 dark:text-brand-400 outline-none text-center"
                                        value={retailMarkup}
                                        onChange={e => setRetailMarkup(Number(e.target.value))}
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-brand-200 text-2xl">%</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Wholesale Markup (%)</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        className="w-full p-5 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl text-3xl font-black text-blue-700 dark:text-blue-400 outline-none text-center"
                                        value={wholesaleMarkup}
                                        onChange={e => setWholesaleMarkup(Number(e.target.value))}
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-blue-200 text-2xl">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleApply}
                                disabled={isApplying || targetProducts.length === 0}
                                className="w-full py-5 bg-brand-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-brand-500/40 hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                            >
                                {isApplying ? (
                                    <RefreshCcw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                Execute Mass Price Update
                            </button>
                        </div>
                    </div>

                    <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800 flex gap-4">
                        <Info className="w-6 h-6 text-blue-600 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">Calculation Logic</p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                                Prices are calculated as <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">Purchase Price + (Markup %)</code>. Items with 0 purchase price will be ignored. Results are rounded to the nearest integer.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Scope & Impact Summary */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 shadow-sm h-full">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-brand-500" />
                            Update Snapshot
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-center py-4 border-b dark:border-gray-700">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Scope</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedCategory}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b dark:border-gray-700">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impact Count</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{targetProducts.length} Items</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b dark:border-gray-700">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retail Spread</span>
                                <span className="text-sm font-bold text-emerald-600">+{retailMarkup}% on Cost</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b dark:border-gray-700">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Wholesale Spread</span>
                                <span className="text-sm font-bold text-blue-600">+{wholesaleMarkup}% on Cost</span>
                            </div>
                        </div>

                        {targetProducts.length > 0 && (
                            <div className="mt-8 space-y-4">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Preview (Top 3)</p>
                                {targetProducts.slice(0, 3).map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <p className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate mb-2">{p.name}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase">Cost: {formatCurrency(p.purchasePrice)}</div>
                                            <ArrowRight className="w-3 h-3 text-gray-300" />
                                            <div className="text-[10px] text-brand-600 font-black">NEW RETAIL: {formatCurrency(p.purchasePrice * (1 + (retailMarkup / 100)))}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {targetProducts.length === 0 && (
                            <div className="h-48 flex flex-col items-center justify-center text-center opacity-20">
                                <AlertTriangle className="w-12 h-12 mb-2" />
                                <p className="font-black uppercase text-[10px] tracking-widest">Selection Empty</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceMarkupManager;
