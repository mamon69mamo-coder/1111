import React, { useState } from 'react';
import { StaffUser } from '../types';
import { Lock, User, KeyRound, X, ShieldAlert, Check } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: StaffUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('agent1');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Staff Portal Login</h2>
          <p className="text-xs text-slate-400 mt-1">
            কাস্টমার কেয়ার, অ্যাডমিন এবং সুপার অ্যাডমিন লগইন আইডি ও পাসওয়ার্ড প্রবেশ করান
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Login ID / Username (আইডি)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="e.g. agent1, admin1, superadmin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password (পাসওয়ার্ড)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Quick preset selector buttons */}
          <div className="pt-2">
            <span className="text-[11px] text-slate-400 block mb-2 font-medium">
              Quick Test Roles (ক্লিক করে টেস্ট করুন):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset('agent1', 'admin123')}
                className={`px-2.5 py-1.5 text-[11px] rounded-lg border text-left transition-colors ${
                  username === 'agent1'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-medium">Agent 1</div>
                <div className="text-[9px] text-slate-500">কেয়ার অফিসার</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('admin1', 'admin123')}
                className={`px-2.5 py-1.5 text-[11px] rounded-lg border text-left transition-colors ${
                  username === 'admin1'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-medium">Admin</div>
                <div className="text-[9px] text-slate-500">টিম লিডার</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('superadmin', 'admin123')}
                className={`px-2.5 py-1.5 text-[11px] rounded-lg border text-left transition-colors ${
                  username === 'superadmin'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-semibold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-medium">Super Admin</div>
                <div className="text-[9px] text-slate-500">হেডকোয়ার্টার</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <span>Verifying...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Login to Staff Console</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
