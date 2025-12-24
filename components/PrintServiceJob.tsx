
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
    <div className="bg-white p-10 border-2 border-gray-200 rounded-[2.5rem] relative overflow-hidden mb-12 last:mb-0 print:mb-0 print:border-gray-300 print:rounded-none print:border-b-4 print:border-dashed">
      <div className="absolute top-0 right-0 px-8 py-3 bg-gray-900 text-white text-[11px] font-black uppercase tracking-widest rounded-bl-3xl print:border print:border-black print:text-black print:bg-white">
        {type}
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-8 print:border-gray-200">
        <div className="flex gap-6">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-contain bg-gray-50 p-2 border border-gray-100" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center border-2 border-brand-100">
              <Wrench className="w-10 h-10 text-brand-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{profile.name}</h1>
            <p className="text-sm text-gray-500 font-bold mt-1">{profile.address}</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Ph: {profile.phone} | PAN: {profile.pan}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">REPAIR TICKET</h2>
          <div className="text-lg font-mono font-black text-brand-600 mt-1">#{job.ticketNumber}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-8">
        {/* Left: Customer & Device */}
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Customer Details</span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg"><User className="w-4 h-4 text-gray-400" /></div>
              <p className="text-lg font-black text-gray-800">{job.customerName}</p>
            </div>
            <p className="text-sm text-gray-500 ml-12 font-medium">{job.customerPhone}</p>
          </div>
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Hardware Information</span>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg"><Smartphone className="w-4 h-4 text-gray-400" /></div>
              <p className="text-base font-black text-gray-700">{job.deviceModel}</p>
            </div>
            {job.deviceImei && <p className="text-[11px] text-gray-400 ml-12 font-black uppercase mt-1">IMEI/SN: {job.deviceImei}</p>}
            {job.devicePassword && <p className="text-[11px] text-orange-600 ml-12 font-black uppercase mt-1">Security: {job.devicePassword}</p>}
          </div>
        </div>

        {/* Right: Dates & Financials */}
        <div className="space-y-6 text-right">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Intake Date (Nepali)</span>
            <p className="text-lg font-black text-gray-800">{formatNepaliDate(job.date)}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 print:bg-white print:border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Repair Cost</span>
              <span className="text-lg font-black text-gray-900">{formatCurrency(job.estimatedCost)}</span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-gray-200 pt-2">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Advance Deposit</span>
              <span className="text-lg font-black text-emerald-600">{formatCurrency(job.advanceAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Description */}
      <div className="mb-10 p-6 bg-gray-50 rounded-3xl border border-gray-100 print:bg-white print:border-gray-200 min-h-[100px]">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Fault Diagnostic & Problem Description</span>
        <p className="text-sm text-gray-700 font-bold leading-relaxed italic">"{job.problemDescription || 'No description provided.'}"</p>
      </div>

      {/* Footer / Terms */}
      <div className="grid grid-cols-2 gap-12">
        <div className="text-[9px] text-gray-400 font-bold uppercase leading-relaxed pr-6">
          <p className="mb-2 text-gray-600 font-black tracking-widest border-b pb-1">Repair Terms & Conditions:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Customer MUST verify device condition at intake.</li>
            <li>We are not responsible for any data loss during repair.</li>
            <li>Warranty applies ONLY to parts replaced by us.</li>
            <li>Liquid/Physical damage voids all internal warranties.</li>
          </ul>
        </div>
        <div className="flex justify-between items-end pb-2">
           <div className="text-center">
              <div className="w-36 border-t border-gray-300 pt-2 text-[9px] font-black uppercase text-gray-400 tracking-widest">Customer Sign</div>
           </div>
           <div className="text-center">
              <div className="w-44 border-t-4 border-gray-900 pt-2 text-[10px] font-black uppercase text-gray-900 tracking-widest">Authorized Seal</div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/70 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block print:overflow-visible">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 0mm;
          }
          body {
            visibility: hidden;
            background: white !important;
          }
          .service-job-print-target, .service-job-print-target * {
            visibility: visible;
          }
          .service-job-print-target {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            -webkit-print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

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
          onClick={() => window.print()} 
          className="bg-brand-600 text-white p-3 rounded-full shadow-2xl hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2"
          title="Browser Print"
        >
          <Printer className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest pr-1">Print Cards</span>
        </button>
        <button 
          onClick={onClose} 
          className="bg-gray-800 text-white p-3 rounded-full shadow-2xl hover:bg-gray-900 transition-all active:scale-95"
          title="Close Preview"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full flex justify-center py-10 no-print">
        <div className="service-job-print-target w-full max-w-[210mm] animate-in slide-in-from-bottom-6 duration-500">
           <JobCard type="CUSTOMER COPY" />
           <div className="my-14 border-t-4 border-dotted border-gray-300 relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-4 py-1 text-[9px] font-black text-gray-400 uppercase tracking-[0.5em]">Cut Along This Line</div>
           </div>
           <JobCard type="SHOP COPY" />
        </div>
      </div>

      {/* Actual print target for the browser print function */}
      <div className="hidden print:block service-job-print-target">
           <JobCard type="CUSTOMER COPY" />
           <div className="my-10 border-t-2 border-dashed border-gray-400"></div>
           <JobCard type="SHOP COPY" />
      </div>
    </div>
  );
};

export default PrintServiceJob;
