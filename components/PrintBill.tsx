
import React, { useEffect, useState } from 'react';
import { Transaction, Party, BusinessProfile } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { numberToWords } from '../services/numberToWords';
import { X, Printer, ShoppingBag, FileDown } from 'lucide-react';
import { db } from '../services/db';
import { downloadTransactionPdf } from '../services/pdfService';

interface PrintBillProps {
  transaction: Transaction;
  party?: Party;
  onClose: () => void;
}

const PrintBill: React.FC<PrintBillProps> = ({ transaction, party, onClose }) => {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    setProfile(db.getBusinessProfile());
  }, []);

  const getTitle = () => {
    switch (transaction.type) {
      case 'SALE': return 'Tax Invoice';
      case 'PURCHASE': return 'Purchase Bill';
      case 'QUOTATION': return 'Quotation';
      case 'SALE_RETURN': return 'Credit Note';
      case 'PURCHASE_RETURN': return 'Debit Note';
      case 'PAYMENT_IN': return 'Receipt Voucher';
      case 'PAYMENT_OUT': return 'Payment Voucher';
      default: return 'Invoice';
    }
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block print:overflow-visible">
      
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
          .print-bill-target, .print-bill-target * {
            visibility: visible;
          }
          .print-bill-target {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="fixed top-4 right-4 flex gap-2 no-print z-[210]">
        <button 
          onClick={() => downloadTransactionPdf(transaction, party)} 
          className="bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          title="Download PDF"
        >
          <FileDown className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider pr-1">Download PDF</span>
        </button>
        <button 
          onClick={() => window.print()} 
          className="bg-brand-600 text-white p-3 rounded-full shadow-xl hover:bg-brand-700 transition-all active:scale-95 flex items-center gap-2"
          title="Print via Browser"
        >
          <Printer className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider pr-1">Print Bill</span>
        </button>
        <button 
          onClick={onClose} 
          className="bg-gray-800 text-white p-3 rounded-full shadow-xl hover:bg-gray-900 transition-all active:scale-95"
          title="Close Preview"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full flex justify-center py-10 print:py-0">
        <div className="print-bill-target bg-white w-full max-w-[210mm] shadow-2xl p-12 border border-gray-100 animate-in zoom-in-95 duration-300 print:max-w-none">
          {/* Business Header */}
          <div className="flex justify-between items-start mb-10 border-b-2 border-gray-900 pb-8">
            <div className="flex gap-6">
                {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl object-contain bg-gray-50 p-2" />
                ) : (
                    <div className="w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center border-2 border-brand-100">
                      <ShoppingBag className="w-10 h-10 text-brand-500" />
                    </div>
                )}
                <div>
                  <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{profile.name}</h1>
                  <p className="text-sm text-gray-600 font-bold">{profile.address}</p>
                  <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-gray-500 font-black uppercase tracking-widest">PAN/VAT: {profile.pan}</p>
                      <p className="text-xs text-gray-500 font-bold">Contact: {profile.phone}</p>
                  </div>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-1">{getTitle()}</h2>
                <div className="bg-gray-900 text-white px-4 py-1.5 text-[10px] font-black inline-block rounded uppercase tracking-[0.2em]">
                  {transaction.type.replace('_', ' ')}
                </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-12 mb-10">
            <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Billed To</span>
                  <p className="text-xl font-black text-gray-900 leading-tight">{transaction.partyName}</p>
                  {party?.address && <p className="text-sm text-gray-600 mt-1 font-medium">{party.address}</p>}
                  {party?.phone && <p className="text-sm text-gray-600 font-bold">Ph: {party.phone}</p>}
                </div>
                {party && party.balance !== 0 && (
                    <div className="pt-3 border-t border-dashed border-gray-200">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Opening Balance</span>
                      <p className="text-sm font-black text-gray-700">Rs. {formatCurrency(Math.abs(party.balance))} {party.balance >= 0 ? 'Dr' : 'Cr'}</p>
                    </div>
                )}
            </div>
            <div className="flex flex-col items-end space-y-5">
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Invoice No</span>
                  <p className="font-mono text-xl font-black text-gray-900">#{transaction.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Date (Nepali)</span>
                  <p className="font-black text-gray-800 text-lg">{formatNepaliDate(transaction.date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Payment Mode</span>
                  <p className="text-xs font-black px-3 py-1 bg-gray-100 rounded-full border border-gray-200 uppercase tracking-wider">{transaction.paymentMode || 'Credit'}</p>
                </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-12">
            <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-900 text-white">
                      <th className="py-4 px-4 text-center w-16 font-black uppercase text-[10px] tracking-widest border-r border-gray-700">S.N.</th>
                      <th className="py-4 px-6 text-left font-black uppercase text-[10px] tracking-widest">Description of Goods</th>
                      <th className="py-4 px-4 text-center w-24 font-black uppercase text-[10px] tracking-widest border-x border-gray-700">Qty</th>
                      <th className="py-4 px-6 text-right w-32 font-black uppercase text-[10px] tracking-widest border-x border-gray-700">Rate</th>
                      <th className="py-4 px-6 text-right w-36 font-black uppercase text-[10px] tracking-widest">Total (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items && transaction.items.length > 0 ? (
                      transaction.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 text-center border-x border-gray-100 font-bold text-gray-400">{idx + 1}</td>
                          <td className="py-4 px-6 border-x border-gray-100 font-bold text-gray-800">{item.productName}</td>
                          <td className="py-4 px-4 text-center border-x border-gray-100 font-black text-gray-600">{item.quantity} {item.unit || 'pcs'}</td>
                          <td className="py-4 px-6 text-right border-x border-gray-100 font-bold text-gray-600">{formatCurrency(item.rate)}</td>
                          <td className="py-4 px-6 text-right border-x border-gray-100 font-black text-gray-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))
                  ) : (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase tracking-widest italic bg-gray-50/50">No items recorded</td>
                      </tr>
                  )}
                </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Amount In Words</span>
                  <p className="text-sm font-black text-gray-800 italic leading-snug">"{numberToWords(transaction.totalAmount)}"</p>
                </div>
                <div className="px-5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notes / Terms</span>
                  <p className="text-xs text-gray-500 font-medium italic">{transaction.notes || 'No extra notes provided.'}</p>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Sub Total:</span>
                    <span className="font-black text-gray-900">{formatCurrency(transaction.subTotal || transaction.totalAmount)}</span>
                  </div>
                  {transaction.discount && transaction.discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-red-600">
                      <span className="font-bold uppercase tracking-wider">Discount (-):</span>
                      <span className="font-black">{formatCurrency(transaction.discount)}</span>
                    </div>
                  )}
                  {transaction.tax && transaction.tax > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-bold uppercase tracking-wider">Tax (VAT):</span>
                      <span className="font-black text-gray-900">{formatCurrency(transaction.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200 mt-2">
                    <span className="text-lg font-black text-gray-900 uppercase tracking-tight">Net Amount:</span>
                    <div className="text-right">
                        <span className="text-2xl font-black text-brand-600 block leading-none">Rs. {formatCurrency(transaction.totalAmount)}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inc. All Taxes</span>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="mt-24 flex justify-between items-end px-4">
            <div className="text-center">
                <div className="w-48 border-t border-gray-300 pt-3 text-[10px] font-black uppercase text-gray-400 tracking-widest">Receiver's Sign</div>
            </div>
            <div className="text-center">
                <div className="w-56 border-t-4 border-gray-900 pt-3 text-[11px] font-black uppercase text-gray-900 tracking-[0.2em]">Authorized Signature</div>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-dashed border-gray-200 text-center">
            <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.4em]">Computer Generated Document - Professional Edition</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintBill;
