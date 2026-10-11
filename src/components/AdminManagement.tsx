import React, { useState, useEffect } from 'react';
import { StaffUser, CustomerSession } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Radio,
  MapPin,
  Clock,
  Cpu,
  Wifi,
} from 'lucide-react';
import { MapView } from './MapView';

interface AdminManagementProps {
  currentUser: StaffUser;
  customers: CustomerSession[];
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ currentUser, customers }) => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'agent'>('agent');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName || !newPassword) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create staff');
      }

      setStatusMsg({ type: 'success', text: `অফিসার '${newName}' সফলভাবে যুক্ত হয়েছে!` });
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      fetchStaff();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error creating staff' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isAdminOrSuper = currentUser.role === 'superadmin' || currentUser.role === 'admin';

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Staff Hierarchy & Access Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            অ্যাডমিন ও সুপার অ্যাডমিন কন্ট্রোল প্যানেল
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            কাস্টমার কেয়ার এজেন্ট এবং অ্যাডমিন টিম পরিচালনা, আইডি তৈরি ও ভূমিকা নিয়ন্ত্রণ করুন
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
            <div className="text-[10px] text-emerald-400 capitalize font-mono">
              Role: {currentUser.role}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create New Staff Member */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold">নতুন স্টাফ / এজেন্ট যুক্ত করুন</h2>
          </div>
          <p className="text-xs text-slate-400">
            {isSuperAdmin
              ? 'সুপার অ্যাডমিন হিসেবে আপনি অ্যাডমিন এবং কেয়ার অফিসার তৈরি করতে পারেন।'
              : 'অ্যাডমিন হিসেবে আপনি কাস্টমার কেয়ার এজেন্ট তৈরি করতে পারেন।'}
          </p>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-800/60 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                পুরো নাম (Full Name)
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Arif Rahman"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                লগইন আইডি (Username)
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. agent3, admin2"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                পাসওয়ার্ড (Password)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                পদবি ও ভূমিকা (Role)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="agent">Customer Care Agent (কেয়ার অফিসার)</option>
                {isSuperAdmin && <option value="admin">Admin (টিম লিডার / অ্যাডমিন)</option>}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'আইডি তৈরি করুন'}</span>
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Staff Directory Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Active Staff Directory (বর্তমান স্টাফ তালিকা)
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {staffList.length} Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-medium">নাম (Name)</th>
                    <th className="pb-2.5 font-medium">লগইন আইডি</th>
                    <th className="pb-2.5 font-medium">পদবি (Role)</th>
                    <th className="pb-2.5 font-medium">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {staffList.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-emerald-400">
                          {member.name.charAt(0)}
                        </div>
                        <span>{member.name}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-300">{member.username}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            member.role === 'superadmin'
                              ? 'bg-purple-950/80 border border-purple-800/60 text-purple-300'
                              : member.role === 'admin'
                              ? 'bg-sky-950/80 border border-sky-800/60 text-sky-300'
                              : 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-300'
                          }`}
                        >
                          {member.role === 'superadmin' ? 'সুপার অ্যাডমিন' : member.role === 'admin' ? 'অ্যাডমিন' : 'এজেন্ট'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Online Customers Geo Radar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">
                  অনলাইন কাস্টমারদের ভৌগোলিক অবস্থান (Visitor Geo Map)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {customers.length} Online Now
              </span>
            </div>

            {customers.length > 0 ? (
              <MapView
                location={customers[0].location}
                ip={customers[0].ip}
                mac={customers[0].mac}
                title="সক্রিয় কাস্টমার জিপিএস মনিটর"
                height="h-56"
              />
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                <MapPin className="w-8 h-8 mx-auto opacity-30 text-emerald-400 mb-2" />
                <p className="text-xs">বর্তমানে কোনো কাস্টমার অনলাইনে নেই।</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
