
import React, { useState, useRef, useEffect } from 'react';
import { generateBusinessInsight } from '../services/aiService';
import { Sparkles, Send, X, MessageSquare, Loader2, Bot, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I can analyze your business data. Ask me about stock levels, today\'s sales, or party balances.'
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const responseText = await generateBusinessInsight(userMessage.content);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);
  };

  // Quick prompt suggestions
  const suggestions = [
    "How much sales did we do today?",
    "List items with low stock",
    "Who are my top debtors?",
    "Total value of inventory?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none font-sans">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[350px] sm:w-[380px] h-[500px] flex flex-col mb-4 overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="bg-[#10b981] p-4 flex items-center justify-between text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Business Assistant</h3>
                <div className="flex items-center gap-1.5 opacity-90">
                   <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                   <p className="text-[10px] font-medium">Online</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-[#10b981] text-white'
                }`}>
                  {msg.role === 'user' ? <MessageSquare className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                
                <div className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gray-800 text-white rounded-tr-sm' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm markdown-body'
                }`}>
                   <ReactMarkdown 
                      components={{
                         ul: ({node, ...props}) => <ul className="list-disc pl-4 my-1 space-y-1" {...props} />,
                         li: ({node, ...props}) => <li className="marker:text-gray-400" {...props} />,
                         p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                         strong: ({node, ...props}) => <span className="font-bold text-[#10b981]" {...props} />
                      }}
                   >
                     {msg.content}
                   </ReactMarkdown>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0 opacity-50">
                    <Bot className="w-5 h-5" />
                 </div>
                 <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#10b981]" />
                    <span className="text-xs text-gray-400 font-medium">Analyzing data...</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length < 3 && !isLoading && (
             <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
                {suggestions.map((s, i) => (
                   <button 
                     key={i}
                     onClick={() => { setInput(s); handleSend(); }}
                     className="whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-medium hover:border-[#10b981] hover:text-[#10b981] transition-colors shadow-sm"
                   >
                      {s}
                   </button>
                ))}
             </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about inventory, sales..."
                className="flex-1 pl-4 pr-10 py-2.5 bg-gray-100 border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all placeholder-gray-400 text-gray-800"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-[#10b981] text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-[#10b981] transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 pointer-events-auto hover:scale-105 active:scale-95 ${
            isOpen ? 'bg-gray-800 rotate-90' : 'bg-[#10b981] hover:bg-emerald-600 shadow-emerald-500/40'
        }`}
      >
        {isOpen ? (
            <X className="w-6 h-6 text-white" />
        ) : (
            <>
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                </span>
            </>
        )}
        
        {/* Tooltip */}
        {!isOpen && (
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-xl translate-x-2 group-hover:translate-x-0">
             Ask AI Assistant
             <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
          </span>
        )}
      </button>

    </div>
  );
};

export default AIAssistant;
