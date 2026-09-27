'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { persistence, isProblemSolved, getCanonicalCodeId } from '@/lib/persistence';
import { ChapterGroup, ChallengeSummary } from '@/lib/types';
import { TechnicalDifficulty, ApertureStatus, EngravedSQLChip } from '@/components/ui/Badge';
import { AuthModal } from '@/components/ui/AuthModal';
import {
  Search, Database, LayoutGrid, List, ChevronRight,
  Layers, Zap, Clock, Terminal, Activity, Filter
} from 'lucide-react';

const MODULE_ICONS: Record<number, React.ElementType> = {
  1: Database,
  2: Activity,
  3: Filter,
  4: Layers,
  5: Zap,
  6: Activity,
  7: Terminal,
  8: Clock,
  9: Layers,
};

function getSqlConceptTag(problem: ChallengeSummary): { label: string; variant: 'copper' | 'gold' | 'emerald' | 'crimson' | 'steel' } {
  const title = (problem.title || '').toLowerCase();
  if (title.includes('join')) return { label: 'JOIN', variant: 'copper' };
  if (title.includes('window') || title.includes('rank') || title.includes('row_number') || title.includes('lead') || title.includes('lag')) return { label: 'WINDOW', variant: 'gold' };
  if (title.includes('cte') || title.includes('with') || title.includes('recursive')) return { label: 'CTE', variant: 'emerald' };
  if (title.includes('group by') || title.includes('having') || title.includes('count') || title.includes('sum') || title.includes('avg')) return { label: 'AGGREGATE', variant: 'gold' };
  if (title.includes('where') || title.includes('between') || title.includes('like') || title.includes('filter')) return { label: 'FILTER', variant: 'steel' };
  if (title.includes('case') || title.includes('when')) return { label: 'CONDITIONAL', variant: 'copper' };
  if (title.includes('date') || title.includes('month') || title.includes('year')) return { label: 'DATE/TIME', variant: 'gold' };
  return { label: 'QUERY', variant: 'steel' };
}

function CurriculumExplorerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialModule = searchParams.get('module');
  const initialTrack = searchParams.get('track');
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const initialModNum = initialModule ? parseInt(initialModule, 10) : null;
  const defaultTrack = (initialTrack as 'all' | 'fundamentals' | 'core' | 'advanced' | 'master') ||
    (initialModNum
      ? initialModNum <= 4
        ? 'fundamentals'
        : initialModNum <= 6
          ? 'core'
          : initialModNum === 7
            ? 'advanced'
            : initialModNum <= 9
              ? 'master'
              : 'all'
      : 'all');

  const [chapters, setChapters] = useState<ChapterGroup[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('sqlquest_curriculum_fast_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [solvedIds, setSolvedIds] = useState<number[]>([]);
  const [activeTrack, setActiveTrack] = useState<'all' | 'fundamentals' | 'core' | 'advanced' | 'master'>(defaultTrack);
  const [selectedModule, setSelectedModule] = useState<number | 'all'>(
    initialModNum ? initialModNum : 'all'
  );
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'modules'>('table');
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const cached = localStorage.getItem('sqlquest_curriculum_fast_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    async function loadData(forceRefresh = false) {
      try {
        const [chaps, localSolved] = await Promise.all([
          api.getChapters(forceRefresh).catch(() => [] as ChapterGroup[]),
          persistence.getSolvedIds().catch(() => [] as number[]),
        ]);
        setChapters((prev) => {
          const effective = (chaps && chaps.length > 0) ? chaps : prev;
          if (chaps && chaps.length > 0 && user) {
            try {
              localStorage.setItem('sqlquest_curriculum_fast_v1', JSON.stringify(chaps));
            } catch {
              // ignore
            }
          }
          const flatLevels = effective.flatMap((c) => c.levels || []);
          const backendSolved = user ? flatLevels.filter((l) => l.passed).map((l) => l.id) : [];
          const merged = user ? Array.from(new Set([...backendSolved, ...localSolved])) : localSolved;
          setSolvedIds(merged);
          return effective;
        });
      } catch (err) {
        console.error('Failed to load curriculum:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleRefresh = () => loadData(true);
    window.addEventListener('sqlquest_auth_logout', handleRefresh);
    window.addEventListener('sqlquest_auth_login', handleRefresh);
    window.addEventListener('sqlquest_problem_solved', handleRefresh);
    return () => {
      window.removeEventListener('sqlquest_auth_logout', handleRefresh);
      window.removeEventListener('sqlquest_auth_login', handleRefresh);
      window.removeEventListener('sqlquest_problem_solved', handleRefresh);
    };
  }, [user]);

  const trackChapters = useMemo(() => {
    if (activeTrack === 'master') {
      return chapters.filter((c) => (c.chapter_id === 8 || c.chapter_id === 9) || c.levels?.some((l) => l.track === 'master' || l.code_id?.startsWith('Pro-')));
    }
    if (activeTrack === 'fundamentals') {
      return chapters.filter((c) => (c.chapter_id >= 1 && c.chapter_id <= 4) || c.levels?.some((l) => l.track === 'fundamentals' || l.code_id?.startsWith('Basics-')));
    }
    if (activeTrack === 'core') {
      return chapters.filter((c) => (c.chapter_id === 5 || c.chapter_id === 6) || c.levels?.some((l) => l.track === 'core' || (l.code_id?.startsWith('SQL-') && !l.code_id?.startsWith('ASQL-'))));
    }
    if (activeTrack === 'advanced') {
      return chapters.filter((c) => c.chapter_id === 7 || c.levels?.some((l) => l.track === 'advanced' || l.code_id?.startsWith('ASQL-')));
    }
    return chapters;
  }, [chapters, activeTrack]);

  // Ensure selectedModule belongs to activeTrack, otherwise sync activeTrack or reset
  useEffect(() => {
    if (selectedModule !== 'all' && chapters.length > 0) {
      const targetChap = chapters.find((c) => c.chapter_id === selectedModule);
      if (targetChap) {
        const belongsToCurrent = trackChapters.some((c) => c.chapter_id === selectedModule);
        if (!belongsToCurrent) {
          setTimeout(() => {
            if (targetChap.chapter_id <= 4) setActiveTrack('fundamentals');
            else if (targetChap.chapter_id <= 6) setActiveTrack('core');
            else if (targetChap.chapter_id === 7) setActiveTrack('advanced');
            else if (targetChap.chapter_id <= 9) setActiveTrack('master');
          }, 0);
        }
      } else {
        setTimeout(() => setSelectedModule('all'), 0);
      }
    }
  }, [chapters, trackChapters, selectedModule]);

  const trackProblems = useMemo(() => {
    return trackChapters.flatMap((c) => c.levels || []);
  }, [trackChapters]);

  const allProblemsTotal = useMemo(() => chapters.flatMap((c) => c.levels || []), [chapters]);
  const trackTotalCount = trackProblems.length;
  const trackSolvedCount = useMemo(() => {
    return trackProblems.filter((p) => isProblemSolved(p, solvedIds, trackProblems)).length;
  }, [trackProblems, solvedIds]);

  const totalSolvedAll = useMemo(() => {
    return allProblemsTotal.filter((p) => isProblemSolved(p, solvedIds, allProblemsTotal)).length;
  }, [allProblemsTotal, solvedIds]);

  const filteredProblems = useMemo(() => {
    return trackProblems.filter((p) => {
      const matchesModule = selectedModule === 'all' || p.chapter_id === selectedModule;
      const pDiff = (p.difficulty || 'Easy').toLowerCase();
      const matchesDifficulty = difficultyFilter === 'all' || pDiff === difficultyFilter;
      const isSolved = isProblemSolved(p, solvedIds, trackProblems);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'solved' && isSolved) ||
        (statusFilter === 'unsolved' && !isSolved);
      const q = searchQuery.toLowerCase().trim();
      const numStr = (p.level_number || p.id || '').toString();
      const codeId = (p.code_id || '').toLowerCase();
      const pTitle = p.title || '';
      const pChapTitle = p.chapter_title || '';
      const matchesSearch =
        !q ||
        codeId.includes(q) ||
        pTitle.toLowerCase().includes(q) ||
        numStr.includes(q) ||
        p.id.toString().includes(q) ||
        pChapTitle.toLowerCase().includes(q);

      return matchesModule && matchesDifficulty && matchesStatus && matchesSearch;
    });
  }, [trackProblems, selectedModule, difficultyFilter, statusFilter, searchQuery, solvedIds]);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-[#090909] text-[#F5F5F5] overflow-hidden">
      {/* Precision Milled Header with Track Filters */}
      <div className="border-b border-[#242424] bg-[#121212] px-4 md:px-8 py-4">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-lg sm:text-xl font-bold text-[#F5F5F5] tracking-tight mt-0.5 flex items-center gap-3">
              <span>SQL Curriculum Explorer</span>
              <span className="px-2 py-0.2 rounded-[3px] text-[10px] font-mono bg-[#1C1C1C] text-[#D4D4D4] border border-[#2E2E2E]">
                {chapters.length} MODULES
              </span>
            </h1>
          </div>

          {/* Quick Telemetry Progress Aperture */}
          <div className="flex items-center gap-3 bg-[#0E0E0E] border border-[#242424] rounded-[4px] px-3.5 py-2 shrink-0">
            <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-base font-bold text-[#F5F5F5]">{totalSolvedAll}</span>
              <span className="text-xs text-[#666666]">/ {allProblemsTotal.length} SOLVED</span>
            </div>
            <div className="h-4 w-[1px] bg-[#222222]" />
            <span className="font-mono text-xs font-semibold text-[#FF9B42]">
              {Math.round((totalSolvedAll / (allProblemsTotal.length || 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* Track Filter Tabs & Search Bar */}
        <div className="max-w-[1800px] mx-auto mt-4 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#1E1E1E]">
          {/* Track Selector Tabs */}
          <div className="flex items-center p-0.5 bg-[#0E0E0E] border border-[#242424] rounded-[4px] gap-0.5">
            <button
              onClick={() => {
                setActiveTrack('all');
                setSelectedModule('all');
              }}
              className={`px-3 py-1 font-mono text-xs transition-all duration-[120ms] rounded-[2px] ${activeTrack === 'all'
                  ? 'bg-[#222222] text-[#F5F5F5] font-bold border border-[#3A3A3A]'
                  : 'text-[#888888] hover:text-[#D4D4D4]'
                }`}
              title="All 100 SQL Challenges"
            >
              ALL TRACKS (100)
            </button>
            <button
              onClick={() => {
                setActiveTrack('fundamentals');
                setSelectedModule('all');
              }}
              className={`px-3 py-1 font-mono text-xs transition-all duration-[120ms] rounded-[2px] ${activeTrack === 'fundamentals'
                  ? 'bg-[#222222] text-[#48BB78] font-bold border border-[#3A3A3A]'
                  : 'text-[#888888] hover:text-[#D4D4D4]'
                }`}
              title="Fundamentals: Basic SQL (Basics-001 through Basics-035)"
            >
              FUNDAMENTALS (35)
            </button>
            <button
              onClick={() => {
                setActiveTrack('core');
                setSelectedModule('all');
              }}
              className={`px-3 py-1 font-mono text-xs transition-all duration-[120ms] rounded-[2px] ${activeTrack === 'core'
                  ? 'bg-[#222222] text-[#FF6B00] font-bold border border-[#3A3A3A]'
                  : 'text-[#888888] hover:text-[#D4D4D4]'
                }`}
              title="Core SQL: Joins, Aggregations, Analytics (SQL-001 through SQL-035)"
            >
              CORE SQL (35)
            </button>
            <button
              onClick={() => {
                setActiveTrack('advanced');
                setSelectedModule('all');
              }}
              className={`px-3 py-1 font-mono text-xs transition-all duration-[120ms] rounded-[2px] ${activeTrack === 'advanced'
                  ? 'bg-[#222222] text-[#A855F7] font-bold border border-[#3A3A3A]'
                  : 'text-[#888888] hover:text-[#D4D4D4]'
                }`}
              title="Advanced SQL: CASE, Conditional Formatting & Logic (ASQL-001 through ASQL-010)"
            >
              ADVANCED SQL (10)
            </button>
            <button
              onClick={() => {
                setActiveTrack('master');
                setSelectedModule('all');
              }}
              className={`px-3 py-1 font-mono text-xs transition-all duration-[120ms] rounded-[2px] ${activeTrack === 'master'
                  ? 'bg-[#222222] text-[#38BDF8] font-bold border border-[#3A3A3A]'
                  : 'text-[#888888] hover:text-[#D4D4D4]'
                }`}
              title="Master Track: Production Relational Engineering & Temporal Analysis (Pro-001 through Pro-020)"
            >
              MASTER (20)
            </button>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#666666]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries, concepts, SQL-001..."
                className="w-full h-8 pl-8 pr-3 font-mono bg-[#0E0E0E] border border-[#242424] focus:border-[#FF6B00] rounded-[4px] text-xs placeholder-[#555555] text-[#F5F5F5] outline-none transition-colors"
              />
            </div>

            {/* Difficulty Dropdown */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as any)}
              className="h-8 px-2 font-mono bg-[#0E0E0E] border border-[#242424] rounded-[4px] text-xs text-[#B0B0B0] outline-none cursor-pointer"
            >
              <option value="all">ALL DIFFICULTIES</option>
              <option value="easy">EASY</option>
              <option value="medium">MEDIUM</option>
              <option value="hard">HARD</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-8 px-2 font-mono bg-[#0E0E0E] border border-[#242424] rounded-[4px] text-xs text-[#B0B0B0] outline-none cursor-pointer"
            >
              <option value="all">ALL STATUSES</option>
              <option value="solved">SOLVED</option>
              <option value="unsolved">UNSOLVED</option>
            </select>

            {/* View Switcher */}
            <div className="flex items-center bg-[#0E0E0E] border border-[#242424] rounded-[4px] p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-[2px] transition-all ${viewMode === 'table' ? 'bg-[#222222] text-[#FF6B00]' : 'text-[#666666] hover:text-[#B0B0B0]'
                  }`}
                title="Table Matrix"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('modules')}
                className={`p-1.5 rounded-[2px] transition-all ${viewMode === 'modules' ? 'bg-[#222222] text-[#FF6B00]' : 'text-[#666666] hover:text-[#B0B0B0]'
                  }`}
                title="Roadmap Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden max-w-[1800px] w-full mx-auto">
        {viewMode === 'modules' ? (
          /* Roadmap View */
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapters.map((chap) => {
                const levels = chap.levels || [];
                const solvedInChap = levels.filter((l) => isProblemSolved(l, solvedIds, allProblemsTotal)).length;
                const percent = levels.length > 0 ? Math.round((solvedInChap / levels.length) * 100) : 0;
                const IconComponent = MODULE_ICONS[chap.chapter_id] || Database;

                return (
                  <div
                    key={chap.chapter_id}
                    onClick={() => {
                      setSelectedModule(chap.chapter_id);
                      setViewMode('table');
                    }}
                    className="group rounded-[6px] border border-[#242424] bg-[#121212] p-4 hover:border-[#3A3A3A] hover:bg-[#161616] cursor-pointer transition-all duration-[120ms] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#1A1A1A] text-[#FF6B00] border border-[#2A2A2A]">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-semibold text-[#888888] bg-[#0E0E0E] border border-[#222222]">
                          MOD-{String(chap.chapter_id).padStart(2, '0')}
                        </span>
                      </div>

                      <h3 className="font-mono font-bold text-sm text-[#F5F5F5] mt-3 group-hover:text-white transition-colors">
                        {chap.chapter_title.replace(/^Module \d+:\s*/, '')}
                      </h3>
                      <p className="text-xs text-[#777777] mt-1 line-clamp-2">
                        Relational benchmarks targeting {chap.chapter_title.replace(/^Module \d+:\s*/, '')}.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1C1C1C]">
                      <div className="flex items-center justify-between font-mono text-[10px] text-[#888888] mb-1.5">
                        <span>{solvedInChap}/{levels.length} SOLVED</span>
                        <span className="text-[#FF6B00] font-semibold">{percent}%</span>
                      </div>
                      <div className="h-1 w-full bg-[#1A1A1A] rounded-[1px] overflow-hidden">
                        <div
                          className="h-full bg-[#FF6B00] rounded-[1px] transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        ) : (
          /* Table Matrix View with Left Technical Module Index */
          <div className="flex-1 flex min-h-0 overflow-hidden w-full">
            {/* Left Module Index */}
            <aside className="w-64 border-r border-[#242424] bg-[#0D0D0D] flex flex-col min-h-0 shrink-0 hidden md:flex">
              <div className="p-3 border-b border-[#202020] flex items-center justify-between shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#777777]">
                <span>MODULE INDEX ({trackChapters.length})</span>
                <span className="text-[#FF6B00]">{trackSolvedCount}/{trackTotalCount}</span>
              </div>

              <nav className="p-2 space-y-0.5 overflow-y-auto flex-1 font-mono">
                <button
                  onClick={() => setSelectedModule('all')}
                  className={`w-full text-left px-2.5 py-2 rounded-[3px] text-xs flex items-center justify-between transition-all duration-[120ms] ${selectedModule === 'all'
                      ? 'bg-[#1C1C1C] text-[#F5F5F5] font-bold border border-[#333333]'
                      : 'text-[#888888] hover:bg-[#141414] hover:text-[#D4D4D4]'
                    }`}
                >
                  <span>ALL PROBLEMS</span>
                  <span className="text-[10px] text-[#666666]">{trackProblems.length}</span>
                </button>

                {trackChapters.map((chap) => {
                  const chapLevels = chap.levels || [];
                  const chapSolved = chapLevels.filter((l) => isProblemSolved(l, solvedIds, trackProblems)).length;
                  const isSelected = selectedModule === chap.chapter_id;

                  return (
                    <button
                      key={chap.chapter_id}
                      onClick={() => setSelectedModule(chap.chapter_id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-[3px] text-xs transition-all duration-[120ms] flex items-center justify-between ${isSelected
                          ? 'bg-[#1C1C1C] text-[#F5F5F5] font-bold border border-[#333333]'
                          : 'text-[#888888] hover:bg-[#141414] hover:text-[#D4D4D4]'
                        }`}
                    >
                      <div className="truncate pr-2 flex items-center gap-2">
                        <span className={`text-[9px] ${isSelected ? 'text-[#FF6B00]' : 'text-[#555555]'}`}>
                          M{chap.chapter_id}
                        </span>
                        <span className="truncate text-[11px]">
                          {chap.chapter_title.replace(/^Module \d+:\s*/, '')}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#666666] shrink-0">
                        {chapSolved}/{chapLevels.length}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Right Problem Matrix */}
            <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between font-mono text-[11px] text-[#777777]">
                  <span>Showing <strong className="text-[#F5F5F5]">{filteredProblems.length}</strong> problems</span>
                  <span>{trackSolvedCount} of {trackTotalCount} Mastered</span>
                </div>

                <div className="rounded-[6px] border border-[#242424] bg-[#121212] overflow-hidden">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#242424] bg-[#0E0E0E] text-[#777777]">
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase w-20">STATUS</th>
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase w-24">ID</th>
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">QUERY PROBLEM</th>
                        <th className="hidden sm:table-cell py-2.5 px-3 font-semibold text-[10px] uppercase w-28">CONCEPT</th>
                        <th className="py-2.5 px-3 font-semibold text-[10px] uppercase text-right w-24">DIFFICULTY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1C1C]">
                      {loading && filteredProblems.length === 0 ? (
                        Array.from({ length: 10 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-2.5 px-3"><div className="h-3 w-12 bg-[#1A1A1A] rounded-[2px]" /></td>
                            <td className="py-2.5 px-3"><div className="h-3 w-14 bg-[#1A1A1A] rounded-[2px]" /></td>
                            <td className="py-2.5 px-3"><div className="h-3 w-48 bg-[#1A1A1A] rounded-[2px]" /></td>
                            <td className="hidden sm:table-cell py-2.5 px-3"><div className="h-3 w-16 bg-[#1A1A1A] rounded-[2px]" /></td>
                            <td className="py-2.5 px-3 text-right"><div className="h-3 w-12 bg-[#1A1A1A] rounded-[2px] ml-auto" /></td>
                          </tr>
                        ))
                      ) : filteredProblems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-xs text-[#777777]">
                            No SQL challenges matching active query criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProblems.map((problem) => {
                          const isSolved = isProblemSolved(problem, solvedIds, trackProblems);
                          const problemCode = getCanonicalCodeId(problem, trackProblems) || problem.code_id || `Basics-${String(problem.level_number || 1).padStart(3, '0')}`;
                          const isMaster = problem.track === 'master' || problem.chapter_id === 8 || problem.chapter_id === 9 || problemCode.startsWith('Pro-');
                          const isBasics = problem.track === 'fundamentals' || (problem.chapter_id >= 1 && problem.chapter_id <= 4) || problemCode.startsWith('Basics');
                          const isAdvanced = problem.chapter_id === 7 || problem.track === 'advanced' || problemCode.startsWith('ASQL-');
                          const idColorClass = isMaster
                            ? 'text-[#38BDF8]'
                            : isBasics
                              ? 'text-[#48BB78]'
                              : isAdvanced
                                ? 'text-[#A855F7]'
                                : 'text-[#FF6B00]';
                          const concept = getSqlConceptTag(problem);

                          return (
                            <tr
                              key={problem.id}
                              onClick={() => {
                                if (!user) {
                                  setAuthModalOpen(true);
                                } else {
                                  router.push(`/quest/${problemCode}`);
                                }
                              }}
                              className="hover:bg-[#161616] cursor-pointer transition-colors duration-[120ms] group"
                            >
                              <td className="py-2 px-3">
                                <ApertureStatus status={isSolved ? 'passed' : 'unattempted'} />
                              </td>
                              <td className={`py-2 px-3 font-mono font-bold ${idColorClass}`}>
                                {problemCode}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-sans font-medium text-[#D4D4D4] group-hover:text-white transition-colors truncate pr-2">
                                    {problem.title}
                                  </span>
                                  <ChevronRight className="h-3.5 w-3.5 text-[#555555] group-hover:text-[#FF6B00] transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
                                </div>
                              </td>
                              <td className="hidden sm:table-cell py-2 px-3">
                                <EngravedSQLChip label={concept.label} variant={concept.variant} />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <TechnicalDifficulty difficulty={problem.difficulty || 'Easy'} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function CurriculumPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-xs text-[#777777]">LOADING SQL MATRIX...</div>}>
      <CurriculumExplorerContent />
    </Suspense>
  );
}
