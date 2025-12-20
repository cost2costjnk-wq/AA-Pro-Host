
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { CashDrawer, CashNoteCount, Denomination } from '../types';
import { formatCurrency } from '../services/formatService';
import { Banknote, Save, History, RefreshCcw, Info } from 'lucide-react';
import { useToast } from './Toast';

const DENOMINATIONS: Denomination[] = [1000, 500, 100, 50, 20, 10, 5, 2, 1];

const CashDrawerManager: React.FC = () => {
    const [drawer, setDrawer] = useState<CashDrawer | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setDrawer(db.getCashDrawer());
    }, []);

    const handleCountChange = (denom: Denomination, count: number) => {
        if (!drawer) return;
        const newNotes = drawer.notes.map(n => 
            n.denomination === denom ? { ...n, count: Math.max(0, count) } : n
        );
        setDrawer({ ...drawer, notes: newNotes });
    };

    const handleSave = () => {
        if (!drawer) return;
        db.updateCashDrawer({ ...drawer, lastUpdated: new Date().toISOString() });
        setIsEditing(false);
        addToast('Cash drawer reconciled successfully', 'success');
    };

    if (!drawer) return null;

    const totalValue = drawer.notes.reduce((sum, n) => sum + (n.denomination * n.count), 0);

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-brand-500" />
                        Cash Drawer
                    </h1>
                    <p className="text-sm text-gray-500">Manage physical note counts and reconciliation</p>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button 
                                onClick={() => { setDrawer(db.getCashDrawer()); setIsEditing(false); }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-medium"
                            >
                                <Save className="w-4 h-4" />
                                Save Reconciliation
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm font-medium"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reconcile Drawer
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Drawer Summary */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Total Physical Cash</p>
                        <p className="text-3xl font-black text-brand-600">{formatCurrency(totalValue)}</p>
                        <p className="text-[10px] text-gray-400 mt-4 uppercase">Last Updated: {new Date(drawer.lastUpdated).toLocaleString()}</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3">
                        <Info className="w-5 h-5 shrink-0 text-blue-600" />
                        <p>This count represents physical cash inside the register. It should match your "Cash In Hand" account balance.</p>
                    </div>
                </div>

                {/* Note Breakdown */}
                <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-bold text-gray-700 text-sm uppercase">Physical Denominations</span>
                        <span className="text-xs text-gray-500">{drawer.notes.filter(n => n.count > 0).length} note types present</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {drawer.notes.map(note => (
                            <div key={note.denomination} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${note.count > 0 ? 'bg-brand-50/30 border-brand-100' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-8 rounded flex items-center justify-center font-bold text-sm shadow-sm ${
                                        note.denomination >= 500 ? 'bg-red-100 text-red-700 border border-red-200' :
                                        note.denomination >= 50 ? 'bg-green-100 text-green-700 border border-green-200' :
                                        'bg-blue-100 text-blue-700 border border-blue-200'
                                    }`}>
                                        {note.denomination}
                                    </div>
                                    <span className="text-gray-400 font-medium text-sm">X</span>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    {isEditing ? (
                                        <input 
                                            type="number"
                                            min="0"
                                            className="w-20 p-2 border border-gray-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={note.count}
                                            onChange={(e) => handleCountChange(note.denomination, parseInt(e.target.value) || 0)}
                                        />
                                    ) : (
                                        <span className="text-xl font-black text-gray-800">{note.count}</span>
                                    )}
                                    <div className="w-24 text-right">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</p>
                                        <p className="text-sm font-bold text-gray-700">{formatCurrency(note.denomination * note.count)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashDrawerManager;
