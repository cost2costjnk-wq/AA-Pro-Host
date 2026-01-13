import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { WarrantyCase, Product, Party, WarrantyItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { 
  RotateCcw, Plus, Search, Pencil, Trash2, CheckCircle, 
  Clock, X, User, Package, Calendar, Truck, FileDown, 
  Inbox, CheckCircle2, Building2, History, FileSpreadsheet, Printer
} from 'lucide-react';
import { useToast } from './Toast';
import NepaliDatePicker from './NepaliDatePicker';
import { downloadWarrantyPdf } from '../services/pdfService';
import { exportToExcel } from '../services/exportService';

const WarrantyManager: React.FC = () => {
    const [cases, setCases] = useState<WarrantyCase[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCase, setEditingCase] = useState<WarrantyCase | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'RECEIVED' | 'PENDING_VENDOR' | 'READY_CUSTOMER' | 'CLOSED'>('ALL');
    const { addToast } = useToast();

    const loadCases = () => setCases(db.getWarrantyCases());
    useEffect(() => {
        loadCases();
        window.addEventListener('db-updated', loadCases);
        return () => window.removeEventListener('db-updated', loadCases);
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

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this warranty record?')) {
            await db.deleteWarrantyCase(id);
            addToast('Warranty case removed', 'success');
        }
    };

    const handleDownloadPdf = (wCase: WarrantyCase) => {
        downloadWarrantyPdf(wCase);
        addToast('Warranty ticket generated', 'success');
    };

    const handleExportExcel = () => {
        const data = filteredCases.map(c => ({
            'Ticket #': c.ticketNumber, 'Date Received': formatNepaliDate(c.dateReceived), 'Customer': c.customerName, 'Vendor': c.vendorName || '-', 'Status': c.status, 'Items': c.items.map(i => `${i.productName} (${i.serialNumber})`).join(', ')
        }));
        exportToExcel(data, 'Warranty_Registry');
    };

    const stats = useMemo(() => ({
        total: cases.length, inShop: cases.filter(c => c.status === 'RECEIVED').length, atVendor: cases.filter(c => c.status === 'SENT').length, readyForCustomer: cases.filter(c => c.status === 'VENDOR_RETURNED').length, settled: cases.filter(c => c.status === 'CLOSED').length
    }), [cases]);

    const filteredCases = useMemo(() => {
        let result = cases;
        if (activeFilter === 'RECEIVED') result = result.filter(c => c.status === 'RECEIVED');
        else if (activeFilter === 'PENDING_VENDOR') result = result.filter(c => c.status === 'SENT');
        else if (activeFilter === 'READY_CUSTOMER') result = result.filter(c => c.status === 'VENDOR_RETURNED');
        else if (activeFilter === 'CLOSED') result = result.filter(c => c.status === 'CLOSED');
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(c => c.customerName.toLowerCase().includes(term) || c.ticketNumber.toLowerCase().includes(term) || (c.vendorName && c.vendorName.toLowerCase().includes(term)));
        }
        return result.sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime());
    }, [cases, searchTerm, activeFilter]);

    const getStatusUI = (status: string) => {
        switch (status) {
            case 'SENT': return { label: 'At Vendor', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Truck className="w-3 h-3" /> };
            case 'VENDOR_RETURNED': return { label: 'Ready', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <CheckCircle2 className="w-3 h-3" /> };
            case 'CLOSED': return { label: 'Settled', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: <History className="w-3 h-3" /> };
            default: return { label: 'In Shop', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: <Inbox className="w-3 h-3" /> };
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div><h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight"><RotateCcw className="w-10 h-10 text-brand-500" /> Warranty Tracking</h1><p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Manage returns and vendor claims</p></div>
                <div className="flex gap-3"><button onClick={handleExportExcel} className="p-3 bg-white border border-gray-200 text-emerald-600 rounded-2xl hover:bg-emerald-50"><FileSpreadsheet className="w-5 h-5" /></button><button onClick={() => { setEditingCase(null); setShowModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-xl shadow-brand-500/20 active:scale-95"><Plus className="w-4 h-4" /> New Intake</button></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[ { id: 'ALL', label: 'Total', val: stats.total, color: 'brand', icon: RotateCcw }, { id: 'RECEIVED', label: 'In Shop', val: stats.inShop, color: 'orange', icon: Inbox }, { id: 'PENDING_VENDOR', label: 'At Vendor', val: stats.atVendor, color: 'blue', icon: Truck }, { id: 'READY_CUSTOMER', label: 'Ready', val: stats.readyForCustomer, color: 'emerald', icon: CheckCircle2 }, { id: 'CLOSED', label: 'Settled', val: stats.settled, color: 'slate', icon: History } ].map(s => <div key={s.id} onClick={() => setActiveFilter(s.id as any)} className={`p-5 rounded-[2rem] border cursor-pointer transition-all ${activeFilter === s.id ? `bg-white border-${s.color}-500 shadow-lg ring-4 ring-${s.color}-500/5` : 'bg-gray-50 dark:bg-gray-900 border-transparent'}`}><div className="flex items-center gap-3 mb-2"><div className={`p-2 bg-${s.color}-50 text-${s.color}-600 rounded-xl`}><s.icon className="w-4 h-4" /></div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span></div><p className="text-xl font-black text-gray-900 dark:text-white">{s.val}</p></div>)}
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] p-5 shadow-sm flex flex-col lg:flex-row items-center gap-4"><div className="flex-1 relative w-full group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" /><input type="text" placeholder="Search ticket #, customer, vendor, or product..." className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand-500/10 outline-none transition-all dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-50/80 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-gray-100"><tr className=""><th className="px-8 py-5">Ticket</th><th className="px-8 py-5">Partners</th><th className="px-8 py-5">Product Matrix</th><th className="px-8 py-5 text-center">Tracking</th><th className="px-8 py-5 text-center">Actions</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredCases.map(wc => {
                                const statusUI = getStatusUI(wc.status);
                                return (<tr key={wc.id} className="hover:bg-gray-50/50 transition-all"><td className="px-8 py-5"><div className="font-black text-gray-900 dark:text-white">#{wc.ticketNumber}</div><div className="text-[10px] font-bold text-gray-400 uppercase">{formatNepaliDate(wc.dateReceived)}</div></td><td className="px-8 py-5"><div className="font-bold text-gray-800 dark:text-gray-200">{wc.customerName}</div>{wc.vendorName && <div className="text-[11px] text-blue-500 font-medium">@ {wc.vendorName}</div>}</td><td className="px-8 py-5"><div className="space-y-1">{wc.items.map((i, idx) => <div key={idx} className="text-[11px] font-medium text-gray-600">{i.productName} <span className="text-[9px] text-gray-400">(SN: {i.serialNumber})</span></div>)}</div></td><td className="px-8 py-5 text-center"><div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border shadow-sm ${statusUI.color}`}>{statusUI.icon} {statusUI.label}</div></td><td className="px-8 py-5 text-center"><div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => handleDownloadPdf(wc)} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Printer className="w-4.5 h-4.5" /></button><button onClick={() => { setEditingCase(wc); setShowModal(true); }} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil className="w-4.5 h-4.5" /></button><button onClick={() => handleDelete(wc.id)} className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button></div></td></tr>);
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {showModal && <WarrantyFormModal initialData={editingCase} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadCases(); }} />}
        </div>
    );
};

