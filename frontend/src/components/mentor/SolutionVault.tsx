'use client';

import React, { useState } from 'react';
import {
  Lock, Unlock, Sparkles, Trophy, Check,
  Copy, ArrowRight, Zap, AlertTriangle, BookOpen, Clock,
  Cpu, HelpCircle, Layers
} from 'lucide-react';
import { ChallengeDetail } from '@/lib/types';
import { getProblemSolution, ProblemSolution } from '@/lib/problem-intelligence';
import {
  getDialectComparison,
  DialectComparison,
  SqlDialectId,
  SQL_DIALECTS
} from '@/lib/dialect-comparisons';
import { DialectComparisonView } from './DialectComparisonView';

interface SolutionVaultProps {
  problem: ChallengeDetail;
  isSolved: boolean;
  unlocked: boolean;
  hintsUsedCount?: number;
  onUnlock: () => void;
  onLoadCodeToEditor: (code: string) => void;
  onSubmitCode?: () => void;
}

export const SolutionVault: React.FC<SolutionVaultProps> = ({
  problem,
  isSolved,
  unlocked,
  hintsUsedCount,
  onUnlock,
  onLoadCodeToEditor,
  onSubmitCode,
}) => {
  const [isBreakingLock, setIsBreakingLock] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeDialect, setActiveDialect] = useState<SqlDialectId>('sqlite');
  const [loadedDialectMsg, setLoadedDialectMsg] = useState<string | null>(null);

  const solution: ProblemSolution = React.useMemo(() => {
    return getProblemSolution(problem);
  }, [problem]);

  const dialectComparison: DialectComparison = React.useMemo(() => {
    return getDialectComparison(problem, solution?.code);
  }, [problem, solution]);

  const activeCode = dialectComparison.queries[activeDialect]?.code || solution.code;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLoad = (code: string) => {
    onLoadCodeToEditor(code);
    setLoaded(true);
    setTimeout(() => setLoaded(false), 2500);
  };

  // 1. LOCKED VAULT VIEW
  if (!unlocked) {
    return (
      <div className="relative h-full flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md w-full space-y-5">
          {/* Animated lock */}
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-2xl bg-[#D29922]/10 border border-[#D29922]/30 ${isBreakingLock ? 'scale-150 opacity-0 transition-all duration-700' : 'animate-pulse-glow'}`} />
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-b from-[#1F242C] to-[#161B22] border border-[#30363D] flex items-center justify-center shadow-xl">
              {isBreakingLock ? (
                <Unlock className="w-7 h-7 text-emerald-400 animate-bounce" />
              ) : (
                <Lock className="w-7 h-7 text-[#D29922]" />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D29922]/15 text-[#D29922] text-[11px] font-mono font-semibold border border-[#D29922]/30">
              <Lock className="w-3 h-3" /> OFFICIAL SOLUTION LOCKED
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#E6EDF3] tracking-tight">
              Submit Your Code to Unlock
            </h3>
            <p className="text-xs text-[#8B949E] leading-relaxed max-w-sm mx-auto">
              Write your logic in the editor and click <span className="text-emerald-400 font-semibold">Submit</span>. Once your solution passes all test cases, the official canonical solution and interview breakdown unlock automatically!
            </p>
          </div>

          {/* Unlock Requirements */}
          <div className="rounded-xl border border-[#21262D] bg-[#111622]/80 backdrop-blur-md p-3.5 text-left space-y-2">
            <span className="text-[10px] font-mono text-[#8B949E] uppercase tracking-wider font-semibold block">
              How to Unlock:
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[#E6EDF3]">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <span>Solve the problem & pass all test cases</span>
              </div>
              <div className="flex items-center gap-2 text-[#8B949E]">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold">
                  OR
                </div>
                <span>Use emergency reveal button below</span>
              </div>
            </div>
          </div>

          {/* Force Reveal Button */}
          <button
            onClick={() => {
              setIsBreakingLock(true);
              setTimeout(() => {
                onUnlock();
                setIsBreakingLock(false);
              }, 600);
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-[#30363D] bg-[#161B22] hover:bg-[#21262D] text-xs font-mono text-[#8B949E] hover:text-[#E6EDF3] transition-all flex items-center justify-center gap-2"
          >
            <Unlock className="w-3.5 h-3.5 text-[#D29922]" />
            <span>Reveal Official Solution Immediately</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. UNLOCKED VAULT VIEW
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 select-text">
      {/* Unlocked Header Banner */}
      <div className="rounded-2xl border border-[#238636]/40 bg-gradient-to-r from-[#238636]/15 via-[#161B22] to-[#161B22] p-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#238636]/20 border border-[#238636]/40 flex items-center justify-center text-[#3FB950]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono text-[#3FB950] font-bold uppercase tracking-wider block">
              {isSolved ? '🎉 Challenge Solved by You!' : 'Official Solution Unlocked'}
            </span>
            <h4 className="text-sm sm:text-base font-bold text-[#E6EDF3]">
              Canonical Solution & Interview Guide
            </h4>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#21262D] border border-[#30363D] text-[#8B949E]">
          ID: {problem.code_id}
        </span>
      </div>

      {/* Solution Deep-Dive Card */}
      {solution && (
        <div className="rounded-2xl border border-[#30363D] bg-[#161B22] p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Solution Header & Complexities */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#30363D] pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#3FB950]">
                  Official Solution
                </span>
                <span className="text-xs text-[#8B949E]">•</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262D] border border-[#30363D] text-[#8B949E]">
                  {problem.code_id}
                </span>
              </div>
              <h5 className="text-base font-bold text-[#E6EDF3] mt-0.5">
                {solution.title}
              </h5>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-[#0D1117] border border-[#30363D] text-[#58A6FF] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time: {solution.timeComplexity}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#0D1117] border border-[#30363D] text-[#A371F7] flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Space: {solution.spaceComplexity}
              </span>
              {dialectComparison.hasDivergence ? (
                <button
                  onClick={() => {
                    const el = document.getElementById('dialect-comparison-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-2 py-0.5 rounded-[4px] bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all text-[11px] font-mono font-medium flex items-center gap-1.5 cursor-pointer"
                  title="View dialect variations below"
                >
                  <Layers className="w-3 h-3" />
                  <span>{dialectComparison.category} Variance</span>
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-[4px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-mono font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>ANSI Portable</span>
                </span>
              )}
            </div>
          </div>

          {/* Code Canvas with Clean Dialect Switcher and Single Load to Editor Button */}
          <div className="rounded-xl border border-[#30363D] bg-[#0D1117] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161B22]/90 border-b border-[#21262D] text-xs gap-2">
              {/* Dialect Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                {(['sqlite', 'postgres', 'mysql', 'snowflake'] as SqlDialectId[]).map((dId) => {
                  const meta = SQL_DIALECTS[dId];
                  const isSelected = activeDialect === dId;
                  return (
                    <button
                      key={dId}
                      onClick={() => setActiveDialect(dId)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? `${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder} shadow-sm font-semibold`
                          : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#21262D] border border-transparent'
                      }`}
                    >
                      {dId === 'sqlite' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      <span>{meta.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Actions: Copy & Load to Editor */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopy(activeCode)}
                  className="px-2 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] hover:text-white transition-all flex items-center gap-1 text-[11px] font-medium shadow-sm cursor-pointer"
                  title="Copy Solution SQL"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => {
                    handleLoad(activeCode);
                    if (activeDialect !== 'sqlite') {
                      setLoadedDialectMsg(`Loaded ${SQL_DIALECTS[activeDialect].name} syntax. Sandbox executes in SQLite.`);
                      setTimeout(() => setLoadedDialectMsg(null), 4000);
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-[#1F6FEB] hover:bg-[#388BFD] text-white transition-all flex items-center gap-1 text-[11px] font-semibold shadow-sm cursor-pointer"
                >
                  {loaded ? <Check className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                  <span>{loaded ? 'Loaded!' : 'Load to Editor'}</span>
                </button>
              </div>
            </div>

            {/* Subtle Non-sandbox Dialect Note */}
            {activeDialect !== 'sqlite' && (
              <div className="px-3 py-1.5 bg-[#12161E] border-b border-[#21262D] text-[11px] font-mono text-[#8B949E] flex items-center justify-between gap-2">
                <span>
                  <strong className={SQL_DIALECTS[activeDialect].badgeText}>{SQL_DIALECTS[activeDialect].name}</strong> preview • Sandbox runs SQLite
                </span>
                <button
                  onClick={() => setActiveDialect('sqlite')}
                  className="text-cyan-400 hover:underline shrink-0 text-[10px]"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Toast alert on loading non-sandbox SQL */}
            {loadedDialectMsg && (
              <div className="px-3 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{loadedDialectMsg}</span>
              </div>
            )}

            <pre className="p-4 sm:p-5 font-mono text-sm sm:text-base text-[#E6EDF3] leading-relaxed overflow-x-auto whitespace-pre selection:bg-[#58A6FF]/20">
              {activeCode}
            </pre>
          </div>

          {/* 1. The Intuitive Mental Model */}
          {solution.mentalModel && (
            <div className="space-y-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#58A6FF] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#58A6FF]" /> The Intuitive Mental Model
              </span>
              <div className="text-sm sm:text-base text-[#E6EDF3] leading-relaxed bg-[#0D1117] p-4 sm:p-5 rounded-xl border border-[#30363D] space-y-2 shadow-inner">
                <p>{solution.mentalModel}</p>
              </div>
            </div>
          )}

          {/* 2. Line-by-Line Breakdown */}
          {solution.lineByLine && solution.lineByLine.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#A371F7] font-bold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#A371F7]" /> Line-by-Line Breakdown
              </span>
              <div className="space-y-2.5">
                {solution.lineByLine.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-[#21262D] bg-[#0D1117] p-3.5 space-y-1.5 text-sm">
                    <div className="font-mono text-[#58A6FF] font-semibold bg-[#161B22] px-2.5 py-1 rounded w-fit text-xs sm:text-sm">
                      {item.line}
                    </div>
                    <FormattedExplanation text={item.explanation} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Common Beginner Traps */}
          {solution.beginnerTraps && solution.beginnerTraps.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-[#D29922] font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D29922]" /> Beginner Traps &amp; &quot;Why Not Do This?&quot;
              </span>
              <div className="space-y-2">
                {solution.beginnerTraps.map((trap, idx) => (
                  <div key={idx} className="rounded-xl border border-[#D29922]/20 bg-[#D29922]/10 p-3.5 text-sm text-[#E6EDF3] leading-relaxed">
                    {trap}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. The Golden Takeaway Rule */}
          {solution.keyTakeaway && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#161B22] to-[#161B22] text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider block">
                🎯 The Golden Engineering Takeaway:
              </span>
              <p className="text-white font-medium leading-relaxed">
                &quot;{solution.keyTakeaway}&quot;
              </p>
            </div>
          )}

          {/* 5. Why Interviewers Love This */}
          {solution.interviewPros && (
            <div className="rounded-xl border border-[#238636]/30 bg-[#238636]/10 p-4 space-y-2 text-xs sm:text-sm">
              <span className="font-bold text-[#3FB950] flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#3FB950]" /> Why Interviewers Love This
              </span>
              <div className="text-[#E6EDF3] leading-relaxed space-y-1.5 pl-1">
                {Array.isArray(solution.interviewPros)
                  ? solution.interviewPros.map((pro, i) => (
                      <p key={i} className="text-[#E6EDF3]">
                        {pro.startsWith('•') || pro.startsWith('Q') ? pro : `• ${pro}`}
                      </p>
                    ))
                  : <p>{solution.interviewPros}</p>}
              </div>
            </div>
          )}

          {/* 6. Cross-Dialect Interview Comparison Section */}
          <div id="dialect-comparison-section" className="scroll-mt-4 pt-1">
            <DialectComparisonView
              comparison={dialectComparison}
              activeDialect={activeDialect}
              onSelectDialect={(dId) => setActiveDialect(dId)}
              onLoadCodeToEditor={(code, dId) => {
                handleLoad(code);
                if (dId !== 'sqlite') {
                  setLoadedDialectMsg(`Loaded ${SQL_DIALECTS[dId].name} syntax into Monaco. Note: Execution runs against the SQLite sandbox.`);
                  setTimeout(() => setLoadedDialectMsg(null), 4000);
                }
              }}
            />
          </div>

          {/* 7. Deep Dive Interview, Performance & Real-World Use Case Cards (Stacked Vertically with Rich Color Themes) */}
          {solution.interviewCons && (
            <div className="space-y-4 pt-1">
              {(Array.isArray(solution.interviewCons) ? solution.interviewCons : [solution.interviewCons]).map((item, idx) => (
                <SectionCard key={idx} content={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CodeSnippetBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightSql = (sql: string) => {
    const keywords = /\b(SELECT|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|AS|WITH|COUNT|SUM|AVG|MIN|MAX|DISTINCT|CASE|WHEN|THEN|ELSE|END)\b/g;
    const parts = sql.split(keywords);

    return parts.map((part, idx) => {
      if (keywords.test(part)) {
        return (
          <span key={idx} className="text-[#FF7B72] font-semibold">
            {part}
          </span>
        );
      }
      return <span key={idx} className="text-[#79C0FF]">{part}</span>;
    });
  };

  return (
    <div className="relative group my-2.5 rounded-xl border border-[#30363D] bg-[#0D1117] p-3 font-mono text-xs sm:text-sm overflow-x-auto shadow-inner">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#21262D] text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">
        <span className="flex items-center gap-1.5 text-[#3FB950]">
          <span className="w-2 h-2 rounded-full bg-[#3FB950]" /> SQL CODE
        </span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition-colors flex items-center gap-1 font-mono text-[10px] text-[#8B949E]"
        >
          {copied ? <Check className="w-3 h-3 text-[#3FB950]" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="leading-relaxed whitespace-pre font-mono">
        {highlightSql(code)}
      </pre>
    </div>
  );
};

const FormattedExplanation: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // 1. If text contains markdown code blocks ```
  const codeBlockRegex = /```(?:sql|SQL)?\n?([\s\S]*?)```/g;
  if (codeBlockRegex.test(text)) {
    codeBlockRegex.lastIndex = 0;
    const parts: Array<{ type: 'text' | 'code'; content: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', content: match[1].trim() });
      lastIndex = codeBlockRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return (
      <div className="space-y-2 pt-1">
        {parts.map((part, i) => {
          if (part.type === 'code') {
            return <CodeSnippetBlock key={i} code={part.content} />;
          }
          return (
            <p key={i} className="text-[#E6EDF3] leading-relaxed whitespace-pre-wrap pl-1">
              {part.content.trim()}
            </p>
          );
        })}
      </div>
    );
  }

  // 2. Parse text into sections (Method X, headers, and SQL code blocks)
  const lines = text.split('\n');
  const blocks: Array<{ type: 'text' | 'code'; lines: string[] }> = [];
  let currentBlock: { type: 'text' | 'code'; lines: string[] } | null = null;

  const isSqlLine = (line: string, prevType?: 'text' | 'code') => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Explanatory prose text indicators (sentences explaining SQL keywords)
    const isProseText = /\b(tells|means|explains|allows|returns|retrieves|used|where the|table name|data is|reads all|contains|clause|keyword)\b/i.test(trimmed) ||
      (trimmed.includes('.') && !trimmed.endsWith(';'));

    if (isProseText) return false;

    if (/^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WITH|INSERT|UPDATE|DELETE)\b/i.test(trimmed)) {
      return true;
    }
    if (prevType === 'code' && (trimmed.endsWith(';') || trimmed.includes(',') || /^[a-zA-Z0-9_*`"'.\s]+$/i.test(trimmed))) {
      return true;
    }
    return false;
  };

  for (const line of lines) {
    const isCode = isSqlLine(line, currentBlock?.type);
    const targetType = isCode ? 'code' : 'text';

    if (!currentBlock || currentBlock.type !== targetType) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: targetType, lines: [line] };
    } else {
      currentBlock.lines.push(line);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  return (
    <div className="space-y-2 pt-1">
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          const codeText = block.lines.join('\n').trim();
          if (codeText) {
            return <CodeSnippetBlock key={i} code={codeText} />;
          }
        }
        const textContent = block.lines.join('\n').trim();
        if (!textContent) return null;
        return (
          <p key={i} className="text-[#E6EDF3] leading-relaxed whitespace-pre-wrap pl-1">
            {textContent}
          </p>
        );
      })}
    </div>
  );
};

const SectionCard: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const trimmed = content.trim();

  let theme = {
    border: 'border-[#30363D]',
    bg: 'bg-gradient-to-r from-[#161B22] to-[#0D1117]',
    badgeBg: 'bg-[#21262D]',
    badgeText: 'text-[#58A6FF]',
    badgeBorder: 'border-[#30363D]',
    title: 'INSPECTION NOTE',
    icon: Sparkles,
  };

  if (trimmed.includes('⚡ Performance Notes') || trimmed.startsWith('⚡')) {
    theme = {
      border: 'border-amber-500/40',
      bg: 'bg-gradient-to-r from-amber-500/15 via-[#161B22] to-[#0D1117]',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      title: '⚡ PERFORMANCE NOTES',
      icon: Zap,
    };
  } else if (trimmed.includes('🌍 Real-World Use Cases') || trimmed.startsWith('🌍')) {
    theme = {
      border: 'border-sky-500/40',
      bg: 'bg-gradient-to-r from-sky-500/15 via-[#161B22] to-[#0D1117]',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-500/30',
      title: '🌍 REAL-WORLD USE CASES',
      icon: HelpCircle,
    };
  } else if (trimmed.includes('🎓 Company Interview Tip') || trimmed.includes('Frequently Asked By') || trimmed.startsWith('🎓')) {
    theme = {
      border: 'border-purple-500/40',
      bg: 'bg-gradient-to-r from-purple-500/20 via-[#161B22] to-[#0D1117]',
      badgeBg: 'bg-purple-500/25',
      badgeText: 'text-purple-300',
      badgeBorder: 'border-purple-500/40',
      title: '🎓 COMPANY INTERVIEW TIP',
      icon: Trophy,
    };
  } else if (trimmed.includes('⭐ Questions Interviewers Will Ask') || trimmed.startsWith('⭐')) {
    theme = {
      border: 'border-emerald-500/40',
      bg: 'bg-gradient-to-r from-emerald-500/15 via-[#161B22] to-[#0D1117]',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      title: '⭐ QUESTIONS INTERVIEWERS WILL ASK',
      icon: BookOpen,
    };
  } else if (trimmed.includes('🔥 Pro Tip') || trimmed.startsWith('🔥')) {
    theme = {
      border: 'border-orange-500/40',
      bg: 'bg-gradient-to-r from-orange-500/15 via-[#161B22] to-[#0D1117]',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      title: '🔥 PRO TIP (INTERVIEW EXECUTION ORDER)',
      icon: Zap,
    };
  }

  let bodyText = content;
  const matchHeader = content.match(/^(?:⚡ Performance Notes|🌍 Real-World Use Cases|🎓 Company Interview Tip[^:]*|⭐ Questions Interviewers Will Ask|🔥 Pro Tip[^:]*):\s*/i);
  if (matchHeader) {
    bodyText = content.slice(matchHeader[0].length);
  }

  const IconComp = theme.icon;

  return (
    <div className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5 text-xs sm:text-sm space-y-3 shadow-xl relative overflow-hidden backdrop-blur-md transition-all hover:border-opacity-80`}>
      <div className="flex items-center justify-between pb-1 border-b border-[#21262D]">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} text-[11px] font-mono font-bold uppercase tracking-wider`}>
          <IconComp className="w-3.5 h-3.5" />
          {theme.title}
        </span>
      </div>
      <FormattedExplanation text={bodyText} />
    </div>
  );
};
