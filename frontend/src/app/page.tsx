'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/ui/AuthModal';
import { api } from '@/lib/api';
import {
  persistence,
  SubmissionLogEntry,
  calculateRealStreak,
  isProblemSolved,
  getCanonicalCodeId,
} from '@/lib/persistence';
import { ChapterGroup } from '@/lib/types';
import { TechnicalDifficulty, ApertureStatus } from '@/components/ui/Badge';
import { JourneyHero, RelationalCatalogMatrix } from '@/components/ui/Cards';
import {
  Terminal, ChevronRight
} from 'lucide-react';

const MODULE_DEFINITIONS = [
  { id: 1, title: 'Projections & Filtering', total: 8 },
  { id: 2, title: 'Aggregations & Grouping', total: 7 },
  { id: 3, title: 'Basic Joins & Set Operations', total: 7 },
  { id: 4, title: 'Predicates & Built-in Functions', total: 13 },
  { id: 5, title: 'Business Aggregations & Thresholds', total: 20 },
  { id: 6, title: 'Relational Joins & Data Integrity', total: 15 },
  { id: 7, title: 'Conditional Logic & Transformations', total: 10 },
  { id: 8, title: 'Temporal Analysis & Subquery Aggregations', total: 10 },
  { id: 9, title: 'Hierarchical Relational Joins & Set Algebra', total: 10 },
];

