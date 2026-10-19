from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import Optional

from app.database import get_db
from app.models import Challenge, User, UserProgress, Submission
from app.schemas import (
    CodeRunRequest, CodeRunResponse, TestCaseResult,
    CodeSubmitRequest, CodeSubmitResponse,
    SchemaSetupRequest, SchemaSetupResponse, SchemaTableInfo, SchemaTableColumn
)
from app.security import get_current_user, get_current_user_optional
from app.crud import resolve_challenge
from app.cache import cache
from app.sandbox.sql_runner import execute_sql_in_sandbox
from app.sandbox.evaluator import evaluate_challenge_test_cases
from app.sandbox.schema_manager import (
    inspect_sqlite_connection, validate_schema_against_expected,
    get_relevant_tables_for_challenge, generate_setup_sql_for_challenge,
    get_baseline_tables_for_challenge, USER_DB_SESSIONS
)
import sqlite3
import time

router = APIRouter(prefix="/execution", tags=["Execution & Sandbox"])


@router.post("/setup-schema", response_model=SchemaSetupResponse)
async def setup_schema(req: SchemaSetupRequest, db: AsyncSession = Depends(get_db)):
    """
    Executes user DDL/DML schema setup script (CREATE TABLE, INSERT INTO, etc.)
    Validates against challenge expected tables, serializes database state to user session,
    and returns rich metadata with table definitions, row counts, and sample data.
    """
    start_time = time.perf_counter()
    ch = await resolve_challenge(db, req.challenge_id)
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    cleaned_sql = (req.schema_sql or "").strip()
    if not cleaned_sql:
        return SchemaSetupResponse(
            success=False,
            message="No schema SQL provided.",
            error="Please write or run CREATE TABLE and INSERT INTO statements."
        )

    # In-memory execution — restore existing session first (append mode)
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    try:
        # Always initialize standard tables as baseline foundation
        from app.sandbox.sql_runner import SAMPLE_SCHEMAS, SAMPLE_DATA
        cursor.executescript(SAMPLE_SCHEMAS)
        cursor.executescript(SAMPLE_DATA)

        # Append mode: restore previous session tables and execute user script
        session_key = f"{req.session_id or 'default'}_{ch.id}"
        existing_dump = USER_DB_SESSIONS.get(session_key)
        if existing_dump:
            cursor.executescript(existing_dump)

        cursor.executescript(cleaned_sql)
        tables_info = inspect_sqlite_connection(conn)
        actual_table_names = [t["name"] for t in tables_info]

        # Advise user if their table names differ from standard practice tables, but NEVER block execution
        expected_tables = get_relevant_tables_for_challenge(ch.title, ch.objective, ch.starter_code)
        valid, hint_note = validate_schema_against_expected(actual_table_names, expected_tables)

        # Dump DB for session persistence
        dump_lines = list(conn.iterdump())
        dump_sql = "\n".join(dump_lines)

        USER_DB_SESSIONS[session_key] = dump_sql

        total_rows = sum(t["row_count"] for t in tables_info)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        table_names_str = ", ".join(actual_table_names) if actual_table_names else "none"
        msg = f"Created {len(tables_info)} table(s) [{table_names_str}] with {total_rows} row(s) successfully!"
        if not valid and hint_note:
            msg += f" Note: Challenge default was {expected_tables}. You can query '{table_names_str}' in solution.sql."

        return SchemaSetupResponse(
            success=True,
            message=msg,
            tables=[SchemaTableInfo(**t) for t in tables_info],
            execution_time_ms=elapsed_ms
        )

    except sqlite3.Error as err:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return SchemaSetupResponse(
            success=False,
            message="DDL / SQL Execution Error",
            error=f"SQL Error: {str(err)}",
            tables=[],
            execution_time_ms=elapsed_ms
        )
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return SchemaSetupResponse(
            success=False,
            message="Runtime Error",
            error=str(exc),
            tables=[],
            execution_time_ms=elapsed_ms
        )
    finally:
        conn.close()


@router.post("/reset-schema")
async def reset_schema(req: SchemaSetupRequest, db: AsyncSession = Depends(get_db)):
    """
    Clears custom user session DB for this challenge and returns original baseline setup SQL.
    """
    ch = await resolve_challenge(db, req.challenge_id)
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    session_key = f"{req.session_id or 'default'}_{ch.id}"
    if session_key in USER_DB_SESSIONS:
        del USER_DB_SESSIONS[session_key]

    default_setup = generate_setup_sql_for_challenge(ch.title, ch.objective, ch.starter_code)
    return {
        "success": True,
        "message": "Database reset to baseline.",
        "setup_sql": default_setup
    }


