// SQL Quest Persistence Layer
// Pluggable persistence service conforming to docs/engineering.md specification

export interface SubmissionLogEntry {
  id: string;
  problemId: number | string;
  code_id?: string;
  problemTitle: string;
  passed: boolean;
  runtimeMs: number;
  timestamp: number;
  code: string;
}

export interface LayoutSettings {
  navigatorCollapsed: boolean;
  consoleCollapsed: boolean;
  consoleHeight: number;
  activeDocTab: 'spec' | 'context' | 'hints';
}

export interface PersistenceProvider {
  saveDraft(problemId: number | string, code: string, fileType?: 'solution' | 'schema'): Promise<void>;
  loadDraft(problemId: number | string, fileType?: 'solution' | 'schema'): Promise<string | null>;
  saveLayoutSettings(settings: Partial<LayoutSettings>): Promise<void>;
  loadLayoutSettings(): Promise<LayoutSettings>;
  getSolvedIds(): Promise<any[]>;
  markSolved(problemId: number | string): Promise<void>;
  getUnlockedSolutionIds(): Promise<any[]>;
  markSolutionUnlocked(problemId: number | string): Promise<void>;
  getLastActiveProblemId(): Promise<string>;
  setLastActiveProblemId(id: number | string): Promise<void>;
  getSubmissions(): Promise<SubmissionLogEntry[]>;
  saveSubmissions(entries: SubmissionLogEntry[]): Promise<void>;
  recordSubmission(entry: Omit<SubmissionLogEntry, 'id' | 'timestamp'>): Promise<SubmissionLogEntry>;
  clearUserData(): Promise<void>;
}

const DEFAULT_SETTINGS: LayoutSettings = {
  navigatorCollapsed: false,
  consoleCollapsed: false,
  consoleHeight: 220,
  activeDocTab: 'spec',
};

// Bump this version string whenever the database is re-seeded or reset.
// This causes all clients to auto-purge stale localStorage progress data on next load.
const PERSISTENCE_DATA_VERSION = 'v4_db_reset_2026_09_22_clean_slate';

