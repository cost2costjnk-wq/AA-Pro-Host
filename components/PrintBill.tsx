
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
          @page { size: A4; margin: 10mm; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .print-bill-target, .print-bill-target * { visibility: visible; }
          .print-bill-target { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="fixed top-4 right-4 flex gap-2 no-print z-[210]">
        <button onClick={() => window.print()} className="bg-brand-600 text-white p-3 rounded-full shadow-xl"><Printer className="w-6 h-6" /></button>
        <button onClick={onClose} className="bg-gray-800 text-white p-3 rounded-full shadow-xl"><X className="w-6 h-6" /></button>
      </div>

      <div className="print-bill-target bg-white w-full max-w-[210mm] shadow-2xl p-10 mt-10 mb-10 print:mt-0 print:mb-0 print:p-0">
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-100 pb-6">
          <div className="flex gap-5">
              {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="w-20 h-20 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-brand-500" /></div>}
              <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{profile.name}</h1>
                <p className="text-sm text-gray-600 font-medium">{profile.address}</p>
                <p className="text-xs text-gray-500">PAN: {profile.pan} | Contact: {profile.phone}</p>
              </div>
          </div>
          <div className="text-right">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-1">{getTitle()}</h2>
              <div className="bg-gray-900 text-white px-3 py-1 text-xs font-bold inline-block rounded uppercase tracking-widest">#{transaction.id}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-8">
          <div><span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5">Billed To</span><p className="text-lg font-black text-gray-900">{transaction.partyName}</p></div>
          <div className="text-right"><span className="text-[10px] font-black text-gray-400 uppercase block">Date (Nepali)</span><p className="font-bold text-gray-800">{formatNepaliDate(transaction.date)}</p></div>
        </div>

        <div className="mb-10">
          <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                    <th className="py-3 px-4 text-center w-16 font-black uppercase text-[10px]">S.N.</th>
                    <th className="py-3 px-4 text-left font-black uppercase text-[10px]">Description</th>
                    <th className="py-3 px-4 text-center w-24 font-black uppercase text-[10px]">HSN</th>
                    <th className="py-3 px-4 text-center w-20 font-black uppercase text-[10px]">Qty</th>
                    <th className="py-3 px-4 text-right w-24 font-black uppercase text-[10px]">Rate</th>
                    <th className="py-3 px-4 text-right w-24 font-black uppercase text-[10px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-center">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium">{item.productName}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs">{item.hsnCode || '-'}</td>
                    <td className="py-3 px-4 text-center">{item.quantity} {item.unit || 'pcs'}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.rate)}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-10">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Amount In Words</span>
            <p className="text-sm font-bold text-gray-800 italic leading-snug">{numberToWords(transaction.totalAmount)}</p>
          </div>
          <div className="space-y-2">
              <div className="flex justify-between pt-3 border-t-2 border-gray-900 mt-2">
                <span className="text-lg font-black text-gray-900 uppercase">Grand Total:</span>
                <span className="text-2xl font-black text-brand-600">Rs. {formatCurrency(transaction.totalAmount)}</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintBill;
