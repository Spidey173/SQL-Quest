'use client';

import React from 'react';
import { TechnicalDifficulty } from './Badge';

/**
 * MachinedPanel: Structural surface made of black titanium with milled seams and micro-chamfers.
 */
export function MachinedPanel({
  children,
  className = '',
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-[6px] border border-[#242424] bg-[#121212] overflow-hidden ${
        interactive
          ? 'cursor-pointer hover:border-[#383838] hover:bg-[#161616] transition-all duration-[120ms] ease-out active:scale-[0.995]'
          : ''
      } ${className}`}
    >
      {/* Precision hairline edge highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

/**
 * TelemetryConsoleRibbon: Unified single-chassis hardware console.
 * Completely replaces disconnected stat cards with an integrated CNC-milled instrument ribbon.
 */
export function TelemetryConsoleRibbon({
  latencyMs = 1.2,
  streakDays = 0,
  totalModules = 9,
  solvedCount = 0,
  totalCount = 100,
}: {
  latencyMs?: number;
  streakDays?: number;
  totalModules?: number;
  solvedCount?: number;
  totalCount?: number;
}) {
  const percent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-[6px] border border-[#242424] bg-[#101010] shadow-xl overflow-hidden">
      {/* Precision top edge highlight */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1E1E1E]">
        {/* Cell 1: Engine Execution Latency */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#777777] uppercase">
              ENGINE LATENCY
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[#38A169] bg-[#0E1A12] border border-[#1E3825] px-1.5 py-0.2 rounded-[2px]">
              <span className="h-1 w-1 rounded-full bg-[#38A169] animate-pulse" />
              <span>LIVE</span>
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-baseline gap-1">
              <span>{latencyMs}</span>
              <span className="text-xs font-normal text-[#888888]">ms</span>
            </div>
            <p className="font-mono text-[11px] text-[#666666] mt-0.5">
              SQLite 3.45 in-memory • P99: 1.8ms
            </p>
          </div>
        </div>

        {/* Cell 2: Active Streak & Cadence Ledger */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#777777] uppercase">
              ACTIVE STREAK
            </span>
            <span className="font-mono text-[9px] text-[#FF9B42] bg-[#1A120B] border border-[#3E2314] px-1.5 py-0.2 rounded-[2px]">
              DAILY CADENCE
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-baseline gap-1">
              <span>{streakDays}</span>
              <span className="text-xs font-normal text-[#888888]">DAYS</span>
            </div>
            {/* 7-Day Punch-Card Dots */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const isActive = streakDays > 0 && i >= 7 - Math.min(streakDays, 7);
                return (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-[1px] ${
                      isActive ? 'bg-[#FF6B00]' : 'bg-[#222222]'
                    }`}
                    title={`Day ${i + 1}`}
                  />
                );
              })}
              <span className="font-mono text-[10px] text-[#666666] ml-1">7-Day Ledger</span>
            </div>
          </div>
        </div>

        {/* Cell 3: Curriculum Depth */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#777777] uppercase">
              CURRICULUM DEPTH
            </span>
            <span className="font-mono text-[9px] text-[#B0B0B0] bg-[#161616] border border-[#262626] px-1.5 py-0.2 rounded-[2px]">
              SQL CHALLENGES
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-baseline gap-1">
              <span>{totalModules}</span>
              <span className="text-xs font-normal text-[#888888]">MODULES</span>
            </div>
            <p className="font-mono text-[11px] text-[#666666] mt-0.5">
              35 Fundamentals • 35 Core • 10 Advanced • 20 Master
            </p>
          </div>
        </div>

        {/* Cell 4: Verification Mastery */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#777777] uppercase">
              VERIFICATION MASTERY
            </span>
            <span className="font-mono text-[9px] text-[#FFC857] bg-[#1A180C] border border-[#3A3215] px-1.5 py-0.2 rounded-[2px]">
              {percent}% DONE
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5] flex items-baseline gap-1.5">
              <span>{solvedCount}</span>
              <span className="text-xs font-normal text-[#666666]">/ {totalCount}</span>
            </div>
            {/* High-density progress track */}
            <div className="mt-2 h-1 w-full bg-[#1C1C1C] rounded-[1px] overflow-hidden">
              <div
                className="h-full bg-[#FF6B00] rounded-[1px] transition-all duration-500"
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * JourneyHero: Upgraded command deck with authentic SQL code preview plate.
 */
export function JourneyHero({
  solvedCount,
  totalCount = 100,
  streakDays = 0,
  nextProblemId = 'Basics-001',
  nextProblemTitle,
  onContinue,
}: {
  solvedCount: number;
  totalCount?: number;
  streakDays?: number;
  nextProblemId?: number | string;
  nextProblemTitle?: string;
  onContinue: () => void;
}) {
  const percent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;
  const problemCode = typeof nextProblemId === 'string'
    ? nextProblemId
    : `SQL-${String(nextProblemId).padStart(3, '0')}`;

  return (
    <div className="relative rounded-[8px] border border-[#242424] bg-[#111111] p-6 sm:p-8 overflow-hidden shadow-2xl">
      {/* Machined top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.09] to-transparent pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Mission Launchpad (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-[#FF6B00] bg-[#1A120B] border border-[#3E2314] px-2 py-0.5 rounded-[3px]">
              SQL CHALLENGES
            </span>
            <span className="font-mono text-[10px] text-[#777777] uppercase tracking-wider">
              RELATIONAL DATABASE MASTERCLASS
            </span>
            {streakDays > 0 && (
              <span className="font-mono text-[10px] text-[#FFC857] bg-[#1A180C] border border-[#3A3215] px-2 py-0.5 rounded-[3px] ml-auto">
                ⚡ {streakDays} DAY STREAK
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#F5F5F5] tracking-tight leading-tight">
            Master Relational Data & Database Architecture
          </h1>

          <p className="text-xs sm:text-sm text-[#8E8E8E] leading-relaxed max-w-xl">
            An industrial control instrument for database engineering interviews. Practice queries against live relational tables, inspect database execution plans, and master SQL problem solving.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] bg-[#FF6B00] hover:bg-[#E05F00] text-black font-mono font-bold text-xs tracking-tight transition-all duration-[120ms] ease-out shadow-sm active:scale-[0.98]"
            >
              <span>CONTINUE QUERY [{problemCode}]</span>
              <span className="opacity-70">↵</span>
            </button>

            {nextProblemTitle && (
              <span className="font-mono text-xs text-[#888888] truncate max-w-xs">
                {nextProblemTitle}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Authentic SQL Query Preview Plate (5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-[6px] border border-[#222222] bg-[#0A0A0A] p-3.5 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A1A] text-[10px] text-[#666666]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
                <span className="font-bold text-[#A0A0A0]">QUERY BUFFER • {problemCode}</span>
              </div>
              <span>SQLite 3.45</span>
            </div>

            <pre className="text-[#D4D4D4] text-[11px] leading-relaxed overflow-x-auto py-1">
              <code>
                <span className="text-[#FF6B00]">SELECT</span> employee_id, first_name, salary<br />
                <span className="text-[#FF6B00]">FROM</span> employees<br />
                <span className="text-[#FF6B00]">WHERE</span> department_id = 1<br />
                <span className="text-[#FF6B00]">ORDER BY</span> salary <span className="text-[#FFC857]">DESC</span>;
              </code>
            </pre>

            <div className="mt-2.5 pt-2 border-t border-[#181818] flex items-center justify-between text-[10px] text-[#555555]">
              <span>[PLAN: INDEX_SCAN pk_dept]</span>
              <span className="text-[#38A169]">RUNTIME: 1.2ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monolithic Linear Conduit */}
      <div className="mt-8 pt-4 border-t border-[#1C1C1C]">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#888888] mb-2">
          <span className="tracking-wider uppercase">MASTERCLASS COMPLETION CONDUIT</span>
          <span className="font-bold text-[#F5F5F5]">{solvedCount} of {totalCount} Problems Verified ({percent}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-[2px] bg-[#181818] overflow-hidden">
          <div
            className="h-full bg-[#FF6B00] rounded-[2px] transition-all duration-500 ease-out"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * RelationalCatalogMatrix: Displays the 12 modules as an authentic database system catalog.
 */
export function RelationalCatalogMatrix({
  modules,
  onSelectModule,
}: {
  modules: Array<{
    id: number;
    title: string;
    total: number;
    solved: number;
  }>;
  onSelectModule: (id: number) => void;
}) {
  const conceptTags: Record<number, { concept: string; diff: 'Easy' | 'Medium' | 'Hard' }> = {
    1: { concept: 'SELECT • WHERE • AND/OR • ORDER BY • LIMIT • DISTINCT', diff: 'Easy' },
    2: { concept: 'COUNT • MAX • MIN • SUM • AVG • GROUP BY • HAVING', diff: 'Easy' },
    3: { concept: 'INNER JOIN • LEFT JOIN • RIGHT JOIN • FULL JOIN • SELF JOIN • UNION', diff: 'Easy' },
    4: { concept: 'LIKE • IN • BETWEEN • IS NULL • CASE • ROUND • STRING/DATE', diff: 'Easy' },
    5: { concept: 'DEPARTMENT ANALYTICS • SALES METRICS • THRESHOLD FILTERS', diff: 'Easy' },
    6: { concept: 'MULTI-TABLE JOINS • ANTI-JOINS • ORPHAN CHECKS • MANAGER RELATIONS', diff: 'Medium' },
    7: { concept: 'CASE WHEN • SALARY BANDS • DEMOGRAPHIC COHORTS • STATUS FLAGS', diff: 'Medium' },
    8: { concept: 'TEMPORAL ARITHMETIC • DATEDIFF • CORRELATED SUBQUERIES • COHORT ANALYSIS', diff: 'Hard' },
    9: { concept: 'HIERARCHICAL SELF-JOINS • SET ALGEBRA • ANTI-JOINS • GEOMETRIC PREDICATES', diff: 'Hard' },
  };

  return (
    <div className="rounded-[6px] border border-[#242424] bg-[#111111] p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-[#1E1E1E] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
              RELATIONAL SYSTEM CATALOG • information_schema.modules
            </h2>
          </div>
          <p className="text-xs text-[#777777] font-mono mt-0.5">
            Sequential progression from foundational projections to high-frequency analytics.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#202020] text-[#666666] text-[10px] uppercase">
              <th className="py-2 px-3 w-16">MOD</th>
              <th className="py-2 px-3">CURRICULUM MODULE</th>
              <th className="hidden md:table-cell py-2 px-3">CORE CONCEPTS</th>
              <th className="py-2 px-3 text-center w-24">BENCHMARKS</th>
              <th className="hidden sm:table-cell py-2 px-3 text-center w-20">TIER</th>
              <th className="py-2 px-3 text-right w-44">PROGRESS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#181818]">
            {modules.map((mod) => {
              const percent = mod.total > 0 ? Math.round((mod.solved / mod.total) * 100) : 0;
              const isComplete = mod.solved >= mod.total && mod.total > 0;
              const info = conceptTags[mod.id] || { concept: 'RELATIONAL SQL', diff: 'Medium' };

              return (
                <tr
                  key={mod.id}
                  onClick={() => onSelectModule(mod.id)}
                  className="hover:bg-[#161616] cursor-pointer transition-colors duration-[100ms] group"
                >
                  <td className="py-2.5 px-3 font-bold text-[#FF6B00]">
                    MOD-{String(mod.id).padStart(2, '0')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#D4D4D4] group-hover:text-white transition-colors">
                    {mod.title}
                  </td>
                  <td className="hidden md:table-cell py-2.5 px-3 text-[#777777] text-[11px]">
                    {info.concept}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#9E9E9E]">
                    {mod.total}
                  </td>
                  <td className="hidden sm:table-cell py-2.5 px-3 text-center">
                    <TechnicalDifficulty difficulty={info.diff} size="sm" />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-1.5 w-24 bg-[#1E1E1E] rounded-[1px] overflow-hidden shrink-0">
                        <div
                          className={`h-full rounded-[1px] transition-all duration-300 ${
                            isComplete ? 'bg-[#38A169]' : 'bg-[#FF6B00]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#888888] w-12 text-right">
                        {mod.solved}/{mod.total}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Backward-compatible export alias for any legacy imports
export const HorizontalModuleTimeline = RelationalCatalogMatrix;
export const GlassCard = MachinedPanel;
