
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { ShoppingBag, Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';

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
    setIsLoading(true);
    setError('');

    // Small delay to simulate security check
    setTimeout(() => {
      const success = authService.login(email, password);
      if (success) {
        onLoginSuccess();
      } else {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-500 rounded-3xl shadow-xl shadow-brand-500/20 mb-6 transform hover:rotate-12 transition-transform duration-300">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">AA Pro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Business Management & POS System</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Sign In</h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-800 dark:text-white font-medium transition-all"
                    placeholder="name@business.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                  <input 
                    type="password" 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-gray-800 dark:text-white font-medium transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Access Dashboard
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-t border-gray-100 dark:border-gray-600 text-center">
             <p className="text-xs text-gray-400 dark:text-gray-500">Authorized Personnel Only • IP: 127.0.0.1</p>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-400 dark:text-gray-600 text-xs uppercase font-bold tracking-widest">
          Powered by AA Pro Enterprise
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