@router.get("/get-schema/{challenge_id}")
async def get_session_schema(
    challenge_id: str,
    session_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns active session tables if the user has created tables via DDL,
    otherwise returns empty tables list so only user-created tables are shown.
    """
    ch = await resolve_challenge(db, challenge_id)
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    session_key = f"{session_id or 'default'}_{ch.id}"
    session_dump = USER_DB_SESSIONS.get(session_key)

    if not session_dump:
        baseline_tables = get_baseline_tables_for_challenge(ch.title, ch.objective, ch.starter_code, ch.story)
        return {
            "has_session_db": False,
            "tables": [SchemaTableInfo(**t) for t in baseline_tables]
        }

    conn = sqlite3.connect(":memory:")
    try:
        conn.cursor().executescript(session_dump)
        tables_info = inspect_sqlite_connection(conn)
        # Filter session tables to those relevant to this challenge
        relevant_names = set(get_relevant_tables_for_challenge(ch.title, ch.objective, ch.starter_code, ch.story))
        filtered_tables = [t for t in tables_info if t["name"].lower() in relevant_names]
        if not filtered_tables:
            filtered_tables = tables_info
        return {
            "has_session_db": True,
            "tables": [SchemaTableInfo(**t) for t in filtered_tables]
        }
    except Exception:
        baseline_tables = get_baseline_tables_for_challenge(ch.title, ch.objective, ch.starter_code, ch.story)
        return {
            "has_session_db": False,
            "tables": [SchemaTableInfo(**t) for t in baseline_tables]
        }
    finally:
        conn.close()


@router.post("/run", response_model=CodeRunResponse)
async def run_query(req: CodeRunRequest, db: AsyncSession = Depends(get_db)):
    ch = await resolve_challenge(db, req.challenge_id)
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    session_key = f"{req.session_id or 'default'}_{ch.id}"
    session_dump = USER_DB_SESSIONS.get(session_key)

    # If no custom session, auto-seed from the challenge's own setup SQL (cached)
    if not session_dump:
        cached_sql = cache.get_cached_setup_sql(ch.id)
        if cached_sql:
            session_dump = cached_sql
        else:
            session_dump = generate_setup_sql_for_challenge(ch.title, ch.objective, ch.starter_code)
            cache.set_cached_setup_sql(ch.id, session_dump)

    # If custom input is provided, run single test
    if req.custom_input is not None and req.custom_input != "":
        exec_res = execute_sql_in_sandbox(req.code, session_dump=session_dump)
        test_res = TestCaseResult(
            test_case_index=1,
            description="Custom SQL Run",
            passed=exec_res["success"],
            input=req.custom_input,
            expected_output="Custom run",
            actual_output=exec_res["stdout"],
            error=exec_res["stderr"],
            execution_time_ms=exec_res["execution_time_ms"],
            hidden=False
        )

        return CodeRunResponse(
            success=exec_res["success"],
            stdout=exec_res["stdout"],
            stderr=exec_res["stderr"],
            columns=exec_res.get("columns", []),
            rows=exec_res.get("rows", []),
            test_results=[test_res],
            passed_all=exec_res["success"],
            execution_time_ms=exec_res["execution_time_ms"],
            security_error=exec_res.get("security_error")
        )

    # Otherwise, run against all visible test cases
    visible_tests = [t for t in ch.test_cases if not t.get("hidden", False)]
    if not visible_tests:
        visible_tests = ch.test_cases[:1]

    passed_all, test_results, total_time, columns, rows, query_plan = await evaluate_challenge_test_cases(
        req.code, ch.expected_output, visible_tests, session_dump=session_dump, return_plan=True
    )

    # Clean query execution means no SQL syntax or database runtime error occurred
    first_res = test_results[0] if test_results else {}
    first_error = first_res.get("error") or ""
    is_exec_error = bool(first_error and ("Syntax" in first_error or "Execution Error" in first_error or "Security Violation" in first_error or "Timed Out" in first_error))
    query_success = not is_exec_error

    return CodeRunResponse(
        success=query_success,
        stdout=first_res.get("actual_output", ""),
        stderr=first_error if is_exec_error else "",
        columns=columns,
        rows=rows,
        test_results=[TestCaseResult(**tr) for tr in test_results],
        passed_all=passed_all,
        execution_time_ms=total_time,
        security_error=first_error if "Security Violation" in str(first_error) else None,
        query_plan=query_plan
    )


@router.post("/submit", response_model=CodeSubmitResponse)
async def submit_query(
    req: CodeSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    ch = await resolve_challenge(db, req.challenge_id)
    if not ch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    session_key = f"{req.session_id or 'default'}_{ch.id}"
    session_dump = USER_DB_SESSIONS.get(session_key)

    # If no custom session, auto-seed from the challenge's own setup SQL (cached)
    if not session_dump:
        cached_sql = cache.get_cached_setup_sql(ch.id)
        if cached_sql:
            session_dump = cached_sql
        else:
            session_dump = generate_setup_sql_for_challenge(ch.title, ch.objective, ch.starter_code)
            cache.set_cached_setup_sql(ch.id, session_dump)

    # Fetch previous progress if logged in
    progress = None
    already_passed = False
    attempts = 1
    if current_user:
        prog_res = await db.execute(
            select(UserProgress).where(
                UserProgress.user_id == current_user.id,
                UserProgress.challenge_id == ch.id
            )
        )
        progress = prog_res.scalars().first()
        already_passed = progress.passed if progress else False
        attempts = (progress.attempts + 1) if progress else 1

    # Unlimited attempts enabled: no lives restriction for studying & practice

    # Run against all test cases (both visible and hidden)
    passed_all, test_results, total_time, columns, rows, query_plan = await evaluate_challenge_test_cases(
        req.code, ch.expected_output, ch.test_cases, session_dump=session_dump, return_plan=True
    )

    # Record submission history if user is logged in
    passed_tests_count = sum(1 for tr in test_results if tr.get("passed"))
    if current_user:
        sub = Submission(
            user_id=current_user.id,
            challenge_id=ch.id,
            code=req.code,
            status="PASSED" if passed_all else "FAILED",
            tests_passed=passed_tests_count,
            total_tests=len(ch.test_cases),
            execution_time_ms=total_time
        )
        db.add(sub)

    # Find next challenge from cache instead of querying Neon DB
    next_ch = None
    all_challenges = cache.get_all_challenges()
    if all_challenges:
        for c in all_challenges:
            if c.id > ch.id:
                next_ch = c
                break
    else:
        next_ch_res = await db.execute(
            select(Challenge).where(Challenge.id > ch.id).order_by(Challenge.id.asc())
        )
        next_ch = next_ch_res.scalars().first()

    first_actual = test_results[0].get("actual_output", "") if test_results else ""
    first_error = test_results[0].get("error", "") if (test_results and not passed_all) else ""

    if passed_all:
        if current_user:
            stars = 3

            # Update progress entry
            if not progress:
                progress = UserProgress(
                    user_id=current_user.id,
                    challenge_id=ch.id,
                    passed=True,
                    stars=stars,
                    attempts=attempts,
                    best_time_ms=total_time,
                    code_submitted=req.code
                )
                db.add(progress)
            else:
                progress.passed = True
                progress.stars = max(progress.stars, stars)
                progress.attempts = attempts
                progress.best_time_ms = min(progress.best_time_ms or total_time, total_time)
                progress.code_submitted = req.code

            await db.commit()
            cache.invalidate_progress(current_user.id)

        return CodeSubmitResponse(
            success=True,
            passed_all=True,
            stars_earned=3,
            test_results=[TestCaseResult(**tr) for tr in test_results],
            columns=columns,
            rows=rows,
            stdout=first_actual,
            stderr="",
            execution_time_ms=total_time,
            next_challenge_id=next_ch.code_id if next_ch else None,
            next_code_id=next_ch.code_id if next_ch else None,
            message="Challenge passed successfully!",
            query_plan=query_plan
        )

    else:
        if current_user:
            if not progress:
                progress = UserProgress(
                    user_id=current_user.id,
                    challenge_id=ch.id,
                    passed=False,
                    stars=0,
                    attempts=attempts,
                    best_time_ms=total_time,
                    code_submitted=req.code
                )
                db.add(progress)
            else:
                progress.attempts = attempts
                if not already_passed:
                    progress.code_submitted = req.code

            await db.commit()
            cache.invalidate_progress(current_user.id)

        return CodeSubmitResponse(
            success=False,
            passed_all=False,
            stars_earned=0,
            test_results=[TestCaseResult(**tr) for tr in test_results],
            columns=columns,
            rows=rows,
            stdout=first_actual,
            stderr=first_error or "Query result did not match expected solution schema or rows.",
            execution_time_ms=total_time,
            next_challenge_id=None,
            next_code_id=None,
            message="Some test cases failed. Keep refining your query!",
            query_plan=query_plan
        )