const WarrantyFormModal: React.FC<{ initialData: WarrantyCase | null, onClose: () => void, onSave: () => void }> = ({ initialData, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<Partial<WarrantyCase>>(initialData || { dateReceived: new Date().toISOString(), status: 'RECEIVED', items: [{ id: '1', productId: '', productName: '', serialNumber: '', problemDescription: '' }], customerName: '', notes: '' });
    
    const handleFinalSave = async () => {
        if (!formData.customerName) { addToast('Customer required', 'error'); return; }
        const wc: WarrantyCase = { id: initialData?.id || Date.now().toString(), ticketNumber: initialData?.ticketNumber || 'WC-' + Math.floor(1000 + Math.random() * 9000), customerId: formData.customerId || 'WALK-IN', customerName: formData.customerName!, items: formData.items as WarrantyItem[], dateReceived: formData.dateReceived!, status: formData.status as any, vendorId: formData.vendorId, vendorName: formData.vendorName, notes: formData.notes };
        if (initialData) await db.updateWarrantyCase(wc);
        else await db.addWarrantyCase(wc);
        onSave();
        addToast('Warranty updated', 'success');
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="px-10 py-8 border-b flex justify-between items-center bg-gray-50/50"><h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Warranty Protocol</h2><button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button></div>
                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-6">
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Customer Identity</label><input className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="Search customer..." /></div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Intake Date</label><NepaliDatePicker value={formData.dateReceived!} onChange={d => setFormData({...formData, dateReceived: d})} /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-brand-600 uppercase mb-4 tracking-widest">Case Lifecycle State</label><select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black uppercase outline-none appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="RECEIVED">NEW INTAKE (IN SHOP)</option><option value="SENT">SENT TO VENDOR (PENDING FROM VENDOR)</option><option value="VENDOR_RETURNED">BACK FROM VENDOR (READY FOR CUSTOMER)</option><option value="CLOSED">SETTLED (RETURNED TO CUSTOMER)</option></select></div>
                    <div className="space-y-4"><label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest">Defective Hardware Mapping</label>{formData.items?.map((item, idx) => <div key={idx} className="p-6 bg-gray-50 rounded-3xl grid grid-cols-2 gap-6 border border-gray-100"><input className="p-3 border border-gray-200 rounded-xl text-xs font-bold" value={item.productName} onChange={e => { const n = [...formData.items!]; n[idx].productName = e.target.value; setFormData({...formData, items: n}); }} placeholder="Product Title" /><input className="p-3 border border-gray-200 rounded-xl text-xs font-mono font-bold" value={item.serialNumber} onChange={e => { const n = [...formData.items!]; n[idx].serialNumber = e.target.value; setFormData({...formData, items: n}); }} placeholder="Serial Number" /></div>)}</div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Linked Vendor (Supplier)</label><input className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-bold outline-none" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} placeholder="Which vendor handles this claim?" /></div>
                </div>
                <div className="px-10 py-8 border-t flex justify-end gap-4 bg-gray-50/50"><button onClick={onClose} className="px-8 py-3 text-gray-500 font-black uppercase text-xs">Discard</button><button onClick={handleFinalSave} className="px-12 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-brand-500/40 hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Save Record</button></div>
            </div>
        </div>
    );
};

export default WarrantyManager;