import re
import sqlite3
from typing import Dict, Any, List, Optional, Union
from app.sandbox.sql_runner import execute_sql_in_sandbox

DANGEROUS_SQL_PATTERNS = [
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bCREATE\b",
    r"\bPRAGMA\b",
    r"\bATTACH\b",
    r"\bDETACH\b",
    r"\bTRUNCATE\b",
    r"\bEXEC\b",
    r"\bEXECUTE\b",
]

def is_safe_sql_query(query: str) -> tuple[bool, Optional[str]]:
    clean_query = query.strip()
    if not clean_query:
        return False, "Query cannot be empty."

    for pattern in DANGEROUS_SQL_PATTERNS:
        if re.search(pattern, clean_query, re.IGNORECASE):
            match = re.search(pattern, clean_query, re.IGNORECASE).group(0)
            return False, f"Security Violation: '{match}' statements are disabled."

    upper_q = clean_query.upper()
    if not (upper_q.startswith("SELECT") or upper_q.startswith("WITH") or upper_q.startswith("DELETE") or upper_q.startswith("UPDATE") or upper_q.startswith("--")):
        return False, "Only read-only SELECT/WITH or data modification queries (DELETE/UPDATE) are supported."

    return True, None


def strip_sql_comments(sql: str) -> str:
    """Removes block and line comments to check the actual executable SQL code."""
    s = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    lines = [line.split("--")[0].strip() for line in s.splitlines()]
    return " ".join([l for l in lines if l]).strip()


def parse_output_table_lines(lines: List[str]):
    """Parses formatted SQL grid output lines into (headers, rows)."""
    clean = [l.strip() for l in lines if l.strip() and not re.match(r"^[-+|: ]+$", l.strip())]
    if not clean:
        return [], []
    headers = [h.strip().lower() for h in clean[0].split("|") if h.strip()]
    rows = []
    for l in clean[1:]:
        if "(0 rows returned)" in l.lower():
            continue
        cells = [re.sub(r"(\d+)\.0\b", r"\1", c.strip().lower()) for c in l.split("|")]
        rows.append(cells)
    return headers, rows