class LocalPersistenceProvider implements PersistenceProvider {
  private isBrowser = typeof window !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      try {
        // Version-gated reset: wipe stale progress data when DB is re-seeded
        const storedVersion = localStorage.getItem('sqlquest_data_version');
        if (storedVersion !== PERSISTENCE_DATA_VERSION) {
          console.info(`[Persistence] Data version changed (${storedVersion} → ${PERSISTENCE_DATA_VERSION}), clearing stale progress.`);
          localStorage.removeItem('sqlquest_solved_ids');
          localStorage.removeItem('sqlquest_submissions_log');
          localStorage.removeItem('sql_quest_submissions');
          localStorage.removeItem('sql_quest_solved_ids');
          localStorage.removeItem('sqlquest_last_active_problem');
          localStorage.removeItem('sqlquest_unlocked_solution_ids');
          // Also clear all cached draft code (may reference old problem IDs)
          const draftKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('sqlquest_draft_') || k.startsWith('sqlquest_last_saved_'))) {
              draftKeys.push(k);
            }
          }
          for (const k of draftKeys) {
            localStorage.removeItem(k);
          }
          // Also clear cached curriculum
          localStorage.removeItem('pq_cached_chapters_v3');
          localStorage.removeItem('sqlquest_curriculum_v4');
          localStorage.removeItem('sqlquest_curriculum_v5');
          localStorage.setItem('sqlquest_data_version', PERSISTENCE_DATA_VERSION);
        }
      } catch (e) {
        console.warn('Error purging legacy storage keys:', e);
      }
    }
  }

  async saveDraft(problemId: number | string, code: string, fileType: 'solution' | 'schema' = 'solution'): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const key = fileType === 'schema' ? `sqlquest_draft_schema_${problemId}` : `sqlquest_draft_${problemId}`;
      const timeKey = fileType === 'schema' ? `sqlquest_last_saved_schema_${problemId}` : `sqlquest_last_saved_${problemId}`;
      localStorage.setItem(key, code);
      localStorage.setItem(timeKey, Date.now().toString());
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }

  async loadDraft(problemId: number | string, fileType: 'solution' | 'schema' = 'solution'): Promise<string | null> {
    if (!this.isBrowser) return null;
    try {
      const key = fileType === 'schema' ? `sqlquest_draft_schema_${problemId}` : `sqlquest_draft_${problemId}`;
      const code = localStorage.getItem(key);
      if (!code) return null;

      // Discard any draft that contains legacy Python code
      const isPythonDraft = /^\s*(def\s+|class\s+|import\s+|from\s+|s\s*=|print\(|input\(|#\s*TODO)/im.test(code) ||
                            code.includes('input()') ||
                            code.includes('counts.get') ||
                            code.includes('while left < right') ||
                            code.includes('def ') ||
                            code.includes('non-repeating character');

      if (isPythonDraft) {
        localStorage.removeItem(key);
        return null;
      }

      return code;
    } catch {
      return null;
    }
  }

  async saveLayoutSettings(settings: Partial<LayoutSettings>): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const current = await this.loadLayoutSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('sqlquest_layout_settings', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save layout settings:', e);
    }
  }

  async loadLayoutSettings(): Promise<LayoutSettings> {
    if (!this.isBrowser) return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem('sqlquest_layout_settings');
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async getSolvedIds(): Promise<any[]> {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem('sqlquest_solved_ids');
      if (!raw) return []; // Real initial: 0 solved
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async markSolved(problemId: number | string): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const solved = await this.getSolvedIds();
      if (!solved.includes(problemId)) {
        solved.push(problemId);
        localStorage.setItem('sqlquest_solved_ids', JSON.stringify(solved));
      }
    } catch (e) {
      console.warn('Failed to mark problem solved:', e);
    }
  }

  async getUnlockedSolutionIds(): Promise<any[]> {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem('sqlquest_unlocked_solution_ids');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async markSolutionUnlocked(problemId: number | string): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const unlocked = await this.getUnlockedSolutionIds();
      if (!unlocked.includes(problemId)) {
        unlocked.push(problemId);
        localStorage.setItem('sqlquest_unlocked_solution_ids', JSON.stringify(unlocked));
      }
    } catch (e) {
      console.warn('Failed to mark solution unlocked:', e);
    }
  }

  async getLastActiveProblemId(): Promise<string> {
    if (!this.isBrowser) return 'Basics-001';
    try {
      const id = localStorage.getItem('sqlquest_last_active_problem');
      return id || 'Basics-001';
    } catch {
      return 'Basics-001';
    }
  }

  async setLastActiveProblemId(id: number | string): Promise<void> {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem('sqlquest_last_active_problem', id.toString());
    } catch (e) {
      console.warn('Failed to set last active problem:', e);
    }
  }

  async getSubmissions(): Promise<SubmissionLogEntry[]> {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem('sqlquest_submissions_log');
      if (!raw) return []; // Real initial: 0 submissions
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async saveSubmissions(entries: SubmissionLogEntry[]): Promise<void> {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem('sqlquest_submissions_log', JSON.stringify(entries.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save submissions:', e);
    }
  }

  async recordSubmission(entry: Omit<SubmissionLogEntry, 'id' | 'timestamp'>): Promise<SubmissionLogEntry> {
    const fullEntry: SubmissionLogEntry = {
      ...entry,
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
    };
    if (!this.isBrowser) return fullEntry;
    try {
      const logs = await this.getSubmissions();
      logs.unshift(fullEntry);
      // Keep up to 100 most recent submissions
      localStorage.setItem('sqlquest_submissions_log', JSON.stringify(logs.slice(0, 100)));
      if (entry.passed) {
        await this.markSolved(entry.problemId);
      }
    } catch (e) {
      console.warn('Failed to record submission:', e);
    }
    return fullEntry;
  }

  async clearUserData(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem('sqlquest_solved_ids');
      localStorage.removeItem('sqlquest_submissions_log');
      localStorage.removeItem('sqlquest_last_active_problem');
      localStorage.removeItem('sqlquest_unlocked_solution_ids');
      localStorage.removeItem('sqlquest_curriculum_fast_v1');
      localStorage.removeItem('sql_quest_submissions');
      localStorage.removeItem('sql_quest_solved_ids');
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('sqlquest_draft_') ||
            k.startsWith('sqlquest_last_saved_'))
        ) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed to clear persistence user data:', e);
    }
  }
}

