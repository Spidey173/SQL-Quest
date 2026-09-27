'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, BookOpen, LayoutDashboard, BarChart2,
  Terminal, CornerDownLeft, RotateCcw, Copy, Check
} from 'lucide-react';
import { TechnicalDifficulty } from './Badge';
import { ALL_PROBLEM_SOLUTIONS } from '@/lib/ranked-solutions-data';

export interface CommandItem {
  id: string;
  category: 'Actions' | 'Navigation' | 'Modules' | 'Problems';
  title: string;
  subtitle?: string;
  badge?: string;
  shortcut?: string;
  icon: React.ReactNode;
  perform: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleSidebar?: () => void;
  onToggleConsole?: () => void;
  onResetCode?: () => void;
  currentProblemId?: number;
}

const MODULES = [
  { id: 1, title: 'Module 1: Projections & Filtering' },
  { id: 2, title: 'Module 2: Aggregations & Grouping' },
  { id: 3, title: 'Module 3: Basic Joins & Set Operations' },
  { id: 4, title: 'Module 4: Predicates & Built-in Functions' },
  { id: 5, title: 'Module 5: Business Aggregations & Thresholds' },
  { id: 6, title: 'Module 6: Relational Joins & Data Integrity' },
  { id: 7, title: 'Module 7: Conditional Logic & Transformations' },
  { id: 8, title: 'Module 8: Temporal Analysis & Subquery Aggregations' },
  { id: 9, title: 'Module 9: Hierarchical Relational Joins & Set Algebra' },
];

