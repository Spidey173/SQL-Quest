import { ChallengeDetail } from './types';
import { ALL_PROBLEM_SOLUTIONS, ProblemSolution } from './ranked-solutions-data';

export type { ProblemSolution };

export interface UserMethodAnalysis {
  methodName: string;
  rankTitle: string;
  timeComplexity: string;
  spaceComplexity: string;
  isOptimal: boolean;
  assessment: string;
  keyFeatures: string[];
}

export interface LearnerGuide {
  fourWays: Array<{
    number: number;
    title: string;
    description: string;
    concept: string;
  }>;
  walkthroughStages: Array<{
    stageNumber: number;
    stageTitle: string;
    mission: string;
    codeSnippet?: string;
    interactiveHint: string;
    actionLabel: string;
  }>;
}

export function getProblemSolution(problem: ChallengeDetail | string | number): ProblemSolution {
  if (typeof problem === 'string') {
    return ALL_PROBLEM_SOLUTIONS[problem] || ALL_PROBLEM_SOLUTIONS['Basics-001'];
  }
  if (typeof problem === 'number') {
    return ALL_PROBLEM_SOLUTIONS[String(problem)] || ALL_PROBLEM_SOLUTIONS['Basics-001'];
  }
  // Try code_id first (e.g. "Basics-001", "SQL-001", "001"), then numeric id / level_number
  return (
    ALL_PROBLEM_SOLUTIONS[problem.code_id] ||
    ALL_PROBLEM_SOLUTIONS[String(problem.id)] ||
    ALL_PROBLEM_SOLUTIONS[String(problem.level_number)] ||
    ALL_PROBLEM_SOLUTIONS['Basics-001']
  );
}

export function classifyUserMethod(problemId: number | string, userCode: string): UserMethodAnalysis {
  const cleanCode = (userCode || '').trim().toUpperCase();

  if (!cleanCode) {
    return {
      methodName: 'Unsubmitted Code',
      rankTitle: 'Query Status: Empty',
      timeComplexity: 'O(1)',
      spaceComplexity: 'O(1)',
      isOptimal: false,
      assessment: 'Write an ANSI SQL query to solve this database challenge.',
      keyFeatures: ['Empty query input'],
    };
  }

  // Detect SQL pattern markers
  const containsJoin = cleanCode.includes('JOIN');
  const containsGroupBy = cleanCode.includes('GROUP BY');
  const containsWindow = cleanCode.includes('OVER') || cleanCode.includes('ROW_NUMBER') || cleanCode.includes('RANK');
  const containsCTE = cleanCode.includes('WITH');
  const containsDistinct = cleanCode.includes('DISTINCT');

  if (containsWindow || containsCTE) {
    return {
      methodName: 'Advanced SQL Query (Window Function / CTE)',
      rankTitle: 'Optimal Advanced',
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      isOptimal: true,
      assessment: 'Your solution leverages advanced SQL capabilities (Window Functions or CTEs) for high efficiency!',
      keyFeatures: containsWindow ? ['Window partition analytics', 'Rank ordering'] : ['Modular common table expression'],
    };
  }

  if (containsGroupBy || containsJoin || containsDistinct) {
    return {
      methodName: 'Relational Aggregation / Join Pattern',
      rankTitle: 'Standard Relational',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      isOptimal: true,
      assessment: 'Solid SQL query using standard joins, grouping, or distinct projections.',
      keyFeatures: containsJoin ? ['Multi-table JOIN operation'] : ['GROUP BY aggregation'],
    };
  }

  const solution = getProblemSolution(problemId);

  return {
    methodName: 'Standard Projection / Selection',
    rankTitle: 'Standard Query',
    timeComplexity: solution?.timeComplexity || 'O(N)',
    spaceComplexity: solution?.spaceComplexity || 'O(N)',
    isOptimal: true,
    assessment: 'Clean ANSI SQL query targeting schema columns.',
    keyFeatures: ['Direct table projection', 'Filtering logic'],
  };
}

export function getProblemLearnerGuide(problemId: number | string, challenge?: ChallengeDetail): LearnerGuide {
  const solution = getProblemSolution(challenge || problemId);
  const title = challenge?.title || solution?.title || `SQL Challenge #${problemId}`;

  return {
    fourWays: [
      {
        number: 1,
        title: 'Direct Table Selection',
        description: 'Standard ANSI SELECT projection filtering target attributes.',
        concept: 'Relational Projection',
      },
      {
        number: 2,
        title: 'Filtered & Sorted Query',
        description: 'Utilize WHERE predicates and ORDER BY clauses for index range scanning.',
        concept: 'B-Tree Index Scanning',
      },
      {
        number: 3,
        title: 'Grouped Aggregation',
        description: 'Bucket tuples with GROUP BY and compute aggregate functions like COUNT, SUM, AVG.',
        concept: 'Relational Grouping',
      },
      {
        number: 4,
        title: 'Advanced Window Analytics',
        description: 'Partition and rank dataset rows with window functions like ROW_NUMBER() and RANK().',
        concept: 'Window Frame Processing',
      },
    ],
    walkthroughStages: [
      {
        stageNumber: 1,
        stageTitle: 'Understand Schema & Requirements',
        mission: `Identify target database tables and output column requirements for: ${title}`,
        interactiveHint: 'Check table schema and sample data before crafting your SELECT statement.',
        actionLabel: 'Inspect Schema',
      },
      {
        stageNumber: 2,
        stageTitle: 'Draft & Test Base Query',
        mission: 'Write initial SELECT statement with required joins and WHERE conditions.',
        codeSnippet: solution?.code || 'SELECT * FROM table_name;',
        interactiveHint: 'Run your SQL query to verify actual tabular output against expected schema.',
        actionLabel: 'Execute Query',
      },
      {
        stageNumber: 3,
        stageTitle: 'Optimize Execution Plan',
        mission: 'Ensure index usage, remove redundant SELECT * wildcards, and format output headers.',
        interactiveHint: 'Check EXPLAIN QUERY PLAN to verify no unexpected full-table scans occur.',
        actionLabel: 'Optimize SQL',
      },
    ],
  };
}
