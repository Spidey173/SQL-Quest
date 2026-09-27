import React, { useMemo } from 'react';
import { Table, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';

interface SqlQueryResultTableProps {
  rawOutput?: string;
  columns?: string[];
  rows?: (string | number | boolean | null | undefined)[][];
  error?: string;
  expectedOutput?: string;
  isVerification?: boolean;
  isSuccess?: boolean;
  executionTimeMs?: number;
  tableName?: string;
}

export interface ParsedTableData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export function parseSqlOutput(text?: string): ParsedTableData | null {
  if (!text || !text.trim()) return null;

  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Filter out divider lines (like ---- | ---- or ----------)
  const nonDividerLines = lines.filter((line) => !/^[-+|: ]+$/.test(line));
  if (nonDividerLines.length === 0) return null;

  // Detect delimiter (pipe | or tab or comma)
  const firstLine = nonDividerLines[0];
  let delimiter = '|';
  if (firstLine.includes('|')) {
    delimiter = '|';
  } else if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  } else {
    // Single column output
    const headers = [firstLine];
    const rows = nonDividerLines.slice(1).map((r) => [r]);
    return { headers, rows, totalRows: rows.length };
  }

  const headers = firstLine
    .split(delimiter)
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  const rows = nonDividerLines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    // In pipe-delimited output, sometimes leading/trailing empty cells exist
    if (cells.length > headers.length && cells[0] === '') cells.shift();
    if (cells.length > headers.length && cells[cells.length - 1] === '') cells.pop();

    // Ensure row matches headers length
    while (cells.length < headers.length) cells.push('NULL');
    return cells.slice(0, headers.length);
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

export const SqlResultGrid: React.FC<SqlQueryResultTableProps> = ({
  rawOutput,
  columns,
  rows,
  error,
  isVerification = false,
  isSuccess = true,
  executionTimeMs = 12,
  tableName = 'employees',
}) => {
  const actualParsed = useMemo(() => {
    if (columns && columns.length > 0 && Array.isArray(rows)) {
      return {
        headers: columns,
        rows: rows.map((r) => (Array.isArray(r) ? r.map((c) => (c !== null && c !== undefined ? String(c) : 'NULL')) : [String(r)])),
        totalRows: rows.length,
      };
    }
    return parseSqlOutput(rawOutput);
  }, [columns, rows, rawOutput]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-[#180D0D] border border-[#522020] text-[#F87171] space-y-2 font-mono text-xs animate-in fade-in duration-150">
        <div className="flex items-center gap-2 font-bold text-sm text-[#EF4444]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>SQL Execution Error</span>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed bg-[#0E0E0E] p-3 rounded border border-[#331818] text-[#FCA5A5]">
          {error}
        </p>
        <div className="text-[11px] text-[#A1A1AA] pt-1">
          💡 Check your column names, table name (<code className="text-[#FF9B42]">{tableName}</code>), or syntax spelling.
        </div>
      </div>
    );
  }

  if (!actualParsed || actualParsed.headers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#71717A] space-y-2 font-mono">
        <Database className="w-8 h-8 text-[#3F3F46] animate-pulse" />
        <span className="text-xs">No query result to display. Write your SQL and click RUN or VERIFY.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 font-sans">
      {/* Summary Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono px-1">
        <div className="flex items-center gap-2">
          {isVerification && isSuccess ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0E1A12] border border-[#2E4A35] text-[#38A169] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Output
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161616] border border-[#2A2A2A] text-[#E4E4E7] font-semibold">
              <Table className="w-3.5 h-3.5 text-[#FF6B00]" /> Query Output ({actualParsed.totalRows} {actualParsed.totalRows === 1 ? 'row' : 'rows'})
            </span>
          )}
          <span className="text-[11px] text-[#71717A]">
            • {actualParsed.headers.length} columns
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#71717A]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#A1A1AA]" />
            {executionTimeMs}ms
          </span>
          <span>• SQLite 3.45</span>
        </div>
      </div>

      {/* Primary Data Grid */}
      <div className="flex-1 min-h-[140px] border border-[#262626] rounded-md overflow-hidden bg-[#111111] flex flex-col shadow-inner">
        <div className="overflow-auto flex-1 max-h-[300px] scrollbar-thin">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-[#1A1A1A] border-b border-[#2D2D2D] z-10 shadow-sm">
              <tr>
                <th className="py-2 px-3 text-[10px] text-[#71717A] border-r border-[#2D2D2D] w-10 text-center font-bold">#</th>
                {actualParsed.headers.map((col, idx) => (
                  <th
                    key={idx}
                    className="py-2 px-3 text-[#FF9B42] font-semibold tracking-wide border-r border-[#2D2D2D] whitespace-nowrap uppercase text-[11px]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actualParsed.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={actualParsed.headers.length + 1}
                    className="py-8 text-center text-[#71717A] italic"
                  >
                    (0 rows returned)
                  </td>
                </tr>
              ) : (
                actualParsed.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-[#1E1E1E] hover:bg-[#181818] transition-colors group"
                  >
                    <td className="py-1.5 px-3 text-[10px] text-[#52525B] border-r border-[#1E1E1E] text-center font-bold bg-[#141414]">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-1.5 px-3 border-r border-[#1E1E1E] whitespace-nowrap text-[12px] ${cell === 'NULL'
                            ? 'text-[#71717A] italic'
                            : 'text-[#E4E4E7]'
                          }`}
                      >
                        {cell}
                      </td>
                    ))}
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


