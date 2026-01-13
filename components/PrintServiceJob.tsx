
import React, { useEffect, useState } from 'react';
import { ServiceJob, BusinessProfile } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { X, Printer, Wrench, Smartphone, User, FileDown } from 'lucide-react';
import { db } from '../services/db';
import { downloadServiceJobPdf } from '../services/pdfService';

interface PrintServiceJobProps {
  job: ServiceJob;
  onClose: () => void;
}

const PrintServiceJob: React.FC<PrintServiceJobProps> = ({ job, onClose }) => {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    setProfile(db.getBusinessProfile());
  }, []);

  if (!profile) return null;

  const JobCard = ({ type }: { type: 'CUSTOMER COPY' | 'SHOP COPY' }) => (
    <div className="bg-white p-8 border-2 border-gray-200 rounded-3xl relative overflow-hidden mb-8 last:mb-0 print:mb-0 print:border-gray-400 print:rounded-none print:border-b-4 print:border-dashed print:shadow-none">
      <div className="absolute top-0 right-0 px-6 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl print:border print:border-black print:text-black print:bg-white">
        {type}
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-6 print:border-gray-300">
        <div className="flex gap-4">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100">
              <Wrench className="w-8 h-8 text-brand-500" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{profile.name}</h1>
            <p className="text-xs text-gray-500 font-bold">{profile.address}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Ph: {profile.phone} | PAN: {profile.pan}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">REPAIR TICKET</h2>
          <div className="text-sm font-mono font-black text-brand-600">#{job.ticketNumber}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        {/* Left: Customer & Device */}
        <div className="space-y-4">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Customer Details</span>
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-300" />
              <p className="text-sm font-black text-gray-800">{job.customerName}</p>
            </div>
            <p className="text-xs text-gray-500 ml-5">{job.customerPhone}</p>
          </div>
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Device Information</span>
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-gray-300" />
              <p className="text-sm font-bold text-gray-700">{job.deviceModel}</p>
            </div>
            {job.deviceImei && <p className="text-[10px] text-gray-400 ml-5 font-bold">IMEI/SN: {job.deviceImei}</p>}
            {job.devicePassword && <p className="text-[10px] text-orange-500 ml-5 font-bold uppercase">Pass/Pattern: {job.devicePassword}</p>}
          </div>
        </div>

        {/* Right: Dates & Financials */}
        <div className="space-y-4 text-right">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Intake Date (Nepali)</span>
            <p className="text-sm font-bold text-gray-800">{formatNepaliDate(job.date)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 print:bg-white print:border-gray-400">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Est. Total</span>
              <span className="text-sm font-black text-gray-900">{formatCurrency(job.estimatedCost)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-1">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Advance Paid</span>
              <span className="text-sm font-black text-emerald-600">{formatCurrency(job.advanceAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Description */}
      <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 print:bg-white print:border-gray-300 min-h-[60px]">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Reported Issue / Problem</span>
        <p className="text-xs text-gray-700 font-medium leading-relaxed italic">"{job.problemDescription || 'No description provided.'}"</p>
      </div>

      {/* Footer / Terms */}
      <div className="grid grid-cols-2 gap-10">
        <div className="text-[8px] text-gray-400 font-bold uppercase leading-relaxed">
          <p className="mb-1 text-gray-500">Terms & Conditions:</p>
          <ul className="list-disc pl-3 space-y-0.5">
            <li>Customer is responsible for data backup.</li>
            <li>No warranty on physical or liquid damage.</li>
            <li>Devices not collected within 30 days may be disposed.</li>
          </ul>
        </div>
        <div className="flex justify-between items-end">
           <div className="text-center">
              <div className="w-32 border-t border-gray-300 pt-1 text-[8px] font-bold uppercase text-gray-400">Customer Sign</div>
           </div>
           <div className="text-center">
              <div className="w-32 border-t-2 border-gray-900 pt-1 text-[9px] font-black uppercase text-gray-900">Authorized Sign</div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block print:overflow-visible">
      
      <div className="fixed top-4 right-4 flex gap-2 no-print z-[210]">
        <button 
          onClick={() => downloadServiceJobPdf(job)} 
          className="bg-blue-600 text-white p-3 rounded-full shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          title="Download PDF"
        >
          <FileDown className="w-6 h-6" />
          <span className="text-xs font-black uppercase tracking-widest pr-1">Download PDF</span>
        </button>
        <button 
          onClick={onClose} 
          className="bg-gray-800 text-white p-3 rounded-full shadow-2xl hover:bg-gray-900 transition-all active:scale-95"
          title="Close Preview"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full flex justify-center no-print">
        <div className="w-full max-w-[210mm] mt-8 mb-20 animate-in zoom-in-95 duration-300">
           <JobCard type="CUSTOMER COPY" />
           <div className="my-10 border-t-2 border-dashed border-gray-200"></div>
           <JobCard type="SHOP COPY" />
        </div>
      </div>
    </div>
  );
};

export default PrintServiceJob;
