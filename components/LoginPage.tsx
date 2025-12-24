
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { ShoppingBag, Mail, Lock, LogIn, Loader2, AlertCircle, HelpCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');

    try {
      const success = await authService.login(email, password);
      if (success) {
        // Using window.location.reload() to ensure clean state initialization
        // This is safer than just updating a React state variable in complex apps
        window.location.reload();
      } else {
        setError('Invalid email or password. Please check your credentials.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login component error:", err);
      setError('Connection or system error. Please refresh and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans transition-colors duration-200">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-500 rounded-3xl shadow-xl shadow-brand-500/20 mb-6 transform hover:rotate-6 transition-transform duration-300">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">AA Pro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Business Intelligence & POS</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-10">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Security Sign In</h2>
                <div className="p-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl">
                    <Lock className="w-5 h-5" />
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Operator Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder-gray-300 dark:placeholder-gray-600"
                    placeholder="name@business.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Security Key</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-brand-500 transition-colors" />
                  <input 
                    type="password" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder-gray-300 dark:placeholder-gray-600"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 p-4 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold animate-in slide-in-from-bottom-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-5 bg-brand-500 hover:bg-brand-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Enter Dashboard
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 p-6 border-t border-gray-100 dark:border-gray-600 flex justify-between items-center px-10">
             <div className="flex items-center gap-2 text-gray-400 group cursor-help">
                <HelpCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Authorized Access</span>
             </div>
             <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">NODE_SIG: {localStorage.getItem('aapro_device_sig')?.slice(-8)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
