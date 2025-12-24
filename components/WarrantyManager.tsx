
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { WarrantyCase, Product, Party, WarrantyItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { RotateCcw, Plus, Search, Pencil, Trash2, CheckCircle, Clock, X, ChevronDown, User, Package, AlertCircle, Calendar, Truck, FileDown } from 'lucide-react';
import { useToast } from './Toast';
import NepaliDatePicker from './NepaliDatePicker';
import { downloadWarrantyPdf } from '../services/pdfService';

const WarrantyManager: React.FC = () => {
    const [cases, setCases] = useState<WarrantyCase[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCase, setEditingCase] = useState<WarrantyCase | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const { addToast } = useToast();

    useEffect(() => {
        setCases(db.getWarrantyCases());
    }, []);

    const handleDelete = (id: string) => {
        if (window.confirm('Delete this warranty case?')) {
            db.deleteWarrantyCase(id);
            setCases(db.getWarrantyCases());
            addToast('Warranty case removed', 'success');
        }
    };

    const handleDownloadPdf = (wCase: WarrantyCase) => {
        downloadWarrantyPdf(wCase);
        addToast('Warranty ticket generated', 'success');
    };

    const handleSave = () => {
        setCases(db.getWarrantyCases());
        setShowModal(false);
        setEditingCase(null);
    };

    const filteredCases = cases.filter(c => 
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Warranty Manager</h1>
                    <p className="text-sm text-gray-500">Track customer returns and vendor claims</p>
                </div>
                <button 
                    onClick={() => { setEditingCase(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Warranty Case
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex-1 max-w-md">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search by ticket or customer..." 
                            className="ml-2 bg-transparent border-none outline-none text-sm w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Case ID / Date</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Items</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCases.map(wc => (
                                <tr key={wc.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 font-bold text-gray-900">#{wc.ticketNumber}</td>
                                    <td className="px-6 py-4">{wc.customerName}</td>
                                    <td className="px-6 py-4 text-gray-500">{wc.items.length} items</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                            wc.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600' :
                                            wc.status === 'SENT' ? 'bg-blue-50 text-blue-600' :
                                            'bg-orange-50 text-orange-600'
                                        }`}>
                                            {wc.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDownloadPdf(wc)} className="p-1.5 text-gray-400 hover:text-emerald-600" title="Download Claim PDF">
                                                <FileDown className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { setEditingCase(wc); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(wc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && <WarrantyFormModal initialData={editingCase} onClose={() => setShowModal(false)} onSave={handleSave} />}
        </div>
    );
};

const WarrantyFormModal: React.FC<{ initialData: WarrantyCase | null, onClose: () => void, onSave: () => void }> = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<WarrantyCase>>(initialData || {
        dateReceived: new Date().toISOString(),
        status: 'RECEIVED',
        items: [],
        customerName: ''
    });

    const [customerSearch, setCustomerSearch] = useState(initialData?.customerName || '');
    const [showCustomerDrop, setShowCustomerDrop] = useState(false);
    const [highlightedCust, setHighlightedCust] = useState(0);

    const [vendorSearch, setVendorSearch] = useState(initialData?.vendorName || '');
    const [showVendorDrop, setShowVendorDrop] = useState(false);
    const [highlightedVendor, setHighlightedVendor] = useState(0);

    const [showItemDrop, setShowItemDrop] = useState(false);
    const [focusedRowIdx, setFocusedRowIdx] = useState(-1);
    const [highlightedItem, setHighlightedItem] = useState(0);
    const itemDropRef = useRef<HTMLDivElement>(null);

    const { addToast } = useToast();
    const parties = useMemo(() => db.getParties(), []);
    const products = useMemo(() => db.getProducts(), []);

    const filteredCustomers = useMemo(() => parties.filter(p => p.type === 'customer' && p.name.toLowerCase().includes(customerSearch.toLowerCase())), [parties, customerSearch]);
    const filteredVendors = useMemo(() => parties.filter(p => p.type === 'supplier' && p.name.toLowerCase().includes(vendorSearch.toLowerCase())), [parties, vendorSearch]);
    const filteredProducts = useMemo(() => products.filter(p => p.type !== 'service'), [products]);

    const selectProduct = (idx: number, p: Product) => {
        const newItems = [...(formData.items || [])];
        newItems[idx] = { ...newItems[idx], productId: p.id, productName: p.name };
        setFormData({ ...formData, items: newItems });
        setShowItemDrop(false);
    };

    const handleFinalSave = () => {
        if (!formData.customerName || !formData.items?.length) {
            addToast('Customer and at least one item are required', 'error');
            return;
        }

        const wc: WarrantyCase = {
            id: initialData?.id || Date.now().toString(),
            ticketNumber: initialData?.ticketNumber || 'WR-' + Math.floor(1000 + Math.random() * 9000).toString(),
            customerId: formData.customerId!,
            customerName: formData.customerName!,
            items: formData.items as WarrantyItem[],
            dateReceived: formData.dateReceived!,
            status: formData.status as any,
            vendorId: formData.vendorId,
            vendorName: formData.vendorName,
            notes: formData.notes
        };

        if (initialData) db.updateWarrantyCase(wc);
        else db.addWarrantyCase(wc);

        onSave();
        addToast('Warranty case saved', 'success');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Warranty Case Entry</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }} />
                            {showCustomerDrop && customerSearch && (
                                <div className="absolute z-30 top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-auto">
                                    {filteredCustomers.map((p, i) => (
                                        <div key={p.id} data-index={i} className={`p-3.5 border-b last:border-0 cursor-pointer text-sm font-bold ${highlightedCust === i ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-50'}`} onClick={() => { setFormData({...formData, customerId: p.id, customerName: p.name}); setCustomerSearch(p.name); setShowCustomerDrop(false); }}>{p.name}</div>
                                    ))}
                                    {filteredCustomers.length === 0 && <div className="p-4 text-xs text-gray-400 italic">No matching partner found.</div>}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vendor (Optional)</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={vendorSearch} onChange={e => { setVendorSearch(e.target.value); setShowVendorDrop(true); }} />
                            {showVendorDrop && vendorSearch && (
                                <div className="absolute z-30 top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-auto">
                                    {filteredVendors.map((p, i) => (
                                        <div key={p.id} data-index={i} className={`p-3.5 border-b last:border-0 cursor-pointer text-sm font-bold ${highlightedVendor === i ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-50'}`} onClick={() => { setFormData({...formData, vendorId: p.id, vendorName: p.name}); setVendorSearch(p.name); setShowVendorDrop(false); }}>{p.name}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Case Items</label>
                        {(formData.items || []).map((item, idx) => (
                            <div key={idx} className="relative grid grid-cols-3 gap-2 border p-2 rounded-lg">
                                <div className="relative">
                                    <input 
                                        placeholder="Product Name" 
                                        className="w-full border p-1 text-xs" 
                                        value={item.productName} 
                                        onChange={e => {
                                            const newItems = [...(formData.items || [])];
                                            newItems[idx] = { ...newItems[idx], productName: e.target.value };
                                            setFormData({ ...formData, items: newItems });
                                            setFocusedRowIdx(idx);
                                            setShowItemDrop(true);
                                        }} 
                                    />
                                    {showItemDrop && focusedRowIdx === idx && (
                                        <div ref={itemDropRef} className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-[60] max-h-48 overflow-auto">
                                            {filteredProducts.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase())).map((p, i) => (
                                                <div key={p.id} data-index={i} className={`p-2.5 border-b last:border-0 cursor-pointer flex justify-between items-center ${highlightedItem === i ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-50'}`} onClick={() => selectProduct(idx, p)}>
                                                    <span className="font-bold">{p.name}</span>
                                                    <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">STOCK: {p.stock}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input placeholder="Serial #" className="w-full border p-1 text-xs" value={item.serialNumber} onChange={e => { const newItems = [...(formData.items || [])]; newItems[idx].serialNumber = e.target.value; setFormData({...formData, items: newItems}); }} />
                                <input placeholder="Problem" className="w-full border p-1 text-xs" value={item.problemDescription} onChange={e => { const newItems = [...(formData.items || [])]; newItems[idx].problemDescription = e.target.value; setFormData({...formData, items: newItems}); }} />
                            </div>
                        ))}
                        <button onClick={() => setFormData({...formData, items: [...(formData.items || []), { id: Date.now().toString(), productId: '', productName: '', serialNumber: '', problemDescription: '' }]})} className="text-xs text-brand-600 font-bold">+ Add Item</button>
                    </div>
                </div>
                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600">Cancel</button>
                    <button onClick={handleFinalSave} className="px-6 py-2 bg-brand-500 text-white rounded-lg font-bold">Save Warranty Case</button>
                </div>
            </div>
        </div>
    );
};

export default WarrantyManager;
