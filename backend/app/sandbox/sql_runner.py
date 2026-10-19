import re
import sqlite3
import time
from typing import Dict, Any, List, Optional

# Standard sample databases for different categories of SQL questions
SAMPLE_SCHEMAS = """
-- Employees & Departments
CREATE TABLE IF NOT EXISTS departments (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    hire_date DATE,
    job_title TEXT,
    salary REAL,
    manager_id INTEGER,
    department_id INTEGER,
    age INTEGER,
    city TEXT,
    gender TEXT,
    state TEXT
);

-- Customers, Products, Sales & Orders
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    age INTEGER,
    customer_type TEXT
);

CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    price REAL,
    stock_quantity INTEGER,
    supplier_id INTEGER
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY,
    supplier_name TEXT,
    city TEXT,
    country TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount REAL,
    status TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL
);

CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY,
    product_id INTEGER,
    sale_date DATE,
    quantity INTEGER,
    amount REAL,
    region TEXT,
    salesperson_id INTEGER
);

-- Students, Courses & Enrollments
CREATE TABLE IF NOT EXISTS students (
    student_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    class TEXT,
    class_name TEXT,
    marks REAL,
    age INTEGER,
    city TEXT
);

CREATE TABLE IF NOT EXISTS courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT,
    credits INTEGER
);

CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INTEGER PRIMARY KEY,
    student_id INTEGER,
    course_id INTEGER,
    grade TEXT,
    enrollment_date DATE
);

-- Branches & Accounts
CREATE TABLE IF NOT EXISTS branches (
    branch_id INTEGER PRIMARY KEY,
    branch_name TEXT,
    city TEXT,
    profit REAL
);

-- User Activity & Logins
CREATE TABLE IF NOT EXISTS user_logins (
    login_id INTEGER PRIMARY KEY,
    user_id INTEGER,
    login_date DATE,
    device TEXT
);
"""

