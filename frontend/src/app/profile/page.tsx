'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from '@/components/ui/AuthModal';
import { api } from '@/lib/api';
import {
  persistence,
  SubmissionLogEntry,
  calculateRealStreak,
  calculateRealAverageRuntime,
  getCanonicalProblemId,
} from '@/lib/persistence';
import { ChapterGroup } from '@/lib/types';
import {
  User, CheckCircle2, Flame, Clock,
  Layers, ArrowRight, BarChart2,
  Check, Zap, Activity, ChevronRight, ChevronLeft
} from 'lucide-react';

// Circular Radial Progress Ring for Whole Completion in Magma / Industrial Orange
function CircularCompletionGauge({
  percent,
  size = 148,
  strokeWidth = 10,
  solved,
  total,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  solved: number;
  total: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E1E1E"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#telemetryProgressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="telemetryProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E53935" />
            <stop offset="60%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#FFC857" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold font-mono text-[#F5F5F5] leading-none">
          {solved}
        </span>
        <span className="text-xs text-[#777777] font-mono mt-1">of {total} solved</span>
        <span className="text-xs font-semibold text-[#FF6B00] mt-1 font-mono bg-[#1A120B] px-2.5 py-0.5 rounded-[3px] border border-[#3E2314]">
          {percent}% Verified
        </span>
      </div>
    </div>
  );
}

export default function TelemetryPage() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signup');
  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [solvedIds, setSolvedIds] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionLogEntry[]>([]);

  useEffect(() => {
    async function loadData(forceRefresh = false) {
      try {
        const [chaps, localSolved, localSubs, remoteSubs] = await Promise.all([
          api.getChapters(forceRefresh).catch(() => [] as ChapterGroup[]),
          persistence.getSolvedIds().catch(() => [] as any[]),
          persistence.getSubmissions().catch(() => [] as SubmissionLogEntry[]),
          user ? api.getUserSubmissions().catch(() => [] as SubmissionLogEntry[]) : Promise.resolve([] as SubmissionLogEntry[]),
        ]);
        const flatLevels = (chaps || []).flatMap((c) => c.levels || []);
        const backendSolved = user ? flatLevels.filter((l) => l.passed).map((l) => l.id) : [];
        const solvedCanonicalSet = new Set<number>();
        const sourceSolved = user ? Array.from(new Set([...backendSolved, ...localSolved])) : localSolved;
        for (const rawId of sourceSolved) {
          const canonical = getCanonicalProblemId(rawId, flatLevels);
          if (canonical >= 1 && canonical <= 100) {
            solvedCanonicalSet.add(canonical);
          }
        }

        let mergedSubs: SubmissionLogEntry[] = [];
        if (user) {
          mergedSubs = (remoteSubs || []).slice().sort((a, b) => b.timestamp - a.timestamp);
        } else {
          mergedSubs = (localSubs || []).slice().sort((a, b) => b.timestamp - a.timestamp);
        }

        setChapters(chaps);
        setSolvedIds(Array.from(solvedCanonicalSet));
        setSubmissions(mergedSubs);
      } catch (e) {
        console.error('Failed to load telemetry state:', e);
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

  const allProblems = useMemo(() => chapters.flatMap((c) => c.levels), [chapters]);
  const totalProblems = allProblems.length || 100;
  const solvedCount = solvedIds.length;
  const overallPercent = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;
  const remainingCount = Math.max(0, totalProblems - solvedCount);

  // Real Analytics Calculations synchronized with user.streak
  const realStreak = useMemo(() => {
    const computed = calculateRealStreak(submissions);
    if (computed > 0) return computed;
    if (user?.streak && (solvedCount > 0 || submissions.length > 0)) {
      return user.streak;
    }
    if (solvedCount > 0) return 1;
    return 0;
  }, [submissions, user, solvedCount]);

  const realAvgRuntime = useMemo(() => calculateRealAverageRuntime(submissions), [submissions]);

  // Acceptance Rate
  const passRate = useMemo(() => {
    if (!submissions.length) return solvedCount > 0 ? 100 : 0;
    const passed = submissions.filter((s) => s.passed).length;
    return Math.round((passed / submissions.length) * 100);
  }, [submissions, solvedCount]);

  // Solved Today
  const solvedToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    const passedToday = submissions.filter(
      (s) => s.passed && new Date(s.timestamp).toDateString() === todayStr
    );
    const uniquePassed = new Set(
      passedToday
        .map((s) => getCanonicalProblemId(s.code_id || s.problemId, allProblems))
        .filter((id) => id > 0)
    );
    return uniquePassed.size;
  }, [submissions, allProblems]);

  // 1. Completion by Difficulty Types (Easy, Medium, Hard)
  const difficultyTypes = useMemo(() => {
    const types = [
      { name: 'Easy', color: '#48BB78', bg: 'bg-[#38A169]', border: 'border-[#1E3825]' },
      { name: 'Medium', color: '#FF6B00', bg: 'bg-[#FF6B00]', border: 'border-[#3E2314]' },
      { name: 'Hard', color: '#E53935', bg: 'bg-[#E53935]', border: 'border-[#4A2020]' },
    ];

    return types.map((item) => {
      const inType = allProblems.filter(
        (p) => p.difficulty?.toLowerCase() === item.name.toLowerCase()
      );
      const total = inType.length || 1;
      const solved = inType.filter((p) =>
        p.passed ||
        solvedIds.includes(p.id) ||
        (p.code_id && solvedIds.includes(getCanonicalProblemId(p.code_id, allProblems)))
      ).length;
      const percent = Math.round((solved / total) * 100);
      return {
        ...item,
        total,
        solved,
        percent,
      };
    });
  }, [allProblems, solvedIds]);

  // 2. Daily Problem-Solving Velocity Analytics (Scrollable Timeline)
  const [daysRange, setDaysRange] = useState<14 | 30 | 60>(30);
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    dayLabel: string;
    weekday: string;
    solvedCount: number;
    totalRuns: number;
    isToday: boolean;
  } | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const recentDaysAnalytics = useMemo(() => {
    const days = [];
    const now = new Date();
    const daysLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const daySubs = submissions.filter(
        (s) => new Date(s.timestamp).toDateString() === dateStr
      );
      const passedSubs = daySubs.filter((s) => s.passed);
      const uniqueSolved = Array.from(
        new Set(
          passedSubs
            .map((s) => getCanonicalProblemId(s.code_id || s.problemId, allProblems))
            .filter((id) => id > 0)
        )
      );

      const daySolvedCount = uniqueSolved.length;
      const totalRuns = daySubs.length;

      days.push({
        date: isoDate,
        dayLabel: `${monthsLabel[d.getMonth()]} ${d.getDate()}`,
        weekday: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : daysLabel[d.getDay()],
        isToday: i === 0,
        solvedCount: daySolvedCount,
        totalRuns,
      });
    }

    const maxSolves = Math.max(4, ...days.map((d) => d.solvedCount));
    const totalSolves = days.reduce((acc, d) => acc + d.solvedCount, 0);
    const totalRuns = days.reduce((acc, d) => acc + d.totalRuns, 0);

    return {
      days,
      maxSolves,
      totalSolves,
      totalRuns,
    };
  }, [submissions, solvedToday, daysRange]);

  // Auto-scroll to the right (Today) on mount and on range change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [daysRange, recentDaysAnalytics]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 bg-[#090909] text-[#F5F5F5] py-6 px-4 md:px-8 overflow-y-auto">
      <div className="w-full max-w-[1800px] mx-auto space-y-6">

        {/* 1. Header Profile Banner (Machined Titanium Plate) */}
        <div className="relative rounded-[6px] border border-[#242424] bg-[#121212] p-5 sm:p-6 overflow-hidden shadow-xl">
          {/* Hairline top highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[4px] bg-[#1A1A1A] border border-[#2A2A2A] text-[#FF6B00] shadow-sm shrink-0">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#F5F5F5] tracking-tight">
                    {user ? user.username : 'Developer Telemetry'}
                  </h1>
                  {!user ? (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-[2px] bg-[#161616] text-[#888888] border border-[#262626] font-semibold">
                      Visitor (Not Signed In)
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-[2px] bg-[#0E1A12] text-[#48BB78] border border-[#1E3825] font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#38A169]" />
                      Verified Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#777777] font-mono mt-1">
                  Full analytics breakdown: daily solved problem velocity, difficulty distribution, and curriculum mastery.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signin');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-[4px] bg-[#FF6B00] hover:bg-[#E05F00] text-black font-mono font-bold text-xs tracking-tight transition-all duration-[120ms] ease-out shadow-sm cursor-pointer"
                >
                  <span>Sign In / Register</span>
                </button>
              )}
              <Link href="/quest">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#1A1A1A] hover:bg-[#222222] border border-[#2E2E2E] text-[#D4D4D4] hover:text-white font-mono text-xs transition-all duration-[120ms] cursor-pointer"
                >
                  <span>Open Curriculum</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1 text-[#FF6B00]" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Total Completion in Whole & Types Breakdown (Core Analytics Cockpit) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Card A: Total Completion in Whole */}
          <div className="relative rounded-[6px] border border-[#242424] bg-[#121212] p-5 sm:p-6 flex flex-col justify-between shadow-xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1E1E1E]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#777777]">
                  Total Completion (Whole)
                </span>
                <CheckCircle2 className="h-4 w-4 text-[#FF6B00]" />
              </div>

              <div className="mt-5 flex items-center justify-around gap-4">
                <CircularCompletionGauge
                  percent={overallPercent}
                  solved={solvedCount}
                  total={totalProblems}
                />

                <div className="space-y-3 font-mono">
                  <div>
                    <div className="text-[10px] text-[#666666] uppercase">Solved</div>
                    <div className="text-2xl font-bold text-[#FF6B00]">{solvedCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#666666] uppercase">Remaining</div>
                    <div className="text-2xl font-bold text-[#888888]">{remainingCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1C1C1C] flex items-center justify-between font-mono text-xs text-[#777777]">
              <span>Curriculum Syllabus</span>
              <span className="text-[#F5F5F5] font-semibold">{totalProblems} Challenges</span>
            </div>
          </div>

          {/* Card B: Completion by Types (Difficulty Types Breakdown) */}
          <div className="relative rounded-[6px] border border-[#242424] bg-[#121212] p-5 sm:p-6 flex flex-col justify-between shadow-xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1E1E1E]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#777777]">
                  Completion by Difficulty Types
                </span>
                <Layers className="h-4 w-4 text-[#FF9B42]" />
              </div>

              <div className="mt-4 space-y-4">
                {difficultyTypes.map((type) => (
                  <div key={type.name} className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#D4D4D4]">{type.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#0E0E0E] text-[#888888] border border-[#222222]">
                          {type.solved}/{type.total}
                        </span>
                      </div>
                      <span className="font-bold text-[#F5F5F5]">{type.percent}%</span>
                    </div>

                    {/* Progress Track */}
                    <div className="h-2 w-full rounded-[2px] bg-[#1A1A1A] overflow-hidden">
                      <div
                        className={`h-full ${type.bg} transition-all duration-700 ease-out rounded-[2px]`}
                        style={{ width: `${type.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1C1C1C] flex items-center justify-between font-mono text-xs text-[#777777]">
              <span>Distribution</span>
              <span className="text-[#888888]">3 Difficulty Tiers</span>
            </div>
          </div>

          {/* Card C: Execution Velocity & Accuracy */}
          <div className="relative rounded-[6px] border border-[#242424] bg-[#121212] p-5 sm:p-6 flex flex-col justify-between shadow-xl overflow-hidden md:col-span-2 xl:col-span-1">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1E1E1E]">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#777777]">
                  Performance & Telemetry
                </span>
                <Activity className="h-4 w-4 text-[#FF6B00]" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 font-mono">
                <div className="p-3 rounded-[4px] bg-[#0E0E0E] border border-[#222222]">
                  <div className="text-[10px] text-[#777777] flex items-center gap-1.5">
                    <Flame className="h-3 w-3 text-[#FF9B42]" />
                    <span>Practice Streak</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#F5F5F5]">{realStreak}</span>
                    <span className="text-xs text-[#FF9B42]">days</span>
                  </div>
                </div>

                <div className="p-3 rounded-[4px] bg-[#0E0E0E] border border-[#222222]">
                  <div className="text-[10px] text-[#777777] flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-[#38A169]" />
                    <span>Acceptance Rate</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#38A169]">{passRate}%</span>
                  </div>
                </div>

                <div className="p-3 rounded-[4px] bg-[#0E0E0E] border border-[#222222]">
                  <div className="text-[10px] text-[#777777] flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-[#888888]" />
                    <span>Avg Runtime</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#D4D4D4]">{realAvgRuntime || 22}</span>
                    <span className="text-xs text-[#666666]">ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-[4px] bg-[#0E0E0E] border border-[#222222]">
                  <div className="text-[10px] text-[#777777] flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-[#FFC857]" />
                    <span>Solved Today</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#FFC857]">{solvedToday}</span>
                    <span className="text-xs text-[#777777]">done</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#1C1C1C] flex items-center justify-between font-mono text-xs text-[#777777]">
              <span>Total Submissions</span>
              <span className="text-[#F5F5F5] font-semibold">{Math.max(submissions.length, solvedCount)} Executions</span>
            </div>
          </div>

        </div>

        {/* 3. Problems Solved (Daily Velocity with Smooth Left-Scroll History) */}
        <div className="relative rounded-[6px] border border-[#242424] bg-[#121212] p-5 sm:p-6 shadow-xl space-y-4 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E1E1E]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#1A1A1A] border border-[#2A2A2A] text-[#FF6B00] shrink-0">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-[#F5F5F5] tracking-tight">
                  Problems Solved (Daily Velocity)
                </h3>
                <p className="text-xs text-[#777777] font-mono mt-0.5">
                  Day-by-day problem-solving activity & streak cadence. Scroll left to inspect earlier history.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Range Selector */}
              <div className="flex items-center rounded-[4px] bg-[#0E0E0E] border border-[#242424] p-0.5 text-xs font-mono">
                {([14, 30, 60] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDaysRange(r)}
                    className={`px-3 py-1 rounded-[2px] transition-all font-semibold cursor-pointer ${
                      daysRange === r
                        ? 'bg-[#222222] text-[#FF6B00] border border-[#3A3A3A]'
                        : 'text-[#777777] hover:text-[#D4D4D4]'
                    }`}
                  >
                    {r}D
                  </button>
                ))}
              </div>

              {/* Left / Right Scroll Buttons (shown for 30D and 60D scroll views) */}
              {daysRange !== 14 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleScrollLeft}
                    title="Scroll left (earlier days)"
                    className="p-1.5 rounded-[3px] bg-[#161616] hover:bg-[#202020] border border-[#262626] text-[#777777] hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleScrollRight}
                    title="Scroll right (recent days)"
                    className="p-1.5 rounded-[3px] bg-[#161616] hover:bg-[#202020] border border-[#262626] text-[#777777] hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Stat Badges */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-[3px] bg-[#0E0E0E] border border-[#242424] text-[#FF6B00] font-semibold">
                  {recentDaysAnalytics.totalSolves} Solved in {daysRange}d
                </span>
                <span className="px-2.5 py-1 rounded-[3px] bg-[#0E0E0E] border border-[#242424] text-[#666666]">
                  {recentDaysAnalytics.totalRuns} Runs Total
                </span>
              </div>
            </div>
          </div>

          {/* Selected Day Floating Inspector */}
          {selectedDay && (
            <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-[4px] bg-[#161616] border border-[#2A2A2A] text-[#F5F5F5] font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {selectedDay.weekday}, {selectedDay.dayLabel}
                </span>
                <span className="text-[#444444]">•</span>
                <span className="text-[#FF6B00] font-bold">
                  {selectedDay.solvedCount} Problems Solved
                </span>
                <span className="text-[#444444]">•</span>
                <span className="text-[#888888]">
                  {selectedDay.totalRuns} Total Runs
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-[#666666] hover:text-white text-xs px-2 py-0.5 rounded-[2px] hover:bg-[#222222]"
              >
                Clear ×
              </button>
            </div>
          )}

          {/* Velocity Bar Track (Fluid Width for 14D with minimum bar sizes, Scrollable for 30D / 60D) */}
          <div
            ref={scrollContainerRef}
            className={
              daysRange === 14
                ? 'w-full flex items-end justify-between gap-1.5 sm:gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-[#242424] pb-3 pt-4 px-1 select-none'
                : 'flex items-end gap-2.5 sm:gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-[#242424] pb-3 pt-4 px-1 select-none scroll-smooth'
            }
          >
            {recentDaysAnalytics.days.map((day, idx) => {
              const heightPercent = day.solvedCount > 0
                ? Math.min(100, Math.max(30, Math.round((day.solvedCount / recentDaysAnalytics.maxSolves) * 100)))
                : day.totalRuns > 0 ? 18 : 6;

              const isSelected = selectedDay?.date === day.date;

              return (
                <div
                  key={idx}
                  onClick={() =>
                    setSelectedDay(
                      isSelected
                        ? null
                        : {
                            date: day.date,
                            dayLabel: day.dayLabel,
                            weekday: day.weekday,
                            solvedCount: day.solvedCount,
                            totalRuns: day.totalRuns,
                            isToday: day.isToday,
                          }
                    )
                  }
                  className={`flex flex-col items-center justify-end group cursor-pointer transition-transform duration-150 hover:-translate-y-1 ${
                    daysRange === 14
                      ? 'min-w-[42px] sm:min-w-[48px] flex-1 max-w-[76px]'
                      : 'min-w-[56px] sm:min-w-[62px]'
                  } ${isSelected ? 'scale-105' : ''}`}
                  title={`${day.date}: ${day.solvedCount} solved, ${day.totalRuns} runs`}
                >
                  {/* Solved Count Badge */}
                  <span
                    className={`text-[11px] font-mono font-bold mb-1.5 transition-all ${
                      day.solvedCount > 0
                        ? 'text-[#FF6B00] opacity-100 group-hover:scale-110'
                        : 'text-[#444444] opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {day.solvedCount > 0 ? `${day.solvedCount}` : '0'}
                  </span>

                  {/* Vertical Bar Container (Machined Charcoal Well) */}
                  <div
                    className={`w-full h-36 rounded-[4px] bg-[#0E0E0E] border border-[#1E1E1E] flex items-end justify-center p-1.5 transition-all group-hover:border-[#333333] group-hover:bg-[#141414] ${
                      isSelected ? 'border-[#FF6B00] bg-[#161616]' : ''
                    }`}
                  >
                    <div
                      className={`w-full max-w-[32px] rounded-[2px] transition-all duration-500 ${
                        day.solvedCount > 0
                          ? 'bg-gradient-to-t from-[#E53935] to-[#FF6B00] shadow-[0_0_10px_rgba(255,107,0,0.45)] group-hover:shadow-[0_0_16px_rgba(255,107,0,0.7)]'
                          : day.totalRuns > 0
                          ? 'bg-[#2A2A2A]'
                          : 'h-1.5 w-4 bg-[#1C1C1C] rounded-full group-hover:bg-[#333333]'
                      }`}
                      style={{ height: day.solvedCount > 0 || day.totalRuns > 0 ? `${heightPercent}%` : undefined }}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`text-[11px] font-mono mt-2 font-medium tracking-tight ${
                      day.isToday
                        ? 'text-[#FF6B00] font-bold underline underline-offset-4'
                        : 'text-[#888888]'
                    }`}
                  >
                    {day.weekday}
                  </span>

                  {/* Date Label */}
                  <span className="text-[10px] font-mono text-[#555555]">
                    {day.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
