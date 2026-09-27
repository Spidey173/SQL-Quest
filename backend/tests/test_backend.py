import pytest
import asyncio
from app.sandbox.runner import execute_code_in_sandbox, inspect_code_safety
from app.sandbox.evaluator import evaluate_challenge_test_cases


def test_ast_security_blocks_malicious_imports():
    malicious_code_1 = "import os\nos.system('ls')"
    error_1 = inspect_code_safety(malicious_code_1)
    assert error_1 is not None
    assert "Security Violation" in error_1
    assert "os" in error_1

    malicious_code_2 = "from subprocess import Popen"
    error_2 = inspect_code_safety(malicious_code_2)
    assert error_2 is not None
    assert "subprocess" in error_2

    malicious_code_3 = "f = open('/etc/passwd', 'r')"
    error_3 = inspect_code_safety(malicious_code_3)
    assert error_3 is not None
    assert "open" in error_3

    malicious_code_4 = "eval('2 + 2')"
    error_4 = inspect_code_safety(malicious_code_4)
    assert error_4 is not None
    assert "eval" in error_4


def test_ast_security_allows_safe_code():
    safe_code = """
energy = 100
for i in range(5):
    energy += i
print(energy)
"""
    error = inspect_code_safety(safe_code)
    assert error is None


@pytest.mark.asyncio
async def test_sandbox_executes_valid_code():
    code = "name = input()\nprint(f'Hello, {name}!')"
    res = await execute_code_in_sandbox(code, stdin_input="Runner")
    assert res["success"] is True
    assert res["stdout"].strip() == "Hello, Runner!"
    assert res["exit_code"] == 0


@pytest.mark.asyncio
async def test_sandbox_catches_infinite_loop_timeout():
    code = "while True:\n    pass"
    res = await execute_code_in_sandbox(code, timeout_seconds=1.0)
    assert res["success"] is False
    assert "Timed Out" in res["stderr"]


@pytest.mark.asyncio
async def test_evaluator_grades_test_cases():
    code = "SELECT first_name, last_name FROM employees WHERE employee_id = 1;"
    test_cases = [
        {"input": "", "expected": "first_name | last_name\n----------------------\nJohn | Doe", "description": "Select query test"}
    ]
    passed_all, results, total_time, columns, rows = await evaluate_challenge_test_cases(code, test_cases)
    assert passed_all is True
    assert len(results) == 1
    assert results[0]["passed"] is True
    assert columns == ["first_name", "last_name"]
    assert rows == [["John", "Doe"]]


@pytest.mark.asyncio
async def test_evaluator_beginner_friendly_matching():
    # 1. Standard SQL matching
    code_sql = "SELECT COUNT(*) FROM employees;"
    test_case_sql = [{"input": "", "expected": "COUNT(*)\n--------------------\n8"}]
    passed, res, _, columns, rows = await evaluate_challenge_test_cases(code_sql, test_case_sql)
    assert passed is True


@pytest.mark.asyncio
async def test_evaluator_rejects_wrong_columns():
    # Submitting SELECT * when specific columns are expected should FAIL
    code_sql = "SELECT * FROM employees;"
    test_cases = [
        {"input": "", "expected": "employee_id | first_name | last_name | job_title | salary", "description": "Specific 5 columns"}
    ]
    passed, res, _, _, _ = await evaluate_challenge_test_cases(code_sql, test_cases)
    assert passed is False


@pytest.mark.asyncio
async def test_sandbox_sql_timeout():
    from app.sandbox.sql_runner import execute_sql_in_sandbox
    infinite_cte = "WITH RECURSIVE cnt(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM cnt) SELECT * FROM cnt;"
    res = execute_sql_in_sandbox(infinite_cte, timeout_seconds=1.0)
    assert res["success"] is False
    assert "Timed Out" in res["stderr"]
