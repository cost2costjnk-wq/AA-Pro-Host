
import React, { useEffect, useState } from 'react';
import { Transaction, Party, BusinessProfile } from '../types';
import { formatCurrency } from '../services/formatService';
import { formatNepaliDate } from '../services/nepaliDateService';
import { numberToWords } from '../services/numberToWords';
import { X, Printer, ShoppingBag } from 'lucide-react';
import { db } from '../services/db';

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
      case 'SALE': return 'Estimate Bill';
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
    <div className="fixed inset-0 z-[200] bg-gray-900/50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          /* Standard reset to clear layout shifts */
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all content within the root/body */
          body * {
            visibility: hidden;
          }
          /* Re-enable visibility ONLY for the bill container and its children */
          .print-bill-target, .print-bill-target * {
            visibility: visible;
          }
          /* Fix positioning on the physical page */
          .print-bill-target {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Hide auxiliary buttons */
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Actions Toolbar - Hidden on Print */}
      <div className="fixed top-4 right-4 flex gap-2 no-print z-[210]">
        <button 
          onClick={() => window.print()} 
          className="bg-brand-600 text-white p-3 rounded-full shadow-xl hover:bg-brand-700 transition-all active:scale-95"
          title="Print Now"
        >
          <Printer className="w-6 h-6" />
        </button>
        <button 
          onClick={onClose} 
          className="bg-gray-800 text-white p-3 rounded-full shadow-xl hover:bg-gray-900 transition-all active:scale-95"
          title="Close Preview"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Bill Container */}
      <div className="print-bill-target bg-white w-full max-w-[210mm] shadow-2xl p-10 mt-10 mb-10 print:mt-0 print:mb-0 print:p-0 print:max-w-none">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-6 print:border-gray-300">
          <div className="flex gap-5">
              {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt="Logo" className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                  <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100 print:border-gray-400">
                    <ShoppingBag className="w-8 h-8 text-brand-500 print:text-gray-900" />
                  </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">{profile.name}</h1>
                <p className="text-sm text-gray-600 font-medium">{profile.address}</p>
                <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-500 font-bold">PAN/VAT: {profile.pan}</p>
                    <p className="text-xs text-gray-500">Contact: {profile.phone}</p>
                </div>
              </div>
          </div>
          <div className="text-right">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-1">{getTitle()}</h2>
              <div className="bg-gray-900 text-white px-3 py-1 text-xs font-bold inline-block rounded uppercase tracking-widest print:bg-gray-100 print:text-gray-900 print:border print:border-gray-900">
                {transaction.type.replace('_', ' ')}
              </div>
          </div>
        </div>

        {/* Party and Invoice Meta */}
        <div className="grid grid-cols-2 gap-10 mb-8">
          <div className="space-y-3">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Billed To</span>
                <p className="text-lg font-black text-gray-900 leading-tight">{transaction.partyName}</p>
                {party?.address && <p className="text-sm text-gray-600 mt-1">{party.address}</p>}
                {party?.phone && <p className="text-sm text-gray-600">Ph: {party.phone}</p>}
              </div>
              <div className="pt-2 border-t border-dashed border-gray-100 print:border-gray-300">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Opening Balance</span>
                <p className="text-sm font-bold text-gray-700">Rs. {party ? formatCurrency(Math.abs(party.balance)) : '0.00'}</p>
              </div>
          </div>
          <div className="flex flex-col items-end space-y-4">
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Voucher No</span>
                <p className="font-mono text-lg font-black text-gray-900">#{transaction.id}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Date (Nepali)</span>
                <p className="font-bold text-gray-800">{formatNepaliDate(transaction.date)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Payment Mode</span>
                <p className="text-sm font-bold px-2 py-0.5 bg-gray-100 rounded border border-gray-200 print:bg-white print:border-gray-800">{transaction.paymentMode || 'Credit'}</p>
              </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-10">
          <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white print:bg-gray-100 print:text-black print:border-y print:border-black">
                    <th className="py-3 px-4 text-center border border-transparent print:border-black w-16 font-black uppercase text-[10px]">S.N.</th>
                    <th className="py-3 px-4 text-left border border-transparent print:border-black font-black uppercase text-[10px]">Description of Goods</th>
                    <th className="py-3 px-4 text-center border border-transparent print:border-black w-24 font-black uppercase text-[10px]">Qty</th>
                    <th className="py-3 px-4 text-right border border-transparent print:border-black w-32 font-black uppercase text-[10px]">Rate (Rs)</th>
                    <th className="py-3 px-4 text-right border border-transparent print:border-black w-32 font-black uppercase text-[10px]">Total (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items && transaction.items.length > 0 ? (
                    transaction.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 print:border-gray-300">
                        <td className="py-3 px-4 text-center border-x border-gray-100 print:border-black">{idx + 1}</td>
                        <td className="py-3 px-4 border-x border-gray-100 print:border-black font-medium">{item.productName}</td>
                        <td className="py-3 px-4 text-center border-x border-gray-100 print:border-black">{item.quantity} {item.unit || 'pcs'}</td>
                        <td className="py-3 px-4 text-right border-x border-gray-100 print:border-black">{formatCurrency(item.rate)}</td>
                        <td className="py-3 px-4 text-right border-x border-gray-100 print:border-black font-bold">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))
                ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-400 italic">No items recorded in this transaction.</td>
                    </tr>
                )}
              </tbody>
          </table>
        </div>

        {/* Summary and Footer */}
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 print:bg-white print:border-gray-800">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Amount In Words</span>
                <p className="text-sm font-bold text-gray-800 italic leading-snug">{numberToWords(transaction.totalAmount)}</p>
              </div>
              <div className="p-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Remarks / Notes</span>
                <p className="text-sm text-gray-600 italic">{transaction.notes || 'N/A'}</p>
              </div>
          </div>

          <div className="space-y-2">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Sub Total:</span>
                <span className="font-bold text-gray-900">{formatCurrency(transaction.subTotal || transaction.totalAmount)}</span>
              </div>
              {transaction.discount && transaction.discount > 0 && (
                <div className="flex justify-between items-center py-1 text-red-600">
                  <span className="font-medium">Discount (-):</span>
                  <span className="font-bold">{formatCurrency(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax && transaction.tax > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 font-medium">Tax (+):</span>
                  <span className="font-bold text-gray-900">{formatCurrency(transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-900 mt-2">
                <span className="text-lg font-black text-gray-900 uppercase">Grand Total:</span>
                <span className="text-2xl font-black text-brand-600 print:text-black">Rs. {formatCurrency(transaction.totalAmount)}</span>
              </div>
          </div>
        </div>

        <div className="mt-20 flex justify-between items-end">
          <div className="text-center">
              <div className="w-48 border-t border-gray-400 pt-2 text-xs font-bold uppercase text-gray-500">Receiver's Signature</div>
          </div>
          <div className="text-center">
              <div className="w-48 border-t-2 border-gray-900 pt-2 text-xs font-black uppercase text-gray-900">Authorized Signature</div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-dashed border-gray-200 text-center no-print">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Computer Generated Invoice - No Signature Required if Printed</p>
        </div>
      </div>
    </div>
  );
};

export default PrintBill;
