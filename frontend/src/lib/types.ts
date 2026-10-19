export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  streak?: number;
  avatar: string;
  theme: string;
  created_at: string;
}

export interface TestCase {
  input: string;
  expected: string;
  hidden?: boolean;
  description?: string;
}

export interface ChallengeSummary {
  id: number;
  code_id: string;
  track?: string;
  chapter_id: number;
  chapter_title: string;
  level_number: number;
  title: string;
  difficulty: string;
  passed: boolean;
  stars: number;
  locked: boolean;
  is_boss?: boolean;
  xp_reward?: number;
  coin_reward?: number;
}

export interface ChapterGroup {
  chapter_id: number;
  chapter_title: string;
  levels: ChallengeSummary[];
  completion_percentage: number;
  total_xp?: number;
}

export interface ChallengeDetail {
  id: number;
  code_id: string;
  track?: string;
  chapter_id: number;
  chapter_title: string;
  level_number: number;
  title: string;
  story: string;
  objective: string;
  starter_code: string;
  expected_output: string;
  hints: string[];
  visible_test_cases: TestCase[];
  total_test_cases: number;
  explanation?: string;
  difficulty: string;
  passed: boolean;
  stars: number;
  saved_code?: string;
  setup_sql?: string;
  expected_tables?: string[];
  xp_reward?: number;
  coin_reward?: number;
  is_boss?: boolean;
  boss_name?: string;
  boss_hp?: number;
}

export interface SchemaTableColumn {
  name: string;
  type: string;
  pk?: boolean;
  nullable?: boolean;
}

export interface SchemaTableInfo {
  name: string;
  columns: SchemaTableColumn[];
  row_count: number;
  sample_rows: Record<string, any>[];
}

export interface SchemaSetupResponse {
  success: boolean;
  message: string;
  tables: SchemaTableInfo[];
  error?: string;
  execution_time_ms: number;
}

export interface TestCaseResult {
  test_case_index: number;
  description: string;
  passed: boolean;
  input: string;
  expected_output: string;
  actual_output: string;
  error?: string;
  execution_time_ms: number;
  hidden: boolean;
}

export interface QueryPlanNode {
  id: number;
  parent: number;
  detail: string;
  op_type: 'INDEX_SEARCH' | 'TEMP_B_TREE' | 'FULL_TABLE_SCAN' | 'EXECUTE' | string;
  efficiency: 'Optimal' | 'Memory Sort' | 'Sequential Scan' | 'Standard' | string;
}

export interface CodeRunResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  columns?: string[];
  rows?: any[][];
  test_results: TestCaseResult[];
  passed_all: boolean;
  execution_time_ms: number;
  security_error?: string;
  query_plan?: QueryPlanNode[];
}

export interface CodeSubmitResponse {
  success: boolean;
  passed_all: boolean;
  stars_earned: number;
  test_results: TestCaseResult[];
  columns?: string[];
  rows?: any[][];
  stdout?: string;
  stderr?: string;
  execution_time_ms?: number;
  next_challenge_id?: number | string;
  next_code_id?: string;
  new_achievements?: Achievement[];
  message: string;
  boss_defeated?: boolean;
  query_plan?: QueryPlanNode[];
}


export interface Achievement {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xp_bonus: number;
  coin_bonus: number;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  stars: number;
  streak: number;
}

export interface ChapterMastery {
  chapter_id: number;
  chapter_title: string;
  total_levels: number;
  completed_levels: number;
  stars_earned: number;
  total_stars: number;
  percentage: number;
}

export interface ProfileResponse {
  user: User;
  total_completed: number;
  total_challenges: number;
  total_stars: number;
  max_stars: number;
  accuracy_percentage: number;
  chapter_mastery: ChapterMastery[];
  weak_topics: string[];
  strengths: string[];
  recent_activity: Array<{
    challenge_title: string;
    code_id?: string;
    level_number: number;
    status: string;
    execution_time_ms: number;
    date: string;
  }>;
}

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

