'use client';

import React, { useState, useMemo } from 'react';
import { Database, Columns, Copy, Check, Code2, Table as TableIcon, Play } from 'lucide-react';
import { SchemaTableInfo } from '@/lib/types';

interface SchemaViewerProps {
  problemTitle?: string;
  dynamicTables?: SchemaTableInfo[];
  setupSql?: string;
  onRunSetup?: () => void;
  onOpenSchemaEditor?: () => void;
}

export function SchemaViewer({
  dynamicTables,
  setupSql,
  onRunSetup,
  onOpenSchemaEditor,
}: SchemaViewerProps) {
  // Tabs: Tables (Columns & Constraints), DDL SQL, or Live Table Data
  const [subTab, setSubTab] = useState<'tables' | 'data' | 'ddl'>('tables');

  // ONLY show tables that are actively created in the session via DDL
  const tables = useMemo(() => {
    return dynamicTables || [];
  }, [dynamicTables]);

  const [activeTableIndex, setActiveTableIndex] = useState<number>(0);
  const [copiedDdl, setCopiedDdl] = useState(false);

  const currentTable = tables[activeTableIndex] || tables[0] || null;

  const copyDdlSql = () => {
    if (!setupSql) return;
    navigator.clipboard.writeText(setupSql);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 1500);
  };

  const hasTables = tables.length > 0;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 space-y-4 select-text">
      {/* Sub-Nav: Columns vs Live Table Data */}
      <div className="flex items-center justify-between pb-2 border-b border-[#242424]">
        <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-[5px] border border-[#242424]">
          <button
            onClick={() => setSubTab('tables')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-mono text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'tables'
                ? 'bg-[#1F1F1F] text-[#F5F5F5] shadow-sm'
                : 'text-[#888888] hover:text-[#D4D4D4]'
            }`}
          >
            <Columns className="h-3.5 w-3.5 text-[#38A169]" />
            <span>Columns {hasTables ? `(${tables.length})` : ''}</span>
          </button>

          <button
            onClick={() => setSubTab('data')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-mono text-xs font-semibold transition-all cursor-pointer ${
              subTab === 'data'
                ? 'bg-[#1F1F1F] text-[#F5F5F5] shadow-sm'
                : 'text-[#888888] hover:text-[#D4D4D4]'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5 text-[#4299E1]" />
            <span>Table Data {currentTable ? `(${currentTable.sample_rows?.length || 0})` : ''}</span>
          </button>
        </div>

        {hasTables && (
          <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-[#0E1A12] text-[#48BB78] border border-[#2E4A35]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#48BB78]" />
            <span>Active Session DB</span>
          </span>
        )}
      </div>

      {/* Table Selector Buttons (when there are created tables and viewing tables or data) */}
      {subTab !== 'ddl' && hasTables && (
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#888888] font-semibold uppercase tracking-wider mb-2">
            <Database className="h-3 w-3 text-[#38A169]" />
            <span>CREATED TABLES</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {tables.map((tbl, idx) => {
              const isSelected = activeTableIndex === idx;
              return (
                <button
                  key={tbl.name}
                  onClick={() => setActiveTableIndex(idx)}
                  className={`px-2.5 py-1 rounded-[4px] font-mono text-[11px] font-medium transition-all duration-[120ms] flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E1E1E] text-[#F5F5F5] border border-[#3E3E3E] shadow-sm'
                      : 'bg-[#121212] text-[#B0B0B0] border border-[#242424] hover:border-[#333333]'
                  }`}
                >
                  <span>{tbl.name}</span>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#38A169]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State when no DDL has been executed yet */}
      {subTab !== 'ddl' && !hasTables && (
        <div className="rounded-[8px] border border-[#262626] bg-[#111111] p-6 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-[#181818] border border-[#2A2A2A] text-[#777777]">
            <Database className="h-6 w-6 text-[#888888]" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="font-mono text-sm font-bold text-[#F5F5F5]">
              No DDL Tables Created Yet
            </h4>
            <p className="text-xs text-[#888888] font-mono leading-relaxed">
              Run your <code>schema.sql</code> script to create tables and insert data into your practice database session.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            {onRunSetup && (
              <button
                onClick={onRunSetup}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#38A169] hover:bg-[#2F855A] text-white text-xs font-mono font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Setup (DDL)</span>
              </button>
            )}
            {onOpenSchemaEditor && (
              <button
                onClick={onOpenSchemaEditor}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[4px] bg-[#1A1A1A] hover:bg-[#242424] border border-[#333333] text-xs font-mono text-[#CCCCCC] transition-colors cursor-pointer"
              >
                <Code2 className="h-3.5 w-3.5 text-[#888888]" />
                <span>Edit schema.sql</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: COLUMNS & CONSTRAINTS */}
      {subTab === 'tables' && currentTable && (
        <div className="rounded-[6px] border border-[#242424] bg-[#121212] overflow-hidden shadow-md">
          <div className="p-3.5 border-b border-[#242424] bg-[#0E0E0E]">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-[#F5F5F5]">
                {currentTable.name}
              </span>
              <span className="text-[11px] text-[#777777] font-mono">
                ({currentTable.columns.length} columns, {currentTable.sample_rows?.length || currentTable.row_count || 0} rows)
              </span>
            </div>
          </div>

          {/* Column Definitions Grid */}
          <div className="p-4 space-y-2.5">
            <div className="font-mono text-[10px] uppercase font-semibold text-[#888888] tracking-wider flex items-center gap-1.5">
              <Columns className="h-3 w-3 text-[#38A169]" />
              <span>COLUMNS & DATA TYPES</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentTable.columns.map((col) => (
                <div
                  key={col.name}
                  className="flex items-center justify-between p-2 rounded-[4px] bg-[#0A0A0A] border border-[#202020] font-mono text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    {col.pk ? (
                      <span className="px-1 py-0.2 rounded-[2px] bg-[#221B0B] text-[#FFC857] border border-[#3E3314] text-[9px] font-bold">
                        PK
                      </span>
                    ) : (
                      <span className="text-[#444444] text-[10px]">•</span>
                    )}
                    <span className="font-medium text-[#D4D4D4] truncate">{col.name}</span>
                  </div>
                  <span className="text-[#777777] text-[10px] bg-[#121212] px-1.5 py-0.5 rounded-[2px] border border-[#222222]">
                    {col.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL TABLE DATA GRID */}
      {subTab === 'data' && currentTable && (
        <div className="rounded-[6px] border border-[#242424] bg-[#121212] overflow-hidden shadow-md">
          <div className="p-3 border-b border-[#242424] flex items-center justify-between bg-[#0E0E0E]">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-[#4299E1]" />
              <span className="font-mono text-xs font-bold text-[#F5F5F5]">
                {currentTable.name} ({currentTable.sample_rows?.length || 0} rows inserted)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            {!currentTable.sample_rows || currentTable.sample_rows.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#777777]">
                No rows found in `{currentTable.name}`. Run INSERT statements in <code>schema.sql</code> to populate data.
              </div>
            ) : (
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#242424] text-[#888888]">
                    {currentTable.columns.map((col) => (
                      <th key={col.name} className="px-3.5 py-2 font-semibold text-[11px] whitespace-nowrap">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {currentTable.sample_rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#161616] transition-colors">
                      {currentTable.columns.map((col) => (
                        <td key={col.name} className="px-3.5 py-2 text-[#CCCCCC] text-[11px] whitespace-nowrap">
                          {String(row[col.name] !== undefined && row[col.name] !== null ? row[col.name] : 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: DDL SQL (The exact DDL script) */}
      {subTab === 'ddl' && (
        <div className="rounded-[6px] border border-[#242424] bg-[#121212] overflow-hidden shadow-md">
          <div className="p-3 border-b border-[#242424] flex items-center justify-between bg-[#0E0E0E]">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-[#38A169]" />
              <span className="font-mono text-xs font-bold text-[#F5F5F5]">DDL CODE</span>
            </div>
            {setupSql && (
              <button
                onClick={copyDdlSql}
                className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] font-mono text-[10px] text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1E1E1E] transition-colors cursor-pointer"
                title="Copy DDL SQL"
              >
                {copiedDdl ? <Check className="h-3 w-3 text-[#38A169]" /> : <Copy className="h-3 w-3" />}
                <span>{copiedDdl ? 'COPIED' : 'COPY DDL'}</span>
              </button>
            )}
          </div>
          <div className="p-4 bg-[#090909]">
            <pre className="font-mono text-xs text-[#CCCCCC] whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[480px]">
              {setupSql || '-- No DDL script entered yet.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
