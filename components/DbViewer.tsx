
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Database, Search, RefreshCw, X, ChevronDown, ChevronRight, Braces } from 'lucide-react';

const DbViewer: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (activeTable) {
      loadData(activeTable);
    }
  }, [activeTable]);

  const loadTables = async () => {
    const list = await db.listTables();
    setTables(list);
    if (list.length > 0 && !activeTable) {
      setActiveTable(list[0]);
    }
  };

  const loadData = async (tableName: string) => {
    setLoading(true);
    try {
      const records = await db.getTableData(tableName);
      setData(records);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extract keys for table header from first item or all items (union)
  const getColumns = () => {
    if (data.length === 0) return [];
    // Collect all unique keys from first 10 items to guess schema
    const keys = new Set<string>();
    data.slice(0, 10).forEach(item => {
        if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(k => keys.add(k));
        }
    });
    return Array.from(keys);
  };

  const columns = getColumns();

  return (
    <div className="flex flex-col h-[600px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
           <Database className="w-5 h-5 text-gray-500" />
           <h2 className="font-bold text-gray-700">DB Browser</h2>
           <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">IndexedDB</span>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Table Selector */}
           <div className="relative">
              <select 
                value={activeTable}
                onChange={(e) => setActiveTable(e.target.value)}
                className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm font-medium"
              >
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
           </div>

           <button 
             onClick={() => loadData(activeTable)}
             className="p-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
             title="Refresh Data"
           >
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-gray-200 flex gap-2">
         <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 w-full max-w-md">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Filter data..." 
              className="bg-transparent border-none outline-none text-sm w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="ml-auto text-xs text-gray-500 flex items-center px-2">
            {filteredData.length} Records
         </div>
      </div>

      {/* Main Content Area: Split View if record selected */}
      <div className="flex-1 flex overflow-hidden">
         {/* Table View */}
         <div className={`flex-1 overflow-auto ${selectedRecord ? 'w-2/3 border-r border-gray-200' : 'w-full'}`}>
            <table className="w-full text-xs text-left border-collapse">
               <thead className="bg-gray-100 text-gray-600 font-semibold sticky top-0 z-10 shadow-sm">
                  <tr>
                     <th className="p-2 border-b border-r border-gray-200 w-10 text-center">#</th>
                     {columns.map(col => (
                        <th key={col} className="p-2 border-b border-r border-gray-200 min-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis">
                           {col}
                        </th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {filteredData.map((row, idx) => (
                     <tr 
                       key={idx} 
                       onClick={() => setSelectedRecord(row)}
                       className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedRecord === row ? 'bg-blue-100' : 'even:bg-gray-50'}`}
                     >
                        <td className="p-2 border-b border-r border-gray-200 text-center text-gray-400">{idx + 1}</td>
                        {columns.map(col => {
                           const val = row[col];
                           let displayVal = val;
                           if (typeof val === 'object' && val !== null) {
                              displayVal = Array.isArray(val) ? `[Array(${val.length})]` : '{Object}';
                           } else if (typeof val === 'boolean') {
                              displayVal = val ? 'true' : 'false';
                           }
                           return (
                              <td key={col} className="p-2 border-b border-r border-gray-200 max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis font-mono text-gray-700">
                                 {String(displayVal)}
                              </td>
                           );
                        })}
                     </tr>
                  ))}
                  {filteredData.length === 0 && (
                     <tr>
                        <td colSpan={columns.length + 1} className="p-8 text-center text-gray-400">
                           {loading ? 'Loading...' : 'No records found'}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Record Inspector Panel */}
         {selectedRecord && (
            <div className="w-1/3 flex flex-col bg-gray-50 overflow-hidden shadow-xl z-20">
               <div className="p-3 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-sm text-gray-700">
                     <Braces className="w-4 h-4 text-brand-500" />
                     JSON Viewer
                  </div>
                  <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-red-500">
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-800 bg-gray-50">
                  <pre className="whitespace-pre-wrap break-all">
                     {JSON.stringify(selectedRecord, null, 2)}
                  </pre>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default DbViewer;
