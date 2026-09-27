// SQL Dialect Comparison & Cross-Engine Intelligence Engine
// Covers SQLite (Sandbox), PostgreSQL (Production/Neon), MySQL (LeetCode Default), and Snowflake (Enterprise Cloud DWH)

import { ChallengeDetail } from './types';
import { getProblemSolution } from './problem-intelligence';

export type SqlDialectId = 'sqlite' | 'postgres' | 'mysql' | 'snowflake';

export interface SqlDialectMeta {
  id: SqlDialectId;
  name: string;
  version: string;
  badgeLabel: string;
  tagline: string;
  brandColor: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  interviewContext: string;
  iconName: string;
}

export const SQL_DIALECTS: Record<SqlDialectId, SqlDialectMeta> = {
  sqlite: {
    id: 'sqlite',
    name: 'SQLite',
    version: '3.45',
    badgeLabel: 'SANDBOX ENGINE',
    tagline: 'Active In-Browser Execution Sandbox',
    brandColor: '#003B57',
    badgeBorder: 'border-cyan-500/40',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    interviewContext: 'Used in embedded devices, mobile apps, edge computing, and client-side wasm sandboxes. Weak typing, dates stored as TEXT or REAL, and lacks native DATEDIFF or FULL OUTER JOIN.',
    iconName: 'Database',
  },
  postgres: {
    id: 'postgres',
    name: 'PostgreSQL',
    version: '16.x',
    badgeLabel: 'PRODUCTION STANDARD',
    tagline: 'Modern Web & Backend Standard (Neon, Supabase, Meta, Stripe)',
    brandColor: '#336791',
    badgeBorder: 'border-blue-500/40',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-400',
    interviewContext: 'Strict ANSI SQL adherence, rich INTERVAL date types, native regex (~), STRING_AGG(), and native FULL OUTER JOIN. Integer division truncates decimals (5 / 2 = 2), requiring explicit cast to ::numeric.',
    iconName: 'Server',
  },
  mysql: {
    id: 'mysql',
    name: 'MySQL',
    version: '8.0+',
    badgeLabel: 'LEETCODE DEFAULT',
    tagline: 'Classic LeetCode SQL & Enterprise Default (Amazon, Meta, Uber)',
    brandColor: '#00758F',
    badgeBorder: 'border-amber-500/40',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    interviewContext: 'Default engine in LeetCode/HackerRank coding interviews. Automatically converts division to float, uses DATEDIFF(d1, d2), but || means logical OR by default unless PIPES_AS_CONCAT is configured.',
    iconName: 'Cpu',
  },
  snowflake: {
    id: 'snowflake',
    name: 'Snowflake',
    version: 'Cloud DWH',
    badgeLabel: 'DATA WAREHOUSE',
    tagline: 'Modern Enterprise Analytics & BI (Data Eng / Analytics Eng)',
    brandColor: '#29B5E8',
    badgeBorder: 'border-sky-400/40',
    badgeBg: 'bg-sky-400/15',
    badgeText: 'text-sky-300',
    interviewContext: 'Industry gold standard for modern data stack and analytics engineering interviews. Supercharged with QUALIFY (filters window functions directly), LISTAGG(), zero-safe DIV0(), and native semi-structured VARIANT.',
    iconName: 'Layers',
  },
};

export interface DialectComparisonRow {
  construct: string;
  sqlite: string;
  postgres: string;
  mysql: string;
  snowflake: string;
  interviewNote: string;
}

export interface DialectComparison {
  problemId: string;
  title: string;
  hasDivergence: boolean;
  category: 'Date & Time' | 'String Manipulation' | 'Aggregation & Math' | 'Joins & Set Ops' | 'Window Analytics' | 'DML / Deletes' | 'ANSI Standard';
  varianceBadge: string;
  varianceSummary: string;
  whyInterviewersAsk: string;
  pitfallsToAvoid: string[];
  queries: Record<SqlDialectId, {
    code: string;
    notes: string;
    highlightedFunctions: string[];
  }>;
  comparisonTable?: DialectComparisonRow[];
}