export const persistence: PersistenceProvider = new LocalPersistenceProvider();

/**
 * Calculates real consecutive active days streak from real submission timestamps.
 */
export function calculateRealStreak(submissions: SubmissionLogEntry[]): number {
  if (!submissions || submissions.length === 0) return 0;

  const datesWithActivity = new Set<string>();
  submissions.forEach((sub) => {
    const d = new Date(sub.timestamp);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    datesWithActivity.add(dateStr);
  });

  const now = new Date();
  const formatDay = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const todayStr = formatDay(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDay(yesterday);

  // If no activity today or yesterday, streak is broken
  if (!datesWithActivity.has(todayStr) && !datesWithActivity.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let curr = new Date(now);
  // If no activity today, start counting backward from yesterday
  if (!datesWithActivity.has(todayStr)) {
    curr = yesterday;
  }

  while (datesWithActivity.has(formatDay(curr))) {
    streak++;
    curr.setDate(curr.getDate() - 1);
  }

  return streak;
}

/**
 * Calculates real average execution runtime in milliseconds from submissions.
 */
export function calculateRealAverageRuntime(submissions: SubmissionLogEntry[]): number {
  if (!submissions || submissions.length === 0) return 0;
  const total = submissions.reduce((acc, s) => acc + (s.runtimeMs || 0), 0);
  return Math.round(total / submissions.length);
}

/**
 * Debounces a callback function by the specified delay in milliseconds (default 2000ms per engineering spec).
 */
export function createDebouncedSaver(
  saveFn: (code: string) => void | Promise<void>,
  delayMs = 2000
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (code: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      saveFn(code);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Resolves any problem identifier or summary to a canonical problem database primary key (1..100).
 * Handles:
 * - Direct primary key numbers (1..100)
 * - Code ID strings ("Basics-001".."Basics-035" -> 1..35, "SQL-001".."SQL-035" -> 36..70, "ASQL-001".."ASQL-010" -> 71..80, "Pro-001".."Pro-020" -> 81..100)
 * - Problem objects ({ id, code_id, ... })
 */
export function getCanonicalProblemId(
  item: number | string | { id?: number; code_id?: string; level_number?: number } | null | undefined,
  allProblems?: Array<{ id: number; code_id?: string; level_number?: number }>
): number {
  if (item === null || item === undefined) return 0;

  if (typeof item === 'object') {
    if (typeof item.id === 'number' && item.id >= 1 && item.id <= 1000) {
      return item.id;
    }
    if (item.code_id) {
      return getCanonicalProblemId(item.code_id, allProblems);
    }
    return 0;
  }

  if (typeof item === 'string') {
    const s = item.trim().toUpperCase();

    // Check "ASQL-001" .. "ASQL-010" -> 71..80
    if (s.startsWith('ASQL-') || s.startsWith('ASQL_')) {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 10) {
        return num + 70;
      }
    }

    // Check "PRO-001" .. "PRO-020" -> 81..100
    if (s.startsWith('PRO-') || s.startsWith('PRO_')) {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 20) {
        return num + 80;
      }
    }

    // Check "SQL-001" .. "SQL-035" -> 36..70
    if (s.startsWith('SQL-') || s.startsWith('SQL_')) {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 70) {
        return num + 35;
      }
    }

    // Check "BASICS-001" .. "BASICS-035" or "BASIS-001" .. "BASIS-035" -> 1..35
    if (s.startsWith('BASICS-') || s.startsWith('BASICS_') || s.startsWith('BASIS-') || s.startsWith('BASIS_')) {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 35) {
        return num;
      }
    }

    // Lookup in allProblems by code_id
    if (allProblems && allProblems.length > 0) {
      const found = allProblems.find((p) => p.code_id && (p.code_id.toUpperCase() === s || p.code_id === s.padStart(3, '0')));
      if (found && typeof found.id === 'number') {
        return found.id;
      }
    }

    // Numeric string e.g. "36" or "001"
    const parsed = parseInt(s, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 1000) {
      return parsed;
    }

    return 0;
  }

  if (typeof item === 'number') {
    if (isNaN(item) || item <= 0) return 0;

    // Direct database primary key 1..1000
    if (item >= 1 && item <= 1000) {
      return item;
    }

    // Lookup in allProblems if available
    if (allProblems && allProblems.length > 0) {
      const found = allProblems.find((p) => p.id === item);
      if (found && typeof found.id === 'number') {
        return found.id;
      }
    }
  }

  return 0;
}

