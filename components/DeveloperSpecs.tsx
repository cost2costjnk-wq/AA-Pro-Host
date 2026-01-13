
import React from 'react';
import { 
  FileCode, Database, Zap, Layout, 
  Terminal, Shield, Server, Box, 
  Download, Printer, Keyboard, 
  ShieldCheck, ArrowRightCircle
} from 'lucide-react';

const DeveloperSpecs: React.FC = () => {
  const sections = [
    {
      title: "Production tech stack (High Volume)",
      icon: <Terminal className="w-6 h-6 text-brand-500" />,
      content: [
        "Language: PHP 8.2 (Strictly using PSR-12 standards)",
        "Database: SQLite 3 for local nodes (Multi-file partitioning for 100GB+ datasets)",
        "Optimization: Use WAL (Write-Ahead Logging) mode in SQLite for concurrent access",
        "Backup Strategy: GZIP compression implemented in PHP to handle 10GB partitions",
        "Frontend Integration: React 18 with TanStack Query for high-speed data fetching"
      ]
    },
    {
      title: "SQLite Schema Architecture",
      icon: <Database className="w-6 h-6 text-blue-500" />,
      content: [
        "Tables: Use Indexed columns on 'party_id', 'date', and 'transaction_type' for sub-second report generation.",
        "Transactions: Implement transactional integrity (COMMIT/ROLLBACK) to prevent Stock vs Ledger mismatches.",
        "Partitioning: Create separate SQLite files per Financial Year to keep individual DB size under 10GB for fast backups.",
        "Compression: All JSON payloads stored in DB should be compressed using PHP's gzcompress() before persistence."
      ]
    },
    {
      title: "Fixed Business Logic Specs",
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      content: [
        "Opening Balance: Must iterate all historical records prior to requested start_date to calculate exact Dr/Cr carry-forward.",
        "Quotations: Strictly isolated from sales logic. Quotations must NOT impact stock or account balances.",
        "Warranty Tracking: Implement a dedicated Ledger table to track hardware transitions (Customer -> Shop -> Vendor -> Customer).",
        "Staff Access: Module-level permissions strictly enforced at the API layer (Middleware)."
      ]
    }
  ];

  return (
    <div className="p-4 lg:p-12 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6">
            <FileCode className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Production Blueprint</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Standardized Tech Specs for 100GB+ Data Deployments</p>
        </div>
        <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest no-print">Print Specs</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((sec, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 rounded-[2.5rem] shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">{sec.icon}</div>
              <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">{sec.title}</h3>
            </div>
            <ul className="space-y-4">
              {sec.content.map((item, j) => (
                <li key={j} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-brand-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-brand-400" /> Compliance Note</h3>
          <p className="text-brand-100 font-medium leading-relaxed max-w-2xl">
            For production scaling to 100GB, the PHP backend must serve data in paginated chunks (max 50 per request). Backups should be performed using the SQLite `.backup` command to a separate file, which is then GZIP'd before being moved to long-term storage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperSpecs;
