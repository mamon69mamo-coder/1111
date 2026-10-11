import React, { useState, useEffect, useRef } from 'react';
import { CustomerSession, StaffUser } from '../types';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  MapPin,
  Cpu,
  Wifi,
  PhoneCall,
  PhoneOff,
  Send,
  Bell,
  Search,
  Users,
  ShieldCheck,
  Headphones,
  Activity,
  Play,
  Square,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { MapView } from './MapView';

interface AgentConsoleProps {
  currentUser: StaffUser;
  customers: CustomerSession[];
  selectedCustomer: CustomerSession | null;
  onSelectCustomer: (customer: CustomerSession) => void;
  isPttActive: boolean;
  onPttStart: (targetCustomerId?: string, isBroadcast?: boolean) => void;
  onPttEnd: (targetCustomerId?: string, isBroadcast?: boolean) => void;
  isCustomerAudioIncoming: boolean;
  incomingCustomerVolume: number;
  onSendChatMessage: (recipientId: string, text: string) => void;
  chatMessages: Array<{ sender: string; text: string; isAgent: boolean; timestamp: number; customerId?: string }>;
  notificationAlert: string | null;
  onDismissAlert: () => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  currentUser,
  customers,
  selectedCustomer,
  onSelectCustomer,
  isPttActive,
  onPttStart,
  onPttEnd,
  isCustomerAudioIncoming,
  incomingCustomerVolume,
  onSendChatMessage,
  chatMessages,
  notificationAlert,
  onDismissAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isPttLocked, setIsPttLocked] = useState(false);

  const pttCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customerWaveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard shortcut for PTT: Press Space to talk, release Space to stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!isPttActive) {
          onPttStart(selectedCustomer?.id, broadcastMode);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (isPttActive && !isPttLocked) {
          onPttEnd(selectedCustomer?.id, broadcastMode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPttActive, isPttLocked, selectedCustomer, broadcastMode, onPttStart, onPttEnd]);

  // Render PTT voice animation
  useEffect(() => {
    let animId: number;
    const canvas = pttCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      if (isPttActive) {
        t += 0.1;
        const bars = 24;
        const bw = 3;
        const gap = (w - bars * bw) / (bars - 1);

        for (let i = 0; i < bars; i++) {
          const x = i * (bw + gap);
          const val = Math.sin(t + i * 0.4) * 0.5 + 0.5;
          const bh = Math.max(3, val * (h - 6));
          const y = (h - bh) / 2;

          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(x, y, bw, bh, 1.5);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, h / 2 - 1, w, 2);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPttActive]);

  // Render Customer Audio Stream animation
  useEffect(() => {
    let animId: number;
    const canvas = customerWaveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      if (isCustomerAudioIncoming || selectedCustomer?.isMicActive) {
        t += 0.08;
        const bars = 24;
        const bw = 3;
        const gap = (w - bars * bw) / (bars - 1);

        for (let i = 0; i < bars; i++) {
          const x = i * (bw + gap);
          const val = Math.sin(t + i * 0.5) * 0.5 + 0.5;
          const bh = Math.max(3, val * (h - 6));
          const y = (h - bh) / 2;

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.roundRect(x, y, bw, bh, 1.5);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, h / 2 - 1, w, 2);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isCustomerAudioIncoming, selectedCustomer]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location.city && c.location.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedCustomer) return;
    onSendChatMessage(selectedCustomer.id, chatInput.trim());
    setChatInput('');
  };

  const handlePttMouseDown = () => {
    if (!isPttLocked) {
      onPttStart(selectedCustomer?.id, broadcastMode);
    }
  };

  const handlePttMouseUp = () => {
    if (!isPttLocked) {
      onPttEnd(selectedCustomer?.id, broadcastMode);
    }
  };

  const toggleLockPtt = () => {
    if (isPttLocked) {
      setIsPttLocked(false);
      onPttEnd(selectedCustomer?.id, broadcastMode);
    } else {
      setIsPttLocked(true);
      onPttStart(selectedCustomer?.id, broadcastMode);
    }
  };

  // Quick Canned Audio Announcements
  const sendQuickGreeting = (text: string) => {
    if (!selectedCustomer && !broadcastMode) return;
    // Send both as text and simulate PTT chime
    onSendChatMessage(selectedCustomer?.id || 'all', `[ভয়েস অ্যানাউন্সমেন্ট]: ${text}`);
    // Start temporary 3-second PTT burst
    onPttStart(selectedCustomer?.id, broadcastMode);
    setTimeout(() => {
      onPttEnd(selectedCustomer?.id, broadcastMode);
    }, 2500);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Real-time Notification Banner for New Customers */}
      {notificationAlert && (
        <div className="bg-emerald-500 text-slate-950 px-6 py-2.5 flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 font-bold" />
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              {notificationAlert}
            </span>
          </div>
          <button
            onClick={onDismissAlert}
            className="text-xs font-semibold px-2 py-1 bg-slate-950/20 hover:bg-slate-950/30 rounded transition-colors"
          >
            বুঝেছি (Dismiss)
          </button>
        </div>
      )}

      {/* Main Multi-Column Cockpit */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Live Visitor Radar (Customer List) */}
        <aside className="lg:col-span-3 border-r border-slate-800 bg-slate-900/60 flex flex-col h-full overflow-hidden">
          {/* Header & Search */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Visitors ({customers.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">
                LIVE RADAR
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP, MAC, Location..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Visitor List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <Activity className="w-6 h-6 mx-auto opacity-40 text-emerald-400" />
                <p className="text-xs">কোনো কাস্টমার অনলাইনে নেই</p>
                <p className="text-[11px] text-slate-600">
                  নতুন কেউ ওয়েবসাইটে ঢুকলে তাৎক্ষণিক অ্যালার্ট আসবে
                </p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    onClick={() => onSelectCustomer(cust)}
                    className={`w-full p-3.5 text-left transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-mono font-bold text-slate-200 tabular-nums">
                          IP: {cust.ip}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                        #{cust.id.slice(-4)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-purple-300 font-mono">
                      <Cpu className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">MAC: {cust.mac}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {cust.location.city || 'Dhaka'}, {cust.location.country || 'BD'}
                        </span>
                      </div>

                      {cust.isMicActive && (
                        <span className="flex items-center gap-1 text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                          <Mic className="w-2.5 h-2.5" />
                          <span>Mic On</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Console: Selected Customer Cockpit & PTT Station */}
        <section className="lg:col-span-6 flex flex-col h-full border-r border-slate-800 overflow-y-auto p-4 sm:p-6 space-y-6">
          {selectedCustomer ? (
            <>
              {/* Selected Customer Header Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Connected Customer Session
                    </span>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Customer #{selectedCustomer.id.slice(-6)}</span>
                      <span className="text-xs font-normal text-slate-400">
                        ({selectedCustomer.deviceType})
                      </span>
                    </h2>
                  </div>

                  {/* Mode switch: Solo Customer vs Broadcast to All */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBroadcastMode(!broadcastMode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        broadcastMode
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {broadcastMode ? '📢 Broadcast All' : '🎯 Single Customer'}
                    </button>
                  </div>
                </div>

                {/* Identification Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">
                      Client IP Address
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-200 tabular-nums">
                      {selectedCustomer.ip}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">
                      Hardware MAC Fingerprint
                    </span>
                    <span className="text-sm font-mono font-bold text-purple-300 tabular-nums">
                      {selectedCustomer.mac}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">
                      GPS Location
                    </span>
                    <span className="text-sm font-medium text-emerald-300 truncate block">
                      {selectedCustomer.location.city || 'Detected'}, {selectedCustomer.location.country || ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* TWO-WAY VOICE COMMUNICATIONS UNIT */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      Two-Way Voice Station (দ্বি-মুখী ভয়েস কন্ট্রোল)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Agent: {currentUser.name}
                  </span>
                </div>

                {/* Part 1: Incoming Customer Audio Monitor (Customer speaks -> Agent hears) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
                        Incoming Customer Voice (কাস্টমারের মাইকের আওয়াজ)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                        className="text-xs text-slate-400 hover:text-slate-200 p-1"
                        title={isSpeakerMuted ? 'Unmute' : 'Mute'}
                      >
                        {isSpeakerMuted ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    কাস্টমারের মাইক অন রয়েছে। কাস্টমার কথা বললে স্বয়ংক্রিয়ভাবে নিচে তরঙ্গ দেখা যাবে এবং স্পিকারে শোনা যাবে।
                  </p>

                  <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <canvas ref={customerWaveCanvasRef} width={260} height={36} className="w-full h-9 rounded" />
                    <span className="text-xs font-mono text-slate-400 shrink-0">
                      {selectedCustomer.isMicActive ? 'MIC ACTIVE' : 'LISTENING'}
                    </span>
                  </div>
                </div>

                {/* Part 2: Agent PTT Push-To-Talk Button (Agent speaks -> Customer hears) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Agent PTT Announcement Microphone
                    </span>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1">
                      বাটন চেপে ধরে কাস্টমারের মাইকে কথা বলুন
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      (অথবা কিবোর্ডের Space bar চেপে ধরে কথা বলতে পারেন)
                    </p>
                  </div>

                  {/* Big Circular PTT Master Button */}
                  <div className="relative group my-2">
                    <button
                      onMouseDown={handlePttMouseDown}
                      onMouseUp={handlePttMouseUp}
                      onTouchStart={handlePttMouseDown}
                      onTouchEnd={handlePttMouseUp}
                      className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all select-none shadow-2xl relative ${
                        isPttActive
                          ? 'bg-rose-600 scale-95 shadow-rose-600/50 ring-4 ring-rose-400 ring-offset-4 ring-offset-slate-950 animate-pulse'
                          : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 shadow-emerald-500/30'
                      }`}
                    >
                      <Mic className={`w-10 h-10 ${isPttActive ? 'text-white' : 'text-slate-950'}`} />
                      <span
                        className={`text-xs font-bold uppercase mt-1 tracking-wider ${
                          isPttActive ? 'text-white' : 'text-slate-950'
                        }`}
                      >
                        {isPttActive ? 'TRANSMITTING' : 'PUSH TO TALK'}
                      </span>
                    </button>
                  </div>

                  {/* PTT Wave Spectrum */}
                  <div className="w-full max-w-sm">
                    <canvas ref={pttCanvasRef} width={280} height={30} className="w-full h-8 rounded bg-slate-900 border border-slate-800" />
                  </div>

                  {/* Lock PTT Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleLockPtt}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        isPttLocked
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isPttLocked ? (
                        <>
                          <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                          <span>Release PTT Lock</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Lock PTT (হাতে না ধরে কথা বলুন)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Canned Quick Voice Greetings */}
                  <div className="w-full pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 font-medium block mb-2 text-left">
                      Quick Voice Greetings (এক ক্লিকে ঘোষণা):
                    </span>
                    <div className="flex flex-wrap gap-2 text-left">
                      <button
                        onClick={() => sendQuickGreeting('হ্যালো! কাস্টমার কেয়ার থেকে বলছি, কীভাবে সাহায্য করতে পারি?')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300 transition-colors"
                      >
                        👋 স্বাগতম শুভেচ্ছা
                      </button>
                      <button
                        onClick={() => sendQuickGreeting('দয়া করে একটু লাইনে থাকুন, আমি আপনার তথ্য চেক করছি।')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300 transition-colors"
                      >
                        ⏳ অনুগ্রহ করে অপেক্ষা করুন
                      </button>
                      <button
                        onClick={() => sendQuickGreeting('আপনার মাইক ক্লিয়ার শুনতে পাচ্ছি, বিস্তারিত বলুন।')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] text-slate-300 transition-colors"
                      >
                        ✅ মাইক ক্লিয়ার আছে
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS Location Tracker Map */}
              <MapView
                location={selectedCustomer.location}
                ip={selectedCustomer.ip}
                mac={selectedCustomer.mac}
                title={`কাস্টমার জিপিএস মানচিত্র: ${selectedCustomer.location.city || 'Dhaka'}, ${selectedCustomer.location.country || 'Bangladesh'}`}
                height="h-56"
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <Headphones className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">
                বাম পাশের তালিকা থেকে যেকোনো কাস্টমার সিলেক্ট করুন
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                কাস্টমার সিলেক্ট করলে তার আইপি, ম্যাক অ্যাড্রেস, জিপিএস লোকেশন ও পিটিটি মাইক সক্রিয় হবে।
              </p>
            </div>
          )}
        </section>

        {/* Right Column: Live Chat & Call Log Notes */}
        <aside className="lg:col-span-3 bg-slate-900/60 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Live Text Channel
            </h3>
            {selectedCustomer && (
              <span className="text-[10px] font-mono text-emerald-400">
                #{selectedCustomer.id.slice(-6)}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
                <p className="text-xs">কোনো বার্তা নেই</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.isAgent ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-slate-500 mb-0.5">
                    {msg.sender} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-1.5 text-xs ${
                      msg.isAgent
                        ? 'bg-emerald-500 text-slate-950 font-medium'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
            <input
              type="text"
              disabled={!selectedCustomer}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={selectedCustomer ? 'মেসেজ পাঠান...' : 'আগে কাস্টমার সিলেক্ট করুন'}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!selectedCustomer || !chatInput.trim()}
              className="px-3 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-semibold flex items-center transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
};