SAMPLE_DATA = """
-- Departments
INSERT INTO departments VALUES (101, 'Engineering', 'New York');
INSERT INTO departments VALUES (102, 'Sales', 'Chicago');
INSERT INTO departments VALUES (103, 'Marketing', 'San Francisco');
INSERT INTO departments VALUES (104, 'HR', 'Boston');
INSERT INTO departments VALUES (105, 'Finance', 'New York');

-- Employees
INSERT INTO employees VALUES (1, 'John', 'Doe', 'john.doe@email.com', '555-0101', '2020-01-15', 'Software Engineer', 85000, NULL, 101, 28, 'New York', 'Male', 'NY');
INSERT INTO employees VALUES (2, 'Jane', 'Smith', 'jane.smith@email.com', '555-0102', '2019-03-22', 'Engineering Manager', 120000, NULL, 101, 35, 'New York', 'Female', 'NY');
INSERT INTO employees VALUES (3, 'Bob', 'Johnson', 'bob.j@email.com', '555-0103', '2021-06-01', 'Sales Exec', 60000, 2, 102, 32, 'Chicago', 'Male', 'IL');
INSERT INTO employees VALUES (4, 'Alice', 'Williams', 'alice.w@email.com', '555-0104', '2018-11-12', 'Sales Director', 110000, NULL, 102, 40, 'Chicago', 'Female', 'IL');
INSERT INTO employees VALUES (5, 'Charlie', 'Brown', 'charlie.b@email.com', '555-0105', '2022-02-10', 'Marketing Specialist', 55000, 4, 103, 25, 'San Francisco', 'Male', 'CA');
INSERT INTO employees VALUES (6, 'Diana', 'Prince', 'diana.p@email.com', '555-0106', '2017-08-05', 'HR Lead', 75000, NULL, 104, 38, 'Boston', 'Female', 'MA');
INSERT INTO employees VALUES (7, 'Eva', 'Green', 'eva.g@email.com', '555-0107', '2023-01-01', 'Software Engineer', 90000, 2, 101, 26, 'New York', 'Female', 'NY');
INSERT INTO employees VALUES (8, 'Frank', 'Miller', 'frank.m@email.com', '555-0108', '2020-09-15', 'Financial Analyst', 70000, NULL, 105, 30, 'New York', 'Male', 'NY');

-- Customers
INSERT INTO customers VALUES (1, 'Alice', 'Smith', 'alice@gmail.com', 'New York', 'NY', 'USA', 29, 'VIP');
INSERT INTO customers VALUES (2, 'Bob', 'Jones', 'bob@yahoo.com', 'Chicago', 'IL', 'USA', 42, 'Regular');
INSERT INTO customers VALUES (3, 'Charlie', 'Day', 'charlie@gmail.com', 'New York', 'NY', 'USA', 35, 'Regular');
INSERT INTO customers VALUES (4, 'David', 'Miller', 'david@outlook.com', 'San Francisco', 'CA', 'USA', 24, 'VIP');
INSERT INTO customers VALUES (5, 'Emma', 'Watson', 'emma@gmail.com', 'Boston', 'MA', 'USA', 31, 'Regular');

-- Products & Suppliers
INSERT INTO suppliers VALUES (1, 'TechCorp', 'San Jose', 'USA');
INSERT INTO suppliers VALUES (2, 'OfficeSupplies Ltd', 'Chicago', 'USA');

INSERT INTO products VALUES (10, 'Laptop', 'Electronics', 1200.00, 50, 1);
INSERT INTO products VALUES (11, 'Smartphone', 'Electronics', 800.00, 100, 1);
INSERT INTO products VALUES (12, 'Desk Chair', 'Furniture', 250.00, 30, 2);
INSERT INTO products VALUES (13, 'Monitor', 'Electronics', 350.00, 45, 1);
INSERT INTO products VALUES (14, 'Notebook', 'Stationery', 5.00, 500, 2);

-- Orders
INSERT INTO orders VALUES (501, 1, '2024-01-10', 1550.00, 'Completed');
INSERT INTO orders VALUES (502, 2, '2024-01-15', 250.00, 'Completed');
INSERT INTO orders VALUES (503, 1, '2024-02-01', 800.00, 'Completed');
INSERT INTO orders VALUES (504, 4, '2024-02-14', 1200.00, 'Pending');
INSERT INTO orders VALUES (505, 3, '2024-03-05', 355.00, 'Completed');

-- Sales
INSERT INTO sales VALUES (1, 10, '2024-01-10', 1, 1200.00, 'North', 3);
INSERT INTO sales VALUES (2, 11, '2024-01-15', 2, 1600.00, 'South', 3);
INSERT INTO sales VALUES (3, 12, '2024-02-01', 1, 250.00, 'East', 5);
INSERT INTO sales VALUES (4, 13, '2024-02-14', 3, 1050.00, 'West', 3);
INSERT INTO sales VALUES (5, 10, '2024-03-01', 2, 2400.00, 'North', 3);

-- Students & Courses
INSERT INTO students VALUES (1, 'Alex', 'Turner', 'Class A', 'Class A', 92.5, 16, 'Chicago');
INSERT INTO students VALUES (2, 'Bella', 'Hadid', 'Class A', 'Class A', 88.0, 17, 'New York');
INSERT INTO students VALUES (3, 'Chris', 'Evans', 'Class B', 'Class B', 74.5, 16, 'Boston');
INSERT INTO students VALUES (4, 'Daniel', 'Craig', 'Class B', 'Class B', 95.0, 17, 'Chicago');
INSERT INTO students VALUES (5, 'Ella', 'Purnell', 'Class A', 'Class A', 61.0, 16, 'New York');

-- Branches
INSERT INTO branches VALUES (1, 'Downtown Main', 'New York', 450000.00);
INSERT INTO branches VALUES (2, 'Westside Hub', 'Chicago', 320000.00);
INSERT INTO branches VALUES (3, 'Silicon Office', 'San Francisco', 680000.00);
"""


def strip_comments_only(sql: str) -> str:
    """Removes block and line comments to preserve only executable SQL statements."""
    s = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    lines = [re.sub(r"--.*$", "", line).strip() for line in s.splitlines()]
    return "\n".join(l for l in lines if l).strip()


