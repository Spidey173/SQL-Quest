'use client';

import React from 'react';
import {
  Layers, Database, Server, Cpu, Check, AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  DialectComparison,
  SqlDialectId,
  SQL_DIALECTS
} from '@/lib/dialect-comparisons';

interface DialectComparisonViewProps {
  comparison: DialectComparison;
  activeDialect: SqlDialectId;
  onSelectDialect: (dialect: SqlDialectId) => void;
  onLoadCodeToEditor?: (code: string, dialect: SqlDialectId) => void;
}

export const DialectComparisonView: React.FC<DialectComparisonViewProps> = ({
  comparison,
  activeDialect,
  onSelectDialect,
  onLoadCodeToEditor,
}) => {
  const getDialectIcon = (id: SqlDialectId) => {
    switch (id) {
      case 'sqlite':
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case 'postgres':
        return <Server className="w-3.5 h-3.5 text-blue-400" />;
      case 'mysql':
        return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
      case 'snowflake':
        return <Layers className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  // 1. CLEAN PRESENTATION FOR 100% ANSI PORTABLE PROBLEMS (e.g. Basics-001)
  // Avoids cluttering the solution with redundant duplicate code boxes
  if (!comparison.hasDivergence) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-[#161B22] to-[#161B22] p-3.5 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              100% ANSI Portable Query
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262D] border border-[#30363D] text-[#8B949E]">
            Universal SQL
          </span>
        </div>

        <p className="text-xs text-[#C9D1D9] leading-relaxed">
          This query uses pure standard ANSI SQL. It executes identically with the exact same output across <strong className="text-cyan-400">SQLite 3.45</strong>, <strong className="text-blue-400">PostgreSQL 16</strong>, <strong className="text-amber-400">MySQL 8.0</strong>, and <strong className="text-sky-400">Snowflake</strong>.
        </p>

        <div className="flex items-center gap-2 pt-1 flex-wrap text-[10px] font-mono text-[#8B949E]">
          <span className="flex items-center gap-1 bg-[#0D1117] px-2 py-0.5 rounded border border-[#21262D]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> SQLite Sandbox
          </span>
          <span className="flex items-center gap-1 bg-[#0D1117] px-2 py-0.5 rounded border border-[#21262D]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> PostgreSQL
          </span>
          <span className="flex items-center gap-1 bg-[#0D1117] px-2 py-0.5 rounded border border-[#21262D]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> MySQL
          </span>
          <span className="flex items-center gap-1 bg-[#0D1117] px-2 py-0.5 rounded border border-[#21262D]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Snowflake
          </span>
        </div>
      </div>
    );
  }

  // 2. STREAMLINED PRESENTATION FOR PROBLEMS WITH DIALECT DIVERGENCE (e.g. Pro-002, SQL-011)
  const dialectsList: SqlDialectId[] = ['sqlite', 'postgres', 'mysql', 'snowflake'];

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-[#161B22] to-[#0D1117] p-4 space-y-4 shadow-xl">
      {/* Header */}
      <div className="border-b border-[#21262D] pb-3 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
            <Layers className="w-3 h-3" /> DIALECT VARIANCE
          </span>
          <span className="text-[11px] font-mono text-[#58A6FF] font-semibold">
            {comparison.category}
          </span>
        </div>
        <h4 className="text-sm sm:text-base font-bold text-[#E6EDF3] leading-snug">
          {comparison.varianceBadge}
        </h4>
        <p className="text-xs text-[#8B949E] leading-relaxed">
          {comparison.varianceSummary}
        </p>
      </div>

      {/* Syntax Comparison Cards (Stacked cleanly, fits narrow sidebar without wrapping) */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono font-bold text-[#8B949E] uppercase tracking-wider block">
          Syntax Comparison by Engine:
        </span>
        <div className="space-y-2">
          {dialectsList.map((id) => {
            const meta = SQL_DIALECTS[id];
            const q = comparison.queries[id];
            const isSelected = activeDialect === id;

            return (
              <div
                key={id}
                onClick={() => onSelectDialect(id)}
                className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                  isSelected
                    ? `${meta.badgeBorder} ${meta.badgeBg} shadow-sm`
                    : 'border-[#21262D] bg-[#0D1117] hover:border-[#30363D]'
                }`}
              >
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#21262D]/60 text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-[#E6EDF3]">
                    {getDialectIcon(id)}
                    <span>{meta.name}</span>
                    <span className="text-[9px] text-[#8B949E] font-normal">({meta.version})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}>
                      {meta.badgeLabel.split(' ')[0]}
                    </span>
                    {onLoadCodeToEditor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDialect(id);
                          onLoadCodeToEditor(q.code, id);
                        }}
                        className="text-[10px] font-mono text-[#58A6FF] hover:text-white px-1.5 py-0.5 rounded hover:bg-[#21262D] transition-colors"
                        title="Load into Monaco Editor"
                      >
                        Load
                      </button>
                    )}
                  </div>
                </div>

                <div className="font-mono text-xs text-[#E6EDF3] bg-[#090D13] p-2 rounded border border-[#21262D]/50 overflow-x-auto whitespace-pre">
                  {q.code}
                </div>

                {q.notes && (
                  <p className="text-[11px] text-[#8B949E] mt-1.5 leading-relaxed">
                    💡 {q.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Function / Construct Table if available */}
      {comparison.comparisonTable && comparison.comparisonTable.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono font-bold text-[#8B949E] uppercase tracking-wider block">
            Construct Quick Reference:
          </span>
          <div className="rounded-lg border border-[#30363D] bg-[#090D13] overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#21262D] bg-[#161B22] text-[#8B949E] text-[10px]">
                  <th className="p-2">Database</th>
                  <th className="p-2">Idiomatic Syntax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262D] text-[#E6EDF3]">
                {comparison.comparisonTable.map((row, idx) => (
                  <React.Fragment key={idx}>
                    <tr>
                      <td className="p-2 font-semibold text-cyan-400">SQLite</td>
                      <td className="p-2 text-cyan-300 font-mono text-[10px]">{row.sqlite}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-blue-400">PostgreSQL</td>
                      <td className="p-2 text-blue-300 font-mono text-[10px]">{row.postgres}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-amber-400">MySQL</td>
                      <td className="p-2 text-amber-300 font-mono text-[10px]">{row.mysql}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-sky-400">Snowflake</td>
                      <td className="p-2 text-sky-300 font-mono text-[10px]">{row.snowflake}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Why Interviewers Ask This */}
      <div className="p-3 rounded-lg border border-[#238636]/30 bg-[#238636]/10 space-y-1.5 text-xs">
        <span className="font-mono text-[10px] font-bold uppercase text-[#3FB950] tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#3FB950]" /> Why Interviewers Ask This
        </span>
        <p className="text-[#E6EDF3] text-[11px] leading-relaxed">
          {comparison.whyInterviewersAsk}
        </p>
      </div>

      {/* Live Coding Pitfalls */}
      <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1.5 text-xs">
        <span className="font-mono text-[10px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" /> Traps in Technical Interviews
        </span>
        <div className="space-y-1 text-[#E6EDF3] text-[11px] leading-relaxed">
          {comparison.pitfallsToAvoid.map((pitfall, i) => (
            <p key={i}>{pitfall}</p>
          ))}
        </div>
      </div>
    </div>
  );
};