/**
 * Resolves any problem identifier to a canonical uppercase code_id string (e.g. "Basis-001" or "SQL-001").
 */
export function getCanonicalCodeId(
  item: number | string | { id?: number; code_id?: string; level_number?: number } | null | undefined,
  allProblems?: Array<{ id: number; code_id?: string; level_number?: number }>
): string | null {
  if (item === null || item === undefined) return null;

  if (typeof item === 'object') {
    if (item.code_id) return getCanonicalCodeId(item.code_id, allProblems);
    if (typeof item.id === 'number') return getCanonicalCodeId(item.id, allProblems);
    return null;
  }

  if (typeof item === 'string') {
    const s = item.trim().toUpperCase();
    if (s.startsWith('SQL-') || s.startsWith('SQL_')) {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 215) {
        return `SQL-${String(num).padStart(3, '0')}`;
      }
    }
    if (s.startsWith('BASICS-') || s.startsWith('BASICS_') || s.startsWith('BASIS-') || s.startsWith('BASIS_')) {
      const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 35) {
        return `Basics-${String(num).padStart(3, '0')}`;
      }
    }
    const num = parseInt(s, 10);
    if (!isNaN(num)) return getCanonicalCodeId(num, allProblems);
    return null;
  }

  if (typeof item === 'number') {
    if (item >= 1 && item <= 35) {
      return `Basics-${String(item).padStart(3, '0')}`;
    }
    if (item >= 36 && item <= 70) {
      return `SQL-${String(item - 35).padStart(3, '0')}`;
    }
    if (item >= 71 && item <= 80) {
      return `ASQL-${String(item - 70).padStart(3, '0')}`;
    }
    if (item >= 81 && item <= 100) {
      return `Pro-${String(item - 80).padStart(3, '0')}`;
    }
    if (allProblems && allProblems.length > 0) {
      const found = allProblems.find((p) => p.id === item);
      if (found?.code_id) return found.code_id;
    }
  }

  return null;
}

/**
 * Robust, cross-tier solved checker.
 * Evaluates whether a challenge is solved using the unique database primary key or code_id.
 * Never collides across tracks on bare level_number.
 */
export function isProblemSolved(
  problem: { id: number; code_id?: string; level_number?: number; passed?: boolean } | null | undefined,
  solvedIds: (number | string)[],
  allProblems?: Array<{ id: number; code_id?: string; level_number?: number }>
): boolean {
  if (!problem) return false;
  if (problem.passed === true) return true;

  const targetId = getCanonicalProblemId(problem, allProblems);
  const targetCode = problem.code_id ? problem.code_id.toUpperCase() : null;

  for (const raw of solvedIds) {
    if (raw === problem.id) return true;
    if (targetCode && typeof raw === 'string' && raw.toUpperCase() === targetCode) {
      return true;
    }
    const rawCanonical = getCanonicalProblemId(raw, allProblems);
    if (rawCanonical > 0 && targetId > 0 && rawCanonical === targetId) {
      return true;
    }
  }

  return false;
}

