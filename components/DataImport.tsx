
import React, { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight, Database, RefreshCcw, Building2, Package, Users, Receipt, Landmark, Bell, Wrench, Banknote } from 'lucide-react';
import { db } from '../services/db';
import { Party, Product, Transaction } from '../types';
import { useToast } from './Toast';
import { cloudService } from '../services/cloudService';

declare const XLSX: any;

interface DataImportProps {
  onBack: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'parties' | 'items' | 'backup'>('items');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [backupAnalysis, setBackupAnalysis] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  // Sample Data for Templates
  const ITEM_TEMPLATE = [
    { "Item Name": "Coca Cola 2L", "Category": "Drinks", "Sales Price": 120, "Purchase Price": 80, "Opening Stock": 25, "Unit": "pcs" },
    { "Item Name": "Real Juice 250ml", "Category": "General", "Sales Price": 50, "Purchase Price": 35, "Opening Stock": 60, "Unit": "pcs" }
  ];

  const PARTY_TEMPLATE = [
    { "Party Name": "Hari Basnet", "Phone Number": "9800000000", "Customer/Supplier": "Customer", "Opening Balance": 500, "Receivable/Payable": "Receivable", "Address": "Kathmandu" },
    { "Party Name": "ABC Traders", "Phone Number": "014000000", "Customer/Supplier": "Supplier", "Opening Balance": 10000, "Receivable/Payable": "Payable", "Address": "Pokhara" }
  ];