export function CommandPalette({
  isOpen,
  onClose,
  onToggleSidebar,
  onToggleConsole,
  onResetCode,
  currentProblemId,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 10);

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown, true);
      return () => {
        window.removeEventListener('keydown', handleGlobalKeyDown, true);
      };
    }
  }, [isOpen, onClose]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Global navigation
    items.push(
      {
        id: 'nav-dashboard',
        category: 'Navigation',
        title: 'Open Dashboard',
        subtitle: 'View overall progress and resume workspace',
        icon: <LayoutDashboard className="h-4 w-4 text-[#888888]" />,
        perform: () => { router.push('/'); onClose(); },
      },
      {
        id: 'nav-curriculum',
        category: 'Navigation',
        title: 'Open Curriculum Explorer',
        subtitle: 'Browse SQL challenges across all modules',
        icon: <BookOpen className="h-4 w-4 text-[#888888]" />,
        perform: () => { router.push('/quest'); onClose(); },
      },
      {
        id: 'nav-progress',
        category: 'Navigation',
        title: 'Open Telemetry Analytics',
        subtitle: 'Review solving velocity and relational concept coverage',
        icon: <BarChart2 className="h-4 w-4 text-[#888888]" />,
        perform: () => { router.push('/profile'); onClose(); },
      }
    );

    // Workspace Actions
    if (currentProblemId) {
      items.push({
        id: 'action-resume',
        category: 'Actions',
        title: `Resume Problem #${currentProblemId}`,
        subtitle: 'Return to active query editor buffer',
        icon: <Terminal className="h-4 w-4 text-[#FF6B00]" />,
        perform: () => { router.push(`/quest/${currentProblemId}`); onClose(); },
      });
    }

    if (onResetCode) {
      items.push({
        id: 'action-reset-code',
        category: 'Actions',
        title: 'Reset Query Template',
        subtitle: 'Revert query to initial starter template',
        icon: <RotateCcw className="h-4 w-4 text-[#888888]" />,
        perform: () => { onResetCode(); onClose(); },
      });
    }

    if (onToggleSidebar) {
      items.push({
        id: 'action-toggle-sidebar',
        category: 'Actions',
        title: 'Toggle Specification Sidebar',
        subtitle: 'Expand or collapse the challenge specification panel',
        shortcut: 'Ctrl+B',
        icon: <BookOpen className="h-4 w-4 text-[#888888]" />,
        perform: () => { onToggleSidebar(); onClose(); },
      });
    }

    if (onToggleConsole) {
      items.push({
        id: 'action-toggle-console',
        category: 'Actions',
        title: 'Toggle Terminal Dock',
        subtitle: 'Open or collapse interactive SQLite console',
        shortcut: 'Ctrl+J',
        icon: <Terminal className="h-4 w-4 text-[#888888]" />,
        perform: () => { onToggleConsole(); onClose(); },
      });
    }

    items.push({
      id: 'action-copy-link',
      category: 'Actions',
      title: 'Copy Workspace URL',
      subtitle: 'Copy current problem link to clipboard',
      icon: copiedLink ? <Check className="h-4 w-4 text-[#38A169]" /> : <Copy className="h-4 w-4 text-[#888888]" />,
      perform: () => {
        if (typeof window !== 'undefined') {
          navigator.clipboard.writeText(window.location.href);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
          onClose();
        }
      },
    });

    // Modules
    MODULES.forEach((mod) => {
      items.push({
        id: `mod-${mod.id}`,
        category: 'Modules',
        title: mod.title,
        subtitle: `Jump to Module ${mod.id} in Curriculum Explorer`,
        icon: <BookOpen className="h-4 w-4 text-[#888888]" />,
        perform: () => { router.push(`/quest?module=${mod.id}`); onClose(); },
      });
    });

    // All Real SQL Problems (all 100 curriculum challenges)
    const seenCodes = new Set<string>();
    const allSolutions = Object.values(ALL_PROBLEM_SOLUTIONS || {});
    allSolutions.forEach((sol: any) => {
      const codeId = sol.code_id || (sol.numeric_id ? `Basics-${String(sol.numeric_id).padStart(3, '0')}` : null);
      if (!codeId || seenCodes.has(codeId)) return;
      seenCodes.add(codeId);

      const pId = sol.numeric_id || sol.levelNumber || 1;
      const diff = pId <= 35 ? 'Easy' : pId <= 70 ? 'Medium' : 'Hard';
      items.push({
        id: `problem-${codeId}`,
        category: 'Problems',
        title: `${codeId}: ${sol.title}`,
        subtitle: `Jump directly to ${codeId} (#${pId})`,
        badge: diff,
        icon: <Terminal className="h-4 w-4 text-[#FF6B00]" />,
        perform: () => { router.push(`/quest/${codeId}`); onClose(); },
      });
    });

    return items;
  }, [currentProblemId, onResetCode, onToggleSidebar, onToggleConsole, copiedLink, router, onClose]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 30);
    const q = query.toLowerCase().trim();
    return allCommands
      .filter((cmd) => {
        return (
          cmd.title.toLowerCase().includes(q) ||
          (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
          cmd.category.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [allCommands, query]);



  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) selected.perform();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-[6px] border border-[#242424] bg-[#121212] shadow-2xl overflow-hidden flex flex-col font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#242424] bg-[#0E0E0E]">
          <Search className="h-4 w-4 text-[#666666] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search SQL challenges, modules, or actions..."
            className="w-full bg-transparent text-[#F5F5F5] placeholder-[#555555] outline-none text-xs font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[9px] bg-[#1C1C1C] text-[#888888] border border-[#2A2A2A] rounded-[2px]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2 space-y-0.5">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#666666] font-mono">
              No matching commands or SQL problems found.
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.perform()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer transition-colors duration-[100ms] ${
                    isSelected
                      ? 'bg-[#1C1C1C] text-[#F5F5F5] ring-1 ring-[#FF6B00]/40 shadow-sm'
                      : 'text-[#AAAAAA] hover:bg-[#141414] hover:text-[#D4D4D4]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className="shrink-0">{cmd.icon}</span>
                    <div className="truncate">
                      <div className="font-semibold truncate text-[#F5F5F5]">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className="text-[10px] text-[#666666] truncate">{cmd.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {cmd.badge && (
                      <TechnicalDifficulty difficulty={cmd.badge} size="sm" />
                    )}
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[9px] bg-[#161616] text-[#777777] border border-[#222222] rounded-[2px]">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="h-3 w-3 text-[#FF6B00]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-[#202020] bg-[#0E0E0E] flex items-center justify-between text-[10px] text-[#666666]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Dismiss</span>
          </div>
          <span>SQL QUEST INSTRUMENT</span>
        </div>
      </div>
    </div>
  );
}