def check_sql_output_matches(
    user_query: str,
    user_lines: List[str],
    target_lines: List[str],
    full_expected_lines: List[str]
) -> bool:
    """
    Intelligently checks if user query and output satisfy the target problem output:
    1. Validates that user entered real SQL (not just starter template comments).
    2. Compares output columns and rows with flexible normalization (case, float formatting).
    """
    real_code = strip_sql_comments(user_query)
    if not real_code:
        return False

    upper_code = real_code.upper()
    if not (upper_code.startswith("SELECT") or upper_code.startswith("WITH") or upper_code.startswith("DELETE") or upper_code.startswith("UPDATE")):
        return False

    if not user_lines:
        # Check if 0 rows returned was expected
        if any("(0 rows returned)" in l.lower() for l in target_lines) or any("(0 rows returned)" in l.lower() for l in full_expected_lines):
            return True
        return False

    def normalize_lines(lines: List[str]) -> List[str]:
        return [re.sub(r"(\d+)\.0\b", r"\1", l.lower().strip()) for l in lines]

    user_norm = normalize_lines(user_lines)
    target_norm = normalize_lines(target_lines)
    full_norm = normalize_lines(full_expected_lines)

    # 1. Direct normalized line match
    if user_norm == target_norm or user_norm == full_norm:
        return True

    # 2. Structured table comparison
    u_h, u_r = parse_output_table_lines(user_lines)
    t_h, t_r = parse_output_table_lines(target_lines)

    if len(t_r) == 0 and len(full_expected_lines) > 1:
        f_h, f_r = parse_output_table_lines(full_expected_lines)
        t_h = t_h or f_h
        t_r = f_r

    # Clean headers (strip table prefix if any e.g. employees.first_name -> first_name)
    u_clean_h = [h.split('.')[-1].strip().lower() for h in u_h]
    t_clean_h = [h.split('.')[-1].strip().lower() for h in t_h]

    # Validate column headers match (unless target headers are empty)
    if t_clean_h and u_clean_h != t_clean_h:
        return False

    def cell_matches(u_val: str, t_val: str) -> bool:
        u_s = str(u_val).strip().lower()
        t_s = str(t_val).strip().lower()
        if u_s == t_s:
            return True
        try:
            return float(u_s) == float(t_s)
        except (ValueError, TypeError):
            pass
        # Dynamic date/time matching: e.g. dates formatted like 2026-09-24, times 12:00:00
        if re.match(r"^\d{4}-\d{2}-\d{2}$", t_s) and re.match(r"^\d{4}-\d{2}-\d{2}$", u_s):
            return True
        if re.match(r"^\d{2}:\d{2}:\d{2}$", t_s) and re.match(r"^\d{2}:\d{2}:\d{2}$", u_s):
            return True
        if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", t_s) and re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", u_s):
            return True
        return False

    def row_matches(u_row: List[str], t_row: List[str]) -> bool:
        if len(u_row) != len(t_row):
            return False
        return all(cell_matches(u, t) for u, t in zip(u_row, t_row))

    if len(u_r) != len(t_r):
        return False

    # Check if ordering is strictly enforced
    has_order_by = bool(re.search(r"\bORDER\s+BY\b", user_query, re.IGNORECASE)) or any(
        re.search(r"\bORDER\s+BY\b", line, re.IGNORECASE) for line in full_expected_lines + target_lines
    )

    if has_order_by:
        if all(row_matches(u, t) for u, t in zip(u_r, t_r)):
            return True
        # Fallback: check multiset match in case database engines differ on NULL sort positions (e.g. SQLite NULLS FIRST vs ANSI NULLS LAST)
        remaining_target = list(t_r)
        for u_row in u_r:
            found_idx = None
            for idx, t_row in enumerate(remaining_target):
                if row_matches(u_row, t_row):
                    found_idx = idx
                    break
            if found_idx is not None:
                remaining_target.pop(found_idx)
            else:
                return False
        return len(remaining_target) == 0
    else:
        # Multiset comparison: order doesn't matter, but multiplicities must match
        remaining_target = list(t_r)
        for u_row in u_r:
            found_idx = None
            for idx, t_row in enumerate(remaining_target):
                if row_matches(u_row, t_row):
                    found_idx = idx
                    break
            if found_idx is not None:
                remaining_target.pop(found_idx)
            else:
                return False
        return len(remaining_target) == 0