  const resetState = () => {
    setFile(null);
    setSuccess('');
    setError('');
    setBackupAnalysis(null);
    setPreviewData([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const switchTab = (tab: 'parties' | 'items' | 'backup') => {
    setActiveTab(tab);
    resetState();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    // Clear input to allow re-selection
    e.target.value = '';
  };

  const handleFile = (file: File) => {
    setFile(file);
    setError('');
    setSuccess('');
    setPreviewData([]);
    setBackupAnalysis(null);
    
    // JSON Handling for Backup
    if (activeTab === 'backup') {
        const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
        
        if (!isJson) {
             setError('Please upload a valid JSON backup file.');
             return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                
                // Relaxed Validation check for legacy backups
                if (!json.transactions && !json.profile && !json.accounts) {
                     setError('Invalid backup file format. Missing core data.');
                     return;
                }
                
                setPreviewData([json]); 
                // Generate Analysis
                setBackupAnalysis({
                    company: json.companyName || json.profile?.name || 'Unknown Company',
                    date: json.generatedAt || new Date().toISOString(),
                    transactions: Array.isArray(json.transactions) ? json.transactions.length : 0,
                    products: Array.isArray(json.products) ? json.products.length : 0,
                    parties: Array.isArray(json.parties) ? json.parties.length : 0,
                    accounts: Array.isArray(json.accounts) ? json.accounts.length : 0,
                    reminders: Array.isArray(json.reminders) ? json.reminders.length : 0,
                    serviceJobs: Array.isArray(json.serviceJobs) ? json.serviceJobs.length : 0,
                    hasCashDrawer: !!json.cashDrawer,
                    version: json.appVersion || 'Legacy'
                });
            } catch (err) {
                setError('Failed to parse JSON file. It might be corrupted.');
            }
        };
        reader.readAsText(file);
        return;
    }

    // Excel Handling
    if (typeof XLSX === 'undefined') {
      setError('Excel processing library not loaded. Please check internet connection.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        setPreviewData(json);
      } catch (err) {
        setError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadSample = () => {
    if (typeof XLSX === 'undefined') {
      setError('Library not loaded.');
      return;
    }

    const data = activeTab === 'items' ? ITEM_TEMPLATE : PARTY_TEMPLATE;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, `sample_${activeTab}.xlsx`);
  };

  const handleBackup = async () => {
    try {
      const jsonString = cloudService.generateBackupData();
      
      const now = new Date();
      // Format: YYYY-MM-DD_HH-mm-ss
      const pad = (n: number) => String(n).padStart(2, '0');
      const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const fileName = `aapro_backup_${datePart}_${timePart}.json`;

      let usedPicker = false;

      // Try File System Access API to let user pick folder
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'JSON Backup File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          addToast('Backup saved successfully', 'success');
          usedPicker = true;
        } catch (err: any) {
           if (err.name === 'AbortError') return; // Cancelled
           console.warn("File picker skipped/failed, falling back to download:", err);
        }
      }
      
      if (!usedPicker) {
          // Fallback to standard download
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          addToast('Backup file downloaded', 'success');
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to generate backup', 'error');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setProcessing(true);
    
    try {
      if (activeTab === 'backup') {
          const data = previewData[0];
          const result = await db.restoreData(data);
          
          if (result.success) {
              setSuccess('Database restored successfully. Application will reload shortly...');
              setTimeout(() => window.location.reload(), 2500);
          } else {
              setError(result.message);
          }
      } else if (activeTab === 'items') {
        const newProducts: Product[] = [];
        previewData.forEach((row: any, index: number) => {
           if (!row["Item Name"]) return; // Skip invalid rows
           
           newProducts.push({
             id: Date.now().toString() + index, // Generate ID (ignored if exists in DB logic)
             name: row["Item Name"],
             category: row["Category"] || 'General',
             stock: Number(row["Opening Stock"] || row["Stock"] || row["stock"] || 0),
             purchasePrice: Number(row["Purchase Price"]) || 0,
             salePrice: Number(row["Sales Price"]) || 0,
             wholesalePrice: Number(row["Wholesale Price"]) || 0,
             unit: row["Unit"] || 'pcs'
           });
        });
        await db.bulkAddProducts(newProducts);
        setSuccess(`Successfully processed ${newProducts.length} items.`);
      } else {
        // --- Parties Import Logic ---
        const existingParties = db.getParties();
        const existingNames = new Set(existingParties.map(p => p.name.toLowerCase()));
        
        const newParties: Party[] = [];
        const newTransactions: Transaction[] = [];

        previewData.forEach((row: any, index: number) => {
           if (!row["Party Name"]) return;
           const name = row["Party Name"].trim();
           
           // Skip if party already exists
           if (existingNames.has(name.toLowerCase())) return;
           // Skip duplicates in the import file
           if (newParties.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
           
           let balance = Number(row["Opening Balance"]) || 0;
           const typeStr = (row["Receivable/Payable"] || "").toLowerCase();
           // Logic: Receivable = Positive, Payable = Negative
           if (typeStr.includes('payable')) {
             balance = -Math.abs(balance);
           } else {
             balance = Math.abs(balance);
           }

           const partyId = `${Date.now()}_${index}`; // Generate a robust ID

           // 1. Create Party with 0 balance initially
           newParties.push({
             id: partyId,
             name: name,
             phone: row["Phone Number"] || '',
             type: (row["Customer/Supplier"] || 'Customer').toLowerCase().includes('supplier') ? 'supplier' : 'customer',
             address: row["Address"],
             balance: 0 
           });

           // 2. Prepare Opening Balance Transaction
           if (balance !== 0) {
               newTransactions.push({
                   id: `OP-IMP-${partyId}`,
                   date: new Date().toISOString(),
                   type: 'BALANCE_ADJUSTMENT',
                   partyId: partyId,
                   partyName: name,
                   items: [],
                   totalAmount: balance,
                   notes: 'Opening Balance (Imported)',
                   category: 'Opening Balance',
                   paymentMode: 'Adjustment'
               });
           }
        });

        if (newParties.length > 0) {
            await db.bulkAddParties(newParties);
            // Add transactions individually to trigger correct balance updates in DB
            newTransactions.forEach(t => db.addTransaction(t));
            setSuccess(`Successfully processed ${newParties.length} new parties.`);
        } else {
            setSuccess('No new parties found to import (duplicates skipped).');
        }
      }
      
      if (activeTab !== 'backup') {
        setFile(null);
        setPreviewData([]);
      }
    } catch (err) {
      setError('Error importing data. Please check file format.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const getTitle = () => {
      if (activeTab === 'backup') return 'Restore Database';
      return activeTab === 'items' ? 'Import Items' : 'Import Parties';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">{getTitle()}</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button 
             onClick={() => switchTab('items')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'items' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}
           >
             Import Items
           </button>
           <button 
             onClick={() => switchTab('parties')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'parties' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}
           >
             Import Parties
           </button>
           <button 
             onClick={() => switchTab('backup')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'backup' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}
           >
             Restore Backup
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Left: Instructions */}
         <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit">
            <h3 className="font-bold text-lg mb-6 text-gray-800">
               {activeTab === 'backup' ? 'Restore Instructions' : `Import ${activeTab === 'items' ? 'Items' : 'Parties'} in 3 Steps`}
            </h3>

            {activeTab === 'backup' ? (
                <div className="space-y-6">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-orange-800 text-sm flex gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                            <strong>Warning:</strong> Restoring a backup will completely <u>replace</u> your current data (Items, Parties, Transactions, Service Jobs, and Cash Drawer). Ensure you have a backup of the current state if needed.
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-2">1. Locate Backup File</h4>
                        <p className="text-sm text-gray-500 mb-3">
                            Find the <code>.json</code> file you previously downloaded using the "Backup Data" button in settings.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-2">2. Review & Restore</h4>
                        <p className="text-sm text-gray-500">
                            Upload the file to see a summary of the data inside. Click "Confirm & Restore" to apply.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                <div>
                    <h4 className="font-semibold text-gray-900 mb-2">1. Download the file & Fill Data</h4>
                    <p className="text-sm text-gray-500 mb-3">
                        Download our sample excel file and enter your data according to the file format.
                    </p>
                    <button 
                        onClick={handleDownloadSample}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download Sample File
                    </button>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-900 mb-2">2. Review & Adjust Data</h4>
                    <p className="text-sm text-gray-500">
                        Review the data to be imported from the app. If there are any errors, fix it in the excel and re-upload.
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-gray-900 mb-2">3. Confirm & Import</h4>
                    <p className="text-sm text-gray-500">
                        When everything is ready to import you can start the import process.
                        <br/>
                        <span className="text-emerald-600 font-medium text-xs mt-1 block">
                            Note: Duplicate entries (by name) will be skipped to prevent errors.
                        </span>
                    </p>
                </div>
                </div>
            )}
         </div>

         {/* Right: Upload Zone */}
         <div className="space-y-4">
             {!backupAnalysis && (
                 <div 
                   className={`border-2 border-dashed rounded-xl h-80 flex flex-col items-center justify-center transition-all cursor-pointer bg-gray-50
                      ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-100'}
                      ${file ? 'bg-emerald-50 border-emerald-500' : ''}
                   `}
                   onDragEnter={handleDrag} 
                   onDragLeave={handleDrag} 
                   onDragOver={handleDrag} 
                   onDrop={handleDrop}
                   onClick={() => inputRef.current?.click()}
                 >
                    <input ref={inputRef} type="file" className="hidden" accept={activeTab === 'backup' ? ".json" : ".xlsx, .xls"} onChange={handleChange} />
                    
                    {file ? (
                       <div className="text-center p-6">
                          {activeTab === 'backup' ? (
                              <Database className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                          ) : (
                              <FileSpreadsheet className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                          )}
                          <p className="font-bold text-gray-800 text-lg mb-1">{file.name}</p>
                          <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                          {previewData.length > 0 && activeTab !== 'backup' && (
                             <div className="mt-4 inline-block bg-white px-3 py-1 rounded-full text-xs font-semibold text-emerald-700 border border-emerald-200">
                                {previewData.length} records found
                             </div>
                          )}
                          <p className="text-xs text-gray-400 mt-8">Click to replace file</p>
                       </div>
                    ) : (
                       <div className="text-center p-6">
                          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="font-bold text-gray-800 text-lg mb-2">Click to Upload or drag and drop</p>
                          <p className="text-sm text-gray-500">
                             {activeTab === 'backup' ? 'Only .json backup files are supported' : 'Only excel files (.xlsx, .xls) are supported.'}
                          </p>
                       </div>
                    )}
                 </div>
             )}

             {/* Backup Analysis Card */}
             {backupAnalysis && activeTab === 'backup' && (
                 <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in zoom-in-95">
                     <div className="bg-brand-500 p-4 text-white flex justify-between items-center">
                         <div className="font-bold flex items-center gap-2">
                             <Database className="w-5 h-5" />
                             Backup Data Verification
                         </div>
                         <button onClick={() => { setBackupAnalysis(null); setFile(null); }} className="text-white/80 hover:text-white text-xs bg-brand-600 px-2 py-1 rounded">
                             Change File
                         </button>
                     </div>
                     <div className="p-5 space-y-4">
                         <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                             <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                                 {backupAnalysis.company.substring(0,1).toUpperCase()}
                             </div>
                             <div>
                                 <h3 className="font-bold text-gray-800">{backupAnalysis.company}</h3>
                                 <p className="text-xs text-gray-500">Backup Date: {new Date(backupAnalysis.date).toLocaleString()}</p>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-3 gap-3 text-center">
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <Receipt className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                 <div className="font-bold text-gray-800">{backupAnalysis.transactions}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">Transactions</div>
                             </div>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <Package className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                 <div className="font-bold text-gray-800">{backupAnalysis.products}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">Products</div>
                             </div>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                 <div className="font-bold text-gray-800">{backupAnalysis.parties}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">Parties</div>
                             </div>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <Wrench className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                 <div className="font-bold text-gray-800">{backupAnalysis.serviceJobs}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">Service Jobs</div>
                             </div>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <Banknote className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                 <div className="font-bold text-emerald-600">{backupAnalysis.hasCashDrawer ? 'Yes' : 'No'}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">Cash Drawer</div>
                             </div>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <Bell className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                                 <div className="font-bold text-gray-800">{backupAnalysis.reminders}</div>
                                 <div className="text-[10px] text-gray-500 uppercase">Reminders</div>
                             </div>
                         </div>

                         <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs flex gap-2 items-start border border-red-100">
                             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                             <p>Confirming restore will <b>permanently overwrite</b> your existing data for "{db.getBusinessProfile().name}".</p>
                         </div>
                     </div>
                 </div>
             )}

             {/* Action Buttons / Status */}
             {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700">
                   <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <p className="text-sm">{error}</p>
                </div>
             )}

             {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 text-green-700">
                   <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <p className="text-sm">{success}</p>
                </div>
             )}

             {/* Import Button */}
             {(previewData.length > 0 || backupAnalysis) && !success && (
                <button 
                  onClick={activeTab === 'backup' ? handleImport : handleBackup}
                  disabled={processing}
                  className={`w-full py-3 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'backup' 
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                        : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/30'
                  }`}
                >
                  {processing ? 'Processing...' : (activeTab === 'backup' ? 'Confirm & Restore Everything' : 'Confirm & Import Data')}
                  {!processing && (activeTab === 'backup' ? <RefreshCcw className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
                </button>
             )}
             
             {activeTab !== 'backup' && previewData.length > 0 && !success && (
                 <button 
                    onClick={handleImport}
                    disabled={processing}
                    className="w-full py-3 text-white bg-emerald-500 rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                 >
                    {processing ? 'Processing...' : 'Start Import'}
                    {!processing && <ArrowRight className="w-5 h-5" />}
                 </button>
             )}
         </div>
      </div>
    </div>
  );
};

export default DataImport;
