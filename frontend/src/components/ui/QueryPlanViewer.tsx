'use client';

import React from 'react';
import { QueryPlanNode } from '@/lib/types';
import { Cpu, Layers, AlertTriangle, CheckCircle2, Database, Zap, Info } from 'lucide-react';

interface QueryPlanViewerProps {
  queryPlan?: QueryPlanNode[];
  executionTimeMs?: number;
}

export function QueryPlanViewer({ queryPlan = [], executionTimeMs = 12 }: QueryPlanViewerProps) {
  if (!queryPlan || queryPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center font-mono">
        <Database className="h-8 w-8 text-[#555555] mb-2 stroke-[1.5]" />
        <p className="text-xs text-[#888888] font-bold">No Query Plan Available</p>
        <p className="text-[11px] text-[#555555] mt-1 max-w-sm">
          Run a <code className="text-[#FF6B00]">SELECT</code> or <code className="text-[#FF6B00]">WITH</code> query to inspect SQLite query planner operations, index scans, and B-tree memory sorts.
        </p>
      </div>
    );
  }

  const hasFullScan = queryPlan.some((n) => n.op_type === 'FULL_TABLE_SCAN');
  const hasTempBTree = queryPlan.some((n) => n.op_type === 'TEMP_B_TREE');
  const hasIndexSearch = queryPlan.some((n) => n.op_type === 'INDEX_SEARCH');

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Overview Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded-[4px] border border-[#262626] bg-[#121212] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777777] uppercase font-bold tracking-wider">Plan Steps</span>
            <p className="text-sm font-bold text-[#F5F5F5]">{queryPlan.length} Operations ({executionTimeMs}ms)</p>
          </div>
          <Layers className="h-4 w-4 text-[#888888]" />
        </div>

        <div className="p-2.5 rounded-[4px] border border-[#262626] bg-[#121212] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777777] uppercase font-bold tracking-wider">Primary Access</span>
            <p className="text-sm font-bold text-[#F5F5F5]">
              {hasIndexSearch ? (
                <span className="text-[#38A169]">Index Seek</span>
              ) : hasFullScan ? (
                <span className="text-[#FFC857]">Sequential Scan</span>
              ) : (
                'Scalar Projection'
              )}
            </p>
          </div>
          <Cpu className="h-4 w-4 text-[#888888]" />
        </div>

        <div className="p-2.5 rounded-[4px] border border-[#262626] bg-[#121212] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777777] uppercase font-bold tracking-wider">Engine Efficiency</span>
            <p className="text-sm font-bold text-[#F5F5F5]">
              {hasIndexSearch && !hasTempBTree ? (
                <span className="text-[#38A169] flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 fill-current" /> O(log N) Optimal
                </span>
              ) : hasFullScan ? (
                <span className="text-[#FFC857]">O(N) Table Scan</span>
              ) : (
                <span className="text-[#38A169]">Standard</span>
              )}
            </p>
          </div>
          <Zap className="h-4 w-4 text-[#FF6B00]" />
        </div>
      </div>

      {/* Plan Operations Tree */}
      <div className="rounded-[4px] border border-[#242424] bg-[#111111] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#242424] bg-[#161616] flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wider">
            SQLite Query Planner Diagnostics (EXPLAIN QUERY PLAN)
          </span>
          <span className="text-[10px] text-[#666666]">Engine: SQLite 3.45</span>
        </div>

        <div className="divide-y divide-[#1F1F1F]">
          {queryPlan.map((step, idx) => {
            const isFullScan = step.op_type === 'FULL_TABLE_SCAN';
            const isIndex = step.op_type === 'INDEX_SEARCH';
            const isBTree = step.op_type === 'TEMP_B_TREE';

            return (
              <div
                key={idx}
                className="p-3 flex items-start gap-3 hover:bg-[#151515] transition-colors font-mono"
              >
                <div className="shrink-0 mt-0.5">
                  {isIndex ? (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#0E1A12] border border-[#2E4A35] text-[#38A169]">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  ) : isFullScan ? (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#1C1608] border border-[#4A3B18] text-[#FFC857]">
                      <AlertTriangle className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888]">
                      <Cpu className="h-3 w-3" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#F5F5F5]">{step.detail}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase tracking-wider ${
                        isIndex
                          ? 'bg-[#0E1A12] text-[#38A169] border border-[#2E4A35]'
                          : isFullScan
                          ? 'bg-[#1C1608] text-[#FFC857] border border-[#4A3B18]'
                          : isBTree
                          ? 'bg-[#191124] text-[#B794F4] border border-[#3E2856]'
                          : 'bg-[#1A1A1A] text-[#888888] border border-[#2E2E2E]'
                      }`}
                    >
                      {step.efficiency}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#777777] mt-1">
                    {isIndex && 'B-tree index traversal. Searches records using index pages with minimal I/O reads.'}
                    {isFullScan && 'Sequential row scan. Evaluates every tuple in the table page file.'}
                    {isBTree && 'In-memory transient B-tree created to fulfill ORDER BY, GROUP BY, or DISTINCT sort.'}
                    {!isIndex && !isFullScan && !isBTree && 'Standard scalar expression or projection execution.'}
                  </p>
                </div>

                <div className="shrink-0 text-right text-[10px] text-[#555555]">
                  Step #{idx + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Senior Engineer Architectural Insight */}
      <div className="p-3 rounded-[4px] border border-[#2A2518] bg-[#14120B] text-[11px] text-[#E0C080] flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-[#FFC857] mt-0.5" />
        <div>
          <span className="font-bold text-[#FFC857]">Senior SQL Optimization Insight: </span>
          {hasFullScan ? (
            <span>
              This query executes a sequential scan across table rows. While instant for practice tables under 1,000 records, in enterprise production schemas with 10M+ rows, adding a composite index on the filtered columns transforms execution from O(N) linear time to O(log N) index seeks.
            </span>
          ) : hasTempBTree ? (
            <span>
              Your sorting/grouping required a transient in-memory B-tree. If sorting large datasets in production, aligning the ORDER BY with existing index sort order eliminates the temporary sorting buffer entirely.
            </span>
          ) : (
            <span>
              Query planner successfully leverages index pointers or scalar lookups without superfluous full-table passes.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
