
import React, { useState } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { Key, ShieldCheck, HelpCircle, ArrowRight, Loader2, AlertCircle, ShoppingBag, Globe, Phone, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

interface ActivationPageProps {
  onActivated: () => void;
}

const ActivationPage: React.FC<ActivationPageProps> = ({ onActivated }) => {
  const [key, setKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const deviceId = subscriptionService.getDeviceId();

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    // Verifying using the checksum logic
    setTimeout(() => {
      const success = subscriptionService.activateLicense(key.toUpperCase().trim());
      if (success) {
        addToast('Workspace activated! Subscription valid for 365 days.', 'success');
        onActivated();
      } else {
        addToast('Invalid License Key. Keys are bound to specific Device IDs.', 'error');
        setIsVerifying(false);
      }
    }, 1200);
  };

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Device ID copied to clipboard', 'info');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans text-white">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
        
        {/* Left Side: Brand & Marketing */}
        <div className="p-10 lg:p-16 bg-gradient-to-br from-brand-600 to-brand-900 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <ShoppingBag className="w-48 h-48 rotate-12" />
          </div>
          
          <div className="relative z-10">
             <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                <ShoppingBag className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">AA PRO <br/>ENTERPRISE</h1>
             <p className="text-brand-100/80 font-medium leading-relaxed max-w-xs">
                Professional Business Management & Intelligence Suite. Yearly subscription powered by AA Pro Solutions.
             </p>
          </div>

          <div className="relative z-10 space-y-6">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
                <div>
                   <p className="text-xs font-black uppercase tracking-widest opacity-60">Verified Security</p>
                   <p className="text-sm font-bold">Hardware-Bound Licensing</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Globe className="w-5 h-5" /></div>
                <div>
                   <p className="text-xs font-black uppercase tracking-widest opacity-60">Status Check</p>
                   <p className="text-sm font-bold">Node Identity Verified</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Activation Form */}
        <div className="p-10 lg:p-16 bg-white text-slate-900">
           <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight uppercase mb-2">Activation Required</h2>
              <p className="text-slate-500 text-sm font-medium">Please enter your yearly subscription key. Each key is unique to your current machine.</p>
           </div>

           {/* Device ID Card */}
           <div className="mb-10 p-5 bg-slate-50 border border-slate-200 rounded-3xl relative">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Your Device ID (Node Signature)</span>
              <div className="flex items-center justify-between gap-4">
                <code className="text-sm font-black text-brand-700 font-mono tracking-tighter break-all">{deviceId}</code>
                <button 
                    onClick={copyDeviceId}
                    className={`shrink-0 p-2.5 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:text-brand-600 shadow-sm'}`}
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
           </div>

           <form onSubmit={handleActivate} className="space-y-6">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">License Key</label>
                 <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-mono font-bold tracking-widest uppercase transition-all placeholder:text-slate-300"
                      placeholder="AA-XXXX-XXXX-XXXX"
                      value={key}
                      onChange={e => setKey(e.target.value)}
                    />
                 </div>
                 <p className="text-[10px] text-slate-400 mt-3 font-bold flex items-center gap-1.5 uppercase">
                    <AlertCircle className="w-3 h-3" /> One key per device only
                 </p>
              </div>

              <button 
                type="submit" 
                disabled={isVerifying || key.length < 12}
                className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isVerifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Activate Workspace <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
           </form>

           <div className="mt-12 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><HelpCircle className="w-5 h-5" /></div>
                 <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Need a bound license?</p>
              </div>
              <div className="space-y-3">
                 <div className="text-xs text-slate-500 leading-relaxed font-medium mb-2">Send your <b>Device ID</b> shown above to the official provider to receive a valid key for this machine.</div>
                 <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <Phone className="w-4 h-4 text-brand-600" /> +977-9803072430
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ActivationPage;
