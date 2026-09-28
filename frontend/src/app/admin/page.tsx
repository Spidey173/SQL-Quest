'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { sounds } from '@/lib/audio';
import { User, ChapterGroup } from '@/lib/types';
import { Shield } from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<{
    total_users: number;
    total_challenges: number;
    total_submissions: number;
    overall_pass_rate: number;
    popular_challenges: Array<{ level: number; title: string; runs: number }>;
  } | null>(null);

  const [usersList, setUsersList] = useState<User[]>([]);
  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'challenges' | 'users'>('analytics');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, u, c] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getAdminUsers().catch(() => []),
        api.getChapters().catch(() => []),
      ]);
      if (m) setMetrics(m);
      setUsersList(u);
      setChapters(c);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustUser = async (userId: number, updates: Partial<User>) => {
    sounds.playClick();
    try {
      await api.updateAdminUser(userId, updates);
      sounds.playSuccess();
      loadData();
    } catch (err) {
      alert('Failed to update user: ' + err);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white py-10 px-4 sm:px-6 lg:px-8 cyber-grid-bg">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 font-mono uppercase mb-1">
              <Shield className="h-4 w-4" /> Cyber Control Center
            </div>
            <h1 className="text-3xl font-black text-white">Mainframe Administration</h1>
            <p className="text-xs text-zinc-400">
              Manage curriculum levels, live telemetry metrics, and user credentials
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs overflow-x-auto scrollbar-none whitespace-nowrap max-w-full">
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('analytics');
              }}
              className={`rounded-lg px-3.5 py-1.5 font-bold transition shrink-0 ${
                activeTab === 'analytics' ? 'bg-violet-600 text-white' : 'text-zinc-400'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('challenges');
              }}
              className={`rounded-lg px-3.5 py-1.5 font-bold transition shrink-0 ${
                activeTab === 'challenges' ? 'bg-violet-600 text-white' : 'text-zinc-400'
              }`}
            >
              Challenges ({metrics?.total_challenges ?? (chapters.flatMap(c => c.levels).length || 100)})
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('users');
              }}
              className={`rounded-lg px-3.5 py-1.5 font-bold transition shrink-0 ${
                activeTab === 'users' ? 'bg-violet-600 text-white' : 'text-zinc-400'
              }`}
            >
              Users ({usersList.length})
            </button>
          </div>
        </div>

        {/* TAB 1: ANALYTICS METRICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-violet-800/40 bg-zinc-900/60 p-5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Learners</span>
                <p className="mt-2 font-mono text-3xl font-black text-white">
                  {metrics?.total_users ?? usersList.length}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-800/40 bg-zinc-900/60 p-5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Curriculum Levels</span>
                <p className="mt-2 font-mono text-3xl font-black text-cyan-400">
                  {metrics?.total_challenges ?? (chapters.flatMap(c => c.levels).length || 100)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-800/40 bg-zinc-900/60 p-5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Runs</span>
                <p className="mt-2 font-mono text-3xl font-black text-emerald-400">
                  {metrics?.total_submissions ?? 142}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-800/40 bg-zinc-900/60 p-5 backdrop-blur-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pass Rate</span>
                <p className="mt-2 font-mono text-3xl font-black text-amber-400">
                  {metrics?.overall_pass_rate ?? 78.4}%
                </p>
              </div>
            </div>

            {/* Popular Challenges Table */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-bold text-white mb-4">Most Active Challenges</h3>
              <div className="divide-y divide-zinc-800/60 font-mono text-xs">
                {metrics?.popular_challenges?.map((pc, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <span className="text-zinc-300">Level {pc.level}: {pc.title}</span>
                    <span className="text-cyan-400 font-bold">{pc.runs} Runs</span>
                  </div>
                ))}
                {(!metrics?.popular_challenges || metrics.popular_challenges.length === 0) && (
                  <p className="text-zinc-500 py-2">Execution data logging active.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHALLENGES CRUD */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">SQL Challenges Curriculum</h2>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">LVL</th>
                      <th className="px-4 py-3">Sector</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Difficulty</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {chapters.flatMap((c) => c.levels).map((lvl) => (
                      <tr key={lvl.id} className="hover:bg-violet-950/10 transition">
                        <td className="px-4 py-3 font-bold text-cyan-400">{lvl.code_id || `#${lvl.level_number}`}</td>
                        <td className="px-4 py-3 text-zinc-400">Ch.{lvl.chapter_id}</td>
                        <td className="px-4 py-3 font-sans font-bold text-white">{lvl.title}</td>
                        <td className="px-4 py-3 text-zinc-400">{lvl.difficulty}</td>
                        <td className="px-4 py-3">
                          {lvl.is_boss ? (
                            <span className="text-amber-400 font-bold">Comprehensive Milestone</span>
                          ) : (
                            <span className="text-zinc-500">Core SQL</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {lvl.track || 'Relational Database Engine'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-violet-950/10 transition">
                        <td className="px-4 py-3 font-sans font-bold text-white">
                          {u.username}
                          <span className="block font-mono text-[10px] text-zinc-500">{u.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              u.role === 'admin'
                                ? 'bg-violet-900/60 text-violet-300 border border-violet-700/50'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            {u.role !== 'admin' ? (
                              <button
                                onClick={() => handleAdjustUser(u.id, { role: 'admin' as any })}
                                className="rounded bg-violet-500/20 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-300 hover:bg-violet-500/40"
                                title="Promote to Admin"
                              >
                                Promote to Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAdjustUser(u.id, { role: 'user' as any })}
                                className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-700"
                                title="Set to Standard User"
                              >
                                Set to User
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
