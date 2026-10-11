import React, { useEffect, useRef, useState } from 'react';
import { CustomerLocation } from '../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MapPin,
  Radio,
  ShieldCheck,
  Cpu,
  Wifi,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Send,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { MapView } from './MapView';

interface CustomerViewProps {
  customerId: string;
  ip: string;
  mac: string;
  location: CustomerLocation;
  isMicActive: boolean;
  onToggleMic: () => void;
  incomingAudioPlaying: boolean;
  activeAnnouncementAgent: string | null;
  onSendMessage: (text: string) => void;
  chatMessages: Array<{ sender: string; text: string; isAgent: boolean; timestamp: number }>;
  onRequestGpsRefresh: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  customerId,
  ip,
  mac,
  location,
  isMicActive,
  onToggleMic,
  incomingAudioPlaying,
  activeAnnouncementAgent,
  onSendMessage,
  chatMessages,
  onRequestGpsRefresh,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0.3);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animate audio waveform canvas when mic is live
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isMicActive) {
        step += 0.08;
        const width = canvas.width;
        const height = canvas.height;
        const bars = 18;
        const barWidth = 4;
        const gap = (width - bars * barWidth) / (bars - 1);

        for (let i = 0; i < bars; i++) {
          const x = i * (barWidth + gap);
          // Simulated pleasant voice wave height
          const wave = Math.sin(step + i * 0.4) * 0.5 + 0.5;
          const barHeight = Math.max(4, wave * (height - 8));
          const y = (height - barHeight) / 2;

          ctx.fillStyle = incomingAudioPlaying ? '#38bdf8' : '#10b981';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // Flat line when mic off
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMicActive, incomingAudioPlaying]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Floating Walkie-Talkie Announcement Overlay (when Agent presses PTT) */}
      {incomingAudioPlaying && (
        <div className="sticky top-[57px] z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-6 py-3 shadow-xl animate-pulse flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
                Live Announcement (সরাসরি ভয়েস অ্যানাউন্সমেন্ট)
              </div>
              <div className="text-sm font-bold text-white">
                {activeAnnouncementAgent || 'Customer Care Agent'} কথা বলছেন... শুনুন!
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-black/30 px-3 py-1 rounded-full font-mono">
              PTT BROADCAST ACTIVE
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Customer Identity & Live Voice Status Strip */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold tracking-wide uppercase">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Real-Time Support Channel Connected (কাস্টমার সংযোগ সক্রিয়)</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome! কাস্টমার কেয়ার আপনার সঙ্গে যুক্ত আছেন
              </h1>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                আপনার কোনো কিছু জিজ্ঞাসা থাকলে সরাসরি মাইকে কথা বলুন। কাস্টমার কেয়ার অফিসার আপনার কথা সরাসরি শুনতে পাচ্ছেন এবং পিটিটি (PTT) অ্যানাউন্সমেন্টে উত্তর দিচ্ছেন।
              </p>
            </div>

            {/* Quick Action Microphone Control */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onToggleMic}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium text-xs transition-all shadow-md ${
                  isMicActive
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                }`}
              >
                {isMicActive ? (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span className="font-semibold">মাইক চালু আছে (Mic Live)</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>মাইক অন করুন (Enable Mic)</span>
                  </>
                )}
              </button>

              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-3">
                <canvas ref={canvasRef} width={90} height={26} className="rounded" />
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  {isMicActive ? 'STREAMING' : 'MUTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Identification Badges (IP, MAC, GPS) */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Wifi className="w-3.5 h-3.5 text-sky-400" />
                <span>Your IP Address (আইপি)</span>
              </div>
              <div className="text-sm font-mono font-semibold text-slate-200 tabular-nums truncate">
                {ip}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Device MAC / HW ID</span>
              </div>
              <div className="text-sm font-mono font-semibold text-purple-300 tabular-nums truncate">
                {mac}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>GPS Location (লোকেশন)</span>
              </div>
              <div className="text-sm font-medium text-emerald-300 truncate">
                {location.city || 'Dhaka'}, {location.country || 'Bangladesh'}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Session Security</span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  ID: #{customerId.slice(-6)}
                </div>
              </div>
              <button
                onClick={onRequestGpsRefresh}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                Update GPS
              </button>
            </div>
          </div>
        </section>

        {/* Hero & Interactive Portal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Commercial Website Content & Voice Explainer */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-[16/9] max-h-80 shadow-lg">
              <img
                src="/src/assets/images/live_support_hero_1791711338042.jpg"
                alt="Live Customer Support Operations"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-6">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                  Nexus Global Care 24/7
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white max-w-xl">
                  তাত্ক্ষণিক ভয়েস সাপোর্ট ও সেবা কেন্দ্র
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">
                  আমাদের অফিসাররা সর্বদা আপনার সহায়তায় প্রস্তুত। আপনি স্বাভাবিকভাবে কথা বললেই আমাদের অফিসার শুনতে পাচ্ছেন।
                </p>
              </div>
            </div>

            {/* How it works for customers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Mic className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">১. কোনো বাটন চাপতে হবে না</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  আপনার মাইক সরাসরি খোলা রয়েছে। স্বাভাবিকভাবে কথা বললেই অফিসার শুনতে পাবেন।
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">২. পিটিটি অ্যানাউন্সমেন্ট</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  অফিসার মাইক অন করে কথা বললে আপনার ডিভাইসের স্পিকারে সরাসরি মাইকের মতো শুনতে পাবেন।
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">৩. সঠিক জিপিএস লোকেশন</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  আপনার সঠিক এলাকা ও আইপি অনুসারে নিকটস্থ কেয়ার টিম আপনাকে সহায়তা করছে।
                </p>
              </div>
            </div>

            {/* Interactive GPS Map Preview */}
            <MapView
              location={location}
              ip={ip}
              mac={mac}
              title="আপনার জিপিএস অবস্থান (Your GPS Radar View)"
              height="h-56"
            />
          </div>

          {/* Right Column: Chat Backup & Voice Assistant Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[580px] shadow-lg overflow-hidden">
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Live Support Chat</h3>
                  <p className="text-[10px] text-slate-400">কথা বলার পাশাপাশি টেক্সট মেসেজ পাঠান</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-mono">
                ONLINE
              </span>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <PhoneCall className="w-8 h-8 mb-2 opacity-50 text-emerald-400" />
                  <p className="text-xs text-slate-300 font-medium">কোনো মেসেজ নেই</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    আপনি মুখে কথা বলতে পারেন অথবা নিচে লিখে পাঠাতে পারেন।
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.isAgent ? 'items-start' : 'items-end'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 mb-0.5 px-1">
                      {msg.sender} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.isAgent
                          ? 'bg-slate-800 text-slate-100 border border-slate-700/60'
                          : 'bg-emerald-500 text-slate-950 font-medium'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="মেসেজ লিখুন..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
