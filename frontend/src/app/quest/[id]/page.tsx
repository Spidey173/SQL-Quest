'use client';

import React, { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { api } from '@/lib/api';
import { persistence, createDebouncedSaver, isProblemSolved, getCanonicalProblemId } from '@/lib/persistence';
import { registerGlobalShortcuts } from '@/lib/shortcuts';
import {
  ChallengeDetail, CodeRunResponse,
  ChapterGroup, ChallengeSummary, SchemaTableInfo
} from '@/lib/types';
import { DifficultyBadge } from '@/components/ui/Badge';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useAuth } from '@/lib/auth-context';
import { soundFX } from '@/lib/audio';
import { SolutionVault } from '@/components/mentor/SolutionVault';
import { InterviewPanel } from '@/components/interview/InterviewPanel';
import {
  Play, RotateCcw, ArrowLeft, ArrowRight, Clock, BookOpen,
  Check, X, Terminal, ChevronDown, ChevronUp, Copy, Trash2,
  CheckSquare, RefreshCw, Lock, Unlock,
  Briefcase, Zap, Sparkles, Code, Database, FileCode, AlertCircle, Table
} from 'lucide-react';
import { SchemaViewer } from '@/components/ui/SchemaViewer';
import { SqlResultGrid } from '@/components/ui/SqlResultGrid';
import { ProblemOneSpecView } from '@/components/ui/ProblemOneSpecView';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import { getProblemSolution } from '@/lib/problem-intelligence';

interface TerminalHistoryEntry {
  id: string;
  command: string;
  stdin?: string;
  interactivePrompts?: Array<{ prompt: string; value: string }>;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timestamp: string;
}


