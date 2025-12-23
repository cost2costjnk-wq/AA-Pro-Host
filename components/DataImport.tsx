import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight, Database, RefreshCcw, Wrench, RotateCcw } from 'lucide-react';
import { db } from '../services/db';
import { Party, Product, Transaction } from '../types';

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
    e.target.value = '';
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setFile(file);
    setError('');
    setSuccess('');
    setPreviewData([]);
    setBackupAnalysis(null);
    
    const fileName = (file.name || '').toLowerCase();

    if (activeTab === 'backup') {
        const isJson = file.type === 'application/json' || fileName.endsWith('.json');
        if (!isJson) {
             setError('Please upload a valid JSON backup file.');
             return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setPreviewData([json]); 
                setBackupAnalysis({
                    company: json.profile?.name || 'Unknown',
                    transactions: Array.isArray(json.transactions) ? json.transactions.length : 0,
                    products: Array.isArray(json.products) ? json.products.length : 0,
                    parties: Array.isArray(json.parties) ? json.parties.length : 0,
                    serviceJobs: Array.isArray(json.serviceJobs) ? json.serviceJobs.length : 0,
                    warrantyCases: Array.isArray(json.warrantyCases) ? json.warrantyCases.length : 0,
                    date: json.timestamp || new Date().toISOString()
                });
            } catch (err) {
                setError('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        setPreviewData(XLSX.utils.sheet_to_json(sheet));
      } catch (err) {
        setError('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setProcessing(true);
    try {
      if (activeTab === 'backup') {
          const result = await db.restoreData(previewData[0]);
          if (result.success) {
              setSuccess('Restored. Reloading...');
              setTimeout(() => window.location.reload(), 2000);
          } else {
              setError(result.message);
          }
      } else if (activeTab === 'items') {
        const newProducts: Product[] = previewData.map((row, i) => ({
             id: Date.now().toString() + i, 
             name: row["Item Name"] || 'Unnamed Item',
             category: row["Category"] || 'General',
             stock: Number(row["Opening Stock"] || 0),
             purchasePrice: Number(row["Purchase Price"]) || 0,
             salePrice: Number(row["Sales Price"]) || 0,
             unit: row["Unit"] || 'pcs'
        }));
        await db.bulkAddProducts(newProducts);
        setSuccess(`Imported ${newProducts.length} items.`);
      } else {
        const newParties: Party[] = previewData.map((row, i) => ({
             id: Date.now().toString() + i,
             name: row["Party Name"] || 'Unnamed Party',
             phone: row["Phone Number"] || '',
             type: (row["Customer/Supplier"] || 'Customer').toLowerCase().includes('supplier') ? 'supplier' : 'customer',
             balance: 0 
        }));
        await db.bulkAddParties(newParties);
        setSuccess(`Imported ${newParties.length} parties.`);
      }
    } catch (err) {
      setError('Import failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Point-in-Time Restore</h2>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           <button onClick={() => switchTab('items')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'items' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}>Import Items</button>
           <button onClick={() => switchTab('parties')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'parties' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}>Import Parties</button>
           <button onClick={() => switchTab('backup')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'backup' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}>Restore DB</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-lg mb-6 text-gray-800">Backup Analysis</h3>
            {activeTab === 'backup' ? (
                <div className="space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-orange-800 text-sm">
                        <strong>Warning:</strong> Restoring a backup overwrites everything in the current workspace.
                    </div>
                    {backupAnalysis && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transactions</p>
                                <p className="text-xl font-black text-gray-800">{backupAnalysis.transactions}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Jobs</p>
                                <p className="text-xl font-black text-blue-600 flex items-center gap-1"><Wrench className="w-4 h-4" /> {backupAnalysis.serviceJobs}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Warranty Cases</p>
                                <p className="text-xl font-black text-purple-600 flex items-center gap-1"><RotateCcw className="w-4 h-4" /> {backupAnalysis.warrantyCases}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Products</p>
                                <p className="text-xl font-black text-emerald-600">{backupAnalysis.products}</p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm text-gray-500">Upload Excel template files to quickly populate your database.</p>
            )}
         </div>

         <div 
           className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-all cursor-pointer bg-gray-50
              ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'}
           `}
           onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
           onClick={() => inputRef.current?.click()}
         >
            <input ref={inputRef} type="file" className="hidden" accept={activeTab === 'backup' ? ".json" : ".xlsx, .xls"} onChange={handleChange} />
            {file ? (
               <div className="text-center p-6">
                  <Database className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-800 truncate max-w-[200px] mx-auto">{file.name}</p>
                  {backupAnalysis && (
                      <p className="text-xs text-gray-500 mt-1">
                        Workspace: <b>{backupAnalysis.company}</b>
                      </p>
                  )}
                  <button onClick={handleImport} disabled={processing} className="mt-4 px-8 py-2.5 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition-all">
                    {processing ? 'Restoring System...' : 'Confirm System Restore'}
                  </button>
               </div>
            ) : (
               <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="font-bold text-gray-800">Click to upload backup file</p>
                  <p className="text-xs text-gray-400 mt-1">JSON or Excel Format</p>
               </div>
            )}
         </div>
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</div>}
    </div>
  );
};

export default DataImport;