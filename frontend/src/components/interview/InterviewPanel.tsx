'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Check,
  Copy,
  Building2,
  Volume2,
  ChevronDown,
  ChevronUp,
  Search,
  Code,
  X,
  Maximize2,
  Minimize2,
  Lock
} from 'lucide-react';
import { ChallengeDetail } from '@/lib/types';
import { getProblemStudyData } from '@/lib/interview-engine';
import { soundFX } from '@/lib/audio';

interface InterviewPanelProps {
  problem: ChallengeDetail;
  isSolved?: boolean;
  onClose?: () => void;
}

type TabType = 'interview' | 'mistakes';

export const InterviewPanel: React.FC<InterviewPanelProps> = ({ problem, isSolved = false, onClose }) => {
  const data = getProblemStudyData(problem);
  const [activeTab, setActiveTab] = useState<TabType>('interview');
  const [isExpanded, setIsExpanded] = useState(false);

  // Interview Q&A State
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAnswerId, setCopiedAnswerId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [expandedQA, setExpandedQA] = useState<Record<string, boolean>>({
    q1: true,
    q2: true,
    q3: true,
    q4: true,
    q5: true,
    q6: true,
    q7: true,
    'fallback-q1': true,
  });

  const handleClose = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false);
    } else if (onClose) {
      onClose();
    }
  }, [isExpanded, onClose]);

  // Handle ESC key to minimize or close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAnswerId(id);
    soundFX.playHintDing();
    setTimeout(() => setCopiedAnswerId(null), 2000);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    soundFX.playHintDing();
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const toggleQA = (id: string) => {
    setExpandedQA((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter questions by search
  const filteredQuestions = data.questions.filter(
    (q) =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.bestReplyScript.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Strictly lock Interview Q&A if challenge has not been solved/submitted
  if (!isSolved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] p-6 text-center select-none font-sans">
        <div className="w-full max-w-md flex flex-col items-center justify-center p-6 bg-[#121212] border border-[#242424] rounded-2xl shadow-xl text-center space-y-5 relative overflow-hidden">
          <div className="absolute w-48 h-48 rounded-full bg-gradient-to-tr from-[#FF6B00]/10 via-[#FFA116]/10 to-transparent blur-2xl pointer-events-none" />

          {/* Holographic Lock */}
          <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] flex items-center justify-center shadow-lg">
            <Lock className="w-7 h-7 text-[#FF6B00]" />
          </div>

          <div className="relative z-10 space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] text-[10px] font-mono font-semibold border border-[#FF6B00]/30">
              <Lock className="w-3 h-3" /> INTERVIEW PREP LOCKED
            </span>
            <h3 className="text-lg font-bold text-[#F5F5F5] tracking-tight">
              Pass Test Cases to Unlock
            </h3>
            <p className="text-xs text-[#888888] leading-relaxed max-w-xs mx-auto">
              Unlock spoken interview scripts, execution plan trade-offs, and rookie traps once your query passes all test suites!
            </p>
          </div>

          {/* Unlock Requirements */}
          <div className="relative z-10 w-full rounded-xl border border-[#222222] bg-[#161616] p-3.5 text-left space-y-2">
            <span className="text-[10px] font-mono text-[#777777] uppercase tracking-wider font-semibold block">
              How to Unlock:
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[#D4D4D4]">
                <div className="w-4 h-4 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <span>Draft your query in <strong>query.sql</strong></span>
              </div>
              <div className="flex items-center gap-2 text-[#D4D4D4]">
                <div className="w-4 h-4 rounded-full bg-[#48BB78]/20 text-[#48BB78] border border-[#48BB78]/40 flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <span>Click <strong>Submit</strong> and pass all test suites</span>
              </div>
            </div>
          </div>

          {onClose && (
            <div className="relative z-10 w-full pt-1">
              <button
                onClick={onClose}
                className="w-full py-2 px-3 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] text-xs font-semibold text-[#F5F5F5] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Back to Specification</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderInnerContent = () => (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0D1117]">
      {/* Top Header Bar */}
      <div className="px-3.5 sm:px-4 py-2.5 border-b border-[#242424] bg-[#121212] flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#333333] bg-[#0E0E0E] text-[#FF6B00] shrink-0">
            {data.difficulty}
          </span>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
              {data.problemTitle} — Interview Study Hub
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-[#888888] truncate mt-0.5">
              <Building2 className="w-3 h-3 text-[#FF6B00] shrink-0" />
              <span className="truncate">Asked by: {data.companyTags.slice(0, 4).join(', ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-[4px] bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] text-[#888888] hover:text-[#F5F5F5] transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            title={isExpanded ? 'Minimize to Sidebar (Esc)' : 'Expand Fullscreen'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#58A6FF]" />
                <span className="hidden sm:inline">Minimize</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-[4px] bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] text-[#888888] hover:text-[#F85149] transition-colors cursor-pointer"
              title="Close Interview View"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Buttons */}
      <div className="px-3 sm:px-4 py-1.5 border-b border-[#202020] bg-[#161616] flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('interview')}
          className={`px-3 py-1 rounded-[4px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'interview'
              ? 'bg-[#FF6B00] text-black shadow-sm font-bold'
              : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#222222]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Interview Q&amp;A ({data.questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-3 py-1 rounded-[4px] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'mistakes'
              ? 'bg-[#FF6B00] text-black shadow-sm font-bold'
              : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#222222]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Rookie Pitfalls ({data.mistakes.length})</span>
        </button>
      </div>

      {/* Scrollable Content Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-3 sm:p-5 space-y-4 pb-12">
        {activeTab === 'interview' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#666666]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. 'Indexing', 'Execution Plan', 'SARGable', 'Joins')..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#161B22] border border-[#30363D] text-xs text-[#F0F6FC] placeholder-[#666666] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => {
                const isItemExpanded = expandedQA[q.id] ?? true;

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[#242424] bg-[#121212] overflow-hidden shadow-sm"
                  >
                    <div
                      onClick={() => toggleQA(q.id)}
                      className="p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-[#181818] transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00]">
                            Q{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#2A2A2A] bg-[#0E0E0E] text-[#888888]">
                            {q.category}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] leading-snug">
                          {q.question}
                        </h3>
                        <div className="text-[11px] text-[#888888] flex items-center gap-1.5 pt-0.5">
                          <span className="font-semibold text-[#D4D4D4]">Evaluates:</span>
                          <span className="truncate">{q.whatInterviewerChecks}</span>
                        </div>
                      </div>

                      <button className="p-1 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888] hover:text-[#F5F5F5] shrink-0">
                        {isItemExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isItemExpanded && (
                      <div className="p-3.5 sm:p-4 pt-2 border-t border-[#202020] space-y-3 bg-[#0A0D12]">
                        {/* Spoken Answer Quote Card */}
                        <div className="rounded-lg border border-[#242424] bg-[#121212] p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5" />
                              Best Spoken Answer:
                            </span>
                            <button
                              onClick={() => handleCopyAnswer(q.id, q.bestReplyScript)}
                              className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-[#D4D4D4] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              {copiedAnswerId === q.id ? (
                                <>
                                  <Check className="w-3 h-3 text-[#48BB78]" />
                                  <span className="text-[#48BB78]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Script</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-xs sm:text-sm text-[#F0F6FC] leading-relaxed whitespace-pre-wrap font-sans">
                            {q.bestReplyScript}
                          </div>
                        </div>

                        {/* Key Terms Badges */}
                        {q.keyPoints && q.keyPoints.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#777777] block">
                              Key Concepts to Mention:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {q.keyPoints.map((point, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2 py-0.5 rounded border border-[#252525] bg-[#141414] text-[11px] font-medium text-[#C9D1D9]"
                                >
                                  • {point}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full Code Follow-Up Snippet */}
                        {q.codeSnippet && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-[#888888] pt-1">
                              <span className="font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-1">
                                <Code className="w-3.5 h-3.5" />
                                SQL Query Follow-Up:
                              </span>
                              <button
                                onClick={() => handleCopyCode(q.id, q.codeSnippet!)}
                                className="px-2 py-0.5 rounded border border-[#2A2A2A] bg-[#181818] hover:bg-[#222222] text-[10px] text-[#C9D1D9] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedCodeId === q.id ? <Check className="w-3 h-3 text-[#48BB78]" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedCodeId === q.id ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>

                            <div className="rounded-lg border border-[#202020] bg-[#07090C] p-3 font-mono text-xs text-[#E6EDF3] leading-relaxed overflow-x-auto">
                              <pre className="whitespace-pre-wrap break-words">{q.codeSnippet}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: COMMON MISTAKES */}
        {activeTab === 'mistakes' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="border-b border-[#242424] pb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#F0F6FC]">
                ⚠️ Common Rookie Mistakes &amp; Traps
              </h3>
              <p className="text-xs text-[#888888] mt-0.5">
                Top relational querying bugs and pitfalls candidates make during technical interviews.
              </p>
            </div>

            <div className="space-y-3">
              {data.mistakes.map((m) => (
                <div key={m.id} className="rounded-xl border border-[#242424] bg-[#121212] p-3.5 sm:p-4 space-y-3 shadow-sm min-w-0">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#F85149] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#F5F5F5] break-words">{m.title}</h4>
                      <p className="text-xs text-[#C9D1D9] leading-relaxed mt-0.5 break-words">
                        {m.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="rounded-lg border border-[#F85149]/30 bg-[#F85149]/5 p-2.5 space-y-1 min-w-0 overflow-hidden">
                      <span className="text-[10px] font-mono font-bold text-[#F85149] block">❌ Buggy Query Pattern</span>
                      <code className="text-xs font-mono text-[#F0F6FC] block whitespace-pre-wrap break-words leading-relaxed">{m.badSnippet}</code>
                    </div>

                    <div className="rounded-lg border border-[#2A2A2A] bg-[#0E0E0E] p-2.5 space-y-1 min-w-0 overflow-hidden">
                      <span className="text-[10px] font-mono font-bold text-[#888888] block">📥 Failing Tuple Case</span>
                      <code className="text-xs font-mono text-[#FF9B42] block whitespace-pre-wrap break-words leading-relaxed">{m.failingInput}</code>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#48BB78]/30 bg-[#48BB78]/5 p-2.5 space-y-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[#48BB78] block">✅ How to Write Correctly</span>
                    <p className="text-xs text-[#F0F6FC] font-medium leading-relaxed break-words">{m.howToFix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-text font-sans">
        <div className="w-full max-w-5xl h-[92vh] flex flex-col bg-[#0D1117] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden relative">
          {renderInnerContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden select-text font-sans">
      {renderInnerContent()}
    </div>
  );
};