function formatExecutionTime(timestamp: number | string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [solvedIds, setSolvedIds] = useState<Array<number | string>>([]);
  const [lastActiveId, setLastActiveId] = useState<number | string>('Basics-001');
  const [submissions, setSubmissions] = useState<SubmissionLogEntry[]>([]);
  const [showAllStream, setShowAllStream] = useState<boolean>(false);

  // Sort submissions so the LATEST query execution is always at the top (timestamp DESC)
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return tB - tA;
    });
  }, [submissions]);

  const visibleSubmissions = useMemo(() => {
    return showAllStream ? sortedSubmissions : sortedSubmissions.slice(0, 10);
  }, [sortedSubmissions, showAllStream]);

  // Instant hydration from local storage on mount (0ms render like localhost)
  useEffect(() => {
    try {
      const token = localStorage.getItem('pq_token');
      const cached = localStorage.getItem('sqlquest_curriculum_fast_v1');
      if (cached && token) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChapters(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function loadData(forceRefresh = false) {
      try {
        const [chaps, localSolved, lastId, subs] = await Promise.all([
          api.getChapters(forceRefresh).catch(() => [] as ChapterGroup[]),
          persistence.getSolvedIds().catch(() => [] as Array<number | string>),
          persistence.getLastActiveProblemId().catch(() => 'Basics-001'),
          persistence.getSubmissions().catch(() => [] as SubmissionLogEntry[]),
        ]);

        const rawChaps = (Array.isArray(chaps) && chaps.length > 0) ? chaps : chapters;
        const flatLevels = rawChaps.flatMap((c) => c.levels || []);
        const backendSolved = user
          ? flatLevels.filter((l) => l.passed).map((l) => l.code_id || l.id)
          : [];

        let resolvedSolved: Array<number | string>;
        if (user) {
          resolvedSolved = Array.from(new Set([...backendSolved, ...localSolved]));
        } else {
          // For guests (not logged in), only trust local guest submissions with a matching passed status
          const passedSubmissionIds = new Set(
            subs.filter((s) => s.passed).map((s) => String(s.problemId))
          );
          resolvedSolved = localSolved.filter((id) => passedSubmissionIds.has(String(id)));
        }

        const sanitizedChaps = (Array.isArray(chaps) && chaps.length > 0)
          ? (user
              ? chaps
              : chaps.map((c) => ({
                  ...c,
                  levels: (c.levels || []).map((l) => ({
                    ...l,
                    passed: resolvedSolved.some((sid) => String(sid) === String(l.code_id) || String(sid) === String(l.id))
                  }))
                })))
          : [];

        if (sanitizedChaps.length > 0) {
          if (user) {
            try {
              localStorage.setItem('sqlquest_curriculum_fast_v1', JSON.stringify(sanitizedChaps));
            } catch {
              // ignore
            }
          }
          setChapters(sanitizedChaps);
        }
        setSolvedIds(resolvedSolved);
        setLastActiveId(lastId || 'Basics-001');
        setSubmissions(subs);
      } catch (e) {
        console.error('Failed to load dashboard state:', e);
      }
    }
    loadData();

    const handleRefresh = () => {
      loadData(true);
    };
    window.addEventListener('sqlquest_auth_logout', handleRefresh);
    window.addEventListener('sqlquest_auth_login', handleRefresh);
    window.addEventListener('sqlquest_problem_solved', handleRefresh);
    return () => {
      window.removeEventListener('sqlquest_auth_logout', handleRefresh);
      window.removeEventListener('sqlquest_auth_login', handleRefresh);
      window.removeEventListener('sqlquest_problem_solved', handleRefresh);
    };
  }, [user]);

  const allProblems = useMemo(() => chapters.flatMap((c) => c.levels || []), [chapters]);
  const totalCount = allProblems.length || 100;

  const canonicalSolvedSet = useMemo(() => {
    const set = new Set<string>();
    
    for (const rawId of solvedIds) {
      const codeId = getCanonicalCodeId(rawId, allProblems);
      if (codeId) set.add(codeId);
    }
    // Also include backend-confirmed passed problems for logged-in user only
    if (user) {
      for (const p of allProblems) {
        if (p.passed && p.code_id) {
          set.add(p.code_id);
        }
      }
    }
    return set;
  }, [solvedIds, allProblems, user]);

  const solvedCount = canonicalSolvedSet.size;
  const realStreak = useMemo(() => calculateRealStreak(submissions), [submissions]);

  const lastActiveProblem = useMemo(() => {
    if (!allProblems || allProblems.length === 0) return null;
    const active = allProblems.find((p) =>
      (typeof lastActiveId === 'string' && p.code_id && p.code_id.toLowerCase() === lastActiveId.toLowerCase()) ||
      (p.code_id && p.code_id === lastActiveId) ||
      String(p.id) === String(lastActiveId) ||
      String(p.level_number) === String(lastActiveId)
    );
    if (active && !isProblemSolved(active, solvedIds, allProblems)) return active;

    const nextUnsolved = allProblems.find((p) => !isProblemSolved(p, solvedIds, allProblems));
    return nextUnsolved || allProblems[0];
  }, [allProblems, lastActiveId, solvedIds]);

  const problemCodeToContinue = useMemo(() => {
    if (!lastActiveProblem) return 'Basics-001';
    return getCanonicalCodeId(lastActiveProblem, allProblems) || lastActiveProblem.code_id || 'Basics-001';
  }, [lastActiveProblem, allProblems]);

  const timelineModules = useMemo(() => {
    return MODULE_DEFINITIONS.map((def) => {
      const chap = chapters.find((c) => c.chapter_id === def.id);
      const levels = chap?.levels || [];
      const solvedInChap = levels.filter((l) => isProblemSolved(l, solvedIds, allProblems)).length;
      return {
        id: def.id,
        title: def.title,
        total: def.total,
        solved: solvedInChap,
      };
    });
  }, [chapters, solvedIds, allProblems]);

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] pb-16">
      <div className="w-full max-w-[1800px] mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* SECTION 1: The One Visual Hero (Monolithic Journey Conduit) */}
        <JourneyHero
          solvedCount={solvedCount}
          totalCount={totalCount}
          streakDays={realStreak}
          nextProblemId={problemCodeToContinue}
          nextProblemTitle={lastActiveProblem?.title}
          onContinue={() => {
            if (!user) {
              setAuthModalOpen(true);
            } else {
              router.push(`/quest/${problemCodeToContinue}`);
            }
          }}
        />

        {/* SECTION 2: Relational System Catalog Matrix */}
        <RelationalCatalogMatrix
          modules={timelineModules}
          onSelectModule={(modId) => router.push(`/quest?module=${modId}`)}
        />

        {/* SECTION 4: Active Session Execution Stream */}
        <div className="rounded-[6px] border border-[#242424] bg-[#121212] p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Terminal className="h-3.5 w-3.5 text-[#FF6B00]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                Recent Query Execution Stream
              </h2>
              {sortedSubmissions.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#2A2A2A] text-[#888888]">
                  Latest First • {sortedSubmissions.length} Total
                </span>
              )}
            </div>
            <Link
              href="/quest"
              className="font-mono text-xs text-[#888888] hover:text-[#FF6B00] flex items-center gap-1 transition-colors"
            >
              <span>EXPLORE SQL CHALLENGES</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {sortedSubmissions.length === 0 ? (
            <div className="rounded-[4px] border border-[#1F1F1F] bg-[#0E0E0E] p-8 text-center">
              <p className="font-mono text-xs text-[#777777]">
                No executions recorded in this session.
              </p>
              <button
                onClick={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                  } else {
                    router.push(`/quest/${problemCodeToContinue}`);
                  }
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1A1A1A] border border-[#2E2E2E] text-xs font-mono text-[#D4D4D4] hover:border-[#FF6B00]/40 transition-colors"
              >
                <span>Initialize Workspace [{problemCodeToContinue}]</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#242424] text-[#777777]">
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">STATUS</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">COORDINATE</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">QUERY TITLE</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase text-right">RUNTIME</th>
                      <th className="py-2.5 px-3 font-semibold text-[10px] uppercase text-right">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {visibleSubmissions.map((sub, idx) => {
                      const subProblemId = getCanonicalCodeId(sub.problemId, allProblems) || (
                        typeof sub.problemId === 'string'
                          ? sub.problemId
                          : `Basics-${String(sub.problemId).padStart(3, '0')}`
                      );
                      const isBasics = subProblemId.startsWith('Basic');
                      const isMaster = subProblemId.startsWith('Pro');
                      const isAdvanced = subProblemId.startsWith('ASQL');
                      const idColorClass = isMaster
                        ? 'text-[#38BDF8]'
                        : isBasics
                          ? 'text-[#48BB78]'
                          : isAdvanced
                            ? 'text-[#A855F7]'
                            : 'text-[#FF6B00]';
                      return (
                        <tr
                          key={sub.id || idx}
                          onClick={() => {
                            if (!user) {
                              setAuthModalOpen(true);
                            } else {
                              router.push(`/quest/${subProblemId}`);
                            }
                          }}
                          className="hover:bg-[#161616] cursor-pointer transition-colors duration-[120ms]"
                        >
                          <td className="py-2.5 px-3">
                            <ApertureStatus status={sub.passed ? 'passed' : 'failed'} />
                          </td>
                          <td className={`py-2.5 px-3 font-mono font-bold ${idColorClass}`}>
                            {subProblemId}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-medium text-[#D4D4D4]">
                            {sub.problemTitle || `Problem #${sub.problemId}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#888888] text-right">
                            {sub.runtimeMs !== undefined && sub.runtimeMs !== null ? `${sub.runtimeMs} ms` : '< 1 ms'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#888888] text-right" title={new Date(sub.timestamp).toLocaleString()}>
                            {formatExecutionTime(sub.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Show More / Show Less Toggle Bar */}
              {sortedSubmissions.length > 10 && (
                <div className="pt-2 flex items-center justify-between border-t border-[#1C1C1C] text-xs font-mono">
                  <span className="text-[#666666] text-[11px]">
                    Showing {visibleSubmissions.length} of {sortedSubmissions.length} executions (latest on top)
                  </span>
                  <button
                    onClick={() => setShowAllStream(!showAllStream)}
                    className="px-3 py-1 rounded-[4px] bg-[#1A1A1A] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#3E3E3E] text-[#D4D4D4] hover:text-white transition-colors text-xs font-medium cursor-pointer"
                  >
                    {showAllStream ? 'Show Recent 10' : `View All ${sortedSubmissions.length} Executions`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
