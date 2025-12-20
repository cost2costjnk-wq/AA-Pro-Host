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
  Filter, 
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
  MoreVertical,
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
  
  // Modal State
  const [showJobModal, setShowJobModal] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<ServiceJob>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Print State
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
      {/* Header */}
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

      {/* Stats Cards */}
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

      {/* Filters & Toolbar */}
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

      {/* Jobs Table */}
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
                                 className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                 title="Edit Job"
                              >
                                 <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => setPrintJob(job)} 
                                 className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
                                 title="Print Receipt"
                              >
                                 <Printer className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => handleDeleteJob(job.id)} 
                                 className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
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

      {/* Modals */}
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

// --- Internal Component: Job Form Modal ---
const JobFormModal: React.FC<{
   jobData: Partial<ServiceJob>;
   isEdit: boolean;
   onClose: () => void;
   onSave: (job: ServiceJob) => void;
}> = ({ jobData, isEdit, onClose, onSave }) => {
   const [formData, setFormData] = useState<Partial<ServiceJob>>(jobData);
   const [products, setProducts] = useState<Product[]>([]);
   const [partSearch, setPartSearch] = useState('');
   const [showProductDropdown, setShowProductDropdown] = useState(false);
   const { addToast } = useToast();

   useEffect(() => {
      setProducts(db.getProducts());
   }, []);

   // Calculations
   const partsTotal = formData.usedParts?.reduce((sum, p) => sum + p.amount, 0) || 0;
   const labor = Number(formData.laborCharge) || 0;
   const advance = Number(formData.advanceAmount) || 0;
   const finalTotal = partsTotal + labor;
   const balanceDue = finalTotal - advance;

   // Handle Part Selection
   const addPart = (product: Product) => {
      const currentParts = formData.usedParts || [];
      const existing = currentParts.find(p => p.productId === product.id);
      
      let newParts;
      if (existing) {
         newParts = currentParts.map(p => 
            p.productId === product.id 
            ? { ...p, quantity: Math.floor(p.quantity + 1), amount: (Math.floor(p.quantity + 1) * p.rate) - (p.discount || 0) } 
            : p
         );
      } else {
         newParts = [...currentParts, {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            rate: product.salePrice,
            discount: 0,
            amount: product.salePrice,
            unit: product.unit
         }];
      }
      setFormData({ ...formData, usedParts: newParts });
      setPartSearch('');
      setShowProductDropdown(false);
   };

   const updatePartItem = (index: number, field: keyof TransactionItem, value: any) => {
       const newParts = [...(formData.usedParts || [])];
       const item = { ...newParts[index] };

       // Strictly sanitize quantity as an integer
       if (field === 'quantity') {
          value = Math.max(1, parseInt(value) || 1);
       } else {
          // @ts-ignore
          item[field] = value;
       }
       
       // @ts-ignore
       item[field] = value;
       
       // Recalculate amount
       const qty = Number(item.quantity) || 0;
       const rate = Number(item.rate) || 0;
       const discount = Number(item.discount) || 0;
       item.amount = (qty * rate) - discount;
       
       newParts[index] = item;
       setFormData({ ...formData, usedParts: newParts });
   };

   const removePart = (idx: number) => {
      const newParts = [...(formData.usedParts || [])];
      newParts.splice(idx, 1);
      setFormData({ ...formData, usedParts: newParts });
   };

   const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.customerName) {
          addToast('Please fill Customer Name', 'error');
          return;
      }

      const fullJob: ServiceJob = {
         id: formData.id || Date.now().toString(),
         ticketNumber: formData.ticketNumber || `JOB-${Date.now()}`,
         date: formData.date || new Date().toISOString(),
         customerId: formData.customerId,
         customerName: formData.customerName,
         customerPhone: formData.customerPhone || '',
         customerAddress: formData.customerAddress || '',
         deviceModel: formData.deviceModel || '',
         deviceImei: formData.deviceImei || '',
         devicePassword: formData.devicePassword || '',
         problemDescription: formData.problemDescription || '',
         status: (formData.status as any) || 'PENDING',
         estimatedDelivery: formData.estimatedDelivery,
         estimatedCost: Number(formData.estimatedCost) || 0,
         advanceAmount: Number(formData.advanceAmount) || 0,
         technicianNotes: formData.technicianNotes || '',
         usedParts: formData.usedParts || [],
         laborCharge: Number(formData.laborCharge) || 0,
         finalAmount: finalTotal
      };
      onSave(fullJob);
   };

   const filteredProducts = products.filter(p => p.name.toLowerCase().includes(partSearch.toLowerCase())).slice(0, 10);

   return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
               <div>
                  <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Update Job Card' : 'Create New Job'}</h2>
                  <p className="text-xs text-gray-500 font-mono">Ticket: {formData.ticketNumber}</p>
               </div>
               <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            <form id="job-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Customer & Device (4 spans) */}
                  <div className="lg:col-span-4 space-y-4">
                     <h3 className="font-bold text-gray-800 border-b pb-2 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Customer Info</h3>
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Name <span className="text-red-500">*</span></label>
                        <input required className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                     </div>
                     
                     <h3 className="font-bold text-gray-800 border-b pb-2 mb-3 mt-6 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Device Details</h3>
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Model Name</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. iPhone 15" value={formData.deviceModel} onChange={e => setFormData({...formData, deviceModel: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-semibold text-gray-500 mb-1">IMEI / Serial</label>
                           <input className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" value={formData.deviceImei} onChange={e => setFormData({...formData, deviceImei: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                           <input className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. 1234" value={formData.devicePassword} onChange={e => setFormData({...formData, devicePassword: e.target.value})} />
                        </div>
                     </div>

                     <div className="pt-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Problem Description</label>
                        <textarea className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 min-h-[60px]" value={formData.problemDescription} onChange={e => setFormData({...formData, problemDescription: e.target.value})} />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs font-semibold text-gray-500 mb-1">Intake Date</label>
                           <NepaliDatePicker value={formData.date || ''} onChange={d => setFormData({...formData, date: d})} />
                        </div>
                        <div>
                           <label className="block text-xs font-semibold text-gray-500 mb-1">Est. Delivery</label>
                           <NepaliDatePicker value={formData.estimatedDelivery || ''} onChange={d => setFormData({...formData, estimatedDelivery: d})} />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Current Status</label>
                        <select 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                           value={formData.status}
                           onChange={e => setFormData({...formData, status: e.target.value as any})}
                        >
                           <option value="PENDING">Pending</option>
                           <option value="IN_PROGRESS">In Progress</option>
                           <option value="COMPLETED">Completed</option>
                           <option value="DELIVERED">Delivered</option>
                           <option value="CANCELLED">Cancelled</option>
                        </select>
                     </div>
                  </div>

                  {/* Right Column: Billing & Spare Parts (8 spans) */}
                  <div className="lg:col-span-8 flex flex-col">
                     <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex flex-col h-full">
                        <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex justify-between items-center">
                            <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> Spare Parts & Billing</span>
                            <span className="text-xs text-brand-600">Total Parts: {formatCurrency(partsTotal)}</span>
                        </h3>
                        
                        {/* Parts Search */}
                        <div className="relative mb-4">
                           <div className="relative">
                              <input 
                                 className="w-full border border-gray-300 rounded-lg p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                 placeholder="Search products to add as spare parts..."
                                 value={partSearch}
                                 onChange={e => { setPartSearch(e.target.value); setShowProductDropdown(true); }}
                                 onFocus={() => setShowProductDropdown(true)}
                              />
                              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                           </div>
                           {showProductDropdown && partSearch && (
                              <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-20 mt-1 max-h-60 overflow-y-auto">
                                 {filteredProducts.map(p => (
                                    <div key={p.id} className="p-3 text-sm hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b last:border-0" onClick={() => addPart(p)}>
                                       <div>
                                          <div className="font-bold text-gray-800">{p.name}</div>
                                          <div className="text-[10px] text-gray-500">Stock: {p.stock} {p.unit}</div>
                                       </div>
                                       <span className="font-bold text-brand-600">{formatCurrency(p.salePrice)}</span>
                                    </div>
                                 ))}
                                 {filteredProducts.length === 0 && (
                                     <div className="p-3 text-center text-gray-400 text-xs italic">No items found</div>
                                 )}
                              </div>
                           )}
                        </div>

                        {/* Used Parts Table */}
                        <div className="bg-white border border-gray-200 rounded-lg flex-1 overflow-hidden flex flex-col min-h-[250px]">
                           <div className="grid grid-cols-[1fr_60px_60px_100px_80px_100px_40px] gap-2 bg-gray-100 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">
                              <div>Part Name</div>
                              <div className="text-center">Qty</div>
                              <div>Unit</div>
                              <div className="text-right">Rate</div>
                              <div className="text-right">Dis.</div>
                              <div className="text-right">Amount</div>
                              <div></div>
                           </div>
                           <div className="flex-1 overflow-y-auto p-2 space-y-1">
                              {formData.usedParts?.length === 0 && <div className="text-sm text-center text-gray-400 py-10">No spare parts added yet.</div>}
                              {formData.usedParts?.map((part, idx) => (
                                 <div key={idx} className="grid grid-cols-[1fr_60px_60px_100px_80px_100px_40px] gap-2 items-center text-xs bg-white border border-transparent hover:border-gray-200 p-1.5 rounded transition-all">
                                    <div className="font-medium text-gray-800 truncate" title={part.productName}>{part.productName}</div>
                                    <div>
                                       <input 
                                          type="number" 
                                          min="1" 
                                          step="1"
                                          className="w-full border rounded p-1 text-center" 
                                          value={part.quantity} 
                                          onChange={e => updatePartItem(idx, 'quantity', e.target.value)} 
                                       />
                                    </div>
                                    <div>
                                       <input 
                                          className="w-full border rounded p-1 text-center uppercase text-[10px]" 
                                          value={part.unit} 
                                          onChange={e => updatePartItem(idx, 'unit', e.target.value)} 
                                       />
                                    </div>
                                    <div>
                                       <input 
                                          type="number" 
                                          className="w-full border rounded p-1 text-right" 
                                          value={part.rate} 
                                          onChange={e => updatePartItem(idx, 'rate', Number(e.target.value))} 
                                       />
                                    </div>
                                    <div>
                                       <input 
                                          type="number" 
                                          className="w-full border rounded p-1 text-right" 
                                          value={part.discount || 0} 
                                          onChange={e => updatePartItem(idx, 'discount', Number(e.target.value))} 
                                       />
                                    </div>
                                    <div className="text-right font-bold text-gray-700">
                                       {formatCurrency(part.amount)}
                                    </div>
                                    <div className="text-center">
                                       <button type="button" onClick={() => removePart(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Totals Section */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                           <div className="space-y-2">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Internal Technician Notes</label>
                                <textarea className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 min-h-[80px]" placeholder="Add repair status updates..." value={formData.technicianNotes} onChange={e => setFormData({...formData, technicianNotes: e.target.value})} />
                           </div>
                           <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <div className="flex justify-between items-center text-sm">
                                 <span className="text-gray-500">Subtotal Parts:</span>
                                 <span className="font-medium text-gray-900">{formatCurrency(partsTotal)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                 <span className="text-gray-500">Labor Charge:</span>
                                 <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">Rs.</span>
                                    <input type="number" className="w-24 border border-gray-300 rounded p-1.5 pl-7 text-right text-sm focus:ring-1 focus:ring-brand-500 outline-none font-bold" value={formData.laborCharge} onChange={e => setFormData({...formData, laborCharge: Number(e.target.value)})} />
                                 </div>
                              </div>
                              <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed">
                                 <span className="text-gray-500">Service Estimate:</span>
                                 <input type="number" className="w-24 border border-gray-300 rounded p-1 text-right text-sm" value={formData.estimatedCost} onChange={e => setFormData({...formData, estimatedCost: Number(e.target.value)})} />
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                 <span className="font-bold text-gray-800">Grand Total:</span>
                                 <span className="font-bold text-gray-900 text-lg">{formatCurrency(finalTotal)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm text-red-600 font-medium">
                                 <span>Advance Paid:</span>
                                 <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-300 text-[10px]">Rs.</span>
                                    <input type="number" className="w-24 border border-red-200 bg-red-50/30 rounded p-1.5 pl-7 text-right text-sm focus:ring-1 focus:ring-red-400 outline-none" value={formData.advanceAmount} onChange={e => setFormData({...formData, advanceAmount: Number(e.target.value)})} />
                                 </div>
                              </div>
                              <div className="flex justify-between items-center text-base border-t-2 border-brand-500 pt-2 mt-2 bg-brand-50 p-2 rounded">
                                 <span className="font-bold text-brand-900">Balance Payable:</span>
                                 <span className="font-black text-brand-700 text-xl">{formatCurrency(balanceDue)}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </form>

            <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50 rounded-b-xl">
               <div className="text-[10px] text-gray-400 self-center italic">
                  * Parts stock will be updated if status is set to Delivered or Completed.
               </div>
               <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
                  <button 
                    type="submit"
                    form="job-form"
                    className="px-8 py-2.5 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
                  >
                     <Save className="w-4 h-4" /> {isEdit ? 'Update Record' : 'Save Job Card'}
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

// --- Internal Component: Print Layout ---
const PrintJobReceipt: React.FC<{ job: ServiceJob; onClose: () => void }> = ({ job, onClose }) => {
   const profile = db.getBusinessProfile();
   
   // Auto print effect
   useEffect(() => {
      // setTimeout(() => window.print(), 500);
   }, []);

   const JobCard = ({ title }: { title: string }) => (
      <div className="border border-gray-800 p-6 mb-8 bg-white text-black min-h-[400px]">
         <div className="flex justify-between border-b-2 border-gray-800 pb-4 mb-4">
            <div>
               <h1 className="text-2xl font-bold uppercase">{profile.name}</h1>
               <p className="text-sm">{profile.address}</p>
               <p className="text-sm">{profile.phone}</p>
            </div>
            <div className="text-right">
               <h2 className="text-xl font-bold uppercase">{title}</h2>
               <p className="font-mono text-lg font-bold">{job.ticketNumber}</p>
               <p className="text-sm">Date: {formatNepaliDate(job.date)}</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
               <h3 className="font-bold border-b border-gray-400 mb-2 uppercase text-sm">Customer Details</h3>
               <p><span className="font-semibold">Name:</span> {job.customerName}</p>
               <p><span className="font-semibold">Phone:</span> {job.customerPhone}</p>
            </div>
            <div>
               <h3 className="font-bold border-b border-gray-400 mb-2 uppercase text-sm">Device Details</h3>
               <p><span className="font-semibold">Model:</span> {job.deviceModel || 'N/A'}</p>
               <p><span className="font-semibold">IMEI:</span> {job.deviceImei || 'N/A'}</p>
               <p><span className="font-semibold">Password:</span> {job.devicePassword || 'N/A'}</p>
            </div>
         </div>

         <div className="mb-6 border-b border-gray-200 pb-4">
            <h3 className="font-bold border-b border-gray-400 mb-2 uppercase text-sm">Problem / Issue</h3>
            <p className="italic mb-4">{job.problemDescription}</p>
            
            {/* Technician Notes Section */}
            <div className="mt-4">
                <h3 className="font-bold border-b border-gray-400 mb-2 uppercase text-sm">Technician Notes</h3>
                <p className="italic min-h-[40px] font-mono text-sm">{job.technicianNotes || '_________________________________________________'}</p>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-8 mt-auto pt-4">
            <div className="text-sm">
               <p className="font-bold">Terms & Conditions:</p>
               <ul className="list-disc pl-4 text-xs">
                  <li>Goods once sold or repaired are not returnable.</li>
                  <li>We are not responsible for data loss during repair.</li>
                  <li>Device must be collected within 30 days.</li>
               </ul>
            </div>
            <div className="text-right space-y-1">
               <p><span className="font-semibold">Est. Cost:</span> {formatCurrency(job.estimatedCost)}</p>
               <p><span className="font-semibold">Advance:</span> {formatCurrency(job.advanceAmount)}</p>
               <div className="mt-8 pt-4 border-t border-gray-800 inline-block w-32 text-center text-xs">
                  Authorized Signature
               </div>
            </div>
         </div>
      </div>
   );

   return (
      <div className="fixed inset-0 z-[100] bg-gray-900/80 flex items-center justify-center p-4">
         <div className="absolute top-4 right-4 flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="bg-blue-600 text-white p-2 rounded-full shadow hover:bg-blue-700">
               <Printer className="w-6 h-6" />
            </button>
            <button onClick={onClose} className="bg-gray-600 text-white p-2 rounded-full shadow hover:bg-gray-700">
               <X className="w-6 h-6" />
            </button>
         </div>

         <div className="bg-white w-[210mm] min-h-[297mm] p-8 overflow-y-auto print:p-0 print:w-full print:h-full print:absolute print:inset-0">
            <JobCard title="Job Sheet (Customer Copy)" />
            <div className="border-t-2 border-dashed border-gray-400 my-8 relative">
               <span className="absolute left-1/2 -top-3 bg-white px-2 text-xs text-gray-500 -translate-x-1/2">Cut Here</span>
            </div>
            <JobCard title="Job Sheet (Shop Copy)" />
         </div>
      </div>
   );
};

export default ServiceCenter;