def execute_sql_in_sandbox(
    user_sql: str,
    custom_schema: Optional[str] = None,
    custom_data: Optional[str] = None,
    timeout_seconds: float = 3.0,
    session_dump: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes user SQL query inside an isolated in-memory SQLite database instance.
    Guards against infinite loops with an execution timeout and returns structured
    columns, rows, formatted output text, and execution time.
    """
    start_time = time.perf_counter()
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    # Register custom SQL helper functions commonly used in MySQL/PostgreSQL/Oracle
    def _sql_month(val):
        if not val:
            return None
        parts = str(val).strip().split("-")
        if len(parts) >= 2:
            try:
                return int(parts[1])
            except ValueError:
                pass
        return None

    def _sql_year(val):
        if not val:
            return None
        parts = str(val).strip().split("-")
        if len(parts) >= 1:
            try:
                return int(parts[0])
            except ValueError:
                pass
        return None

    def _sql_day(val):
        if not val:
            return None
        parts = str(val).strip().split(" ")[0].split("-")
        if len(parts) >= 3:
            try:
                return int(parts[2])
            except ValueError:
                pass
        return None

    def _sql_datediff(d1, d2):
        if not d1 or not d2:
            return None
        try:
            from datetime import date
            p1 = [int(x) for x in str(d1).strip().split(" ")[0].split("-")]
            p2 = [int(x) for x in str(d2).strip().split(" ")[0].split("-")]
            dt1 = date(p1[0], p1[1], p1[2])
            dt2 = date(p2[0], p2[1], p2[2])
            return (dt1 - dt2).days
        except Exception:
            return None

    conn.create_function("MONTH", 1, _sql_month)
    conn.create_function("month", 1, _sql_month)
    conn.create_function("YEAR", 1, _sql_year)
    conn.create_function("year", 1, _sql_year)
    conn.create_function("DAY", 1, _sql_day)
    conn.create_function("day", 1, _sql_day)
    conn.create_function("DATEDIFF", 2, _sql_datediff)
    conn.create_function("datediff", 2, _sql_datediff)

    # Attach execution timeout handler to prevent infinite loops (e.g. recursive CTEs)
    deadline = time.perf_counter() + timeout_seconds

    def timeout_check():
        if time.perf_counter() > deadline:
            return 1  # Non-zero interrupts execution, raising sqlite3.OperationalError
        return 0

    conn.set_progress_handler(timeout_check, 1000)

    try:
        # Load database state: session_dump already contains everything (from iterdump),
        # so only load base schema + data when there's no session dump
        if session_dump and session_dump.strip():
            # Session dump from iterdump() includes all CREATE TABLE + INSERT statements
            cursor.executescript(session_dump)
        else:
            schema_sql = custom_schema or SAMPLE_SCHEMAS
            data_sql = custom_data or SAMPLE_DATA
            cursor.executescript(schema_sql)
            cursor.executescript(data_sql)

        # Execute user SQL code
        cleaned_sql = user_sql.strip()
        cleaned_no_comments = strip_comments_only(cleaned_sql)

        # Gracefully handle accidental trailing comma right before FROM clause (e.g., SELECT col1, col2, FROM tbl)
        cleaned_no_comments = re.sub(r",\s*(FROM\b)", r" \1", cleaned_no_comments, flags=re.IGNORECASE)

        # Support ANSI SQL EXTRACT(MONTH/YEAR/DAY FROM date_column) by rewriting to MONTH()/YEAR()/DAY()
        cleaned_no_comments = re.sub(r"\bEXTRACT\s*\(\s*MONTH\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)", r"MONTH(\1)", cleaned_no_comments, flags=re.IGNORECASE)
        cleaned_no_comments = re.sub(r"\bEXTRACT\s*\(\s*YEAR\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)", r"YEAR(\1)", cleaned_no_comments, flags=re.IGNORECASE)
        cleaned_no_comments = re.sub(r"\bEXTRACT\s*\(\s*DAY\s+FROM\s+([a-zA-Z0-9_.]+)\s*\)", r"DAY(\1)", cleaned_no_comments, flags=re.IGNORECASE)

        if not cleaned_no_comments:
            return {
                "success": False,
                "stdout": "",
                "stderr": "Error: Empty SQL query provided.",
                "columns": [],
                "rows": [],
                "execution_time_ms": 0.0
            }

        # Split by semicolons not enclosed within single quotes
        raw_statements = re.split(r";(?=(?:[^']*'[^']*')*[^']*$)", cleaned_no_comments)
        statements = []
        for s in raw_statements:
            s_clean = s.strip()
            if not s_clean:
                continue
            # Transpile MySQL multi-table DELETE syntax: DELETE p1 FROM Person p1 JOIN Person p2 ON ...
            del_match = re.match(r"DELETE\s+([a-zA-Z0-9_]+)\s+FROM\s+([a-zA-Z0-9_]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)\s+JOIN\s+([a-zA-Z0-9_]+)\s+(?:AS\s+)?([a-zA-Z0-9_]+)\s+ON\s+(.*)", s_clean, re.IGNORECASE | re.DOTALL)
            if del_match:
                del_alias, t1, a1, t2, a2, on_cond = del_match.groups()
                s_clean = f"DELETE FROM {t1} WHERE id IN (SELECT {a1}.id FROM {t1} {a1} JOIN {t2} {a2} ON {on_cond})"
            statements.append(s_clean)

        columns = []
        rows = []

        if not statements:
            return {
                "success": False,
                "stdout": "",
                "stderr": "Error: Empty SQL query provided.",
                "columns": [],
                "rows": [],
                "execution_time_ms": 0.0
            }
        elif len(statements) == 1:
            cursor.execute(statements[0])
        else:
            # Execute prior statements first (e.g. multi-statement setup)
            for stmt in statements[:-1]:
                cursor.execute(stmt)
            # Execute the final statement to return results
            cursor.execute(statements[-1])

        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            raw_rows = cursor.fetchall()
            # Convert tuples to lists for JSON serialization
            rows = [list(row) for row in raw_rows]

            col_header = " | ".join(columns)
            divider = "-" * max(len(col_header), 20)
            row_lines = [" | ".join(str(val) if val is not None else "NULL" for val in row) for row in rows]
            stdout_text = f"{col_header}\n{divider}\n" + "\n".join(row_lines) if rows else f"{col_header}\n{divider}\n(0 rows returned)"
        else:
            # For data-modifying queries (DELETE / UPDATE), display the updated table state if Person exists
            target_table = None
            if "person" in cleaned_no_comments.lower():
                target_table = "Person"
            
            if target_table:
                try:
                    cursor.execute(f"SELECT id, email FROM {target_table} ORDER BY id")
                    if cursor.description:
                        columns = [desc[0] for desc in cursor.description]
                        raw_rows = cursor.fetchall()
                        rows = [list(row) for row in raw_rows]
                        col_header = " | ".join(columns)
                        divider = "-" * max(len(col_header), 20)
                        row_lines = [" | ".join(str(val) if val is not None else "NULL" for val in row) for row in rows]
                        stdout_text = f"{col_header}\n{divider}\n" + "\n".join(row_lines) if rows else f"{col_header}\n{divider}\n(0 rows returned)"
                    else:
                        columns = []
                        rows = []
                        stdout_text = "Query executed successfully. (No result set)"
                except Exception:
                    columns = []
                    rows = []
                    stdout_text = "Query executed successfully. (No result set)"
            else:
                columns = []
                rows = []
                stdout_text = "Query executed successfully. (No result set)"

        # Generate query execution plan for SELECT / WITH queries
        query_plan = []
        try:
            plan_stmt = statements[-1] if statements else ""
            if plan_stmt and re.match(r"^\s*(SELECT|WITH)\b", plan_stmt, re.IGNORECASE):
                plan_cursor = conn.cursor()
                plan_cursor.execute(f"EXPLAIN QUERY PLAN {plan_stmt}")
                for r in plan_cursor.fetchall():
                    # Format: (selectid, order, from, detail)
                    detail = r[3] if len(r) > 3 else str(r)
                    detail_upper = detail.upper()
                    op_type = "INDEX_SEARCH" if "USING INDEX" in detail_upper else (
                        "TEMP_B_TREE" if "USE TEMP B-TREE" in detail_upper else (
                            "FULL_TABLE_SCAN" if "SCAN" in detail_upper else "EXECUTE"
                        )
                    )
                    efficiency = "Optimal" if op_type == "INDEX_SEARCH" else (
                        "Memory Sort" if op_type == "TEMP_B_TREE" else (
                            "Sequential Scan" if op_type == "FULL_TABLE_SCAN" else "Standard"
                        )
                    )
                    query_plan.append({
                        "id": r[0],
                        "parent": r[1],
                        "detail": detail,
                        "op_type": op_type,
                        "efficiency": efficiency
                    })
                plan_cursor.close()
        except Exception:
            pass

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": True,
            "stdout": stdout_text,
            "stderr": "",
            "columns": columns,
            "rows": rows,
            "execution_time_ms": elapsed_ms,
            "query_plan": query_plan
        }

    except sqlite3.OperationalError as err:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        err_msg = str(err)
        if "interrupted" in err_msg.lower():
            err_msg = f"Query Execution Timed Out: Execution exceeded {timeout_seconds}s limit."
        return {
            "success": False,
            "stdout": "",
            "stderr": f"SQL Execution Error: {err_msg}",
            "columns": [],
            "rows": [],
            "execution_time_ms": elapsed_ms
        }
    except sqlite3.Error as err:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": False,
            "stdout": "",
            "stderr": f"SQL Syntax/Execution Error: {str(err)}",
            "columns": [],
            "rows": [],
            "execution_time_ms": elapsed_ms
        }
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Sandbox Runtime Error: {str(exc)}",
            "columns": [],
            "rows": [],
            "execution_time_ms": elapsed_ms
        }
    finally:
        conn.close()
