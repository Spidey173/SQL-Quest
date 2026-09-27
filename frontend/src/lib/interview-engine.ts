import { ChallengeDetail } from './types';
import {
  ALL_50_STUDY_DATA,
  ProblemStudyData
} from './interview-data';

export function getProblemStudyData(problem: ChallengeDetail): ProblemStudyData {
  const candidates: (string | number)[] = [
    problem.id,
    problem.level_number || '',
    String(problem.id),
    String(problem.level_number || ''),
  ];

  if (problem.code_id) {
    candidates.push(problem.code_id);
    const m = problem.code_id.match(/^(Basics|SQL|ASQL|Pro)-(\d+)$/i);
    if (m) {
      const prefix = m[1].toUpperCase();
      const n = parseInt(m[2], 10);
      if (prefix === 'BASICS') {
        candidates.push(n, String(n));
      } else if (prefix === 'SQL') {
        candidates.push(35 + n, String(35 + n));
      } else if (prefix === 'ASQL') {
        candidates.push(70 + n, String(70 + n));
      } else if (prefix === 'PRO') {
        candidates.push(80 + n, String(80 + n));
      }
    }
  }

  for (const cand of candidates) {
    if (cand && (ALL_50_STUDY_DATA as Record<string, any>)[cand]) {
      return (ALL_50_STUDY_DATA as Record<string, any>)[cand];
    }
  }

  // Fallback for custom challenges
  const title = problem.title || 'Technical Challenge';
  const diff = (problem.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Easy';

  return {
    id: `sql-${problem.id}`,
    title: title,
    levelNumber: problem.level_number || 1,
    problemId: problem.id,
    problemTitle: title,
    difficulty: diff,
    companyTags: ['Amazon', 'Microsoft', 'Google', 'TCS'],
    qas: [],
    tracing: {
      code: "1: FROM target_table\n2: WHERE filter_predicate\n3: GROUP BY grouping_columns\n4: HAVING group_predicate\n5: SELECT projection_columns\n6: ORDER BY sort_columns",
      steps: [
        { step: 1, lineNumber: 1, vars: { Phase: "FROM / JOIN", Action: "Locate table pages" }, explanation: "The query planner identifies target relation pages and performs table or index scans." },
        { step: 2, lineNumber: 2, vars: { Phase: "WHERE", Action: "Evaluate row predicates" }, explanation: "Filters out tuples before aggregation or sorting, minimizing memory footprint." },
        { step: 3, lineNumber: 5, vars: { Phase: "SELECT", Action: "Project output columns" }, explanation: "Projects requested scalar expressions, column aliases, and formats output rows." }
      ]
    },
    questions: [
      {
        id: 'fallback-q1',
        category: '30-Second Interview Pitch',
        question: `How would you explain your SQL approach for ${title} to a senior engineer?`,
        whatInterviewerChecks: 'Understanding of SQL logical query processing order and indexing awareness.',
        bestReplyScript: `I structured the query following ANSI relational semantics. We start from the source relation, filter early with SARGable WHERE predicates to leverage B-Tree indexes, aggregate where necessary, and project only required columns to avoid unnecessary I/O buffer allocation.`,
        keyPoints: ['Early predicate filtering', 'Index-friendly (SARGable) conditions', 'Projection limited to required fields']
      },
      {
        id: 'fallback-q2',
        category: 'Database Optimization',
        question: `Why avoid SELECT * in production and what index would benefit this query?`,
        whatInterviewerChecks: 'Index-only scan comprehension, covering indexes, and network/memory transfer overhead.',
        bestReplyScript: `SELECT * forces a full table scan or clustered index lookup to fetch all row attributes from disk. Specifying exact columns allows the database engine to perform a covering index scan, keeping query latency sub-millisecond and preventing buffer pool thrashing.`,
        keyPoints: ['Covering index optimization', 'Elimination of heap table lookups', 'Minimizing network transfer latency']
      }
    ],
    mistakes: [
      {
        id: 'm1',
        title: 'Using Column Aliases Inside WHERE Clause',
        description: 'Attempting to filter by a column alias created in SELECT.',
        badSnippet: 'SELECT salary * 1.1 AS bonus FROM employees WHERE bonus > 5000;',
        failingInput: 'Any query with aliased calculations in WHERE',
        consequence: 'Database raises: "no such column: bonus".',
        howToFix: 'In SQL execution order, WHERE executes BEFORE SELECT. Repeat the expression in WHERE or use a Common Table Expression (CTE).'
      },
      {
        id: 'm2',
        title: 'Cartesian Product from Missing Join Predicate',
        description: 'Joining multiple tables without explicit ON condition or matching keys.',
        badSnippet: 'SELECT * FROM employees, departments;',
        failingInput: 'Multi-table join without matching foreign key',
        consequence: 'Produces M * N row explosion, consuming gigabytes of temporary memory.',
        howToFix: 'Always use explicit ANSI INNER JOIN or LEFT JOIN with specific ON clauses.'
      }
    ]
  };
}
