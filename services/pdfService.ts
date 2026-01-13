
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { db } from './db';
import { formatCurrency } from './formatService';
import { formatNepaliDate } from './nepaliDateService';
import { numberToWords } from './numberToWords';
import { Transaction, ServiceJob, Party, WarrantyCase, Product } from '../types';

export const generatePdf = (title: string, columns: string[], rows: any[][], fileName: string) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text(profile.name, 105, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${profile.address} | PAN: ${profile.pan}`, 105, 26, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 42);

  doc.autoTable({
    startY: 52,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const downloadPriceListPdf = (products: Product[]) => {
    const columns = ['S.N.', 'Item Name', 'HSN', 'Unit', 'Retail Price', 'Wholesale Price'];
    const rows = products.map((p, idx) => [
        idx + 1,
        p.name,
        p.hsnCode || '-',
        p.unit,
        formatCurrency(p.salePrice),
        formatCurrency(p.wholesalePrice || 0)
    ]);
    generatePdf('Product Price Catalog', columns, rows, 'Price_List');
};

export const downloadTransactionPdf = (transaction: Transaction, party?: Party) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();
  const isFinancial = ['PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE'].includes(transaction.type);

  doc.setFontSize(18);
  doc.text(profile.name, 14, 20);
  doc.setFontSize(16);
  const title = transaction.type === 'SALE' ? 'ESTIMATE BILL' : transaction.type.replace('_', ' ');
  doc.text(title, 196, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(isFinancial ? 'PAID TO/FROM:' : 'BILLED TO:', 14, 45);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(transaction.partyName, 14, 51);

  if (transaction.items && transaction.items.length > 0) {
    const columns = ['S.N.', 'Description', 'HSN', 'Qty', 'Rate', 'Amount'];
    const rows = transaction.items.map((item, idx) => [
      idx + 1,
      item.productName,
      item.hsnCode || '-',
      `${item.quantity} ${item.unit || 'pcs'}`,
      formatCurrency(item.rate),
      formatCurrency(item.amount)
    ]);

    doc.autoTable({
      startY: 70,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
    });
  } else {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 70, 182, 30, 'F');
    doc.setFontSize(11);
    doc.text('Payment Amount:', 20, 80);
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${formatCurrency(transaction.totalAmount)}`, 190, 87, { align: 'right' });
  }

  doc.save(`${transaction.type}_${transaction.id}.pdf`);
};

export const downloadServiceJobPdf = (job: ServiceJob) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();
  doc.setFontSize(16);
  doc.text(profile.name, 14, 20);
  doc.text('SERVICE TICKET', 196, 20, { align: 'right' });
  doc.save(`Service_Ticket_${job.ticketNumber}.pdf`);
};

export const downloadWarrantyPdf = (wCase: WarrantyCase) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();
  doc.setFontSize(16);
  doc.text(profile.name, 14, 20);
  doc.text('WARRANTY CLAIM', 196, 20, { align: 'right' });
  doc.save(`Warranty_${wCase.ticketNumber}.pdf`);
};
