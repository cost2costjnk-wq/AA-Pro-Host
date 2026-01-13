import React from 'react';
import { 
  Keyboard, 
  MousePointer2, 
  Save, 
  X, 
  LayoutDashboard, 
  ShoppingCart, 
  Tag, 
  History, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Receipt,
  Search,
  FileText
} from 'lucide-react';

const ShortcutGuide: React.FC = () => {
  const shortcutGroups = [
    {
      title: "Global Navigation",
      icon: <LayoutDashboard className="w-5 h-5 text-brand-500" />,
      items: [
        { key: "Alt + D", desc: "Open Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { key: "Alt + L", desc: "View Party Statement", icon: <FileText className="w-4 h-4" /> },
        { key: "Alt + A", desc: "View Receivable Aging", icon: <Search className="w-4 h-4" /> },
      ]
    },
    {
      title: "Transaction Entry",
      icon: <Tag className="w-5 h-5 text-blue-500" />,
      items: [
        { key: "Alt + S", desc: "New Sales Invoice", icon: <Tag className="w-4 h-4" /> },
        { key: "Alt + P", desc: "New Purchase Bill", icon: <ShoppingCart className="w-4 h-4" /> },
        { key: "Alt + I", desc: "Record Payment In", icon: <ArrowDownCircle className="w-4 h-4" /> },
        { key: "Alt + O", desc: "Record Payment Out", icon: <ArrowUpCircle className="w-4 h-4" /> },
        { key: "Alt + E", desc: "Record New Expense", icon: <Receipt className="w-4 h-4" /> },
      ]
    },
    {
      title: "Form Controls",
      icon: <MousePointer2 className="w-5 h-5 text-orange-500" />,
      items: [
        { key: "Ctrl + S", desc: "Save Active Form", icon: <Save className="w-4 h-4" /> },
        { key: "Escape", desc: "Close Modal / Cancel", icon: <X className="w-4 h-4" /> },
        { key: "Enter", desc: "Move focus to next field", icon: <Keyboard className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
          <Keyboard className="w-8 h-8 text-brand-500" />
          Keyboard Shortcuts
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Boost your productivity with these enterprise-grade hotkeys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shortcutGroups.map((group, gIdx) => (
          <div key={gIdx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                {group.icon}
              </div>
              <h3 className="font-black text-gray-800 dark:text-white uppercase tracking-tight text-sm">{group.title}</h3>
            </div>

            <div className="space-y-4">
              {group.items.map((item, iIdx) => (
                <div key={iIdx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400 group-hover:text-brand-500 transition-colors">
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{item.desc}</span>
                  </div>
                  <kbd className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-[10px] font-black font-mono text-gray-700 dark:text-gray-300 shadow-[0_2px_0_rgba(0,0,0,0.1)]">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-3xl flex items-center gap-4">
        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-brand-600 shadow-sm shrink-0">
          <Save className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-brand-900 dark:text-brand-400">Pro Tip: Quick Save</h4>
          <p className="text-sm text-brand-700 dark:text-brand-300 opacity-80">You can use <kbd className="font-mono font-bold">Ctrl + S</kbd> inside any Sales, Purchase, or Expense form to save instantly without moving your mouse.</p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutGuide;