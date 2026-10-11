import React, { useState, useEffect } from 'react';
import { CallLog } from '../types';
import { PhoneCall, Clock, Cpu, Wifi, MapPin, Download, RefreshCw, CheckCircle2 } from 'lucide-react';

export const CallLogsView: React.FC = () => {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.callLogs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const downloadCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Call ID', 'Customer IP', 'Customer MAC', 'Agent Name', 'Started At', 'Duration (sec)'];
    const rows = logs.map((l) => [
      l.id,
      l.customerIp,
      l.customerMac,
      l.agentName,
      new Date(l.startedAt).toISOString(),
      l.durationSeconds || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `livevoice_call_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <PhoneCall className="w-4 h-4" />
            <span>Voice Session Telemetry & Audit Logs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            কল হিস্ট্রি ও ভয়েস সেশন রিপোর্ট
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            প্রত্যেক কাস্টমারের আইপি, ম্যাক অ্যাড্রেস ও এজেন্টের পিটিটি কথা বলার সম্পূর্ণ রেকর্ড
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={downloadCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Call Logs Database ({logs.length})
          </span>
          <span className="text-xs font-mono text-slate-400">
            Real-time Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4 font-medium">Session ID</th>
                <th className="py-3 px-4 font-medium">Customer IP</th>
                <th className="py-3 px-4 font-medium">Customer MAC</th>
                <th className="py-3 px-4 font-medium">Care Officer</th>
                <th className="py-3 px-4 font-medium">Date & Time</th>
                <th className="py-3 px-4 font-medium">Duration</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Clock className="w-6 h-6 mx-auto mb-2 opacity-40 text-emerald-400" />
                    <span>কোনো পূর্ববর্তী কল হিস্ট্রি নেই।</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      #{log.id.slice(-6)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-white tabular-nums">
                      {log.customerIp}
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-300 tabular-nums">
                      {log.customerMac}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {log.agentName}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-emerald-400">
                      {log.durationSeconds || 1}s
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