// Hand-crafted curated dialect mappings for famous interview problems
const CURATED_DIALECT_MAP: Record<string, DialectComparison> = {
  // 1. LeetCode 197 / Pro-002: Rising Temperature (The #1 Classic Date Math Problem)
  'Pro-002': {
    problemId: 'Pro-002',
    title: 'Rising Temperature',
    hasDivergence: true,
    category: 'Date & Time',
    varianceBadge: 'Date Math: julianday() vs DATEDIFF vs INTERVAL',
    varianceSummary: 'Date subtraction diverges dramatically across engines: SQLite requires julianday() or DATE(), MySQL uses DATEDIFF(d1, d2), Postgres uses INTERVAL or date subtraction, and Snowflake inverts DATEDIFF parameter order.',
    whyInterviewersAsk: 'This is the single most commonly asked LeetCode SQL date question (LeetCode 197). Candidates frequently write MySQL\'s DATEDIFF in PostgreSQL interviews (which fails immediately because DATEDIFF does not exist in Postgres), or invert the arguments in Snowflake.',
    pitfallsToAvoid: [
      '❌ PostgreSQL DATEDIFF: PostgreSQL has no built-in DATEDIFF() function. Using DATEDIFF() in PostgreSQL throws "function datediff does not exist". Use "w1.recordDate = w2.recordDate + INTERVAL \'1 day\'" or "(w1.recordDate - w2.recordDate) = 1".',
      '❌ Snowflake Argument Order: Snowflake\'s DATEDIFF(\'day\', start, end) calculates (end - start). MySQL\'s DATEDIFF(d1, d2) calculates (d1 - d2). Getting this inverted yields -1 instead of 1.',
      '❌ SQLite Text Comparison: Comparing dates with "+" in SQLite (e.g. w2.recordDate + 1) converts dates to numbers incorrectly. You must use julianday() or DATE(w2.recordDate, \'+1 day\').',
    ],
    queries: {
      sqlite: {
        code: `SELECT w1.id
FROM Weather w1
JOIN Weather w2
  ON julianday(w1.recordDate) - julianday(w2.recordDate) = 1
WHERE w1.temperature > w2.temperature;`,
        notes: 'In SQLite, dates are stored as ISO text. Subtraction requires julianday() to convert dates into fractional Julian days, or DATE(w2.recordDate, "+1 day") = w1.recordDate.',
        highlightedFunctions: ['julianday()'],
      },
      postgres: {
        code: `SELECT w1.id
FROM Weather w1
JOIN Weather w2
  ON w1.recordDate = w2.recordDate + INTERVAL '1 day'
WHERE w1.temperature > w2.temperature;`,
        notes: 'PostgreSQL provides native interval arithmetic. Adding INTERVAL \'1 day\' or subtracting date types directly (w1.recordDate - w2.recordDate = 1) is standard and index-friendly.',
        highlightedFunctions: ['INTERVAL \'1 day\'', 'DATE subtraction'],
      },
      mysql: {
        code: `SELECT w1.id
FROM Weather w1
JOIN Weather w2
  ON DATEDIFF(w1.recordDate, w2.recordDate) = 1
WHERE w1.temperature > w2.temperature;`,
        notes: 'Classic LeetCode 197 canonical solution in MySQL. DATEDIFF(expr1, expr2) returns (expr1 - expr2) in days.',
        highlightedFunctions: ['DATEDIFF(w1, w2)'],
      },
      snowflake: {
        code: `SELECT w1.id
FROM Weather w1
JOIN Weather w2
  ON DATEDIFF('day', w2.recordDate, w1.recordDate) = 1
WHERE w1.temperature > w2.temperature;`,
        notes: 'Snowflake\'s DATEDIFF requires the date part as first argument, followed by start date and end date: DATEDIFF(\'day\', start, end). Notice w2 comes before w1!',
        highlightedFunctions: ['DATEDIFF(\'day\', w2, w1)'],
      },
    },
    comparisonTable: [
      {
        construct: '1-Day Difference',
        sqlite: 'julianday(d1) - julianday(d2) = 1',
        postgres: 'd1 = d2 + INTERVAL \'1 day\'',
        mysql: 'DATEDIFF(d1, d2) = 1',
        snowflake: 'DATEDIFF(\'day\', d2, d1) = 1',
        interviewNote: 'Notice Snowflake places start date before end date; MySQL places end date first; Postgres uses INTERVAL.',
      },
      {
        construct: 'Add 1 Day',
        sqlite: 'DATE(d, \'+1 day\')',
        postgres: 'd + INTERVAL \'1 day\'',
        mysql: 'DATE_ADD(d, INTERVAL 1 DAY)',
        snowflake: 'DATEADD(\'day\', 1, d)',
        interviewNote: 'Standard date addition function varies across all 4 database engines.',
      },
    ],
  },

  // 2. LeetCode 196 / Pro-001: Delete Duplicate Emails (Classic DML Join Divergence)
  'Pro-001': {
    problemId: 'Pro-001',
    title: 'Delete Duplicate Emails',
    hasDivergence: true,
    category: 'DML / Deletes',
    varianceBadge: 'Multi-table DELETE: Subquery vs JOIN vs USING',
    varianceSummary: 'MySQL allows DELETE p1 FROM Person p1, Person p2; PostgreSQL requires DELETE FROM Person p1 USING Person p2; SQLite does not support DELETE with JOIN, requiring a subquery.',
    whyInterviewersAsk: 'LeetCode 196 tests multi-table data mutation. Candidates often assume MySQL\'s "DELETE p1 FROM Person p1 JOIN Person p2" is universal ANSI SQL. In reality, PostgreSQL throws a syntax error without the USING keyword, and SQLite rejects DELETE with JOIN completely.',
    pitfallsToAvoid: [
      '❌ SQLite DELETE JOIN: SQLite does not support multi-table DELETE statements with JOIN. You must use "DELETE FROM Person WHERE id NOT IN (...)".',
      '❌ Postgres DELETE JOIN: PostgreSQL does not use "DELETE alias FROM table1 JOIN table2". It requires the specific "USING" clause: "DELETE FROM Person p1 USING Person p2 WHERE...".',
      '❌ MySQL Safe Updates: In MySQL workbench or production, running DELETE without a key column in WHERE fails under SQL_SAFE_UPDATES mode.',
    ],
    queries: {
      sqlite: {
        code: `DELETE FROM Person
WHERE id NOT IN (
  SELECT MIN(id)
  FROM Person
  GROUP BY email
);`,
        notes: 'SQLite standard DML approach: multi-table DELETE joins are not supported, so a subquery grouping by email to retain the minimum id is used.',
        highlightedFunctions: ['DELETE FROM ... WHERE id NOT IN (...)'],
      },
      postgres: {
        code: `DELETE FROM Person p1
USING Person p2
WHERE p1.email = p2.email
  AND p1.id > p2.id;`,
        notes: 'PostgreSQL uses the USING clause to join a secondary table in DELETE statements. The target table to delete from appears immediately after DELETE FROM.',
        highlightedFunctions: ['DELETE FROM ... USING'],
      },
      mysql: {
        code: `DELETE p1
FROM Person p1
JOIN Person p2
  ON p1.email = p2.email
  AND p1.id > p2.id;`,
        notes: 'MySQL allows explicitly listing the alias to delete before the FROM clause, followed by an INNER or SELF JOIN.',
        highlightedFunctions: ['DELETE p1 FROM Person p1 JOIN Person p2'],
      },
      snowflake: {
        code: `DELETE FROM Person
WHERE id NOT IN (
  SELECT MIN(id)
  FROM Person
  GROUP BY email
);`,
        notes: 'In Snowflake and Cloud Data Warehouses, DELETE with subquery or MERGE statements is idiomatic because DWH engines optimize micro-partition deletes via subqueries.',
        highlightedFunctions: ['DELETE FROM ... WHERE id NOT IN (...)'],
      },
    },
    comparisonTable: [
      {
        construct: 'Self-Join Mutation',
        sqlite: 'Subquery with MIN(id)',
        postgres: 'DELETE FROM t1 USING t2',
        mysql: 'DELETE t1 FROM t1 JOIN t2',
        snowflake: 'Subquery or MERGE',
        interviewNote: 'Massive dialect variance! MySQL is the only one using "DELETE alias FROM".',
      },
    ],
  },

  // 3. Basics-035: Display the Current Date and Time
  'Basics-035': {
    problemId: 'Basics-035',
    title: 'Display the Current Date and Time',
    hasDivergence: true,
    category: 'Date & Time',
    varianceBadge: 'Current Date/Time: DATE(\'now\') vs CURRENT_DATE vs NOW()',
    varianceSummary: 'Every major database engine uses a distinct syntax for retrieving system clock time and dates.',
    whyInterviewersAsk: 'Basic date/time retrieval is a quick litmus test in live coding rounds to see if you have actual hands-on production experience in their specific database stack.',
    pitfallsToAvoid: [
      '❌ SQLite NOW(): SQLite has no NOW() function. Calling NOW() will raise "no such function: NOW". Use datetime(\'now\') or date(\'now\').',
      '❌ MySQL CURRENT_TIMESTAMP vs NOW(): In MySQL, NOW() and CURRENT_TIMESTAMP() are synonyms, but CURDATE() extracts only date.',
      '❌ PostgreSQL clock_timestamp() vs now(): In PostgreSQL, now() returns the transaction start time, whereas clock_timestamp() returns the actual wall-clock time.',
    ],
    queries: {
      sqlite: {
        code: `SELECT DATE('now') AS current_date,
       TIME('now') AS current_time,
       DATETIME('now') AS current_timestamp;`,
        notes: 'SQLite uses date(\'now\'), time(\'now\'), and datetime(\'now\'). You can also use CURRENT_DATE and CURRENT_TIMESTAMP (without parentheses).',
        highlightedFunctions: ['DATE(\'now\')', 'DATETIME(\'now\')'],
      },
      postgres: {
        code: `SELECT CURRENT_DATE AS current_date,
       CURRENT_TIME AS current_time,
       NOW() AS current_timestamp;`,
        notes: 'PostgreSQL provides ANSI-standard CURRENT_DATE, CURRENT_TIME, and the ubiquitous NOW().',
        highlightedFunctions: ['CURRENT_DATE', 'NOW()'],
      },
      mysql: {
        code: `SELECT CURDATE() AS current_date,
       CURTIME() AS current_time,
       NOW() AS current_timestamp;`,
        notes: 'MySQL commonly uses CURDATE(), CURTIME(), and NOW(), though ANSI CURRENT_DATE is also accepted.',
        highlightedFunctions: ['CURDATE()', 'NOW()'],
      },
      snowflake: {
        code: `SELECT CURRENT_DATE() AS current_date,
       CURRENT_TIME() AS current_time,
       CURRENT_TIMESTAMP() AS current_timestamp;`,
        notes: 'Snowflake prefers CURRENT_DATE(), CURRENT_TIME(), and CURRENT_TIMESTAMP() with parentheses.',
        highlightedFunctions: ['CURRENT_DATE()', 'CURRENT_TIMESTAMP()'],
      },
    },
    comparisonTable: [
      {
        construct: 'Current Date',
        sqlite: 'DATE(\'now\') / CURRENT_DATE',
        postgres: 'CURRENT_DATE',
        mysql: 'CURDATE() / CURRENT_DATE',
        snowflake: 'CURRENT_DATE()',
        interviewNote: 'Postgres & SQLite don\'t require parentheses; Snowflake accepts them.',
      },
      {
        construct: 'Current Timestamp',
        sqlite: 'DATETIME(\'now\')',
        postgres: 'NOW()',
        mysql: 'NOW()',
        snowflake: 'CURRENT_TIMESTAMP()',
        interviewNote: 'SQLite requires the string parameter \'now\'.',
      },
    ],
  },

  // 4. SQL-011: Monthly Sales Summary
  'SQL-011': {
    problemId: 'SQL-011',
    title: 'Monthly Sales Summary',
    hasDivergence: true,
    category: 'Date & Time',
    varianceBadge: 'Month Extraction: strftime vs DATE_TRUNC vs MONTH()',
    varianceSummary: 'Extracting months for GROUP BY aggregation differs: SQLite uses strftime(), Postgres uses TO_CHAR() or DATE_TRUNC(), MySQL uses DATE_FORMAT() or MONTH(), and Snowflake uses DATE_TRUNC() or TO_VARCHAR().',
    whyInterviewersAsk: 'Grouping metrics by month is the #1 analytical SQL pattern in business intelligence and reporting. Interviewers evaluate whether you know how to truncate timestamps without losing year context.',
    pitfallsToAvoid: [
      '❌ Grouping by Month Number only: GROUP BY MONTH(order_date) collapses January 2023 and January 2024 into the same bucket! In production, always group by Year-Month (e.g. 2024-01).',
      '❌ Postgres strftime: PostgreSQL does not have strftime(). Use TO_CHAR(date, \'YYYY-MM\') or DATE_TRUNC(\'month\', date).',
      '❌ MySQL strftime: MySQL uses DATE_FORMAT(date, \'%Y-%m\'), not strftime.',
    ],
    queries: {
      sqlite: {
        code: `SELECT strftime('%Y-%m', sale_date) AS month,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY month
ORDER BY month;`,
        notes: 'SQLite uses strftime(\'%Y-%m\', date) to format timestamps into year-month strings.',
        highlightedFunctions: ['strftime(\'%Y-%m\', date)'],
      },
      postgres: {
        code: `SELECT TO_CHAR(sale_date, 'YYYY-MM') AS month,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY 1
ORDER BY 1;`,
        notes: 'In PostgreSQL, TO_CHAR(sale_date, \'YYYY-MM\') or DATE_TRUNC(\'month\', sale_date) is idiomatic. Postgres also allows grouping by positional index (GROUP BY 1).',
        highlightedFunctions: ['TO_CHAR(date, \'YYYY-MM\')', 'DATE_TRUNC'],
      },
      mysql: {
        code: `SELECT DATE_FORMAT(sale_date, '%Y-%m') AS month,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY month
ORDER BY month;`,
        notes: 'MySQL uses DATE_FORMAT(sale_date, \'%Y-%m\'). Notice MySQL supports referencing the column alias in GROUP BY!',
        highlightedFunctions: ['DATE_FORMAT(date, \'%Y-%m\')'],
      },
      snowflake: {
        code: `SELECT TO_VARCHAR(sale_date, 'YYYY-MM') AS month,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY month
ORDER BY month;`,
        notes: 'Snowflake supports TO_VARCHAR(sale_date, \'YYYY-MM\') or DATE_TRUNC(\'month\', sale_date), and seamlessly allows alias reuse in GROUP BY.',
        highlightedFunctions: ['TO_VARCHAR(date, \'YYYY-MM\')'],
      },
    },
    comparisonTable: [
      {
        construct: 'Year-Month String',
        sqlite: 'strftime(\'%Y-%m\', d)',
        postgres: 'TO_CHAR(d, \'YYYY-MM\')',
        mysql: 'DATE_FORMAT(d, \'%Y-%m\')',
        snowflake: 'TO_VARCHAR(d, \'YYYY-MM\')',
        interviewNote: 'Every single engine has a completely different date formatting function name!',
      },
    ],
  },

  // 5. Basics-019 / SQL-024: FULL OUTER JOIN
  'Basics-019': {
    problemId: 'Basics-019',
    title: 'Retrieve All Records from Both Tables Using FULL OUTER JOIN',
    hasDivergence: true,
    category: 'Joins & Set Ops',
    varianceBadge: 'FULL OUTER JOIN: Native Support vs UNION Simulation',
    varianceSummary: 'PostgreSQL and Snowflake natively support FULL OUTER JOIN. SQLite and MySQL historically lack native FULL OUTER JOIN, requiring a LEFT JOIN + RIGHT JOIN UNION simulation.',
    whyInterviewersAsk: 'Classic database engine architecture question: "How do you achieve a FULL OUTER JOIN in an engine that doesn\'t support it?"',
    pitfallsToAvoid: [
      '❌ Using FULL OUTER JOIN in MySQL: MySQL throws an immediate syntax error on "FULL OUTER JOIN". You must write LEFT JOIN UNION RIGHT JOIN.',
      '❌ SQLite Version Gotcha: Older SQLite versions (< 3.39) supported neither RIGHT JOIN nor FULL OUTER JOIN. Even in newer SQLite, FULL JOIN is simulated or restricted.',
      '❌ Forgetting UNION vs UNION ALL: Simulating FULL OUTER JOIN requires UNION (to deduplicate matching rows), not UNION ALL.',
    ],
    queries: {
      sqlite: {
        code: `SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
UNION
SELECT e.employee_id, e.first_name, d.department_id
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id;`,
        notes: 'SQLite standard pattern: Emulate FULL OUTER JOIN by taking a LEFT JOIN, and UNIONing it with the reversed LEFT JOIN to include unmatched rows from both tables.',
        highlightedFunctions: ['LEFT JOIN ... UNION ... LEFT JOIN'],
      },
      postgres: {
        code: `SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
FULL OUTER JOIN departments d
  ON e.department_id = d.department_id;`,
        notes: 'PostgreSQL natively implements standard ANSI FULL OUTER JOIN with high performance hash full join algorithms.',
        highlightedFunctions: ['FULL OUTER JOIN'],
      },
      mysql: {
        code: `SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
UNION
SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id;`,
        notes: 'MySQL does NOT support FULL OUTER JOIN syntax. You must combine LEFT JOIN and RIGHT JOIN using UNION (which strips duplicates).',
        highlightedFunctions: ['LEFT JOIN ... UNION ... RIGHT JOIN'],
      },
      snowflake: {
        code: `SELECT e.employee_id, e.first_name, d.department_name
FROM employees e
FULL OUTER JOIN departments d
  ON e.department_id = d.department_id;`,
        notes: 'Snowflake fully supports native FULL OUTER JOIN across large distributed datasets.',
        highlightedFunctions: ['FULL OUTER JOIN'],
      },
    },
  },

  // 6. Pro-003: Game Play Analysis I (Ranking & Window Analytics vs QUALIFY)
  'Pro-003': {
    problemId: 'Pro-003',
    title: 'Game Play Analysis I',
    hasDivergence: true,
    category: 'Window Analytics',
    varianceBadge: 'Window Filtering: Subquery / CTE vs Snowflake QUALIFY',
    varianceSummary: 'Filtering the top row per partition requires a CTE or subquery in SQLite, PostgreSQL, and MySQL, but Snowflake provides the revolutionary QUALIFY clause that filters window functions directly without subqueries.',
    whyInterviewersAsk: 'Senior data engineering and analytics interviews heavily emphasize the Snowflake QUALIFY clause because it eliminates CTE bloat and drastically simplifies analytical pipelines.',
    pitfallsToAvoid: [
      '❌ WHERE with Window Functions: Writing "WHERE ROW_NUMBER() OVER (...) = 1" throws a syntax error in all databases because WHERE runs before window functions.',
      '❌ Trying QUALIFY in Postgres/MySQL: QUALIFY is currently supported in Snowflake, BigQuery, and Databricks, but not in standard PostgreSQL or MySQL.',
    ],
    queries: {
      sqlite: {
        code: `WITH RankedLogins AS (
  SELECT player_id,
         event_date AS first_login,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY event_date ASC) as rn
  FROM Activity
)
SELECT player_id, first_login
FROM RankedLogins
WHERE rn = 1;`,
        notes: 'SQLite supports window functions (3.25+), but requires wrapping in a CTE to filter on ROW_NUMBER() = 1 in the outer query.',
        highlightedFunctions: ['WITH RankedLogins AS (...)'],
      },
      postgres: {
        code: `SELECT DISTINCT ON (player_id) player_id, event_date AS first_login
FROM Activity
ORDER BY player_id, event_date ASC;`,
        notes: 'PostgreSQL superpower: DISTINCT ON (player_id) returns the first row for each distinct value based on ORDER BY, eliminating window functions entirely!',
        highlightedFunctions: ['DISTINCT ON (player_id)'],
      },
      mysql: {
        code: `WITH RankedLogins AS (
  SELECT player_id,
         event_date AS first_login,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY event_date ASC) as rn
  FROM Activity
)
SELECT player_id, first_login
FROM RankedLogins
WHERE rn = 1;`,
        notes: 'MySQL 8.0+ supports CTEs and window functions. For simple minimum date, SELECT player_id, MIN(event_date) FROM Activity GROUP BY player_id is also valid.',
        highlightedFunctions: ['ROW_NUMBER() OVER (...)'],
      },
      snowflake: {
        code: `SELECT player_id,
       event_date AS first_login
FROM Activity
QUALIFY ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY event_date ASC) = 1;`,
        notes: 'Snowflake QUALIFY superpower: Filters window functions directly in the main query without CTEs or subqueries! One of the biggest differentiators in modern SQL interviews.',
        highlightedFunctions: ['QUALIFY ROW_NUMBER() OVER (...) = 1'],
      },
    },
    comparisonTable: [
      {
        construct: 'Filter Window Rows',
        sqlite: 'Subquery or CTE',
        postgres: 'DISTINCT ON or CTE',
        mysql: 'Subquery or CTE',
        snowflake: 'QUALIFY clause',
        interviewNote: 'Snowflake\'s QUALIFY clause is one of the most praised features in data engineering interviews.',
      },
    ],
  },

  // 7. Pro-010: Friend Requests I: Overall Acceptance Rate (Floating point division)
  'Pro-010': {
    problemId: 'Pro-010',
    title: 'Friend Requests I: Overall Acceptance Rate',
    hasDivergence: true,
    category: 'Aggregation & Math',
    varianceBadge: 'Float Division: 1.0 * vs ::numeric vs auto-float vs DIV0()',
    varianceSummary: 'Integer division truncates decimals in SQLite and PostgreSQL, but auto-converts to float in MySQL. Snowflake provides zero-safe division DIV0().',
    whyInterviewersAsk: 'Integer division truncation (e.g. 3 / 4 yielding 0 instead of 0.75) is the most notorious silent bug in database queries. Interviewers test if you safeguard against 0/0 division errors.',
    pitfallsToAvoid: [
      '❌ Postgres integer division: In PostgreSQL, 1 / 2 evaluates to 0. Writing ROUND(1 / 2, 2) returns 0. You must cast to NUMERIC: (1::numeric / 2).',
      '❌ Division by Zero: If no requests exist, dividing by 0 crashes in Postgres. MySQL returns NULL. Snowflake provides DIV0(numerator, denominator) which safely returns 0.',
      '❌ SQLite float conversion: In SQLite, multiply by 1.0 or CAST as REAL to avoid integer truncation.',
    ],
    queries: {
      sqlite: {
        code: `SELECT ROUND(
  IFNULL(
    1.0 * (SELECT COUNT(DISTINCT requester_id, accepter_id) FROM RequestAccepted) /
    NULLIF((SELECT COUNT(DISTINCT sender_id, send_to_id) FROM FriendRequest), 0),
    0.0
  ),
  2
) AS accept_rate;`,
        notes: 'SQLite requires multiplying by 1.0 to force floating-point math, and IFNULL/NULLIF to guard against division by zero.',
        highlightedFunctions: ['1.0 *', 'IFNULL()', 'NULLIF()'],
      },
      postgres: {
        code: `SELECT ROUND(
  COALESCE(
    (SELECT COUNT(DISTINCT (requester_id, accepter_id)) FROM RequestAccepted)::numeric /
    NULLIF((SELECT COUNT(DISTINCT (sender_id, send_to_id)) FROM FriendRequest), 0),
    0
  ),
  2
) AS accept_rate;`,
        notes: 'PostgreSQL requires casting to ::numeric because ROUND(val, 2) is only defined for numeric types, and standard integer division truncates.',
        highlightedFunctions: ['::numeric', 'COALESCE()', 'NULLIF()'],
      },
      mysql: {
        code: `SELECT ROUND(
  IFNULL(
    (SELECT COUNT(DISTINCT requester_id, accepter_id) FROM RequestAccepted) /
    (SELECT COUNT(DISTINCT sender_id, send_to_id) FROM FriendRequest),
    0
  ),
  2
) AS accept_rate;`,
        notes: 'MySQL automatically performs floating-point division when using / operator, and returns NULL on division by zero.',
        highlightedFunctions: ['/ (auto-float)', 'IFNULL()'],
      },
      snowflake: {
        code: `SELECT ROUND(
  DIV0(
    (SELECT COUNT(DISTINCT requester_id, accepter_id) FROM RequestAccepted),
    (SELECT COUNT(DISTINCT sender_id, send_to_id) FROM FriendRequest)
  ),
  2
) AS accept_rate;`,
        notes: 'Snowflake provides DIV0(numerator, denominator), which automatically handles zero in the denominator without needing NULLIF or IFNULL!',
        highlightedFunctions: ['DIV0(num, denom)'],
      },
    },
    comparisonTable: [
      {
        construct: 'Decimal Division',
        sqlite: '1.0 * a / b',
        postgres: '(a::numeric / b)',
        mysql: 'a / b (auto float)',
        snowflake: 'DIV0(a, b)',
        interviewNote: 'PostgreSQL truncates integer division; MySQL auto-converts; Snowflake provides DIV0().',
      },
    ],
  },

  // 8. Basics-032: Extract Part of a String Using SUBSTRING()
  'Basics-032': {
    problemId: 'Basics-032',
    title: 'Extract Part of a String Using SUBSTRING()',
    hasDivergence: true,
    category: 'String Manipulation',
    varianceBadge: 'String Slicing: substr() vs SUBSTRING() vs MID()',
    varianceSummary: 'String indexing starts at 1 in SQL (unlike programming languages at 0). Function names vary between substr() in SQLite/Oracle and SUBSTRING() in MySQL/Postgres.',
    whyInterviewersAsk: 'String manipulation syntax in SQL often catches candidates off guard because string indexing is 1-based, and different engines support different aliases.',
    pitfallsToAvoid: [
      '❌ 0-Based Indexing: SQL string indexes are 1-based! Passing 0 in SUBSTRING(str, 0, 3) in SQLite returns an empty string or behaves unexpectedly.',
      '❌ Postgres SUBSTRING syntax: Postgres supports both ANSI "SUBSTRING(str FROM 1 FOR 3)" and "SUBSTR(str, 1, 3)".',
    ],
    queries: {
      sqlite: {
        code: `SELECT employee_id,
       first_name,
       substr(first_name, 1, 3) AS short_name
FROM employees;`,
        notes: 'SQLite uses the lowercase substr(string, start, length).',
        highlightedFunctions: ['substr(str, 1, 3)'],
      },
      postgres: {
        code: `SELECT employee_id,
       first_name,
       SUBSTRING(first_name FROM 1 FOR 3) AS short_name
FROM employees;`,
        notes: 'PostgreSQL supports the standard ANSI SQL syntax SUBSTRING(str FROM pos FOR len) as well as SUBSTR(str, pos, len).',
        highlightedFunctions: ['SUBSTRING(str FROM pos FOR len)'],
      },
      mysql: {
        code: `SELECT employee_id,
       first_name,
       SUBSTRING(first_name, 1, 3) AS short_name
FROM employees;`,
        notes: 'MySQL accepts SUBSTRING(str, pos, len), SUBSTR(), and MID().',
        highlightedFunctions: ['SUBSTRING(str, 1, 3)'],
      },
      snowflake: {
        code: `SELECT employee_id,
       first_name,
       SUBSTR(first_name, 1, 3) AS short_name
FROM employees;`,
        notes: 'Snowflake supports SUBSTR(str, pos, len) and SUBSTRING(str, pos, len).',
        highlightedFunctions: ['SUBSTR(str, 1, 3)'],
      },
    },
  },

  // 9. Basics-034: Replace NULL Values Using COALESCE()
  'Basics-034': {
    problemId: 'Basics-034',
    title: 'Replace NULL Values Using COALESCE()',
    hasDivergence: true,
    category: 'String Manipulation',
    varianceBadge: 'NULL Coalescing: COALESCE vs IFNULL vs NVL',
    varianceSummary: 'COALESCE() is the universal ANSI SQL standard accepting multiple fallback arguments. SQLite and MySQL also support 2-argument IFNULL(), Oracle/Snowflake support NVL(), and SQL Server uses ISNULL().',
    whyInterviewersAsk: 'Understanding three-valued logic (TRUE, FALSE, UNKNOWN) and NULL handling is one of the most critical aspects of database engineering.',
    pitfallsToAvoid: [
      '❌ Using IFNULL in PostgreSQL: PostgreSQL has NO IFNULL() function! It strictly implements the ANSI standard COALESCE(). Calling IFNULL in Postgres will crash.',
      '❌ Type mismatch in COALESCE: All arguments in COALESCE() must be castable to the same data type. Mixing numbers and strings can cause cast errors in strict engines.',
    ],
    queries: {
      sqlite: {
        code: `SELECT employee_id,
       first_name,
       IFNULL(manager_id, 0) AS manager_id_safe,
       COALESCE(phone_number, email, 'No Contact') AS contact_info
FROM employees;`,
        notes: 'SQLite supports both 2-argument IFNULL() and multi-argument COALESCE().',
        highlightedFunctions: ['IFNULL()', 'COALESCE()'],
      },
      postgres: {
        code: `SELECT employee_id,
       first_name,
       COALESCE(manager_id, 0) AS manager_id_safe,
       COALESCE(phone_number, email, 'No Contact') AS contact_info
FROM employees;`,
        notes: 'PostgreSQL strictly requires COALESCE(). IFNULL does not exist in Postgres.',
        highlightedFunctions: ['COALESCE()'],
      },
      mysql: {
        code: `SELECT employee_id,
       first_name,
       IFNULL(manager_id, 0) AS manager_id_safe,
       COALESCE(phone_number, email, 'No Contact') AS contact_info
FROM employees;`,
        notes: 'MySQL supports IFNULL(expr1, expr2) and multi-argument COALESCE().',
        highlightedFunctions: ['IFNULL()', 'COALESCE()'],
      },
      snowflake: {
        code: `SELECT employee_id,
       first_name,
       NVL(manager_id, 0) AS manager_id_safe,
       COALESCE(phone_number, email, 'No Contact') AS contact_info
FROM employees;`,
        notes: 'Snowflake supports Oracle-style NVL(), IFNULL(), and ANSI COALESCE().',
        highlightedFunctions: ['NVL()', 'COALESCE()'],
      },
    },
  },

  // 10. Basics-007: Limit the Number of Rows (LIMIT)
  'Basics-007': {
    problemId: 'Basics-007',
    title: 'Limit the Number of Rows (LIMIT)',
    hasDivergence: true,
    category: 'Joins & Set Ops',
    varianceBadge: 'Row Limiting: LIMIT vs FETCH FIRST vs TOP',
    varianceSummary: 'LIMIT is widely supported in SQLite, MySQL, and Postgres, but ANSI SQL specifies FETCH FIRST n ROWS ONLY. Microsoft SQL Server uses TOP n.',
    whyInterviewersAsk: 'Shows familiarity with ANSI SQL standard compliance vs vendor-specific extensions, especially when working across Oracle, SQL Server, and Postgres.',
    pitfallsToAvoid: [
      '❌ Forgetting ORDER BY with LIMIT: In relational theory, rows have no guaranteed order. Using LIMIT without ORDER BY returns non-deterministic results!',
      '❌ Microsoft SQL Server TOP: SQL Server does not support LIMIT; it requires SELECT TOP 5 * FROM ...',
    ],
    queries: {
      sqlite: {
        code: `SELECT *
FROM employees
LIMIT 5;`,
        notes: 'Standard SQLite LIMIT clause.',
        highlightedFunctions: ['LIMIT 5'],
      },
      postgres: {
        code: `SELECT *
FROM employees
LIMIT 5;
-- Or pure ANSI standard:
-- FETCH FIRST 5 ROWS ONLY;`,
        notes: 'PostgreSQL supports both standard LIMIT and ANSI SQL FETCH FIRST 5 ROWS ONLY.',
        highlightedFunctions: ['LIMIT 5', 'FETCH FIRST 5 ROWS ONLY'],
      },
      mysql: {
        code: `SELECT *
FROM employees
LIMIT 5;`,
        notes: 'MySQL standard LIMIT syntax. Also supports LIMIT offset, count.',
        highlightedFunctions: ['LIMIT 5'],
      },
      snowflake: {
        code: `SELECT *
FROM employees
LIMIT 5;`,
        notes: 'Snowflake supports LIMIT n OFFSET m as well as TOP n.',
        highlightedFunctions: ['LIMIT 5'],
      },
    },
  },

  // 11. SQL-012: Yearly Sales Summary
  'SQL-012': {
    problemId: 'SQL-012',
    title: 'Yearly Sales Summary',
    hasDivergence: true,
    category: 'Date & Time',
    varianceBadge: 'Year Extraction: strftime vs EXTRACT vs YEAR()',
    varianceSummary: 'Extracting year parts differs across engines: SQLite uses strftime(\'%Y\'), PostgreSQL uses EXTRACT(YEAR FROM date), and MySQL / Snowflake use YEAR(date).',
    whyInterviewersAsk: 'Date part extraction is tested in almost every enterprise data engineering role to evaluate date dimension modeling skills.',
    pitfallsToAvoid: [
      '❌ Postgres YEAR(): PostgreSQL does not have a built-in YEAR() function! Calling YEAR(sale_date) throws "function year does not exist". Use EXTRACT(YEAR FROM sale_date) or DATE_PART(\'year\', sale_date).',
      '❌ SQLite strftime case: In SQLite, strftime(\'%y\') returns 2-digit year (e.g. 24) whereas strftime(\'%Y\') returns 4-digit year (e.g. 2024).',
    ],
    queries: {
      sqlite: {
        code: `SELECT strftime('%Y', sale_date) AS year,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY year
ORDER BY year;`,
        notes: 'SQLite strftime(\'%Y\', date) returns 4-digit year as text.',
        highlightedFunctions: ['strftime(\'%Y\', date)'],
      },
      postgres: {
        code: `SELECT EXTRACT(YEAR FROM sale_date)::integer AS year,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY 1
ORDER BY 1;`,
        notes: 'PostgreSQL uses standard ANSI EXTRACT(YEAR FROM date). Cast to integer to avoid floating-point display.',
        highlightedFunctions: ['EXTRACT(YEAR FROM date)'],
      },
      mysql: {
        code: `SELECT YEAR(sale_date) AS year,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY year
ORDER BY year;`,
        notes: 'MySQL provides the clean YEAR(date) function and supports alias grouping.',
        highlightedFunctions: ['YEAR(date)'],
      },
      snowflake: {
        code: `SELECT YEAR(sale_date) AS year,
       COUNT(*) AS total_orders,
       SUM(total_amount) AS total_sales
FROM sales
GROUP BY year
ORDER BY year;`,
        notes: 'Snowflake supports both YEAR(date) and EXTRACT(year FROM date).',
        highlightedFunctions: ['YEAR(date)'],
      },
    },
    comparisonTable: [
      {
        construct: 'Extract Year',
        sqlite: 'strftime(\'%Y\', d)',
        postgres: 'EXTRACT(YEAR FROM d)',
        mysql: 'YEAR(d)',
        snowflake: 'YEAR(d)',
        interviewNote: 'Postgres requires EXTRACT; MySQL provides YEAR().',
      },
    ],
  },

  // 12. Basics-023: Filter Records Using the LIKE Operator
  'Basics-023': {
    problemId: 'Basics-023',
    title: 'Filter Records Using the LIKE Operator',
    hasDivergence: true,
    category: 'String Manipulation',
    varianceBadge: 'Pattern Matching: LIKE vs ILIKE (Case Sensitivity)',
    varianceSummary: 'In SQLite and MySQL, LIKE is case-insensitive for ASCII by default. In PostgreSQL, LIKE is strictly case-sensitive, requiring ILIKE for case-insensitive matching.',
    whyInterviewersAsk: 'Case-sensitivity in search filters is a major source of production bugs when queries written for MySQL or SQLite are migrated to PostgreSQL.',
    pitfallsToAvoid: [
      '❌ PostgreSQL LIKE Case Sensitivity: In PostgreSQL, WHERE name LIKE \'a%\' will NOT match \'Alice\'! You MUST use ILIKE: WHERE name ILIKE \'a%\'.',
      '❌ Index optimization on LIKE: Leading wildcards (e.g. LIKE \'%son\') invalidate B-tree indexes across all engines, causing full table scans. Use trigram (pg_trgm) indexes in Postgres.',
    ],
    queries: {
      sqlite: {
        code: `SELECT first_name
FROM employees
WHERE first_name LIKE 'A%';`,
        notes: 'SQLite LIKE is case-insensitive for ASCII characters by default.',
        highlightedFunctions: ['LIKE \'A%\''],
      },
      postgres: {
        code: `SELECT first_name
FROM employees
WHERE first_name ILIKE 'A%';`,
        notes: 'PostgreSQL provides ILIKE for case-insensitive pattern matching. Standard LIKE is strictly case-sensitive.',
        highlightedFunctions: ['ILIKE \'A%\''],
      },
      mysql: {
        code: `SELECT first_name
FROM employees
WHERE first_name LIKE 'A%';`,
        notes: 'MySQL LIKE is case-insensitive under standard collations (e.g. utf8mb4_0900_ai_ci).',
        highlightedFunctions: ['LIKE \'A%\''],
      },
      snowflake: {
        code: `SELECT first_name
FROM employees
WHERE first_name ILIKE 'A%';`,
        notes: 'Snowflake supports ILIKE for clean case-insensitive regex/pattern matching.',
        highlightedFunctions: ['ILIKE \'A%\''],
      },
    },
    comparisonTable: [
      {
        construct: 'Case-Insensitive Match',
        sqlite: 'LIKE \'pattern\'',
        postgres: 'ILIKE \'pattern\'',
        mysql: 'LIKE \'pattern\'',
        snowflake: 'ILIKE \'pattern\'',
        interviewNote: 'Crucial Postgres distinction: LIKE is case-sensitive, ILIKE is case-insensitive.',
      },
    ],
  },

  // 13. Basics-029: Round Decimal Values Using ROUND()
  'Basics-029': {
    problemId: 'Basics-029',
    title: 'Round Decimal Values Using ROUND()',
    hasDivergence: true,
    category: 'Aggregation & Math',
    varianceBadge: 'Rounding Precision: Type Strictness & NUMERIC Casting',
    varianceSummary: 'PostgreSQL ROUND(val, scale) strictly requires the NUMERIC datatype; passing double precision throws "function round(double precision, integer) does not exist". SQLite and MySQL accept floats directly.',
    whyInterviewersAsk: 'Tests deep knowledge of relational type systems and how numeric types avoid binary floating-point rounding inaccuracies in financial applications.',
    pitfallsToAvoid: [
      '❌ Postgres ROUND double precision error: In PostgreSQL, ROUND(float_col, 2) causes a compiler error! You must write ROUND(float_col::numeric, 2).',
      '❌ Banker\'s Rounding vs Round Half Up: Different engines and programming languages implement different rounding ties (round half-even vs round half-away from zero).',
    ],
    queries: {
      sqlite: {
        code: `SELECT first_name,
       salary,
       ROUND(salary, 2) AS rounded_salary
FROM employees;`,
        notes: 'SQLite rounds floating-point numbers directly with ROUND(val, 2).',
        highlightedFunctions: ['ROUND(salary, 2)'],
      },
      postgres: {
        code: `SELECT first_name,
       salary,
       ROUND(salary::numeric, 2) AS rounded_salary
FROM employees;`,
        notes: 'PostgreSQL strictly requires casting to ::numeric when rounding with a decimal precision argument.',
        highlightedFunctions: ['ROUND(salary::numeric, 2)'],
      },
      mysql: {
        code: `SELECT first_name,
       salary,
       ROUND(salary, 2) AS rounded_salary
FROM employees;`,
        notes: 'MySQL rounds float, decimal, or double values directly to the specified number of places.',
        highlightedFunctions: ['ROUND(salary, 2)'],
      },
      snowflake: {
        code: `SELECT first_name,
       salary,
       ROUND(salary, 2) AS rounded_salary
FROM employees;`,
        notes: 'Snowflake supports standard ROUND(val, 2) across all numeric formats.',
        highlightedFunctions: ['ROUND(salary, 2)'],
      },
    },
  },

  // 14. Basics-030: Find the Length of a String Using LENGTH()
  'Basics-030': {
    problemId: 'Basics-030',
    title: 'Find the Length of a String Using LENGTH()',
    hasDivergence: true,
    category: 'String Manipulation',
    varianceBadge: 'String Length: LENGTH() vs CHAR_LENGTH() (Bytes vs Characters)',
    varianceSummary: 'In MySQL, LENGTH() returns the length in bytes (octets), while CHAR_LENGTH() returns character count. In SQLite and Postgres, LENGTH() returns character count.',
    whyInterviewersAsk: 'Multi-byte UTF-8 character encoding issues (e.g. emojis or accented characters having byte length != character length) are a favorite topic in senior system design and DB interviews.',
    pitfallsToAvoid: [
      '❌ MySQL LENGTH vs CHAR_LENGTH: In MySQL, LENGTH(\'🚀\') returns 4 (bytes), while CHAR_LENGTH(\'🚀\') returns 1 (character)! Always use CHAR_LENGTH in MySQL for UI text.',
      '❌ SQL Server LEN(): In T-SQL / SQL Server, LENGTH() does not exist; the function is LEN().',
    ],
    queries: {
      sqlite: {
        code: `SELECT first_name,
       length(first_name) AS name_length
FROM employees;`,
        notes: 'SQLite length() returns character count for strings.',
        highlightedFunctions: ['length(str)'],
      },
      postgres: {
        code: `SELECT first_name,
       LENGTH(first_name) AS name_length
FROM employees;`,
        notes: 'PostgreSQL LENGTH() and CHAR_LENGTH() return character count. OCTET_LENGTH() returns byte length.',
        highlightedFunctions: ['LENGTH(str)', 'CHAR_LENGTH(str)'],
      },
      mysql: {
        code: `SELECT first_name,
       CHAR_LENGTH(first_name) AS name_length
FROM employees;`,
        notes: 'In MySQL, CHAR_LENGTH() counts characters. LENGTH() counts raw bytes, which differs for UTF-8 multi-byte text.',
        highlightedFunctions: ['CHAR_LENGTH(str)'],
      },
      snowflake: {
        code: `SELECT first_name,
       LENGTH(first_name) AS name_length
FROM employees;`,
        notes: 'Snowflake supports LENGTH() and CHAR_LENGTH() interchangeably.',
        highlightedFunctions: ['LENGTH(str)'],
      },
    },
  },

  // 15. ASQL-009: Conditional Aggregation
  'ASQL-009': {
    problemId: 'ASQL-009',
    title: 'Conditional Aggregation',
    hasDivergence: true,
    category: 'Aggregation & Math',
    varianceBadge: 'Conditional Counts: SUM(CASE) vs FILTER (WHERE) vs COUNT_IF()',
    varianceSummary: 'PostgreSQL features the powerful ANSI FILTER clause; Snowflake provides native COUNT_IF(); MySQL allows SUM(condition) directly; SQLite uses SUM(CASE WHEN ... THEN 1 ELSE 0 END).',
    whyInterviewersAsk: 'Conditional counting is the building block of data pivoting and dashboard KPI construction. Interviewers test if you know modern engine superpowers like Postgres FILTER and Snowflake COUNT_IF.',
    pitfallsToAvoid: [
      '❌ COUNT(CASE WHEN cond THEN 0 END): COUNT counts non-null values! Returning 0 still counts as a match! You must return NULL in the ELSE branch or use SUM(CASE WHEN cond THEN 1 ELSE 0 END).',
      '❌ MySQL boolean summation: In MySQL, SUM(salary > 50000) works because true is 1. In PostgreSQL, this fails with a type error because booleans cannot be summed directly without CAST(cond AS integer).',
    ],
    queries: {
      sqlite: {
        code: `SELECT department_id,
       COUNT(*) AS total_employees,
       SUM(CASE WHEN salary > 50000 THEN 1 ELSE 0 END) AS high_earners,
       SUM(CASE WHEN salary <= 50000 THEN 1 ELSE 0 END) AS regular_earners
FROM employees
GROUP BY department_id;`,
        notes: 'Universal portable conditional aggregation pattern using SUM(CASE ... THEN 1 ELSE 0 END).',
        highlightedFunctions: ['SUM(CASE ... THEN 1 ELSE 0 END)'],
      },
      postgres: {
        code: `SELECT department_id,
       COUNT(*) AS total_employees,
       COUNT(*) FILTER (WHERE salary > 50000) AS high_earners,
       COUNT(*) FILTER (WHERE salary <= 50000) AS regular_earners
FROM employees
GROUP BY department_id;`,
        notes: 'PostgreSQL superpower: The FILTER (WHERE ...) clause on aggregate functions is clean, ANSI compliant, and faster than CASE expressions.',
        highlightedFunctions: ['COUNT(*) FILTER (WHERE ...)'],
      },
      mysql: {
        code: `SELECT department_id,
       COUNT(*) AS total_employees,
       SUM(salary > 50000) AS high_earners,
       SUM(salary <= 50000) AS regular_earners
FROM employees
GROUP BY department_id;`,
        notes: 'MySQL evaluates boolean conditions to 1 (true) and 0 (false), enabling direct SUM(condition) shorthand.',
        highlightedFunctions: ['SUM(salary > 50000)'],
      },
      snowflake: {
        code: `SELECT department_id,
       COUNT(*) AS total_employees,
       COUNT_IF(salary > 50000) AS high_earners,
       COUNT_IF(salary <= 50000) AS regular_earners
FROM employees
GROUP BY department_id;`,
        notes: 'Snowflake provides COUNT_IF(condition), the gold standard in cloud analytics engineering for conditional counting.',
        highlightedFunctions: ['COUNT_IF(condition)'],
      },
    },
    comparisonTable: [
      {
        construct: 'Conditional Count',
        sqlite: 'SUM(CASE WHEN cond THEN 1 ELSE 0 END)',
        postgres: 'COUNT(*) FILTER (WHERE cond)',
        mysql: 'SUM(cond) / SUM(IF(cond, 1, 0))',
        snowflake: 'COUNT_IF(cond)',
        interviewNote: 'Each engine provides a distinct, highly-optimized syntax for conditional counting!',
      },
    ],
  },
};

