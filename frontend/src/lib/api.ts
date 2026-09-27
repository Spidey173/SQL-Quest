import {
  ChapterGroup, ChallengeDetail, CodeRunResponse,
  CodeSubmitResponse, ProfileResponse, User, SubmissionLogEntry,
  SchemaSetupResponse, SchemaTableInfo
} from './types';

const envApi = process.env.NEXT_PUBLIC_API_URL?.trim();
const rawApiUrl = (envApi && envApi.startsWith('http'))
  ? envApi
  : (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
      ? 'https://sql-quest-backend.vercel.app'
      : '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('pq_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let msg = `Request failed with status ${res.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (typeof errorData.detail === 'string') {
          msg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          msg = errorData.detail
            .map((e: any) => e.msg || e.message || (typeof e === 'string' ? e : JSON.stringify(e)))
            .join('. ');
        } else if (errorData.message) {
          msg = errorData.message;
        }
      } catch {
        if (errorText && errorText.length < 200) {
          msg = errorText;
        }
      }
      throw new Error(msg);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('Connection timed out. Please try again.');
    }
    console.warn(`API call ${endpoint} failed:`, err);
    throw err;
  }
}

let _chaptersCache: ChapterGroup[] | null = null;
let _chaptersPromise: Promise<ChapterGroup[]> | null = null;
const _challengeCache = new Map<string, ChallengeDetail>();

export const api = {
  clearCache() {
    _chaptersCache = null;
    _chaptersPromise = null;
    _challengeCache.clear();
  },

  // Auth
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    api.clearCache();
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, 15000);
  },

  async register(username: string, email: string, password: string): Promise<{ access_token: string; user: User }> {
    api.clearCache();
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }, 15000);
  },

  async getMe(): Promise<User> {
    return request('/auth/me', {}, 10000);
  },

  // Challenges
  async getChapters(forceRefresh = false): Promise<ChapterGroup[]> {
    if (forceRefresh) {
      _chaptersCache = null;
      _chaptersPromise = null;
    } else if (_chaptersCache) {
      return _chaptersCache;
    }
    if (_chaptersPromise) {
      return _chaptersPromise;
    }
    _chaptersPromise = request<ChapterGroup[]>('/challenges/chapters', {}, 15000)
      .then((data) => {
        _chaptersCache = data;
        _chaptersPromise = null;
        return data;
      })
      .catch((err) => {
        _chaptersPromise = null;
        if (_chaptersCache) return _chaptersCache;
        throw err;
      });
    return _chaptersPromise;
  },

  async getChallenge(id: number | string): Promise<ChallengeDetail> {
    const key = String(id);
    if (_challengeCache.has(key)) {
      return _challengeCache.get(key)!;
    }
    const data = await request<ChallengeDetail>(`/challenges/${id}`);
    _challengeCache.set(key, data);
    return data;
  },

  // Code Execution & 2-Phase Schema Setup
  async setupSchema(challengeId: number | string, schemaSql: string, sessionId?: string): Promise<SchemaSetupResponse> {
    return request('/execution/setup-schema', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, schema_sql: schemaSql, session_id: sessionId }),
    }, 12000);
  },

  async resetSchema(challengeId: number | string, sessionId?: string): Promise<{ success: boolean; message: string; setup_sql: string }> {
    return request('/execution/reset-schema', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, schema_sql: '', session_id: sessionId }),
    }, 10000);
  },

  async getSessionSchema(challengeId: number | string, sessionId?: string): Promise<{ has_session_db: boolean; tables: SchemaTableInfo[] }> {
    const q = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    return request(`/execution/get-schema/${challengeId}${q}`);
  },

  async runCode(challengeId: number | string, code: string, customInput?: string, sessionId?: string): Promise<CodeRunResponse> {
    return request('/execution/run', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code, custom_input: customInput, session_id: sessionId }),
    });
  },

  async submitCode(challengeId: number | string, code: string, hintsUsed: number = 0, sessionId?: string): Promise<CodeSubmitResponse> {
    const res = await request<CodeSubmitResponse>('/execution/submit', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, code, hints_used: hintsUsed, session_id: sessionId }),
    });
    _challengeCache.delete(String(challengeId));
    _chaptersCache = null;
    _chaptersPromise = null;
    return res;
  },

  // Profile
  async getProfile(): Promise<ProfileResponse> {
    return request('/profile/me');
  },

  async getUserSubmissions(): Promise<SubmissionLogEntry[]> {
    return request<SubmissionLogEntry[]>('/profile/submissions', {}, 10000).catch(() => []);
  },

  // Admin
  async getAdminMetrics(): Promise<{
    total_users: number;
    total_challenges: number;
    total_submissions: number;
    overall_pass_rate: number;
    popular_challenges: Array<{ level: number; title: string; runs: number }>;
  }> {
    return request('/admin/metrics');
  },

  async getAdminUsers(): Promise<User[]> {
    return request('/admin/users');
  },

  async updateAdminUser(userId: number, updates: Partial<User>): Promise<{ success: boolean; user: User }> {
    return request(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};
