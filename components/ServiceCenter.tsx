
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { ServiceJob, Party, Product, TransactionItem } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import NepaliDatePicker from './NepaliDatePicker';
import { useToast } from './Toast';
import { 
  Wrench, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Smartphone, 
  CheckCircle, 
  Clock, 
  Truck, 
  X, 
  Printer, 
  Save, 
  ChevronDown,
  AlertCircle,
  Trash2,
  Edit2,
  Tag
} from 'lucide-react';

const STATUS_COLORS = {
  'PENDING': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'IN_PROGRESS': 'bg-blue-50 text-blue-700 border-blue-200',
  'COMPLETED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'DELIVERED': 'bg-gray-100 text-gray-700 border-gray-200',
  'CANCELLED': 'bg-red-50 text-red-700 border-red-200'
};

const ServiceCenter: React.FC = () => {
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ServiceJob[]>([]);
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showJobModal, setShowJobModal] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<ServiceJob>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [printJob, setPrintJob] = useState<ServiceJob | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, activeStatus, searchTerm]);

  const loadJobs = () => {
    setJobs(db.getServiceJobs());
  };

  const filterJobs = () => {
    let result = jobs;
    if (activeStatus !== 'ALL') {
      result = result.filter(j => j.status === activeStatus);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(j => 
        j.ticketNumber.toLowerCase().includes(term) ||
        j.customerName.toLowerCase().includes(term) ||
        j.customerPhone.includes(term) ||
        (j.deviceModel && j.deviceModel.toLowerCase().includes(term))
      );
    }
    setFilteredJobs(result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleCreateJob = () => {
    const nextTicket = `JOB-${new Date().getFullYear()}-${(jobs.length + 1).toString().padStart(4, '0')}`;
    setCurrentJob({
      ticketNumber: nextTicket,
      date: new Date().toISOString(),
      status: 'PENDING',
      customerName: '',
      customerPhone: '',
      deviceModel: '',
      devicePassword: '',
      problemDescription: '',
      estimatedCost: 0,
      advanceAmount: 0,
      laborCharge: 0,
      usedParts: [],
      finalAmount: 0
    });
    setIsEditMode(false);
    setShowJobModal(true);
  };

  const handleEditJob = (job: ServiceJob) => {
    setCurrentJob({ ...job });
    setIsEditMode(true);
    setShowJobModal(true);
  };

  const handleDeleteJob = (id: string) => {
    if (window.confirm('Are you sure you want to delete this job record?')) {
      db.deleteServiceJob(id);
      loadJobs();
      addToast('Job deleted successfully', 'success');
    }
  };

  const saveJob = (job: ServiceJob) => {
    try {
      if (isEditMode) {
        db.updateServiceJob(job);
        addToast('Job updated successfully', 'success');
      } else {
        db.addServiceJob(job);
        addToast('New Job Created', 'success');
      }
      setShowJobModal(false);
      loadJobs();
    } catch (e) {
      console.error(e);
      addToast('Failed to save job', 'error');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-brand-500" />
            Service Center
          </h1>
          <p className="text-sm text-gray-500">Manage repairs, job sheets, and billing</p>
        </div>
        <button 
          onClick={handleCreateJob}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create New Job
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
           <div className="flex items-center justify-center gap-2 text-yellow-600 text-xs font-bold uppercase mb-1"><Clock className="w-3 h-3"/> Pending</div>
           <div className="text-2xl font-bold text-gray-800">{jobs.filter(j => j.status === 'PENDING').length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
           <div className="flex items-center justify-center gap-2 text-blue-600 text-xs font-bold uppercase mb-1"><Wrench className="w-3 h-3"/> In Progress</div>
           <div className="text-2xl font-bold text-gray-800">{jobs.filter(j => j.status === 'IN_PROGRESS').length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
           <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold uppercase mb-1"><CheckCircle className="w-3 h-3"/> Completed</div>
           <div className="text-2xl font-bold text-gray-800">{jobs.filter(j => j.status === 'COMPLETED').length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
           <div className="flex items-center justify-center gap-2 text-gray-600 text-xs font-bold uppercase mb-1"><Truck className="w-3 h-3"/> Delivered</div>
           <div className="text-2xl font-bold text-gray-800">{jobs.filter(j => j.status === 'DELIVERED').length}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
         <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-md shadow-sm">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
               type="text" 
               placeholder="Search Ticket, Phone or Model..." 
               className="ml-2 bg-transparent border-none outline-none text-sm w-full"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map(status => (
               <button
                 key={status}
                 onClick={() => setActiveStatus(status)}
                 className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    activeStatus === status 
                    ? 'bg-gray-800 text-white shadow-sm' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                 }`}
               >
                 {status.replace('_', ' ')}
               </button>
            ))}
         </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
         <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                  <tr>
                     <th className="px-6 py-3">Ticket</th>
                     <th className="px-6 py-3">Date</th>
                     <th className="px-6 py-3">Customer Info</th>
                     <th className="px-6 py-3">Device & Issue</th>
                     <th className="px-6 py-3">Status</th>
                     <th className="px-6 py-3 text-right">Est. Cost</th>
                     <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map(job => (
                     <tr key={job.id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4 font-mono font-medium text-gray-900">{job.ticketNumber}</td>
                        <td className="px-6 py-4 text-gray-500">
                           {formatNepaliDate(job.date)}
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold text-gray-800">{job.customerName}</div>
                           <div className="text-xs text-gray-500">{job.customerPhone}</div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                           <div className="font-medium text-gray-800">{job.deviceModel || 'N/A'}</div>
                           <div className="text-xs text-gray-500 truncate" title={job.problemDescription}>{job.problemDescription}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold border ${STATUS_COLORS[job.status]}`}>
                              {job.status.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                           {formatCurrency(job.estimatedCost)}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                 onClick={() => handleEditJob(job)} 
                                 className="p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                 title="Edit Job"
                              >
                                 <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => setPrintJob(job)} 
                                 className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                                 title="Print Receipt"
                              >
                                 <Printer className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => handleDeleteJob(job.id)} 
                                 className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                 title="Delete"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                     <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">
                           No jobs found matching your criteria.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {showJobModal && (
         <JobFormModal 
            jobData={currentJob} 
            isEdit={isEditMode}
            onClose={() => setShowJobModal(false)}
            onSave={saveJob}
         />
      )}

      {printJob && (
         <PrintJobReceipt 
            job={printJob} 
            onClose={() => setPrintJob(null)} 
         />
      )}
    </div>
  );
};

const JobFormModal: React.FC<{
   jobData: Partial<ServiceJob>;
   isEdit: boolean;
   onClose: () => void;
   onSave: (job: ServiceJob) => void;
}> = ({ jobData, isEdit, onClose, onSave }) => {
   const [formData, setFormData] = useState<Partial<ServiceJob>>(jobData);
   const [parties, setParties] = useState<Party[]>([]);
   const [products, setProducts] = useState<Product[]>([]);
   
   const [nameSearch, setNameSearch] = useState(jobData.customerName || '');
   const [showNameDropdown, setShowNameDropdown] = useState(false);
   const [partSearch, setPartSearch] = useState('');
   const [showProductDropdown, setShowProductDropdown] = useState(false);

   const nameWrapperRef = useRef<HTMLDivElement>(null);
   const productWrapperRef = useRef<HTMLDivElement>(null);
   const { addToast } = useToast();

   useEffect(() => {
      setParties(db.getParties());
      setProducts(db.getProducts());
   }, []);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (nameWrapperRef.current && !nameWrapperRef.current.contains(event.target as Node)) {
          setShowNameDropdown(false);
        }
        if (productWrapperRef.current && !productWrapperRef.current.contains(event.target as Node)) {
            setShowProductDropdown(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   const partsTotal = formData.usedParts?.reduce((sum, p) => sum + p.amount, 0) || 0;
   const labor = Number(formData.laborCharge) || 0;
   const advance = Number(formData.advanceAmount) || 0;
   const totalBill = partsTotal + labor;
   const balance = totalBill - advance;

   const filteredParties = parties.filter(p => p.name.toLowerCase().includes(nameSearch.toLowerCase()));
   const filteredProducts = products.filter(p => p.name.toLowerCase().includes(partSearch.toLowerCase())).slice(0, 5);

   const handlePartySelect = (p: Party) => {
       setFormData({
           ...formData,
           customerId: p.id,
           customerName: p.name,
           customerPhone: p.phone || '',
           customerAddress: p.address || ''
       });
       setNameSearch(p.name);
       setShowNameDropdown(false);
   };

   const handleManualNameChange = (val: string) => {
       setNameSearch(val);
       setFormData({ ...formData, customerName: val, customerId: undefined });
       setShowNameDropdown(true);
   };

   const handleAddPart = (p: Product) => {
       const newItem: TransactionItem = {
           productId: p.id,
           productName: p.name,
           quantity: 1,
           rate: p.salePrice,
           amount: p.salePrice
       };
       const currentParts = formData.usedParts || [];
       setFormData({ ...formData, usedParts: [...currentParts, newItem] });
       setPartSearch('');
       setShowProductDropdown(false);
   };

   const removePart = (idx: number) => {
       const newParts = [...(formData.usedParts || [])];
       newParts.splice(idx, 1);
       setFormData({ ...formData, usedParts: newParts });
   };

   const handleSubmit = (e: React.FormEvent) => {
       e.preventDefault();
       if (!formData.customerName || !formData.customerPhone) {
           addToast('Please provide customer name and phone', 'error');
           return;
       }
       const job: ServiceJob = {
           ...formData,
           id: formData.id || Date.now().toString(),
           finalAmount: totalBill
       } as ServiceJob;
       onSave(job);
   };

   return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
         <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-brand-500 p-6 text-white flex justify-between items-center shrink-0">
               <div>
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                     <Wrench className="w-5 h-5" />
                     {isEdit ? `Edit Job Sheet: ${formData.ticketNumber}` : 'New Repair Job Sheet'}
                  </h2>
                  <p className="text-brand-100 text-xs mt-1">Fill in repair details and customer requirements.</p>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                     <User className="w-3 h-3" /> Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="relative" ref={nameWrapperRef}>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Full Name</label>
                        <input 
                           required 
                           className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none font-medium" 
                           placeholder="Search party or type name..."
                           value={nameSearch}
                           onChange={e => handleManualNameChange(e.target.value)}
                           onFocus={() => setShowNameDropdown(true)}
                        />
                        {showNameDropdown && nameSearch && (
                            <div className="absolute z-30 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                {filteredParties.length > 0 ? (
                                    filteredParties.map((p) => (
                                        <div 
                                          key={p.id} 
                                          className="p-3 border-b last:border-0 hover:bg-brand-50 cursor-pointer flex justify-between items-center"
                                          onClick={() => handlePartySelect(p)}
                                        >
                                            <span className="font-bold text-sm">{p.name}</span>
                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">Party</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs text-gray-400 italic">No matching party. Using manual name.</div>
                                )}
                            </div>
                        )}
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Contact Phone</label>
                        <input 
                           required 
                           className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                           placeholder="Primary mobile number"
                           value={formData.customerPhone}
                           onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Status</label>
                        <select 
                           className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white font-bold"
                           value={formData.status}
                           onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                           <option value="PENDING">PENDING</option>
                           <option value="IN_PROGRESS">IN PROGRESS</option>
                           <option value="COMPLETED">COMPLETED</option>
                           <option value="DELIVERED">DELIVERED</option>
                           <option value="CANCELLED">CANCELLED</option>
                        </select>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                     <Smartphone className="w-3 h-3" /> Device & Problem Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Device Model / Serial</label>
                           <input 
                              required 
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                              placeholder="e.g. iPhone 15 Pro Max"
                              value={formData.deviceModel}
                              onChange={e => setFormData({...formData, deviceModel: e.target.value})}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Pattern / Password</label>
                           <input 
                              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none" 
                              placeholder="If required for testing"
                              value={formData.devicePassword}
                              onChange={e => setFormData({...formData, devicePassword: e.target.value})}
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Problem Description</label>
                        <textarea 
                           required 
                           className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none h-[124px] resize-none" 
                           placeholder="Describe the issues reported by customer..."
                           value={formData.problemDescription}
                           onChange={e => setFormData({...formData, problemDescription: e.target.value})}
                        />
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Wrench className="w-3 h-3" /> Parts & Labor
                     </h3>
                     <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 min-h-[200px] flex flex-col">
                        <div className="relative mb-3" ref={productWrapperRef}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="Add parts from inventory..."
                                value={partSearch}
                                onChange={e => {setPartSearch(e.target.value); setShowProductDropdown(true);}}
                                onFocus={() => setShowProductDropdown(true)}
                            />
                            {showProductDropdown && partSearch && (
                                <div className="absolute z-20 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} className="p-2 border-b last:border-0 hover:bg-gray-50 cursor-pointer text-xs flex justify-between" onClick={() => handleAddPart(p)}>
                                            <span>{p.name}</span>
                                            <span className="font-bold text-brand-600">{formatCurrency(p.salePrice)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-2">
                           {formData.usedParts?.map((part, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-700">{part.productName}</span>
                                    <span className="text-[10px] text-gray-400">Qty: {part.quantity} @ {formatCurrency(part.rate)}</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold">{formatCurrency(part.amount)}</span>
                                    <button type="button" onClick={() => removePart(idx)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                 </div>
                              </div>
                           ))}
                           {!formData.usedParts?.length && (
                              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10 opacity-50">
                                 <AlertCircle className="w-8 h-8 mb-2" />
                                 <p className="text-xs font-medium">No parts added yet</p>
                              </div>
                           )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                           <span className="text-[10px] font-black text-gray-400 uppercase">Parts Subtotal</span>
                           <span className="font-bold text-gray-900">{formatCurrency(partsTotal)}</span>
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Service / Labor Charge</label>
                        <input 
                           type="number"
                           className="w-full border border-gray-200 rounded-xl p-3 text-lg font-black text-brand-600 focus:ring-2 focus:ring-brand-500 outline-none" 
                           placeholder="0.00"
                           value={formData.laborCharge}
                           onChange={e => setFormData({...formData, laborCharge: Number(e.target.value)})}
                        />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Tag className="w-3 h-3" /> Financial Summary
                     </h3>
                     <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-6 shadow-xl">
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-400">Total Bill Amount</span>
                              <span className="font-bold">{formatCurrency(totalBill)}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-400">Advance Received</span>
                              <div className="flex items-center gap-2">
                                 <span className="text-red-400 font-bold">-</span>
                                 <input 
                                    type="number"
                                    className="w-24 bg-gray-800 border-none rounded-lg p-1 text-right text-sm font-bold text-white focus:ring-1 focus:ring-brand-500 outline-none"
                                    value={formData.advanceAmount}
                                    onChange={e => setFormData({...formData, advanceAmount: Number(e.target.value)})}
                                 />
                              </div>
                           </div>
                           <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-brand-400">Total Net Balance</span>
                              <span className="text-3xl font-black">{formatCurrency(balance)}</span>
                           </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-gray-800">
                           <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Estimated Cost (Display)</label>
                              <input 
                                 type="number"
                                 className="w-full bg-gray-800 border-none rounded-xl p-2 text-sm font-bold text-white outline-none"
                                 value={formData.estimatedCost}
                                 onChange={e => setFormData({...formData, estimatedCost: Number(e.target.value)})}
                              />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </form>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
               <button type="button" onClick={onClose} className="px-6 py-3 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-2xl transition-all">Discard</button>
               <button onClick={handleSubmit} className="px-10 py-3 bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-500/20 hover:bg-brand-600 active:scale-95 transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" /> 
                  {isEdit ? 'Update Job Sheet' : 'Save Job Sheet'}
               </button>
            </div>
         </div>
      </div>
   );
};

const PrintJobReceipt: React.FC<{ job: ServiceJob; onClose: () => void }> = ({ job, onClose }) => {
    const profile = db.getBusinessProfile();

    useEffect(() => {
        setTimeout(() => {
            window.print();
            onClose();
        }, 800);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] bg-white print:static">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: 80mm auto; margin: 0; }
                    body * { visibility: hidden; }
                    .print-receipt-target, .print-receipt-target * { visibility: visible; }
                    .print-receipt-target {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 5mm;
                        margin: 0;
                        background: white;
                    }
                }
            `}} />
            
            <div className="print-receipt-target w-[80mm] mx-auto p-4 text-center font-sans text-[11px] leading-tight">
                <h1 className="text-sm font-black uppercase mb-1">{profile.name}</h1>
                <p className="mb-2">{profile.address}<br/>Ph: {profile.phone}</p>
                
                <div className="border-y border-dashed border-gray-400 py-2 my-2 text-left">
                    <div className="flex justify-between font-bold mb-1">
                        <span>TICKET: #{job.ticketNumber}</span>
                        <span>{formatNepaliDate(job.date)}</span>
                    </div>
                    <div className="mt-1">
                        <p className="font-bold">Customer: {job.customerName}</p>
                        <p>Phone: {job.customerPhone}</p>
                    </div>
                </div>

                <div className="text-left my-3 space-y-1">
                    <p className="font-bold">Device: {job.deviceModel}</p>
                    <p className="text-[10px] text-gray-600">Problem: {job.problemDescription}</p>
                </div>

                <div className="border-t border-dashed border-gray-400 pt-2 space-y-1 text-left">
                    <div className="flex justify-between"><span>Parts Subtotal:</span><span>{formatCurrency(job.usedParts?.reduce((s,p)=>s+p.amount,0)||0)}</span></div>
                    <div className="flex justify-between"><span>Labor/Service:</span><span>{formatCurrency(job.laborCharge)}</span></div>
                    <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1"><span>BILL TOTAL:</span><span>{formatCurrency(job.finalAmount)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>ADVANCE PAID:</span><span>-{formatCurrency(job.advanceAmount)}</span></div>
                    <div className="flex justify-between font-black text-sm pt-1 border-t-2 border-gray-900 mt-1"><span>BALANCE:</span><span>{formatCurrency(job.finalAmount - job.advanceAmount)}</span></div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 text-[9px] text-gray-400 italic">
                    <p>PLEASE BRING THIS TICKET FOR PICKUP</p>
                    <div className="mt-6 flex justify-between">
                        <span className="border-t border-gray-300 w-16"></span>
                        <span className="font-bold uppercase text-gray-600">Authorized</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceCenter;