// Generic Intelligent Dialect Transformer for all other problems
export function deriveDialectComparison(
  problem: ChallengeDetail | string | number,
  canonicalCode?: string
): DialectComparison {
  const codeId = typeof problem === 'object' ? problem.code_id : String(problem);
  
  // 1. Return hand-curated entry if present
  if (CURATED_DIALECT_MAP[codeId]) {
    return CURATED_DIALECT_MAP[codeId];
  }

  // 2. Fetch canonical solution
  const solution = getProblemSolution(problem);
  const baseCode = (canonicalCode || solution.code || 'SELECT 1;').trim();
  const title = typeof problem === 'object' ? problem.title : solution.title || 'SQL Solution';

  // 3. Analyze query for engine differences
  const upper = baseCode.toUpperCase();

  const hasDateMath = upper.includes('JULIANDAY') || upper.includes('DATEDIFF') || upper.includes('INTERVAL') || upper.includes('DATE_ADD');
  const hasDateExtract = upper.includes('STRFTIME') || upper.includes('DATE_FORMAT') || upper.includes('DATE_TRUNC') || upper.includes('EXTRACT');
  const hasStringConcat = baseCode.includes('||') || upper.includes('CONCAT(') || upper.includes('CONCAT_WS(');
  const hasStringAgg = upper.includes('GROUP_CONCAT') || upper.includes('STRING_AGG') || upper.includes('LISTAGG');
  const hasDivision = baseCode.includes('1.0 *') || baseCode.includes('1.0*') || upper.includes('CAST(') || upper.includes('::NUMERIC');
  const hasWindow = upper.includes('OVER (') || upper.includes('OVER(') || upper.includes('ROW_NUMBER()') || upper.includes('RANK()');
  const hasFullJoin = upper.includes('FULL JOIN') || upper.includes('FULL OUTER JOIN');

  let category: DialectComparison['category'] = 'ANSI Standard';
  let varianceBadge = '✨ 100% ANSI Portable Query';
  let varianceSummary = 'This query uses standard ANSI SQL syntax and executes identically across SQLite, PostgreSQL, MySQL, and Snowflake.';
  let whyInterviewersAsk = 'Interviewers look for clean, standard ANSI SQL queries that avoid vendor lock-in and operate consistently across any database.';
  let hasDivergence = false;

  const sqliteCode = baseCode;
  let postgresCode = baseCode;
  let mysqlCode = baseCode;
  let snowflakeCode = baseCode;

  const pitfalls: string[] = [];

  // Adapt for String Concatenation
  if (hasStringConcat) {
    category = 'String Manipulation';
    hasDivergence = true;
    varianceBadge = 'String Concat: || vs CONCAT()';
    varianceSummary = 'In SQLite, PostgreSQL, and Snowflake, || concatenates strings. In MySQL, || is logical OR unless PIPES_AS_CONCAT mode is set.';
    whyInterviewersAsk = 'MySQL\'s non-standard treatment of || as boolean OR is a classic interview trap that leads to zero or boolean values instead of concatenated text.';
    pitfalls.push('❌ MySQL Pipe Operator: In MySQL, \'Hello\' || \' \' || \'World\' evaluates to logical OR (returning 0 or 1), unless PIPES_AS_CONCAT is enabled in sql_mode. Always use CONCAT() in MySQL.');
    mysqlCode = baseCode.replace(/([a-zA-Z0-9_.'"]+)\s*\|\|\s*([a-zA-Z0-9_.'"]+)/g, 'CONCAT($1, $2)');
  }

  // Adapt for String Aggregation
  else if (hasStringAgg) {
    category = 'Aggregation & Math';
    hasDivergence = true;
    varianceBadge = 'Group Concat: GROUP_CONCAT vs STRING_AGG vs LISTAGG';
    varianceSummary = 'String aggregation functions vary widely: SQLite/MySQL use GROUP_CONCAT(), PostgreSQL uses STRING_AGG(), and Snowflake uses LISTAGG().';
    whyInterviewersAsk = 'Testing candidate familiarity with data pivoting and grouping across both OLTP engines and cloud data warehouses.';
    pitfalls.push('❌ PostgreSQL GROUP_CONCAT: Postgres has no GROUP_CONCAT(). Use STRING_AGG(col, separator).');
    pitfalls.push('❌ Snowflake LISTAGG syntax: Snowflake requires LISTAGG(col, separator) WITHIN GROUP (ORDER BY ...).');
    postgresCode = baseCode.replace(/GROUP_CONCAT\(([^,)]+)(?:,\s*([^)]+))?\)/gi, (_, col, sep) => `STRING_AGG(${col}, ${sep || '\',\''})`);
    snowflakeCode = baseCode.replace(/GROUP_CONCAT\(([^,)]+)(?:,\s*([^)]+))?\)/gi, (_, col, sep) => `LISTAGG(${col}, ${sep || '\',\''}) WITHIN GROUP (ORDER BY ${col})`);
  }

  // Adapt for Full Outer Joins
  else if (hasFullJoin) {
    category = 'Joins & Set Ops';
    hasDivergence = true;
    varianceBadge = 'FULL JOIN: Native vs LEFT+RIGHT UNION';
    varianceSummary = 'PostgreSQL and Snowflake natively support FULL OUTER JOIN. SQLite and MySQL require a simulated LEFT JOIN UNION RIGHT JOIN.';
    whyInterviewersAsk = 'Demonstrates whether you know how to compensate for database engine feature limitations.';
  }

  // Adapt for Window Analytics (Snowflake QUALIFY)
  else if (hasWindow && (upper.includes('WHERE RN = 1') || upper.includes('WHERE RNK = 1') || upper.includes('WITH '))) {
    category = 'Window Analytics';
    hasDivergence = true;
    varianceBadge = 'Window Filtering: CTE vs Snowflake QUALIFY';
    varianceSummary = 'PostgreSQL, SQLite, and MySQL require a CTE or subquery to filter window functions. Snowflake allows direct QUALIFY filtering.';
    whyInterviewersAsk = 'Snowflake QUALIFY eliminates unnecessary subquery layers, making queries cleaner and faster in modern cloud analytics.';
  }

  // Adapt for Division / Math
  else if (hasDivision) {
    category = 'Aggregation & Math';
    hasDivergence = true;
    varianceBadge = 'Integer Division: Truncation vs Float';
    varianceSummary = 'PostgreSQL and SQLite perform integer truncation when dividing integers (e.g. 5/2 = 2). MySQL performs auto-float division. Snowflake offers zero-safe DIV0().';
    whyInterviewersAsk = 'Silent integer division bugs corrupt financial and analytical metrics without throwing runtime errors.';
    pitfalls.push('❌ PostgreSQL Truncation: Remember to cast integers (e.g. col::numeric) in Postgres before division.');
    postgresCode = baseCode.replace(/1\.0\s*\*\s*([a-zA-Z0-9_()]+)/g, '($1)::numeric');
    snowflakeCode = baseCode.replace(/1\.0\s*\*\s*([a-zA-Z0-9_()]+)\s*\/\s*([a-zA-Z0-9_()]+)/g, 'DIV0($1, $2)');
  }

  // Adapt for Date Math
  else if (hasDateMath || hasDateExtract) {
    category = 'Date & Time';
    hasDivergence = true;
    varianceBadge = 'Date Functions: julianday vs INTERVAL vs DATEDIFF';
    varianceSummary = 'Date difference, truncation, and interval arithmetic syntax diverge across all major SQL dialects.';
    whyInterviewersAsk = 'Date manipulations are the #1 source of dialect-specific interview questions.';
  }

  // Universal ANSI Fallback
  if (!hasDivergence) {
    pitfalls.push('✅ ANSI Compliant: This query executes consistently across SQLite 3.45, PostgreSQL 16, MySQL 8.0, and Snowflake without dialect modification.');
    pitfalls.push('💡 Tip: In PostgreSQL, unquoted column and table names are converted to lowercase. In Snowflake, unquoted identifiers are converted to uppercase.');
  }

  return {
    problemId: codeId,
    title,
    hasDivergence,
    category,
    varianceBadge,
    varianceSummary,
    whyInterviewersAsk,
    pitfallsToAvoid: pitfalls,
    queries: {
      sqlite: {
        code: sqliteCode,
        notes: hasDivergence
          ? 'SQLite syntax compatible with the in-browser sandbox runner.'
          : 'Standard ANSI SQL query, runs natively in SQLite sandbox.',
        highlightedFunctions: [],
      },
      postgres: {
        code: postgresCode,
        notes: hasDivergence
          ? 'PostgreSQL 16 syntax: Uses PostgreSQL standard data types, functions, and strict casting.'
          : 'Standard ANSI SQL, fully compatible with PostgreSQL production environments (Neon, Supabase).',
        highlightedFunctions: [],
      },
      mysql: {
        code: mysqlCode,
        notes: hasDivergence
          ? 'MySQL 8.0+ syntax: Uses MySQL specific built-ins and LeetCode conventions.'
          : 'Standard ANSI SQL, ready for MySQL 8.0+ / LeetCode SQL environments.',
        highlightedFunctions: [],
      },
      snowflake: {
        code: snowflakeCode,
        notes: hasDivergence
          ? 'Snowflake SQL: Optimized for Cloud Data Warehouse & Analytics Engineering interviews.'
          : 'Standard ANSI SQL, fully compatible with Snowflake and Modern Data Stack warehouses.',
        highlightedFunctions: [],
      },
    },
    comparisonTable: hasDivergence
      ? [
          {
            construct: category,
            sqlite: 'SQLite 3.45',
            postgres: 'PostgreSQL 16',
            mysql: 'MySQL 8.0+',
            snowflake: 'Snowflake Cloud DWH',
            interviewNote: varianceSummary,
          },
        ]
      : undefined,
  };
}

export function getDialectComparison(
  problem: ChallengeDetail | string | number,
  canonicalCode?: string
): DialectComparison {
  const codeId = typeof problem === 'object' ? problem.code_id : String(problem);
  if (CURATED_DIALECT_MAP[codeId]) {
    return CURATED_DIALECT_MAP[codeId];
  }
  return deriveDialectComparison(problem, canonicalCode);
}
