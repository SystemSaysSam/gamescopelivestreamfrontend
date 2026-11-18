import React, { useState } from 'react';
import { Mail, Check, AlertCircle, Send } from 'lucide-react';
import { api } from '../services/api';
import { ViceButton } from './ViceButton';

export const EmailSubscription: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (!cleanName) {
      setStatus({ type: 'error', message: 'Please enter your name.' });
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);

    try {
      const res = await api.subscribeEmail(cleanName, cleanEmail, 'footer_section');
      if (res.alreadySubscribed) {
        setStatus({
          type: 'success',
          message: 'You are already registered for future GameScope premiere updates!'
        });
      } else {
        setStatus({
          type: 'success',
          message: 'Subscription confirmed! You will receive future premiere alerts and community updates.'
        });
        setName('');
        setEmail('');
      }
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || 'Subscription failed. Please check your network connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0b0e17] border border-white/10 shadow-xl relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00f0ff]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Header & Description */}
          <div className="max-w-xl space-y-1">
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-[#00f0ff] uppercase tracking-wider">
              <Mail className="w-4 h-4 text-[#00f0ff]" />
              <span>GAMESCOPE COMMUNITY DISPATCH</span>
            </div>
            <h3 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight uppercase leading-tight">
              STAY CONNECTED FOR FUTURE PREMIERES & COVERAGE
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Get notified of upcoming launch livestreams, post-show breakdowns, and gaming community updates. No spam. Unsubscribe anytime.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full lg:max-w-lg space-y-2">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full sm:w-1/3 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] placeholder-slate-500 transition-all"
              />

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@gamescope.live"
                className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] placeholder-slate-500 transition-all"
              />

              <ViceButton
                variant="cyan"
                size="sm"
                type="submit"
                disabled={loading}
                icon={loading ? undefined : <Send className="w-3.5 h-3.5 ml-0.5" />}
                className="w-full sm:w-auto !py-2.5 !px-5 !text-xs font-mono font-bold tracking-wider shrink-0"
              >
                {loading ? 'JOINING...' : 'SUBSCRIBE'}
              </ViceButton>
            </div>

            {/* Feedback message */}
            {status && (
              <div className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-mono animate-in fade-in duration-200 ${
                status.type === 'success' 
                  ? 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {status.type === 'success' ? (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            )}
          </form>

        </div>

      </div>
    </section>
  );
};