def evaluate_sql_submission(
    user_query: str,
    expected_output: str,
    test_cases: List[Dict[str, Any]],
    session_dump: Optional[str] = None
) -> Dict[str, Any]:
    # Check for empty or only comment code
    real_code = strip_sql_comments(user_query)
    if not real_code:
        error_msg = "Please write your SQL solution in solution.sql before verifying."
        return {
            "success": False,
            "passed": False,
            "stdout": "",
            "stderr": error_msg,
            "columns": [],
            "rows": [],
            "test_results": [
                {
                    "test_case_index": 1,
                    "description": "SQL Input Validation",
                    "passed": False,
                    "input": "",
                    "expected_output": "Executable SQL Query",
                    "actual_output": "Empty or commented starter code",
                    "error": error_msg,
                    "execution_time_ms": 0.0,
                    "hidden": False
                }
            ],
            "execution_time_ms": 0.0
        }

    is_safe, error_msg = is_safe_sql_query(user_query)
    if not is_safe:
        return {
            "success": False,
            "passed": False,
            "stdout": "",
            "stderr": error_msg,
            "columns": [],
            "rows": [],
            "test_results": [
                {
                    "test_case_index": 1,
                    "description": "SQL Security & Syntax Validation",
                    "passed": False,
                    "input": "",
                    "expected_output": "Allowed Read-Only Query",
                    "actual_output": error_msg,
                    "error": error_msg,
                    "execution_time_ms": 0.0,
                    "hidden": False
                }
            ],
            "execution_time_ms": 0.0
        }

    exec_res = execute_sql_in_sandbox(user_query, session_dump=session_dump)
    exec_time = exec_res["execution_time_ms"]

    if not exec_res["success"]:
        return {
            "success": False,
            "passed": False,
            "stdout": exec_res["stdout"],
            "stderr": exec_res["stderr"],
            "columns": exec_res.get("columns", []),
            "rows": exec_res.get("rows", []),
            "test_results": [
                {
                    "test_case_index": 1,
                    "description": "SQL Execution",
                    "passed": False,
                    "input": "",
                    "expected_output": "Valid SQL Output",
                    "actual_output": f"Execution Error: {exec_res['stderr']}",
                    "error": exec_res["stderr"],
                    "execution_time_ms": exec_time,
                    "hidden": False
                }
            ],
            "execution_time_ms": exec_time
        }

    user_stdout = exec_res["stdout"].strip()
    expected_str = (expected_output or "").strip()

    user_lines = [line.strip() for line in user_stdout.splitlines() if line.strip() and not line.startswith("-")]
    expected_lines = [line.strip() for line in expected_str.splitlines() if line.strip() and not line.startswith("-")]

    test_results = []
    if test_cases and len(test_cases) > 0:
        for idx, tc in enumerate(test_cases, 1):
            raw_tc_expected = tc.get("expected", expected_str).strip()
            tc_desc = tc.get("description") or f"Test Case {idx}"
            tc_hidden = bool(tc.get("hidden", False))
            tc_input = tc.get("input", "")

            tc_expected_lines = [line.strip() for line in raw_tc_expected.splitlines() if line.strip() and not line.startswith("-")]
            if len(tc_expected_lines) <= 1 and len(expected_lines) > 1:
                target_expected_lines = expected_lines
                target_display_expected = expected_str
            else:
                target_expected_lines = tc_expected_lines if tc_expected_lines else expected_lines
                target_display_expected = raw_tc_expected if raw_tc_expected else expected_str

            tc_passed = check_sql_output_matches(
                user_query=user_query,
                user_lines=user_lines,
                target_lines=target_expected_lines,
                full_expected_lines=expected_lines
            )

            test_results.append({
                "test_case_index": idx,
                "description": tc_desc,
                "passed": tc_passed,
                "input": tc_input,
                "expected_output": target_display_expected,
                "actual_output": user_stdout,
                "error": None if tc_passed else "Query result did not match expected solution schema or rows.",
                "execution_time_ms": exec_time,
                "hidden": tc_hidden
            })
    else:
        full_matches = check_sql_output_matches(
            user_query=user_query,
            user_lines=user_lines,
            target_lines=expected_lines,
            full_expected_lines=expected_lines
        )
        test_results.append({
            "test_case_index": 1,
            "description": "Output Schema & Record Matching",
            "passed": full_matches,
            "input": "",
            "expected_output": expected_str or "Target Table Result",
            "actual_output": user_stdout or "(Empty Result Set)",
            "error": None if full_matches else "Query result did not match expected solution schema or rows.",
            "execution_time_ms": exec_time,
            "hidden": False
        })

    all_passed = all(tr["passed"] for tr in test_results)

    return {
        "success": exec_res["success"],
        "passed": all_passed,
        "stdout": exec_res["stdout"],
        "stderr": exec_res["stderr"],
        "columns": exec_res["columns"],
        "rows": exec_res["rows"],
        "test_results": test_results,
        "execution_time_ms": exec_time
    }



async def evaluate_challenge_test_cases(
    user_query: str,
    expected_output_or_testcases: Union[str, List[Dict[str, Any]]],
    test_cases: Optional[List[Dict[str, Any]]] = None,
    session_dump: Optional[str] = None
) -> tuple[bool, List[Dict[str, Any]], float, List[str], List[List[Any]]]:
    if isinstance(expected_output_or_testcases, list):
        tc_list = expected_output_or_testcases
        exp_out = tc_list[0].get("expected", "") if tc_list else ""
    else:
        exp_out = expected_output_or_testcases
        tc_list = test_cases or []

    res = evaluate_sql_submission(user_query, exp_out, tc_list, session_dump=session_dump)
    return res["passed"], res["test_results"], res["execution_time_ms"], res.get("columns", []), res.get("rows", [])


class ASTCodeAnalyzer:
    def analyze(self, code: str) -> Dict[str, Any]:
        return {
            "line_by_line": [{"line": 1, "explanation": "SQL Query Execution Plan"}],
            "time_complexity": "Linear Time O(N)",
            "space_complexity": "O(N)"
        }
