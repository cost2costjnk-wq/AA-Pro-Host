
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { db } from './db';
import { formatCurrency } from './formatService';
import { formatNepaliDate } from './nepaliDateService';
import { numberToWords } from './numberToWords';
import { Transaction, ServiceJob, Party, WarrantyCase, Product } from '../types';

/**
 * Standard Report Generator (Tabular)
 * Used for Inventory, Parties, and general report tables
 */
export const generatePdf = (title: string, columns: string[], rows: any[][], fileName: string) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();

  // Header Section
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // brand-500
  doc.text(profile.name, 105, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${profile.address} | Ph: ${profile.phone} | PAN/VAT: ${profile.pan}`, 105, 26, { align: 'center' });

  doc.setDrawColor(240, 240, 240);
  doc.line(14, 32, 196, 32);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 42);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 47);

  doc.autoTable({
    startY: 52,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Price List Specific PDF
 */
export const downloadPriceListPdf = (products: Product[]) => {
    const columns = ['S.N.', 'Item Name', 'Category', 'Unit', 'Retail Price', 'Wholesale Price'];
    const rows = products.map((p, idx) => [
        idx + 1,
        p.name,
        p.category || 'General',
        p.unit,
        formatCurrency(p.salePrice),
        formatCurrency(p.wholesalePrice || 0)
    ]);
    generatePdf('Product Price Catalog', columns, rows, 'Price_List');
};

/**
 * Transaction Generator (Sales, Purchase, Payments, Expenses)
 */
export const downloadTransactionPdf = (transaction: Transaction, party?: Party) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();
  const isFinancial = ['PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE'].includes(transaction.type);

  // Draw Header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(profile.name, 14, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(profile.address, 14, 25);
  doc.text(`PAN/VAT: ${profile.pan} | Contact: ${profile.phone}`, 14, 30);

  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const title = transaction.type === 'SALE' ? 'TAX INVOICE' : transaction.type.replace('_', ' ');
  doc.text(title, 196, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`#${transaction.id}`, 196, 26, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 35, 196, 35);

  // Party Details
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(isFinancial ? 'PAID TO/FROM:' : 'BILLED TO:', 14, 45);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(transaction.partyName, 14, 51);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (party?.address) doc.text(party.address, 14, 56);
  if (party?.phone) doc.text(`Ph: ${party.phone}`, 14, 61);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text('DATE (NEPALI):', 196, 45, { align: 'right' });
  doc.text(formatNepaliDate(transaction.date), 196, 51, { align: 'right' });

  let nextY = 70;

  if (transaction.items && transaction.items.length > 0) {
    // Items Table
    const columns = ['S.N.', 'Description of Goods', 'Qty', 'Rate', 'Amount'];
    const rows = transaction.items.map((item, idx) => [
      idx + 1,
      item.productName,
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
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });
    nextY = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // Simplified Financial Voucher Layout
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 70, 182, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 70, 182, 30, 'S');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('Payment Amount:', 20, 80);
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${formatCurrency(transaction.totalAmount)}`, 190, 87, { align: 'right' });
    nextY = 110;
  }

  // Summary
  if (nextY > 240) { doc.addPage(); nextY = 20; }
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Notes / Remarks:', 14, nextY);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const splitNotes = doc.splitTextToSize(transaction.notes || 'N/A', 100);
  doc.text(splitNotes, 14, nextY + 5);

  if (!isFinancial) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text('Sub Total:', 140, nextY);
      doc.text(formatCurrency(transaction.subTotal || transaction.totalAmount), 196, nextY, { align: 'right' });
      
      if (transaction.discount) {
        doc.text('Discount (-):', 140, nextY + 6);
        doc.text(formatCurrency(transaction.discount), 196, nextY + 6, { align: 'right' });
      }

      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text('GRAND TOTAL:', 140, nextY + 16);
      doc.text(`Rs. ${formatCurrency(transaction.totalAmount)}`, 196, nextY + 16, { align: 'right' });
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Amount in words:', 14, nextY + 25);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(numberToWords(transaction.totalAmount), 14, nextY + 31);

  // Signatures
  const footerY = 260;
  doc.setDrawColor(150, 150, 150);
  doc.line(14, footerY, 70, footerY);
  doc.line(140, footerY, 196, footerY);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Receiver's Signature", 42, footerY + 5, { align: 'center' });
  doc.text("Authorized Signature", 168, footerY + 5, { align: 'center' });

  doc.save(`${transaction.type}_${transaction.id}.pdf`);
};

/**
 * Service Job Ticket Generator
 */
export const downloadServiceJobPdf = (job: ServiceJob) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();

  const drawJobCard = (startY: number, copyType: string) => {
      // Branding
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(profile.name, 14, startY);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${profile.address} | Ph: ${profile.phone}`, 14, startY + 5);

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('REPAIR SERVICE TICKET', 196, startY, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`#${job.ticketNumber}`, 196, startY + 6, { align: 'right' });
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(copyType, 196, startY + 10, { align: 'right' });

      // Customer/Device Info
      doc.setFillColor(249, 250, 251);
      doc.rect(14, startY + 15, 182, 35, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.rect(14, startY + 15, 182, 35, 'S');

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Customer: ${job.customerName}`, 20, startY + 23);
      doc.text(`Contact: ${job.customerPhone}`, 20, startY + 29);
      doc.text(`Date: ${formatNepaliDate(job.date)}`, 20, startY + 35);

      doc.text(`Device: ${job.deviceModel}`, 110, startY + 23);
      doc.text(`IMEI/SN: ${job.deviceImei || 'N/A'}`, 110, startY + 29);
      doc.text(`Status: ${job.status}`, 110, startY + 35);

      // Issue Details
      doc.setFontSize(9);
      doc.text('REPORTED PROBLEM:', 14, startY + 60);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const splitDesc = doc.splitTextToSize(job.problemDescription || 'No description provided.', 170);
      doc.text(splitDesc, 14, startY + 66);

      // Financials
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Est. Repair Cost:', 14, startY + 90);
      doc.text(formatCurrency(job.estimatedCost), 60, startY + 90);
      
      doc.setTextColor(16, 185, 129);
      doc.text('Advance Paid:', 14, startY + 96);
      doc.text(formatCurrency(job.advanceAmount), 60, startY + 96);

      // Signs
      doc.setDrawColor(200, 200, 200);
      doc.line(14, startY + 115, 60, startY + 115);
      doc.line(140, startY + 115, 196, startY + 115);
      doc.setFontSize(7);
      doc.text('Customer Signature', 37, startY + 120, { align: 'center' });
      doc.text('Authorized Seal & Sign', 168, startY + 120, { align: 'center' });
  };

  drawJobCard(20, 'CUSTOMER COPY');
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, 145, 200, 145);
  doc.setLineDashPattern([], 0);
  drawJobCard(160, 'SHOP COPY');

  doc.save(`Service_Ticket_${job.ticketNumber}.pdf`);
};

/**
 * Warranty Case Ticket Generator
 */
export const downloadWarrantyPdf = (wCase: WarrantyCase) => {
  const doc = new jsPDF('p', 'mm', 'a4') as any;
  const profile = db.getBusinessProfile();

  // Header
  doc.setFontSize(18);
  doc.text(profile.name, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(147, 51, 234); // Purple
  doc.text(`WARRANTY CLAIM TICKET #${wCase.ticketNumber}`, 196, 20, { align: 'right' });
  
  doc.setDrawColor(240, 240, 240);
  doc.line(14, 25, 196, 25);

  // Body Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Customer: ${wCase.customerName}`, 14, 35);
  doc.text(`Claim Date: ${formatNepaliDate(wCase.dateReceived)}`, 14, 41);
  if (wCase.vendorName) doc.text(`Vendor: ${wCase.vendorName}`, 14, 47);

  // Items Table
  const columns = ['S.N.', 'Product Name', 'Serial Number', 'Issue / Problem'];
  const rows = wCase.items.map((item, idx) => [
    idx + 1,
    item.productName,
    item.serialNumber,
    item.problemDescription
  ]);

  doc.autoTable({
    startY: 55,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9 }
  });

  doc.save(`Warranty_${wCase.ticketNumber}.pdf`);
};
