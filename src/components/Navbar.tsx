import React from 'react';
import { StaffUser } from '../types';
import { Radio, Users, PhoneCall, ShieldCheck, LogIn, LogOut, ExternalLink, Headphones } from 'lucide-react';

interface NavbarProps {
  currentTab: 'customer' | 'agent' | 'admin' | 'logs';
  onSelectTab: (tab: 'customer' | 'agent' | 'admin' | 'logs') => void;
  currentUser: StaffUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onlineCustomersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  onLogout,
  onlineCustomersCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('customer');
          }}
          className="flex items-center gap-2 text-base font-bold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <span>LiveVoice Care</span>
        </a>
        <span className="hidden sm:inline-block text-xs text-slate-500 font-normal">
          · PTT Voice & Radar
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onSelectTab('customer')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentTab === 'customer'
              ? 'text-emerald-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Customer View (কাস্টমার ভিউ)</span>
        </button>

        <button
          onClick={() => onSelectTab('agent')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentTab === 'agent'
              ? 'text-emerald-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Agent PTT Console (কাস্টমার কেয়ার)</span>
          {onlineCustomersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-mono tabular-nums">
              {onlineCustomersCount} online
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('admin')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentTab === 'admin'
              ? 'text-emerald-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Team & Admin (টিম ও অ্যাডমিন)</span>
        </button>

        <button
          onClick={() => onSelectTab('logs')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            currentTab === 'logs'
              ? 'text-emerald-400 font-semibold'
              : 'hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Call Logs (কল হিস্ট্রি)</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action / Authentication */}
      <div className="flex items-center gap-3 shrink-0">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {currentUser.role === 'superadmin' ? 'সুপার অ্যাডমিন' : currentUser.role === 'admin' ? 'টিম অ্যাডমিন' : 'কেয়ার এজেন্ট'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap font-medium"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Staff Login (কেয়ার লগইন)</span>
          </button>
        )}
      </div>
    </header>
  );
};