export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const resolvedParams = use(params);
  const problemParam = resolvedParams.id || 'Basics-001';
  const numericParam = parseInt(problemParam, 10);
  const problemId = !isNaN(numericParam) ? numericParam : 1;

  // Workspace Data
  const [problem, setProblem] = useState<ChallengeDetail | null>(null);
  const [allProblems, setAllProblems] = useState<ChallengeSummary[]>([]);
  const [solvedIds, setSolvedIds] = useState<any[]>([]);
  const [code, setCode] = useState<string>('');

  // Two-Phase SQL Workspace: schema.sql (DDL/DML setup) vs solution.sql (Query solving)
  const [activeEditorTab, setActiveEditorTab] = useState<'solution' | 'schema'>('solution');
  const [schemaCode, setSchemaCode] = useState<string>('');
  const [schemaTables, setSchemaTables] = useState<SchemaTableInfo[]>([]);
  const [isSettingUpSchema, setIsSettingUpSchema] = useState(false);
  const [isResettingSchema, setIsResettingSchema] = useState(false);
  const [setupFeedback, setSetupFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Persistent User Session ID for in-memory SQLite sandbox persistence
  const [sessionId, setSessionId] = useState<string>('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sId = localStorage.getItem('sqlquest_session_id');
      if (!sId) {
        sId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('sqlquest_session_id', sId);
      }
      setSessionId(sId);
    }
  }, []);

  // Layout & Tabs
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [dockHeight, setDockHeight] = useState<'normal' | 'expanded'>('normal');
  // Left Panel Tab: Problem Spec, Database Schema, Solution Vault, Interview Q&A
  const [activeTab, setActiveTab] = useState<'spec' | 'schema' | 'vault' | 'interview'>('spec');
  const [activeConsoleTab, setActiveConsoleTab] = useState<'terminal' | 'tests'>('terminal');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Mobile Workspace States
  const [mobileTab, setMobileTab] = useState<'spec' | 'code' | 'interview'>('code');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showMobileConsoleLogs, setShowMobileConsoleLogs] = useState(false);

  // Solution Vault & Practice Mode State
  const hintTier = 1;
  const [isSolutionUnlocked, setIsSolutionUnlocked] = useState<boolean>(false);
  const [isPracticingAgain, setIsPracticingAgain] = useState<boolean>(false);
  const [lastExecutionRuntime, setLastExecutionRuntime] = useState<number>(24);

  // Execution & Terminal State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResponse, setRunResponse] = useState<CodeRunResponse | null>(null);
  const [terminalHistory, setTerminalHistory] = useState<TerminalHistoryEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isTerminalFocused, setIsTerminalFocused] = useState<boolean>(true);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const terminalInputRef = useRef<HTMLInputElement | null>(null);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [interactiveSession, setInteractiveSession] = useState<{
    active: boolean;
    prompts: string[];
    collectedInputs: string[];
    currentStep: number;
  }>({
    active: false,
    prompts: [],
    collectedInputs: [],
    currentStep: 0,
  });
  const [copiedCode, setCopiedCode] = useState(false);

  // Timer HUD
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTimerRunningRef = useRef(true);

  // Debounced autosave for solution.sql and schema.sql
  const debouncedSaveRef = useRef(
    createDebouncedSaver((draftCode: string) => {
      persistence.saveDraft(problemParam, draftCode, 'solution');
    }, 2000)
  );

  const debouncedSchemaSaveRef = useRef(
    createDebouncedSaver((draftCode: string) => {
      persistence.saveDraft(problemParam, draftCode, 'schema');
    }, 2000)
  );

  const stopTimer = useCallback(() => {
    isTimerRunningRef.current = false;
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    isTimerRunningRef.current = true;
    setIsTimerRunning(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setInterval(() => {
      if (!isTimerRunningRef.current) return;
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // 1. Solve Timer per problem
  useEffect(() => {
    setElapsedSeconds(0);
    startTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [problemParam, startTimer]);

  // Always anchor window at top when entering or switching challenges
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    setIsPracticingAgain(false);
  }, [problemParam]);

  // Auto-scroll Terminal canvas to bottom (internal container scroll only)
  useEffect(() => {
    if (activeConsoleTab === 'terminal' && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalHistory, isRunning, interactiveSession, activeConsoleTab]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 3. Load Problem, Restore Draft & Initialize Mentor Greeting
  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [prob, chapters, solved, savedDraft, savedSchemaDraft, layoutSettings] = await Promise.all([
          api.getChallenge(problemParam),
          api.getChapters().catch(() => [] as ChapterGroup[]),
          persistence.getSolvedIds(),
          persistence.loadDraft(problemParam, 'solution'),
          persistence.loadDraft(problemParam, 'schema'),
          persistence.loadLayoutSettings(),
        ]);

        setProblem(prob);
        const flatProblems = (chapters as ChapterGroup[]).flatMap((c) => c.levels);
        setAllProblems(flatProblems);
        const backendSolved = flatProblems.filter((p) => p.passed).map((p) => p.id);
        const resolvedSolved = Array.from(new Set([...backendSolved, ...solved]));
        setSolvedIds(resolvedSolved);
        setIsPracticingAgain(false);

        // If challenge was already solved, stop timer immediately
        const isAlreadySolved = isProblemSolved(prob, resolvedSolved, flatProblems) || Boolean(prob.passed);
        if (isAlreadySolved) {
          stopTimer();
        }

        // Code restoration: Clean starter code without pre-written answers
        const cleanStarter = (prob.starter_code || '')
          .split('\n')
          .filter((line) => line.trim().startsWith('--') || line.trim() === '')
          .join('\n');
        const defaultSolutionCode = cleanStarter.trim() !== ''
          ? cleanStarter
          : `-- Problem #${prob.code_id || problemParam}: ${prob.title}\n-- Write your SQL query below\n\n`;

        let initialCode = defaultSolutionCode;

        // Only restore draft if user actively edited their own code and it's not pre-filled answer
        if (savedDraft && savedDraft.trim() !== '' && savedDraft !== prob.starter_code) {
          const isStalePython = /^\s*(def\s+|class\s+|import\s+|from\s+|s\s*=|print\(|input\(|#\s*TODO)/im.test(savedDraft);
          const officialSol = getProblemSolution(prob);
          const isOfficialSolution = officialSol && (
            officialSol.code.trim() === savedDraft.trim() ||
            (officialSol.code.trim().length > 15 && savedDraft.includes(officialSol.code.trim()))
          );

          if (!isStalePython && !isOfficialSolution) {
            initialCode = savedDraft;
          } else {
            persistence.saveDraft(prob.code_id || problemParam, defaultSolutionCode, 'solution');
          }
        }
        setCode(initialCode);

        // Schema code restoration: clean default header without sample data
        const defaultSchemaCode = `-- Database Schema Setup\n-- Write your DDL / DML statements below\n\n`;
        const initialSchemaCode = savedSchemaDraft && savedSchemaDraft.trim() !== ''
          ? savedSchemaDraft
          : defaultSchemaCode;
        setSchemaCode(initialSchemaCode);

        // Layout restore
        setConsoleCollapsed(layoutSettings.consoleCollapsed);
        await persistence.setLastActiveProblemId(prob.code_id || problemParam);

        // Fetch active session tables if the user already saved schema tables
        try {
          const sId = typeof window !== 'undefined' ? localStorage.getItem('sqlquest_session_id') : undefined;
          const sessionSchemaRes = await api.getSessionSchema(prob.code_id || problemParam, sId || undefined);
          if (sessionSchemaRes && sessionSchemaRes.tables && sessionSchemaRes.tables.length > 0) {
            setSchemaTables(sessionSchemaRes.tables);
          } else {
            // No active session (e.g. backend restarted) — silently re-run saved schema draft to restore it
            const draftHasDDL = savedSchemaDraft && /CREATE\s+TABLE/i.test(savedSchemaDraft);
            if (draftHasDDL) {
              try {
                const autoRes = await api.setupSchema(prob.code_id || problemParam, savedSchemaDraft, sId || undefined);
                if (autoRes?.tables?.length > 0) setSchemaTables(autoRes.tables);
              } catch (_) { /* silent — user can always re-run manually */ }
            } else if (prob.setup_sql) {
              // Fall back to the challenge's own setup_sql if no saved draft
              try {
                const autoRes = await api.setupSchema(prob.code_id || problemParam, prob.setup_sql, sId || undefined);
                if (autoRes?.tables?.length > 0) setSchemaTables(autoRes.tables);
              } catch (_) { /* silent */ }
            }
          }
        } catch (schemaErr) {
          console.warn('Could not load session schema:', schemaErr);
        }

        // Solution is strictly locked until the user submits code and passes all test suites in this session
        setIsSolutionUnlocked(false);
      } catch (err) {
        console.error('Failed to load problem workspace:', err);
      }
    }

    loadWorkspace();

    const handleLogout = () => {
      setSolvedIds([]);
    };
    window.addEventListener('sqlquest_auth_logout', handleLogout);
    return () => window.removeEventListener('sqlquest_auth_logout', handleLogout);
  }, [problemParam, stopTimer]);

  // Sync solved state when user status changes without re-initializing code editor
  useEffect(() => {
    async function syncUserProgress() {
      if (!user) {
        setSolvedIds([]);
        return;
      }
      try {
        const [chapters, localSolved] = await Promise.all([
          api.getChapters().catch(() => [] as ChapterGroup[]),
          persistence.getSolvedIds(),
        ]);
        const backendSolved = (chapters as ChapterGroup[]).flatMap((c) => c.levels).filter((l) => l.passed).map((l) => l.id);
        // Combine backend solved, locally stored solved, and current solvedIds
        const resolved = Array.from(new Set([...backendSolved, ...localSolved, ...solvedIds]));
        setSolvedIds(resolved);
        if (problem && (isProblemSolved(problem, resolved, (chapters as ChapterGroup[]).flatMap((c) => c.levels)) || Boolean(problem.passed))) {
          stopTimer();
        }
      } catch (e) {
        console.error('Failed to sync user solved progress:', e);
      }
    }
    syncUserProgress();
  }, [user, problemParam, problem, stopTimer]);

  // 4. Code Change Handlers
  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode || '';
    setCode(val);
    debouncedSaveRef.current(val);

    // Resume timer if it was stopped after an attempt and challenge is not yet solved
    if (!isTimerRunningRef.current && problem && !isProblemSolved(problem, solvedIds, allProblems)) {
      startTimer();
    }
  };

  const handleSchemaCodeChange = (newCode: string | undefined) => {
    const val = newCode || '';
    setSchemaCode(val);
    debouncedSchemaSaveRef.current(val);
  };

  // Monaco Editor Reference
  const monacoEditorRef = useRef<any>(null);


  const executeWithStdin = async (
    stdinText: string,
    customCommand: string = 'sqlite3 query.sql',
    interactivePrompts?: Array<{ prompt: string; value: string }>
  ) => {
    if (!problem || isRunning || isSubmitting) return;

    try {
      setIsRunning(true);
      setConsoleCollapsed(false);
      setActiveConsoleTab('terminal');

      const res = await api.runCode(problem?.code_id || problemParam, code, stdinText, sessionId);
      setRunResponse(res);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileDrawerOpen(true);
      }

      const exitCode = res.success ? 0 : 1;
      const duration = Math.round(res.execution_time_ms || 24);
      setLastExecutionRuntime(duration);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setTerminalHistory((prev) => [
        ...prev.slice(-25),
        {
          id: Math.random().toString(36).substring(7),
          command: customCommand,
          stdin: stdinText || undefined,
          interactivePrompts,
          stdout: res.stdout || '',
          stderr: res.stderr || (res.security_error ? `[Security Error] ${res.security_error}` : ''),
          exitCode,
          durationMs: duration,
          timestamp: timeStr,
        },
      ]);

      if (!res.success) {
        soundFX.playFailureThud();
      } else {
        soundFX.playSuccessChime();
      }
    } catch (err: any) {
      soundFX.playFailureThud();
      setTerminalHistory((prev) => [
        ...prev.slice(-25),
        {
          id: Math.random().toString(36).substring(7),
          command: customCommand,
          stdin: stdinText || undefined,
          interactivePrompts,
          stdout: '',
          stderr: `Execution error: ${err?.message || 'Failed to connect to runner'}.`,
          exitCode: 1,
          durationMs: 0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    } finally {
      setIsRunning(false);
      setInteractiveSession({ active: false, prompts: [], collectedInputs: [], currentStep: 0 });
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 60);
    }
  };

  const handleRunCode = async (overrideStdin?: string) => {
    if (!problem || isRunning || isSubmitting) return;
    await executeWithStdin(overrideStdin || '', 'sqlite3 query.sql');
  };

  const handleRunTestCases = async () => {
    if (!problem || isRunning || isSubmitting) return;

    try {
      setIsRunning(true);
      setConsoleCollapsed(false);
      setActiveConsoleTab('tests');

      const res = await api.runCode(problem?.code_id || problemParam, code, undefined, sessionId);
      setRunResponse(res);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileDrawerOpen(true);
      }

      const exitCode = res.success ? 0 : 1;
      const duration = Math.round(res.execution_time_ms || 24);
      setLastExecutionRuntime(duration);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const passedCount = res.test_results?.filter((t) => t.passed).length || 0;
      const totalCount = res.test_results?.length || 0;
      const testSummary = res.test_results && res.test_results.length > 0
        ? `engine: SQLite v3.45 • relational_tests\ncollected ${totalCount} test suites\n\n` +
          res.test_results.map((t) => `test_query.sql::test_suite_${t.test_case_index} ${t.passed ? 'PASSED' : 'FAILED'}${!t.passed && t.actual_output ? ` (got: ${t.actual_output.trim()})` : ''}`).join('\n') +
          `\n\n============================== ${passedCount}/${totalCount} suites passed in ${(duration / 1000).toFixed(2)}s ==============================`
        : (res.stdout || '');

      setTerminalHistory((prev) => [
        ...prev.slice(-25),
        {
          id: Math.random().toString(36).substring(7),
          command: 'run_tests --engine sqlite --target query.sql',
          stdin: undefined,
          stdout: testSummary,
          stderr: res.stderr || (res.security_error ? `[Security Error] ${res.security_error}` : ''),
          exitCode,
          durationMs: duration,
          timestamp: timeStr,
        },
      ]);

      if (!res.success || (res.test_results && res.test_results.some((t) => !t.passed))) {
        soundFX.playFailureThud();
      } else {
        soundFX.playSuccessChime();
      }
    } catch (err: any) {
      soundFX.playFailureThud();
      setTerminalHistory((prev) => [
        ...prev.slice(-25),
        {
          id: Math.random().toString(36).substring(7),
          command: 'pytest tests/ -v',
          stdin: undefined,
          stdout: '',
          stderr: `Execution error: ${err?.message || 'Failed to connect to runner'}.`,
          exitCode: 1,
          durationMs: 0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleInteractiveInputSubmit = () => {
    const currentVal = terminalInput;
    const nextCollected = [...interactiveSession.collectedInputs, currentVal];
    const nextStep = interactiveSession.currentStep + 1;

    if (nextStep < interactiveSession.prompts.length) {
      setInteractiveSession((prev) => ({
        ...prev,
        collectedInputs: nextCollected,
        currentStep: nextStep,
      }));
      setTerminalInput('');
    } else {
      const promptsWithValues = interactiveSession.prompts.map((p, idx) => ({
        prompt: p,
        value: nextCollected[idx] || '',
      }));
      const fullStdin = nextCollected.join('\n');
      setInteractiveSession({ active: false, prompts: [], collectedInputs: [], currentStep: 0 });
      setTerminalInput('');
      executeWithStdin(fullStdin, 'sqlite3 query.sql', promptsWithValues);
    }
  };

  const handleTerminalCommandSubmit = () => {
    const trimmed = terminalInput.trim();
    setTerminalInput('');

    if (trimmed) {
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    }

    if (!trimmed) {
      handleRunCode();
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (trimmed === 'clear' || trimmed === 'cls') {
      setTerminalHistory([]);
      return;
    }

    if (trimmed === 'pwd') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          stdout: '~/SQL',
          stderr: '',
          exitCode: 0,
          durationMs: 4,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed === 'whoami') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          stdout: 'developer',
          stderr: '',
          exitCode: 0,
          durationMs: 3,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed === 'ls' || trimmed === 'dir') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          stdout: 'solution.sql   test_cases.py   README.md',
          stderr: '',
          exitCode: 0,
          durationMs: 6,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed === 'sqlite3 --version' || trimmed === 'sql --version') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          stdout: 'SQLite 3.45.3',
          stderr: '',
          exitCode: 0,
          durationMs: 8,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed === 'date') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          stdout: new Date().toString(),
          stderr: '',
          exitCode: 0,
          durationMs: 3,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed.startsWith('echo ')) {
      const echoText = trimmed.replace(/^echo\s+/, '').replace(/^["']|["']$/g, '');
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: trimmed,
          stdout: echoText,
          stderr: '',
          exitCode: 0,
          durationMs: 3,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed === 'help') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: 'help',
          stdout: `VS Code Terminal Commands:\n  sqlite3 query.sql     Execute ANSI SQL query in isolated SQLite engine\n  pytest                  Run test cases\n  clear                   Clear terminal scrollback (Ctrl+L)\n  pwd, ls, whoami, echo   Standard shell utilities\n  <value>                 Pass input directly to script stdin`,
          stderr: '',
          exitCode: 0,
          durationMs: 0,
          timestamp: timeStr,
        },
      ]);
      return;
    }

    if (trimmed === 'pytest' || trimmed === 'pytest tests/' || trimmed === 'test') {
      handleRunTestCases();
      return;
    }

    if (trimmed === 'sql' || trimmed === 'sqlite' || trimmed === 'run') {
      handleRunCode();
      return;
    }

    if (trimmed.startsWith('sqlite3 query.sql') || trimmed.startsWith('sqlite3 query.sql')) {
      const customArg = trimmed.replace(/^sqlite3?\s+solution\.sql\s*/, '').trim();
      if (customArg) {
        executeWithStdin(customArg, trimmed);
      } else {
        handleRunCode();
      }
      return;
    }

    // Treat arbitrary input typed at prompt as custom stdin
    executeWithStdin(trimmed, `sqlite3 query.sql << '${trimmed}'`);
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalInput('');
      }
      return;
    }

    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      setTerminalHistory([]);
      return;
    }

    if (e.key === 'Escape' || (e.ctrlKey && (e.key === 'c' || e.key === 'C'))) {
      e.preventDefault();
      if (interactiveSession.active) {
        setInteractiveSession({ active: false, prompts: [], collectedInputs: [], currentStep: 0 });
        setTerminalInput('');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTerminalHistory((prev) => [
          ...prev.slice(-25),
          {
            id: Math.random().toString(36).substring(7),
            command: 'sqlite3 query.sql',
            stdout: '^C',
            stderr: '',
            exitCode: 130,
            durationMs: 0,
            timestamp: timeStr,
          },
        ]);
      }
    }
  };

  // 7. Submit Code Pipeline with Mission Complete Celebration
  const handleSubmitCode = async () => {
    if (!problem || isRunning || isSubmitting) return;

    // Freeze mission timer immediately upon clicking Submit
    stopTimer();

    try {
      setIsSubmitting(true);
      const targetCodeId = problem.code_id || problemParam;
      await persistence.saveDraft(targetCodeId, code);

      setConsoleCollapsed(false);
      setActiveConsoleTab('tests');

      const res = await api.submitCode(targetCodeId, code, hintTier, sessionId);
      const duration = Math.max(1, Math.round(res.execution_time_ms || 12));
      setLastExecutionRuntime(duration);

      await persistence.recordSubmission({
        problemId: problem.code_id || problem.id,
        problemTitle: problem.title,
        passed: res.passed_all,
        runtimeMs: duration,
        code,
      });

      // Guarantee timer stays stopped
      stopTimer();

      if (res.passed_all) {
        // Unlock solution and automatically open it normally!
        setIsSolutionUnlocked(true);
        setIsPracticingAgain(false);
        setProblem((prev) => (prev ? { ...prev, passed: true } : prev));
        setActiveTab('vault');
        setSolvedIds((prev) => Array.from(new Set([...prev, targetCodeId, problem.id])));
        await persistence.markSolved(targetCodeId);
        if (problem.id) {
          await persistence.markSolved(problem.id);
        }

        // Auto-advance lastActiveProblemId to next challenge so dashboard resumes next problem
        if (nextProblem) {
          await persistence.setLastActiveProblemId(nextProblem.code_id || nextProblem.id);
        }

        window.dispatchEvent(new CustomEvent('sqlquest_problem_solved', { detail: { problemId: targetCodeId } }));
        soundFX.playSuccessChime();
      } else {
        soundFX.playFailureThud();
      }

      const runRes = await api.runCode(targetCodeId, code, undefined, sessionId);
      setRunResponse(runRes);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setMobileDrawerOpen(true);
      }
      setConsoleCollapsed(false);
      setActiveConsoleTab('tests');
      await refreshUser();
      await persistence.saveDraft(targetCodeId, code);
    } catch (err: any) {
      stopTimer();
      soundFX.playFailureThud();
      alert(err?.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Two-Phase SQL: Run Setup (DDL/DML execution in isolated session SQLite sandbox)
  const handleRunSetup = async () => {
    if (!problem || isSettingUpSchema || isRunning) return;

    try {
      setIsSettingUpSchema(true);
      setConsoleCollapsed(false);
      setActiveConsoleTab('terminal');

      const targetCodeId = problem.code_id || problemParam;
      await persistence.saveDraft(targetCodeId, schemaCode, 'schema');

      const res = await api.setupSchema(targetCodeId, schemaCode, sessionId);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (res.success) {
        soundFX.playSuccessChime();
        setSchemaTables(res.tables || []);
        setSetupFeedback({ success: true, message: res.message });

        const tablesSummary = (res.tables || [])
          .map((t) => `✓ ${t.name} (${t.columns.length} columns, ${t.row_count} rows)`)
          .join('\n');

        setTerminalHistory((prev) => [
          ...prev.slice(-25),
          {
            id: Math.random().toString(36).substring(7),
            command: 'sqlite3 schema.sql (Run Setup)',
            stdout: `[Schema Setup Succeeded]\n${res.message}\n\nTables created in sandbox:\n${tablesSummary}\n\n→ Ready! Switching to solution.sql in 1s...`,
            stderr: '',
            exitCode: 0,
            durationMs: Math.round(res.execution_time_ms || 10),
            timestamp: timeStr,
          },
        ]);

        // Auto-switch to solution.sql editor after successful setup
        setTimeout(() => {
          setActiveEditorTab('solution');
        }, 1100);
      } else {
        soundFX.playFailureThud();
        setSetupFeedback({ success: false, message: res.error || 'Failed to setup database tables.' });

        setTerminalHistory((prev) => [
          ...prev.slice(-25),
          {
            id: Math.random().toString(36).substring(7),
            command: 'sqlite3 schema.sql (Run Setup)',
            stdout: '',
            stderr: `[Schema Setup Error]\n${res.error || 'Syntax or schema error in schema.sql'}`,
            exitCode: 1,
            durationMs: Math.round(res.execution_time_ms || 10),
            timestamp: timeStr,
          },
        ]);
      }
    } catch (err: any) {
      soundFX.playFailureThud();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTerminalHistory((prev) => [
        ...prev.slice(-25),
        {
          id: Math.random().toString(36).substring(7),
          command: 'sqlite3 schema.sql (Run Setup)',
          stdout: '',
          stderr: `Schema execution error: ${err?.message || 'Failed to run setup'}.`,
          exitCode: 1,
          durationMs: 0,
          timestamp: timeStr,
        },
      ]);
    } finally {
      setIsSettingUpSchema(false);
    }
  };

  // Reset Database to canonical problem schema
  const handleResetDatabase = async () => {
    if (!problem || isResettingSchema) return;
    if (confirm('Reset database sandbox and reload default schema.sql? Custom tables in this session will be refreshed.')) {
      try {
        setIsResettingSchema(true);
        const targetCodeId = problem.code_id || problemParam;
        await api.resetSchema(targetCodeId, sessionId);

        const defaultSql = `-- Database Schema Setup\n-- Write your DDL / DML statements below\n\n`;
        setSchemaCode(defaultSql);
        await persistence.saveDraft(targetCodeId, defaultSql, 'schema');
        setSchemaTables([]);
        setSetupFeedback(null);
        soundFX.playLockBreak();

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTerminalHistory((prev) => [
          ...prev.slice(-25),
          {
            id: Math.random().toString(36).substring(7),
            command: 'reset database',
            stdout: '✓ Database sandbox session cleared. schema.sql reset to clean workspace.',
            stderr: '',
            exitCode: 0,
            durationMs: 5,
            timestamp: timeStr,
          },
        ]);
      } catch (err: any) {
        alert(err?.message || 'Failed to reset database.');
      } finally {
        setIsResettingSchema(false);
      }
    }
  };

  // Reset starter template
  const handleResetCode = () => {
    if (!problem) return;
    if (activeEditorTab === 'schema') {
      handleResetDatabase();
      return;
    }
    if (confirm('Reset code to starter template? Current draft will be overwritten.')) {
      const cleanStarter = (problem.starter_code || '')
        .split('\n')
        .filter((line) => line.trim().startsWith('--') || line.trim() === '')
        .join('\n');
      const defaultCode = cleanStarter.trim() !== ''
        ? cleanStarter
        : `-- Problem #${problem.code_id || problemParam}: ${problem.title}\n-- Write your SQL query below\n\n`;
      setCode(defaultCode);
      persistence.saveDraft(problem.code_id || problemParam, defaultCode, 'solution');
      soundFX.playLockBreak();
    }
  };

  // Solve Again: resets solution.sql code to clean starter, clears output dock, restarts timer, and focuses problem spec
  const handleSolveAgain = () => {
    setIsPracticingAgain(true);
    setActiveTab('spec');
    setActiveEditorTab('solution');
    setMobileTab('code');

    const cleanStarter = (problem?.starter_code || '')
      .split('\n')
      .filter((line) => line.trim().startsWith('--') || line.trim() === '')
      .join('\n');
    const defaultSolutionCode = cleanStarter.trim() !== ''
      ? cleanStarter
      : (problem ? `-- Problem #${problem.code_id || problemParam}: ${problem.title}\n-- Write your SQL query below\n\n` : '-- Write your SQL query below\n\n');

    setCode(defaultSolutionCode);
    setRunResponse(null);
    setElapsedSeconds(0);
    startTimer();

    const targetCodeId = problem?.code_id || problemParam;
    persistence.saveDraft(targetCodeId, defaultSolutionCode, 'solution');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const unregister = registerGlobalShortcuts({
      onRun: () => {
        if (activeEditorTab === 'schema') {
          handleRunSetup();
        } else {
          handleRunCode();
        }
      },
      onSubmit: handleSubmitCode,
      onToggleConsole: () => setConsoleCollapsed((p) => !p),
      onOpenCommandPalette: () => setCommandPaletteOpen(true),
    });
    return unregister;
  }, [activeEditorTab, handleRunSetup, handleRunCode, handleSubmitCode]);

  const currentIndex = allProblems.findIndex(
    (p) =>
      (problem && (p.code_id === problem.code_id || p.id === problem.id)) ||
      p.code_id === problemParam ||
      (p.code_id && p.code_id.toLowerCase() === problemParam.toLowerCase()) ||
      String(p.level_number) === problemParam ||
      String(p.id) === problemParam
  );
  const prevProblem = currentIndex > 0 ? allProblems[currentIndex - 1] : null;
  const nextProblem = currentIndex >= 0 && currentIndex < allProblems.length - 1 ? allProblems[currentIndex + 1] : null;

  const currentCodeId = problem?.code_id || problemParam;
  const isMaster = Boolean(problem && (problem.track === 'master' || problem.chapter_id === 8 || problem.chapter_id === 9 || currentCodeId.startsWith('Pro-')));
  const isBasics = Boolean(problem && (problem.track === 'fundamentals' || (problem.chapter_id >= 1 && problem.chapter_id <= 4) || currentCodeId.startsWith('Basic')));
  const isAdvanced = Boolean(problem && (problem.chapter_id === 7 || (problem as any).track === 'advanced' || currentCodeId.startsWith('ASQL-')));
  const stepperColorClass = isMaster ? 'text-[#38BDF8]' : isBasics ? 'text-[#48BB78]' : isAdvanced ? 'text-[#A855F7]' : 'text-[#FF6B00]';
  const isCurrentProblemSolved = problem ? (isProblemSolved(problem, solvedIds, allProblems) || Boolean(problem.passed)) : false;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-[#070A0F] text-[#E6EDF3] overflow-hidden select-none">

      {/* 1. Precision Mission Sub-Header */}
      <header className="h-12 border-b border-[#242424] bg-[#121212] px-3 md:px-4 flex items-center justify-between gap-2 md:gap-3 shrink-0 z-20">
        {/* Left: Curriculum Back Link, Prev/Next Stepper, Challenge Info */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 md:flex-initial">
          <Link
            href="/quest"
            className="p-1.5 rounded-[4px] text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors shrink-0"
            title="Back to Curriculum Explorer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Quick Challenge Stepper */}
          <div className="flex items-center gap-1.5 border border-[#262626] rounded-[4px] bg-[#0E0E0E] px-2 py-0.5 text-xs font-mono shrink-0">
            <button
              onClick={() => {
                if (prevProblem) router.push(`/quest/${prevProblem.code_id || prevProblem.id}`);
              }}
              disabled={!prevProblem}
              className="text-[#888888] hover:text-[#F5F5F5] disabled:opacity-30 px-1 py-0.5 rounded transition-colors font-semibold cursor-pointer disabled:cursor-not-allowed"
              title="Previous Problem"
            >
              ‹
            </button>
            <span className="text-[#333333]">|</span>
            <span className={`font-bold ${stepperColorClass}`}>{currentCodeId}</span>
            <span className="text-[#333333]">|</span>
            <button
              onClick={() => {
                if (nextProblem) router.push(`/quest/${nextProblem.code_id || nextProblem.id}`);
              }}
              disabled={!nextProblem}
              className="text-[#888888] hover:text-[#F5F5F5] disabled:opacity-30 disabled:cursor-not-allowed px-1 py-0.5 rounded transition-colors font-semibold cursor-pointer"
              title="Next Problem"
            >
              ›
            </button>
          </div>

          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="text-sm md:text-base font-bold text-[#F5F5F5] truncate font-sans">
              {problem?.title || 'Loading challenge...'}
            </span>
            {problem && (
              <span className="hidden sm:inline-flex">
                <DifficultyBadge difficulty={problem.difficulty} size="sm" />
              </span>
            )}
            {isCurrentProblemSolved && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-[#0E1A12] text-[#48BB78] border border-[#2E4A35] font-semibold shrink-0">
                <Check className="h-3 w-3" /> <span className="hidden sm:inline">SOLVED</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Live Mission Timer (Desktop) */}
        <button
          type="button"
          onClick={() => {
            if (isCurrentProblemSolved && !isPracticingAgain) return;
            if (isTimerRunning) {
              stopTimer();
            } else {
              startTimer();
            }
          }}
          className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-[4px] border text-xs font-mono transition-all duration-[120ms] ${
            isCurrentProblemSolved && !isPracticingAgain
              ? 'border-[#2E4A35] bg-[#0E1A12] text-[#48BB78]'
              : !isTimerRunning
              ? 'border-[#4A3018] bg-[#1A120B] text-[#FF9B42] hover:bg-[#24170D] cursor-pointer'
              : 'border-[#262626] bg-[#0E0E0E] text-[#888888] hover:border-[#383838] cursor-pointer'
          }`}
          title={
            isCurrentProblemSolved && !isPracticingAgain
              ? 'Problem Completed'
              : isTimerRunning
              ? 'Timer running — Click to pause'
              : 'Timer paused — Click to resume'
          }
        >
          <Clock className={`h-3.5 w-3.5 ${
            isCurrentProblemSolved && !isPracticingAgain
              ? 'text-[#38A169]'
              : !isTimerRunning
              ? 'text-[#FF9B42]'
              : 'text-[#888888]'
          }`} />
          <span>{formatTimer(elapsedSeconds)}</span>
          {isCurrentProblemSolved && !isPracticingAgain ? (
            <span className="text-[10px] font-mono font-bold text-[#48BB78] uppercase ml-0.5">
              DONE
            </span>
          ) : !isTimerRunning ? (
            <span className="text-[10px] font-mono font-bold text-[#FF9B42] uppercase ml-0.5">
              PAUSED
            </span>
          ) : null}
        </button>

        {/* Right: Code Actions (schema mode vs solution mode) — Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {activeEditorTab === 'schema' ? (
            <>
              <button
                onClick={handleResetDatabase}
                disabled={isResettingSchema || isSettingUpSchema}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1A1A1A] hover:bg-[#242424] border border-[#333333] text-xs font-mono font-medium text-[#CCCCCC] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                title="Reset database sandbox and reload original schema.sql"
              >
                {isResettingSchema ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 text-[#888888]" />
                )}
                <span>Reset Database</span>
              </button>

              <button
                onClick={handleRunSetup}
                disabled={isSettingUpSchema || isResettingSchema}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#38A169] hover:bg-[#2F855A] text-white text-xs font-mono font-bold transition-all duration-[120ms] shadow-sm disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                title="Execute DDL & DML to build database tables (Ctrl+Enter)"
              >
                {isSettingUpSchema ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>RUN SETUP</span>
                <kbd className="hidden lg:inline-block font-mono text-[9px] text-white/80 bg-black/20 px-1 py-0.2 rounded-[2px]">
                  ↵
                </kbd>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResetCode}
                className="p-1.5 rounded-[4px] text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
                title="Reset code template"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              {isCurrentProblemSolved && !isPracticingAgain ? (
                <>
                  <button
                    onClick={handleSolveAgain}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1A1A1A] hover:bg-[#242424] border border-[#333333] text-xs font-mono font-medium text-[#CCCCCC] hover:text-white transition-all duration-[120ms] disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    title="Solve again / Reset solution & re-verify (Ctrl+Enter)"
                  >
                    {isRunning ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-[#FF9B42]" />
                    )}
                    <span>SOLVE AGAIN</span>
                  </button>

                  <button
                    onClick={() => {
                      if (nextProblem) {
                        router.push(`/quest/${nextProblem.code_id || nextProblem.id}`);
                      } else {
                        router.push('/quest');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#238636] hover:bg-[#2EA043] text-white text-xs font-mono font-bold transition-all duration-[120ms] shadow-sm cursor-pointer active:scale-[0.98]"
                    title={nextProblem ? "Go to next challenge" : "Back to curriculum"}
                  >
                    <span>NEXT CHALLENGE</span>
                    <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRunCode()}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#FF6B00] hover:bg-[#E05F00] text-black text-xs font-mono font-bold transition-all duration-[120ms] shadow-sm disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    title="Run query in SQLite Engine (Ctrl+Enter)"
                  >
                    {isRunning ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    )}
                    <span>RUN</span>
                    <kbd className="hidden lg:inline-block font-mono text-[9px] text-black/70 bg-black/15 px-1 py-0.2 rounded-[2px]">
                      ↵
                    </kbd>
                  </button>

                  <button
                    onClick={handleSubmitCode}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#1A1A1A] hover:bg-[#242424] border border-[#333333] text-xs font-mono font-semibold text-[#F5F5F5] transition-all duration-[120ms] disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    title="Submit solution for verification (Ctrl+Shift+Enter)"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF6B00]" />
                    ) : (
                      <Check className="h-3.5 w-3.5 text-[#38A169]" />
                    )}
                    <span>VERIFY</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* 2. Desktop Workspace Layout (MD+ Only): 2 Focused Panes (Mentor Cockpit + Editor & Terminal) */}
      <div className="hidden md:flex flex-1 overflow-hidden relative min-h-0">

        {/* Left Cockpit Panel (480px / 540px) — Problem Spec / Schema / Solution Vault */}
        <section className="w-[480px] lg:w-[540px] border-r border-[#242424] bg-[#0E0E0E] flex flex-col shrink-0 overflow-hidden">
          {/* Cockpit Navigation Tabs */}
          <div className="h-10 border-b border-[#242424] bg-[#121212] px-2 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none font-mono text-xs">
            {/* Tab 1: Problem Spec */}
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-2.5 py-1 rounded-[3px] font-semibold transition-all duration-[120ms] flex items-center gap-1.5 shrink-0 ${
                activeTab === 'spec'
                  ? 'bg-[#1C1C1C] text-[#F5F5F5] border border-[#333333] shadow-sm'
                  : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'spec' ? 'text-[#FF6B00]' : 'text-[#666666]'}`} />
              <span>SPEC</span>
            </button>

            {/* Tab 2: Database Schema & Tables */}
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-2.5 py-1 rounded-[3px] font-semibold transition-all duration-[120ms] flex items-center gap-1.5 shrink-0 ${
                activeTab === 'schema'
                  ? 'bg-[#1C1C1C] text-[#F5F5F5] border border-[#333333] shadow-sm'
                  : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${activeTab === 'schema' ? 'text-[#FF6B00]' : 'text-[#666666]'}`} />
              <span>SCHEMA</span>
            </button>

            {/* Tab 3: Solution */}
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-2.5 py-1 rounded-[3px] font-semibold transition-all duration-[120ms] flex items-center gap-1.5 shrink-0 ${
                activeTab === 'vault'
                  ? 'bg-[#1C1C1C] text-[#F5F5F5] border border-[#333333] shadow-sm'
                  : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
              }`}
            >
              {isSolutionUnlocked ? (
                <Unlock className="w-3.5 h-3.5 text-[#38A169]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#888888]" />
              )}
              <span>SOLUTIONS</span>
            </button>

            {/* Tab 4: Interview Q&A */}
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-2.5 py-1 rounded-[3px] font-semibold transition-all duration-[120ms] flex items-center gap-1.5 shrink-0 ${
                activeTab === 'interview'
                  ? 'bg-[#1C1C1C] text-[#F5F5F5] border border-[#333333] shadow-sm'
                  : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
              }`}
            >
              {isSolutionUnlocked ? (
                <Briefcase className="w-3.5 h-3.5 text-[#FFC857]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#888888]" />
              )}
              <span>INTERVIEW</span>
            </button>
          </div>

          {/* Cockpit Content Panes */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

            {/* VIEW 1: PROBLEM SPEC */}
            {activeTab === 'spec' && (
              <ProblemOneSpecView
                problem={problem}
                onInsertCode={(suggestedCode) => {
                  setCode(suggestedCode);
                  persistence.saveDraft(currentCodeId, suggestedCode, 'solution');
                }}
              />
            )}

            {/* VIEW: SCHEMA & TABLES */}
            {activeTab === 'schema' && (
              <SchemaViewer
                problemTitle={problem?.title}
                dynamicTables={schemaTables}
                setupSql={schemaCode || problem?.setup_sql}
                onRunSetup={handleRunSetup}
                onOpenSchemaEditor={() => setActiveEditorTab('schema')}
              />
            )}

            {/* VIEW 3: SOLUTION VAULT (LOCKED / UNLOCKED) */}
            {activeTab === 'vault' && problem && (
              <SolutionVault
                problem={problem}
                isSolved={Boolean(isCurrentProblemSolved)}
                unlocked={isSolutionUnlocked}
                hintsUsedCount={hintTier}
                onUnlock={() => {
                  setIsSolutionUnlocked(true);
                  persistence.markSolutionUnlocked(currentCodeId);
                }}
                onSubmitCode={handleSubmitCode}
                onLoadCodeToEditor={(solCode) => {
                  setCode(solCode);
                  persistence.saveDraft(currentCodeId, solCode);
                }}
              />
            )}

            {/* VIEW 4: INTERVIEW Q&A PREP */}
            {activeTab === 'interview' && problem && (
              <InterviewPanel
                problem={problem}
                isSolved={isCurrentProblemSolved || isSolutionUnlocked}
                onClose={() => setActiveTab('spec')}
              />
            )}
          </div>
        </section>

        {/* Right Pane: Monaco Code Canvas + SQLite Terminal Console Dock */}
        <div className="flex-1 flex flex-col bg-[#090909] overflow-hidden">
          {/* Editor Header Bar with Dual File Tabs */}
          <div className="h-10 border-b border-[#242424] bg-[#121212] px-3 flex items-center justify-between shrink-0">
            {/* File Switcher Tabs */}
            <div className="flex items-center gap-1.5 h-full">
              {/* schema.sql Tab (DDL / DML) */}
              <button
                onClick={() => setActiveEditorTab('schema')}
                className={`h-[32px] px-3 rounded-[4px] font-mono text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeEditorTab === 'schema'
                    ? 'bg-[#1E1E1E] text-[#F5F5F5] border border-[#3A3A3A] font-bold shadow-sm'
                    : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
                }`}
                title="Define tables & seed data (CREATE TABLE, INSERT)"
              >
                <Code className={`h-3.5 w-3.5 ${activeEditorTab === 'schema' ? 'text-[#38A169]' : 'text-[#666666]'}`} />
                <span>schema.sql</span>
                <span className="text-[9px] px-1 py-0.2 rounded-[2px] bg-[#0E1A12] text-[#48BB78] border border-[#2E4A35] font-normal">
                  DDL
                </span>
              </button>

              {/* solution.sql Tab (Queries) */}
              <button
                onClick={() => setActiveEditorTab('solution')}
                className={`h-[32px] px-3 rounded-[4px] font-mono text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeEditorTab === 'solution'
                    ? 'bg-[#1E1E1E] text-[#F5F5F5] border border-[#3A3A3A] font-bold shadow-sm'
                    : 'text-[#888888] hover:text-[#D4D4D4] hover:bg-[#161616]'
                }`}
                title="Write your query to solve the problem (SELECT)"
              >
                <FileCode className={`h-3.5 w-3.5 ${activeEditorTab === 'solution' ? 'text-[#FF6B00]' : 'text-[#666666]'}`} />
                <span>solution.sql</span>
                <span className="text-[9px] px-1 py-0.2 rounded-[2px] bg-[#1F160E] text-[#FF9B42] border border-[#3E2314] font-normal">
                  SOLVE
                </span>
              </button>

              <span className="hidden xl:inline text-[10px] text-[#666666] font-mono ml-2">
                • SQLite 3.45 Session Sandbox Active
              </span>
            </div>

            {/* Quick Actions in Editor Header */}
            <div className="flex items-center gap-1.5">
              {activeEditorTab === 'schema' ? (
                <>
                  <button
                    onClick={handleResetDatabase}
                    disabled={isResettingSchema}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-xs font-mono text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
                    title="Reload original schema.sql"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline text-[11px]">Reset</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(schemaCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-1 rounded-[3px] text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
                    title="Copy schema.sql"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-[#38A169]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (problem) {
                        setCode(problem.starter_code);
                        persistence.saveDraft(currentCodeId, problem.starter_code, 'solution');
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-xs font-mono text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
                    title="Reset solution.sql to starter code"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline text-[11px]">Reset</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-1 rounded-[3px] text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-[#38A169]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </>
              )}

              <button
                onClick={() => setConsoleCollapsed((p) => !p)}
                className={`p-1 rounded-[3px] transition-colors ${
                  !consoleCollapsed ? 'bg-[#1A1A1A] text-[#FF6B00]' : 'text-[#888888] hover:text-[#F5F5F5]'
                }`}
                title="Toggle SQL Output Dock (Ctrl+J)"
              >
                <Table className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Monaco Code Editor Canvas */}
          <div className="flex-1 relative overflow-hidden bg-[#090909]">
            <MonacoEditor
              key={activeEditorTab}
              height="100%"
              defaultLanguage="sql"
              theme="vs-dark"
              value={activeEditorTab === 'schema' ? schemaCode : code}
              onChange={activeEditorTab === 'schema' ? handleSchemaCodeChange : handleCodeChange}
              options={{
                fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
                fontSize: 15,
                lineHeight: 24,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                padding: { top: 14, bottom: 14 },
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                fontLigatures: true,
              }}
            />
          </div>

          {/* Precision SQLite Terminal Console Dock */}
          {!consoleCollapsed && (
            <div
              className={`border-t border-[#242424] bg-[#0E0E0E] flex flex-col shrink-0 transition-all duration-[180ms] select-text ${
                dockHeight === 'expanded' ? 'h-80' : 'h-64'
              }`}
            >
              {/* Dock Header */}
              <div className="h-[34px] border-b border-[#242424] bg-[#121212] px-3 flex items-center justify-between shrink-0 select-none font-mono">
                {/* Left Tabs */}
                <div className="flex items-center h-full gap-3 text-[11px] font-semibold">
                  <div className="h-full flex items-center gap-1.5 px-1 text-[#F5F5F5] border-b-2 border-[#FF6B00]">
                    <span>SQL QUERY OUTPUT</span>
                    {isRunning && (
                      <span className="flex items-center gap-1 text-[9px] text-[#FF6B00] font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B00] animate-ping" />
                        executing
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Toolbar */}
                <div className="flex items-center gap-1 text-[#888888]">
                  <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono bg-[#161616] text-[#777777] mr-1 border border-[#222222]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#38A169]" />
                    <span>SQLite 3.45</span>
                  </div>

                  {/* Run Code Button */}
                  <button
                    onClick={() => handleRunCode()}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono text-[#CCCCCC] hover:bg-[#1E1E1E] hover:text-white transition-colors cursor-pointer disabled:opacity-40 mr-1"
                    title="Run SQL query (Ctrl+Enter)"
                  >
                    <Play className="h-2.5 w-2.5 fill-current text-[#FF6B00]" />
                    <span>Run Query</span>
                  </button>

                  {/* Expand / Minimize Height */}
                  <button
                    onClick={() => setDockHeight((p) => (p === 'normal' ? 'expanded' : 'normal'))}
                    className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2b2b2b] transition-colors cursor-pointer"
                    title={dockHeight === 'expanded' ? 'Collapse Grid' : 'Maximize Grid'}
                  >
                    {dockHeight === 'expanded' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>

                  {/* Close Terminal Dock */}
                  <button
                    onClick={() => setConsoleCollapsed(true)}
                    className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#2b2b2b] transition-colors cursor-pointer"
                    title="Close Panel (Ctrl+J)"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Data Grid Canvas */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3 bg-[#0F0F0F] text-[#CCCCCC] select-text"
              >
                  <SqlResultGrid
                    columns={runResponse?.columns}
                    rows={runResponse?.rows}
                    rawOutput={
                      runResponse?.stdout ||
                      (terminalHistory.length > 0 ? terminalHistory[terminalHistory.length - 1]?.stdout : '')
                    }
                    error={
                      runResponse?.stderr ||
                      (terminalHistory.length > 0 ? terminalHistory[terminalHistory.length - 1]?.stderr : '')
                    }
                    expectedOutput={problem?.expected_output}
                    isVerification={Boolean(runResponse && runResponse.test_results && runResponse.test_results.length > 0)}
                    isSuccess={Boolean(runResponse?.success)}
                    executionTimeMs={lastExecutionRuntime}
                    tableName={schemaTables.length > 0 ? schemaTables[0].name : "employees"}
                  />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Mobile Workspace Layout (< MD Only) */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden relative bg-[#070A0F]">
        {/* Mobile Segmented Mode Switcher */}
        <div className="h-11 border-b border-[#21262D] bg-[#111622] px-2 py-1.5 flex items-center gap-1.5 shrink-0 select-none">
          <button
            onClick={() => setMobileTab('spec')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'spec'
                ? 'bg-[#21262D] text-[#58A6FF] border border-[#30363D] shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Problem</span>
          </button>

          <button
            onClick={() => setMobileTab('code')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'code'
                ? 'bg-[#1F6FEB]/20 text-[#58A6FF] border border-[#1F6FEB]/40 shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            onClick={() => setMobileTab('interview')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'interview'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Interview</span>
          </button>
        </div>

        {/* Mobile Tab 1: Problem Spec */}
        {mobileTab === 'spec' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#070A0F] overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <ProblemOneSpecView
                problem={problem}
                onInsertCode={(suggestedCode) => {
                  setCode(suggestedCode);
                  persistence.saveDraft(currentCodeId, suggestedCode, 'solution');
                  setMobileTab('code');
                }}
              />
            </div>

            {/* Bottom Action: Jump to Code */}
            <div className="border-t border-[#21262D] bg-[#0E131C] p-3 shrink-0">
              <button
                onClick={() => setMobileTab('code')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1F6FEB] to-[#38BDF8] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-sky-950/40 cursor-pointer"
              >
                <span>Open Code Editor</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Tab 2: Code Editor (Distraction-free, No Terminal cluttering screen) */}
        {mobileTab === 'code' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#080B12] overflow-hidden relative">
            {/* Mobile Editor Sub-Bar with File Switcher */}
            <div className="h-9 px-2 border-b border-[#21262D] bg-[#0E131C] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveEditorTab('schema')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    activeEditorTab === 'schema'
                      ? 'bg-[#1E2E22] text-[#48BB78] border border-[#2E4A35]'
                      : 'text-[#8B949E]'
                  }`}
                >
                  schema.sql
                </button>
                <button
                  onClick={() => setActiveEditorTab('solution')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    activeEditorTab === 'solution'
                      ? 'bg-[#2E1E12] text-[#FF9B42] border border-[#4E2E18]'
                      : 'text-[#8B949E]'
                  }`}
                >
                  solution.sql
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const text = activeEditorTab === 'schema' ? schemaCode : code;
                    navigator.clipboard.writeText(text);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="p-1 rounded text-[#8B949E] hover:text-white transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {runResponse?.test_results && runResponse.test_results.length > 0 && (
                  <button
                    onClick={() => setMobileDrawerOpen(true)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer ${
                      runResponse.test_results.every((t) => t.passed)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    <span>
                      {runResponse.test_results.filter((t) => t.passed).length}/
                      {runResponse.test_results.length} Tests
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Full-Height Mobile Monaco Editor (Distraction-Free) */}
            <div className="flex-1 relative min-h-0 bg-[#080B12] pb-24">
              <MonacoEditor
                key={`mobile_${activeEditorTab}`}
                height="100%"
                defaultLanguage="sql"
                theme="vs-dark"
                value={activeEditorTab === 'schema' ? schemaCode : code}
                onChange={activeEditorTab === 'schema' ? handleSchemaCodeChange : handleCodeChange}
                onMount={(editor) => {
                  monacoEditorRef.current = editor;
                }}
                options={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                  fontSize: 13,
                  lineHeight: 21,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  insertSpaces: true,
                  padding: { top: 12, bottom: 84 },
                  renderLineHighlight: 'all',
                  cursorBlinking: 'smooth',
                  fontLigatures: true,
                  wordWrap: 'on',
                }}
              />
            </div>

            {/* Floating Ultra-Premium Mobile Action Dock (Guaranteed 100% Visible & Pinned to Viewport) */}
            <div className="fixed bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2.5 p-2 px-3 rounded-2xl bg-[#161B22]/95 backdrop-blur-xl border border-[#30363D] shadow-2xl shadow-black/90">
              {activeEditorTab === 'schema' ? (
                <>
                  <button
                    onClick={handleResetDatabase}
                    disabled={isResettingSchema || isSettingUpSchema}
                    className="p-3 rounded-xl border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0 shadow-inner"
                    title="Reset database sandbox"
                  >
                    {isResettingSchema ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-[#FF6B00]" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={handleRunSetup}
                    disabled={isSettingUpSchema || isResettingSchema}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#238636] via-[#2EA043] to-[#3FB950] active:scale-[0.98] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSettingUpSchema ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Play className="h-4 w-4 fill-current text-white" />
                    )}
                    <span className="tracking-wide uppercase text-[11px]">Run Setup (DDL)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleResetCode}
                    className="p-3 rounded-xl border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-white active:scale-95 transition-all cursor-pointer shrink-0 shadow-inner"
                    title="Reset code"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  {isCurrentProblemSolved && !isPracticingAgain ? (
                    <>
                      <button
                        onClick={handleSolveAgain}
                        disabled={isRunning || isSubmitting}
                        className="flex-1 py-3 px-3.5 rounded-xl border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] active:scale-[0.98] text-xs font-bold text-[#E6EDF3] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {isRunning ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-[#FF6B00]" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-[#FF9B42]" />
                        )}
                        <span>Solve Again</span>
                      </button>

                      <button
                        onClick={() => {
                          if (nextProblem) {
                            router.push(`/quest/${nextProblem.code_id || nextProblem.id}`);
                          } else {
                            router.push('/quest');
                          }
                        }}
                        className="flex-[1.6] py-3 px-4 rounded-xl bg-gradient-to-r from-[#238636] via-[#2EA043] to-[#3FB950] active:scale-[0.98] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <span>Next Challenge</span>
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRunTestCases()}
                        disabled={isRunning || isSubmitting}
                        className="flex-1 py-3 px-3.5 rounded-xl border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] active:scale-[0.98] text-xs font-bold text-[#E6EDF3] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {isRunning ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-[#58A6FF]" />
                        ) : (
                          <Play className="h-4 w-4 fill-current text-emerald-400" />
                        )}
                        <span>Run</span>
                      </button>

                      <button
                        onClick={handleSubmitCode}
                        disabled={isRunning || isSubmitting}
                        className="flex-[1.6] py-3 px-4 rounded-xl bg-gradient-to-r from-[#238636] via-[#2EA043] to-[#3FB950] hover:from-[#2EA043] hover:to-[#3FB950] active:scale-[0.98] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all disabled:opacity-50 cursor-pointer relative overflow-hidden"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-white shrink-0" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Check className="h-3.5 w-3.5 stroke-[3] text-white" />
                          </div>
                        )}
                        <span className="tracking-wide uppercase text-[11px]">Submit Solution</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile Tab 3: Interview Q&A */}
        {mobileTab === 'interview' && problem && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#070A0F] overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <InterviewPanel
                problem={problem}
                isSolved={isSolutionUnlocked}
                onClose={() => setMobileTab('code')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Test Results Bottom Sheet / Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="flex-1"
            aria-hidden="true"
          />
          <div className="bg-[#161B22] border-t border-[#30363D] rounded-t-2xl max-h-[82vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="p-4 border-b border-[#21262D] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {runResponse?.success &&
                (!runResponse.test_results || runResponse.test_results.every((t) => t.passed)) ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Check className="h-5 w-5 bg-emerald-500/20 rounded-full p-1 border border-emerald-500/40" />
                    <span>All Test Cases Passed!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                    <X className="h-5 w-5 bg-red-500/20 rounded-full p-1 border border-red-500/40" />
                    <span>
                      {runResponse?.test_results
                        ? `${runResponse.test_results.filter((t) => t.passed).length}/${runResponse.test_results.length} Tests Passed`
                        : 'Execution Finished'}
                    </span>
                  </div>
                )}
                {lastExecutionRuntime > 0 && (
                  <span className="text-[11px] font-mono text-[#8B949E]">
                    {lastExecutionRuntime}ms
                  </span>
                )}
              </div>

              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#8B949E] hover:text-white hover:bg-[#21262D] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sheet Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Test Case Selection Pills */}
              {problem?.visible_test_cases && problem.visible_test_cases.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {problem.visible_test_cases.map((_, idx) => {
                    const res = runResponse?.test_results?.[idx];
                    const isSelected = selectedCaseIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedCaseIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-[#1F6FEB] text-white'
                            : 'bg-[#21262D] text-[#8B949E] border border-[#30363D]'
                        }`}
                      >
                        {res !== undefined && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              res.passed ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                        )}
                        <span>Case {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Test Case Details */}
              {(() => {
                const result = runResponse?.test_results?.[selectedCaseIndex];
                const testCase = problem?.visible_test_cases?.[selectedCaseIndex];

                return (
                  <div className="p-3.5 rounded-xl border border-[#30363D] bg-[#0D1117] space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[#8B949E] text-[11px] block font-sans font-semibold mb-1">
                        Query Result:
                      </span>
                      <SqlResultGrid
                        columns={runResponse?.columns}
                        rows={runResponse?.rows}
                        rawOutput={result?.actual_output || runResponse?.stdout}
                        error={result?.error || runResponse?.stderr}
                        expectedOutput={result?.expected_output || testCase?.expected || problem?.expected_output}
                        isVerification={true}
                        isSuccess={Boolean(result?.passed ?? runResponse?.success)}
                        executionTimeMs={lastExecutionRuntime}
                        tableName="employees"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Optional Console Output Toggle */}
              <div className="pt-1">
                <button
                  onClick={() => setShowMobileConsoleLogs((p) => !p)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#30363D] bg-[#161B22] text-xs font-semibold text-[#8B949E] hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-[#58A6FF]" />
                    <span>Console Logs & Diagnostics</span>
                  </div>
                  {showMobileConsoleLogs ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showMobileConsoleLogs && (
                  <div className="mt-2 p-3 rounded-xl bg-[#0D1117] border border-[#21262D] font-mono text-xs text-[#C9D1D9] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {runResponse?.stdout || runResponse?.stderr || 'No console log output recorded.'}
                  </div>
                )}
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="p-3 border-t border-[#21262D] bg-[#0E131C] flex items-center gap-2">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#21262D] hover:bg-[#30363D] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Back to Code Editor
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}
