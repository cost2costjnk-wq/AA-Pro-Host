import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../services/db';
import { ServiceJob, Product, Party, TransactionItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { 
  Wrench, Plus, Search, Pencil, Trash2, CheckCircle, 
  Clock, X, ChevronDown, User, Package, AlertCircle, 
  UserCheck, Smartphone, ClipboardList, ArrowRight, UserPlus, Printer, Filter, Calendar, RotateCcw, FileDown
} from 'lucide-react';
import { useToast } from './Toast';
import NepaliDatePicker from './NepaliDatePicker';
import PrintServiceJob from './PrintServiceJob';
import { downloadServiceJobPdf } from '../services/pdfService';

const STATUS_OPTIONS = ['All Status', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'];

const ServiceCenter: React.FC = () => {
    const [jobs, setJobs] = useState<ServiceJob[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);
    const [printingJob, setPrintingJob] = useState<ServiceJob | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { addToast } = useToast();

    const loadJobs = () => setJobs(db.getServiceJobs());

    useEffect(() => {
        loadJobs();
        window.addEventListener('db-updated', loadJobs);
        return () => window.removeEventListener('db-updated', loadJobs);
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
        if (window.confirm('Are you sure you want to delete this service ticket?')) {
            await db.deleteServiceJob(id);
            addToast('Service ticket deleted successfully', 'success');
        }
    };

    const handleSave = () => {
        setShowModal(false);
        setEditingJob(null);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedStatus('All Status');
        setStartDate('');
        setEndDate('');
    };

    const filteredJobs = useMemo(() => {
        let result = jobs;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(j => j.customerName.toLowerCase().includes(term) || j.ticketNumber.toLowerCase().includes(term) || j.deviceModel.toLowerCase().includes(term));
        }
        if (selectedStatus !== 'All Status') result = result.filter(j => j.status === selectedStatus);
        if (startDate) {
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            result = result.filter(j => new Date(j.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            result = result.filter(j => new Date(j.date) <= end);
        }
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [jobs, searchTerm, selectedStatus, startDate, endDate]);

    const hasActiveFilters = searchTerm || selectedStatus !== 'All Status' || startDate || endDate;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'IN_PROGRESS': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'DELIVERED': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'CANCELLED': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-orange-50 text-orange-600 border-orange-100';
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                        <Wrench className="w-8 h-8 text-brand-500" />
                        Service Center
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Track repairs, intake jobs and delivery status</p>
                </div>
                <button onClick={() => { setEditingJob(null); setShowModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 font-bold uppercase text-xs tracking-widest active:scale-95"><Plus className="w-4 h-4" /> New Intake Ticket</button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search ticket, customer or model..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/50 outline-none dark:text-white transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[160px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <select className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none appearance-none focus:ring-2 focus:ring-brand-500/50" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-40"><NepaliDatePicker value={startDate} onChange={setStartDate} placeholder="Intake From" className="!bg-gray-50 dark:!bg-gray-900" /></div>
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                        <div className="w-40"><NepaliDatePicker value={endDate} onChange={setEndDate} placeholder="Intake To" className="!bg-gray-50 dark:!bg-gray-900" /></div>
                    </div>
                    {hasActiveFilters && (
                        <button onClick={handleClearFilters} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100" title="Clear Filters"><RotateCcw className="w-4.5 h-4.5" /></button>
                    )}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/30 dark:bg-gray-900/20">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Service Tickets History</span>
                    <span className="text-[10px] font-black text-brand-600 uppercase bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-lg">{filteredJobs.length} results</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black uppercase text-[10px] tracking-widest border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-8 py-4 text-center w-24">Ticket</th>
                                <th className="px-8 py-4">Customer Details</th>
                                <th className="px-8 py-4">Device / Hardware</th>
                                <th className="px-8 py-4 text-center">Status</th>
                                <th className="px-8 py-4 text-right">Est. Cost</th>
                                <th className="px-8 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredJobs.map(job => (
                                <tr key={job.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 group transition-all">
                                    <td className="px-8 py-5 text-center">
                                        <div className="font-black text-gray-900 dark:text-white">#{job.ticketNumber}</div>
                                        <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase flex items-center justify-center gap-1"><Calendar className="w-2.5 h-2.5" /> {formatNepaliDate(job.date)}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${job.customerId ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>{job.customerId ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}</div>
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-gray-200">{job.customerName}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{job.customerPhone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-gray-300 dark:text-gray-600" /><span className="font-semibold text-gray-700 dark:text-gray-300">{job.deviceModel}</span></div>
                                        {job.deviceImei && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-bold">SN: {job.deviceImei}</div>}
                                    </td>
                                    <td className="px-8 py-5 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(job.status)}`}>{job.status.replace('_', ' ')}</span></td>
                                    <td className="px-8 py-5 text-right"><div className="font-black text-gray-900 dark:text-white">{formatCurrency(job.estimatedCost)}</div>{job.advanceAmount > 0 && <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Adv: {formatCurrency(job.advanceAmount)}</div>}</td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <button onClick={() => downloadServiceJobPdf(job)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all" title="Download PDF Ticket"><FileDown className="w-4.5 h-4.5" /></button>
                                            <button onClick={() => setPrintingJob(job)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all" title="Print Job Card"><Printer className="w-4.5 h-4.5" /></button>
                                            <button onClick={() => { setEditingJob(job); setShowModal(true); }} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-xl transition-all" title="Edit Ticket"><Pencil className="w-4.5 h-4.5" /></button>
                                            <button onClick={() => handleDelete(job.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all" title="Delete Ticket"><Trash2 className="w-4.5 h-4.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showModal && <JobFormModal initialData={editingJob} onClose={() => setShowModal(false)} onSave={handleSave} />}
            {printingJob && <PrintServiceJob job={printingJob} onClose={() => setPrintingJob(null)} />}
        </div>
    );
};

const JobFormModal: React.FC<{ initialData: ServiceJob | null, onClose: () => void, onSave: () => void }> = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<ServiceJob>>(initialData || { date: new Date().toISOString(), status: 'PENDING', customerName: '', customerPhone: '', deviceModel: '', problemDescription: '', estimatedCost: 0, advanceAmount: 0, usedParts: [], laborCharge: 0 });
    const [nameSearch, setNameSearch] = useState(initialData?.customerName || '');
    const [showNameDropdown, setShowNameDropdown] = useState(false);
    const [highlightedNameIndex, setHighlightedNameIndex] = useState(0);
    const [partSearch, setPartSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const { addToast } = useToast();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const partsDropdownRef = useRef<HTMLDivElement>(null);
    const parties = useMemo(() => db.getParties(), []);
    const products = useMemo(() => db.getProducts(), []);
    const filteredParties = useMemo(() => parties.filter(p => p.name.toLowerCase().includes(nameSearch.toLowerCase())), [parties, nameSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowNameDropdown(false);
            if (partsDropdownRef.current && !partsDropdownRef.current.contains(event.target as Node)) setShowProductDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePartySelect = (p: Party) => {
        setFormData({ ...formData, customerId: p.id, customerName: p.name, customerPhone: p.phone || '', customerAddress: p.address || '' });
        setNameSearch(p.name); setShowNameDropdown(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (!showNameDropdown) return;
        const count = filteredParties.length;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedNameIndex(p => (p + 1) % count); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedNameIndex(p => (p - 1 + count) % count); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredParties[highlightedNameIndex]) handlePartySelect(filteredParties[highlightedNameIndex]);
        }
        else if (e.key === 'Escape') { setShowNameDropdown(false); e.stopPropagation(); }
    };

    const handleFinalSave = async () => {
        if (!formData.customerName || !formData.deviceModel) {
            addToast('Customer name and Device Model are required', 'error');
            return;
        }
        const job: ServiceJob = {
            id: initialData?.id || Date.now().toString(),
            ticketNumber: initialData?.ticketNumber || Math.floor(1000 + Math.random() * 8999).toString(),
            date: formData.date!, customerId: formData.customerId, customerName: formData.customerName!, customerPhone: formData.customerPhone!, customerAddress: formData.customerAddress, deviceModel: formData.deviceModel!, deviceImei: formData.deviceImei, devicePassword: formData.devicePassword, problemDescription: formData.problemDescription || '', status: formData.status as any, estimatedCost: Number(formData.estimatedCost) || 0, advanceAmount: Number(formData.advanceAmount) || 0, usedParts: formData.usedParts || [], laborCharge: Number(formData.laborCharge) || 0, finalAmount: (formData.usedParts?.reduce((s, i) => s + i.amount, 0) || 0) + (Number(formData.laborCharge) || 0) - (Number(formData.advanceAmount) || 0)
        };
        if (initialData) await db.updateServiceJob(job);
        else await db.addServiceJob(job);
        onSave();
        addToast(`Ticket #${job.ticketNumber} saved successfully`, 'success');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div><h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3"><Wrench className="w-6 h-6 text-brand-500" />{initialData ? `Edit Ticket #${initialData.ticketNumber}` : 'New Intake Ticket'}</h2><p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Repair Registration Form</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><User className="w-3.5 h-3.5" /> Customer Identity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Customer Name</label>
                                <div className="relative">
                                    <input autoFocus className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" placeholder="Search or enter name..." value={nameSearch} onChange={e => { setNameSearch(e.target.value); setShowNameDropdown(true); setFormData({...formData, customerName: e.target.value, customerId: undefined}); }} onFocus={() => setShowNameDropdown(true)} onKeyDown={handleNameKeyDown} />
                                    {formData.customerId && <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-lg text-[9px] font-black uppercase"><UserCheck className="w-3 h-3" /> Registered</div>}
                                </div>
                                {showNameDropdown && nameSearch && (
                                    <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select from Parties</span><span className="text-[9px] font-bold text-brand-600 uppercase">{filteredParties.length} matching</span></div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {filteredParties.map((p, idx) => (
                                                <div key={p.id} className={`p-4 border-b last:border-0 dark:border-gray-700 cursor-pointer flex justify-between items-center transition-colors ${highlightedNameIndex === idx ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`} onClick={() => handlePartySelect(p)}>
                                                    <div><span className="font-bold text-gray-800 dark:text-gray-200 text-sm block">{p.name}</span><span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{p.phone || 'No Phone'}</span></div><ArrowRight className={`w-4 h-4 transition-all ${highlightedNameIndex === idx ? 'text-brand-500 translate-x-0' : 'text-gray-200 dark:text-gray-700 -translate-x-2'}`} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Primary Phone</label><input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" placeholder="98XXXXXXXX" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Device & Issue Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Device Model</label><input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" placeholder="e.g. iPhone 15 Pro Max" value={formData.deviceModel} onChange={e => setFormData({...formData, deviceModel: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">IMEI / Serial Number</label><input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" placeholder="Enter device identifier..." value={formData.deviceImei} onChange={e => setFormData({...formData, deviceImei: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label><select className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="PENDING">PENDING</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="COMPLETED">COMPLETED</option><option value="DELIVERED">DELIVERED</option></select></div>
                            <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Device Password / Pattern</label><input className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all" placeholder="Pattern or PIN..." value={formData.devicePassword} onChange={e => setFormData({...formData, devicePassword: e.target.value})} /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Problem Description</label><textarea className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:text-white transition-all resize-none min-h-[100px]" placeholder="Describe the fault in detail..." value={formData.problemDescription} onChange={e => setFormData({...formData, problemDescription: e.target.value})} /></div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5" /> Billing & Estimate</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-brand-50/50 dark:bg-brand-900/10 rounded-3xl border border-brand-100/50 dark:border-brand-800/50"><label className="block text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase mb-2">Total Estimate (Rs.)</label><input type="number" className="w-full bg-white dark:bg-gray-900 border border-brand-100 dark:border-brand-800 rounded-xl p-3 text-xl font-black text-brand-700 dark:text-white outline-none" value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: Number(e.target.value)})} /></div>
                            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/50"><label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-2">Advance Amount (Rs.)</label><input type="number" className="w-full bg-white dark:bg-gray-900 border border-brand-100 dark:border-brand-800 rounded-xl p-3 text-xl font-black text-emerald-700 dark:text-white outline-none" value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: Number(e.target.value)})} /></div>
                        </div>
                    </div>
                </div>
                <div className="px-10 py-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-4"><button onClick={onClose} className="px-8 py-3 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-widest hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Discard</button><button onClick={handleFinalSave} className="px-12 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Save Ticket</button></div>
            </div>
        </div>
    );
};

export default ServiceCenter;