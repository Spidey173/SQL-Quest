import os
import hashlib
import tempfile
import sqlite3
import re
from typing import Dict, Any, List, Optional, Tuple

TABLE_DDL: Dict[str, str] = {
    "departments": """CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT,
    location TEXT
);""",
    "employees": """CREATE TABLE employees (
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
);""",
    "customers": """CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    age INTEGER,
    customer_type TEXT
);""",
    "products": """CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    price REAL,
    stock_quantity INTEGER,
    supplier_id INTEGER
);""",
    "suppliers": """CREATE TABLE suppliers (
    supplier_id INTEGER PRIMARY KEY,
    supplier_name TEXT,
    city TEXT,
    country TEXT
);""",
    "orders": """CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount REAL,
    status TEXT
);""",
    "order_items": """CREATE TABLE order_items (
    order_item_id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL
);""",
    "sales": """CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    product_id INTEGER,
    sale_date DATE,
    quantity INTEGER,
    amount REAL,
    region TEXT,
    salesperson_id INTEGER
);""",
    "students": """CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    class TEXT,
    class_name TEXT,
    marks REAL,
    age INTEGER,
    city TEXT
);""",
    "courses": """CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT,
    credits INTEGER
);""",
    "enrollments": """CREATE TABLE enrollments (
    enrollment_id INTEGER PRIMARY KEY,
    student_id INTEGER,
    course_id INTEGER,
    grade TEXT,
    enrollment_date DATE
);""",
    "branches": """CREATE TABLE branches (
    branch_id INTEGER PRIMARY KEY,
    branch_name TEXT,
    city TEXT,
    profit REAL
);""",
    "user_logins": """CREATE TABLE user_logins (
    login_id INTEGER PRIMARY KEY,
    user_id INTEGER,
    login_date DATE,
    device TEXT
);""",
    "purchases": """CREATE TABLE purchases (
    purchase_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    customer_name TEXT,
    purchase_amount REAL
);"""
}

TABLE_SEED: Dict[str, str] = {
    "departments": """INSERT INTO departments VALUES (101, 'Engineering', 'New York');
INSERT INTO departments VALUES (102, 'Sales', 'Chicago');
INSERT INTO departments VALUES (103, 'Marketing', 'San Francisco');
INSERT INTO departments VALUES (104, 'HR', 'Boston');
INSERT INTO departments VALUES (105, 'Finance', 'New York');""",
    "employees": """INSERT INTO employees VALUES (1, 'John', 'Doe', 'john.doe@email.com', '555-0101', '2020-01-15', 'Software Engineer', 85000, NULL, 101, 28, 'New York', 'Male', 'NY');
INSERT INTO employees VALUES (2, 'Jane', 'Smith', 'jane.smith@email.com', '555-0102', '2019-03-22', 'Engineering Manager', 120000, NULL, 101, 35, 'New York', 'Female', 'NY');
INSERT INTO employees VALUES (3, 'Bob', 'Johnson', 'bob.j@email.com', '555-0103', '2021-06-01', 'Sales Exec', 60000, 2, 102, 32, 'Chicago', 'Male', 'IL');
INSERT INTO employees VALUES (4, 'Alice', 'Williams', 'alice.w@email.com', '555-0104', '2018-11-12', 'Sales Director', 110000, NULL, 102, 40, 'Chicago', 'Female', 'IL');
INSERT INTO employees VALUES (5, 'Charlie', 'Brown', 'charlie.b@email.com', '555-0105', '2022-02-10', 'Marketing Specialist', 55000, 4, 103, 25, 'San Francisco', 'Male', 'CA');
INSERT INTO employees VALUES (6, 'Diana', 'Prince', 'diana.p@email.com', '555-0106', '2017-08-05', 'HR Lead', 75000, NULL, 104, 38, 'Boston', 'Female', 'MA');
INSERT INTO employees VALUES (7, 'Eva', 'Green', 'eva.g@email.com', '555-0107', '2023-01-01', 'Software Engineer', 90000, 2, 101, 26, 'New York', 'Female', 'NY');
INSERT INTO employees VALUES (8, 'Frank', 'Miller', 'frank.m@email.com', '555-0108', '2020-09-15', 'Financial Analyst', 70000, NULL, 105, 30, 'New York', 'Male', 'NY');""",
    "customers": """INSERT INTO customers VALUES (1, 'Alice', 'Smith', 'alice@gmail.com', 'New York', 'NY', 'USA', 29, 'VIP');
INSERT INTO customers VALUES (2, 'Bob', 'Jones', 'bob@yahoo.com', 'Chicago', 'IL', 'USA', 42, 'Regular');
INSERT INTO customers VALUES (3, 'Charlie', 'Day', 'charlie@gmail.com', 'New York', 'NY', 'USA', 35, 'Regular');
INSERT INTO customers VALUES (4, 'David', 'Miller', 'david@outlook.com', 'San Francisco', 'CA', 'USA', 24, 'VIP');
INSERT INTO customers VALUES (5, 'Emma', 'Watson', 'emma@gmail.com', 'Boston', 'MA', 'USA', 31, 'Regular');""",
    "products": """INSERT INTO products VALUES (10, 'Laptop', 'Electronics', 1200.00, 50, 1);
INSERT INTO products VALUES (11, 'Smartphone', 'Electronics', 800.00, 100, 1);
INSERT INTO products VALUES (12, 'Desk Chair', 'Furniture', 250.00, 30, 2);
INSERT INTO products VALUES (13, 'Monitor', 'Electronics', 350.00, 45, 1);
INSERT INTO products VALUES (14, 'Notebook', 'Stationery', 5.00, 500, 2);""",
    "suppliers": """INSERT INTO suppliers VALUES (1, 'TechCorp', 'San Jose', 'USA');
INSERT INTO suppliers VALUES (2, 'OfficeSupplies Ltd', 'Chicago', 'USA');""",
    "orders": """INSERT INTO orders VALUES (501, 1, '2024-01-10', 1550.00, 'Completed');
INSERT INTO orders VALUES (502, 2, '2024-01-15', 250.00, 'Completed');
INSERT INTO orders VALUES (503, 1, '2024-02-01', 800.00, 'Completed');
INSERT INTO orders VALUES (504, 4, '2024-02-14', 1200.00, 'Pending');
INSERT INTO orders VALUES (505, 3, '2024-03-05', 355.00, 'Completed');""",
    "sales": """INSERT INTO sales VALUES (1, 10, '2024-01-10', 1, 1200.00, 'North', 3);
INSERT INTO sales VALUES (2, 11, '2024-01-15', 2, 1600.00, 'South', 3);
INSERT INTO sales VALUES (3, 12, '2024-02-01', 1, 250.00, 'East', 5);
INSERT INTO sales VALUES (4, 13, '2024-02-14', 3, 1050.00, 'West', 3);
INSERT INTO sales VALUES (5, 10, '2024-03-01', 2, 2400.00, 'North', 3);""",
    "students": """INSERT INTO students VALUES (1, 'Alex', 'Turner', 'Class A', 'Class A', 92.5, 16, 'Chicago');
INSERT INTO students VALUES (2, 'Bella', 'Hadid', 'Class A', 'Class A', 88.0, 17, 'New York');
INSERT INTO students VALUES (3, 'Chris', 'Evans', 'Class B', 'Class B', 74.5, 16, 'Boston');
INSERT INTO students VALUES (4, 'Daniel', 'Craig', 'Class B', 'Class B', 95.0, 17, 'Chicago');
INSERT INTO students VALUES (5, 'Ella', 'Purnell', 'Class A', 'Class A', 61.0, 16, 'New York');""",
    "courses": """INSERT INTO courses VALUES (101, 'Computer Science', 4);
INSERT INTO courses VALUES (102, 'Mathematics', 3);
INSERT INTO courses VALUES (103, 'Physics', 4);""",
    "branches": """INSERT INTO branches VALUES (1, 'Downtown Main', 'New York', 450000.00);
INSERT INTO branches VALUES (2, 'Westside Hub', 'Chicago', 320000.00);
INSERT INTO branches VALUES (3, 'Silicon Office', 'San Francisco', 680000.00);"""
}


class SessionManager:
    """
    High-performance session store with dual-tier storage:
    Tier 1: Fast in-memory Python dictionary cache
    Tier 2: Persistent atomic filesystem cache to prevent serverless worker/cold-start state loss
    """
    def __init__(self):
        self._memory: Dict[str, str] = {}
        self._dir = os.path.join(tempfile.gettempdir(), "sqlquest_db_sessions")
        try:
            os.makedirs(self._dir, exist_ok=True)
        except Exception:
            pass

    def _path(self, key: str) -> str:
        safe_key = hashlib.sha256(key.encode()).hexdigest()[:24]
        return os.path.join(self._dir, f"sess_{safe_key}.sql")

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        if key in self._memory:
            return self._memory[key]
        p = self._path(key)
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    val = f.read()
                    self._memory[key] = val
                    return val
            except Exception:
                pass
        return default

    def __getitem__(self, key: str) -> str:
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val

    def __setitem__(self, key: str, val: str):
        self._memory[key] = val
        try:
            with open(self._path(key), "w", encoding="utf-8") as f:
                f.write(val)
        except Exception:
            pass

    def __delitem__(self, key: str):
        self._memory.pop(key, None)
        try:
            p = self._path(key)
            if os.path.exists(p):
                os.remove(p)
        except Exception:
            pass

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

USER_DB_SESSIONS = SessionManager()


async def get_session_dump(db: Optional[Any], key: str) -> Optional[str]:
    """
    Retrieves user database session dump across 3 tiers:
    1. Fast in-memory process cache (<0.1ms)
    2. Shared database persistence (enables state across multi-instance Vercel serverless workers)
    3. Ephemeral local filesystem cache
    """
    if key in USER_DB_SESSIONS._memory:
        return USER_DB_SESSIONS._memory[key]

    if db:
        try:
            from app.models import SandboxSession
            from sqlalchemy import select
            stmt = select(SandboxSession.dump_sql).where(SandboxSession.session_key == key)
            res = await db.execute(stmt)
            dump_val = res.scalar_one_or_none()
            if dump_val:
                USER_DB_SESSIONS._memory[key] = dump_val
                return dump_val
        except Exception:
            pass

    return USER_DB_SESSIONS.get(key)


async def save_session_dump(db: Optional[Any], key: str, dump_sql: str):
    """Saves session dump to local memory and shared database for persistent Vercel availability."""
    USER_DB_SESSIONS[key] = dump_sql

    if db:
        try:
            from app.models import SandboxSession, utcnow
            from sqlalchemy import select
            stmt = select(SandboxSession).where(SandboxSession.session_key == key)
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                existing.dump_sql = dump_sql
                existing.updated_at = utcnow()
            else:
                new_session = SandboxSession(session_key=key, dump_sql=dump_sql, updated_at=utcnow())
                db.add(new_session)
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass


async def delete_session_dump(db: Optional[Any], key: str):
    """Evicts session dump from memory, filesystem, and database."""
    if key in USER_DB_SESSIONS:
        try:
            del USER_DB_SESSIONS[key]
        except Exception:
            pass

    if db:
        try:
            from app.models import SandboxSession
            from sqlalchemy import delete
            stmt = delete(SandboxSession).where(SandboxSession.session_key == key)
            await db.execute(stmt)
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass


def get_relevant_tables_for_challenge(title: str, objective: str = "", starter_code: str = "", story: str = "") -> List[str]:
    combined = f"{title} {objective} {starter_code} {story}".lower()
    found = []
    
    table_keywords = {
        "employees": ["employee", "staff", "salary", "manager", "hire_date", "job_title"],
        "departments": ["department", "location"],
        "customers": ["customer", "client"],
        "orders": ["order", "order_date", "total_amount"],
        "order_items": ["order_item", "unit_price"],
        "products": ["product", "stock", "price", "category"],
        "suppliers": ["supplier"],
        "sales": ["sale", "revenue", "salesperson"],
        "students": ["student", "marks", "class", "grade"],
        "courses": ["course", "credit"],
        "enrollments": ["enrollment"],
        "branches": ["branch", "profit"],
        "user_logins": ["user_login", "login_id", "login_date", "device", "login history"],
        "purchases": ["purchase", "purchases"],
        "locations": ["location", "city"],
        "persons": ["person", "persons", "age group", "age_group"]
    }
    
    if "having with sum" in combined or "from purchases" in combined:
        return ["purchases"]
    if any(k in combined for k in ["highest profit", "sold more than 100 times"]):
        return ["sales"]
    
    for tbl, kws in table_keywords.items():
        if any(kw in combined for kw in kws):
            found.append(tbl)
            
    if not found:
        found = ["employees"]
        
    return found

def generate_setup_sql_for_challenge(title: str, objective: str = "", starter_code: str = "", story: str = "") -> str:
    combined_lower = f"{title} {objective} {starter_code} {story}".lower()
    if any(term in combined_lower for term in ["branches with highest profit", "highest profit"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: sales
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    branch_name TEXT,
    selling_price REAL,
    cost_price REAL
);

-- Sample Data: sales
INSERT INTO sales VALUES (1, 'Bangalore', 1000.0, 600.0);
INSERT INTO sales VALUES (2, 'Delhi', 800.0, 450.0);
INSERT INTO sales VALUES (3, 'Mumbai', 500.0, 400.0);
"""

    if any(term in combined_lower for term in ["products sold more than 100 times", "sold more than 100 times"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: sales
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    product_id INTEGER,
    product_name TEXT,
    quantity INTEGER
);

-- Sample Data: sales
INSERT INTO sales VALUES (1, 101, 'Laptop', 60);
INSERT INTO sales VALUES (2, 101, 'Laptop', 50);
INSERT INTO sales VALUES (3, 102, 'Mouse', 40);
INSERT INTO sales VALUES (4, 103, 'Keyboard', 30);
"""

    if any(term in combined_lower for term in ["triangle judgement", "triangle judgment", "table: triangle", "from triangle"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Triangle
DROP TABLE IF EXISTS Triangle;

CREATE TABLE Triangle (
    x INTEGER,
    y INTEGER,
    z INTEGER
);

-- Sample Data: Triangle
INSERT INTO Triangle VALUES (13, 15, 30);
INSERT INTO Triangle VALUES (10, 20, 15);
"""

    if any(term in combined_lower for term in ["customers who never order", "who never order", "customerid references customers.id", "o.id is null", "as customers"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Customers
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Customers;

CREATE TABLE Customers (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50)
);

-- Table: Orders
CREATE TABLE Orders (
    id INTEGER PRIMARY KEY,
    customerId INTEGER
);

-- Sample Data: Customers
INSERT INTO Customers VALUES (1, 'Joe');
INSERT INTO Customers VALUES (2, 'Henry');
INSERT INTO Customers VALUES (3, 'Sam');
INSERT INTO Customers VALUES (4, 'Max');

-- Sample Data: Orders
INSERT INTO Orders VALUES (1, 3);
INSERT INTO Orders VALUES (2, 1);
"""

    if any(term in combined_lower for term in ["sales person", "salesperson", "company named \"red\"", "company named 'red'", "company c"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: SalesPerson
DROP TABLE IF EXISTS Orders;
DROP TABLE IF EXISTS Company;
DROP TABLE IF EXISTS SalesPerson;

CREATE TABLE SalesPerson (
    sales_id INTEGER PRIMARY KEY,
    name VARCHAR(50),
    salary INTEGER,
    commission_rate INTEGER,
    hire_date DATE
);

-- Table: Company
CREATE TABLE Company (
    com_id INTEGER PRIMARY KEY,
    name VARCHAR(50),
    city VARCHAR(50)
);

-- Table: Orders
CREATE TABLE Orders (
    order_id INTEGER PRIMARY KEY,
    order_date DATE,
    com_id INTEGER,
    sales_id INTEGER,
    amount INTEGER
);

-- Sample Data: SalesPerson
INSERT INTO SalesPerson VALUES (1, 'John', 100000, 6, '2006-04-01');
INSERT INTO SalesPerson VALUES (2, 'Amy', 12000, 5, '2010-05-01');
INSERT INTO SalesPerson VALUES (3, 'Mark', 65000, 12, '2008-12-25');
INSERT INTO SalesPerson VALUES (4, 'Pam', 25000, 25, '2005-01-01');

-- Sample Data: Company
INSERT INTO Company VALUES (1, 'RED', 'Boston');
INSERT INTO Company VALUES (2, 'BLUE', 'New York');

-- Sample Data: Orders
INSERT INTO Orders VALUES (1, '2014-01-01', 1, 1, 10000);
INSERT INTO Orders VALUES (2, '2014-02-01', 2, 2, 5000);
INSERT INTO Orders VALUES (3, '2014-03-01', 2, 3, 50000);
"""

    if any(term in combined_lower for term in ["earning more than their managers", "earning more than their manager", "managerid"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Employee
DROP TABLE IF EXISTS Employee;
CREATE TABLE Employee (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50),
    salary INTEGER,
    managerId INTEGER
);

-- Sample Data: Employee
INSERT INTO Employee VALUES (1, 'Joe', 70000, 3);
INSERT INTO Employee VALUES (2, 'Henry', 80000, 4);
INSERT INTO Employee VALUES (3, 'Sam', 60000, NULL);
INSERT INTO Employee VALUES (4, 'Max', 90000, NULL);
"""

    if any(term in combined_lower for term in ["delete duplicate emails", "delete all duplicate email"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Person
DROP TABLE IF EXISTS Person;
CREATE TABLE Person (
    id INTEGER PRIMARY KEY,
    email VARCHAR(50)
);

-- Sample Data: Person
INSERT INTO Person VALUES (1, 'john@mail.com');
INSERT INTO Person VALUES (2, 'bob@mail.com');
INSERT INTO Person VALUES (3, 'john@mail.com');
INSERT INTO Person VALUES (4, 'alice@mail.com');
INSERT INTO Person VALUES (5, 'bob@mail.com');
"""

    if any(term in combined_lower for term in ["duplicate emails", "duplicate email", "report all duplicate email"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Person
DROP TABLE IF EXISTS Person;
CREATE TABLE Person (
    id INTEGER PRIMARY KEY,
    email VARCHAR(50)
);

-- Sample Data: Person
INSERT INTO Person VALUES (1, 'a@example.com');
INSERT INTO Person VALUES (2, 'b@example.com');
INSERT INTO Person VALUES (3, 'a@example.com');
"""

    if any(term in combined_lower for term in ["combine two tables", "personid", "addressid"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Person
DROP TABLE IF EXISTS Address;
DROP TABLE IF EXISTS Person;
CREATE TABLE Person (
    personId INTEGER PRIMARY KEY,
    lastName VARCHAR(50),
    firstName VARCHAR(50)
);

-- Table: Address
CREATE TABLE Address (
    addressId INTEGER PRIMARY KEY,
    personId INTEGER,
    city VARCHAR(50),
    state VARCHAR(50)
);

-- Sample Data: Person
INSERT INTO Person VALUES (1, 'Wang', 'Allen');
INSERT INTO Person VALUES (2, 'Alice', 'Bob');

-- Sample Data: Address
INSERT INTO Address VALUES (1, 2, 'New York City', 'New York');
"""

    if any(term in combined_lower for term in ["biggest single number", "mynumbers", "single number", "single numbers"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: MyNumbers
DROP TABLE IF EXISTS MyNumbers;
CREATE TABLE MyNumbers (
    num INTEGER
);

-- Sample Data: MyNumbers
INSERT INTO MyNumbers VALUES (8);
INSERT INTO MyNumbers VALUES (8);
INSERT INTO MyNumbers VALUES (3);
INSERT INTO MyNumbers VALUES (3);
INSERT INTO MyNumbers VALUES (1);
INSERT INTO MyNumbers VALUES (4);
INSERT INTO MyNumbers VALUES (5);
INSERT INTO MyNumbers VALUES (6);
INSERT INTO MyNumbers VALUES (6);
"""

    if any(term in combined_lower for term in ["shortest distance in a line", "from point", "point p1", "shortest"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Point
DROP TABLE IF EXISTS Point;
CREATE TABLE Point (
    x INTEGER PRIMARY KEY
);

-- Sample Data: Point
INSERT INTO Point VALUES (-1);
INSERT INTO Point VALUES (0);
INSERT INTO Point VALUES (2);
"""

    if any(term in combined_lower for term in ["not boring movies", "boring", "movie", "rating"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Cinema
DROP TABLE IF EXISTS Cinema;
CREATE TABLE Cinema (
    id INTEGER PRIMARY KEY,
    movie VARCHAR(50),
    description VARCHAR(50),
    rating REAL
);

-- Sample Data: Cinema
INSERT INTO Cinema VALUES (1, 'War', 'great 3D', 8.9);
INSERT INTO Cinema VALUES (2, 'Science', 'fiction', 8.5);
INSERT INTO Cinema VALUES (3, 'Irish', 'boring', 6.2);
INSERT INTO Cinema VALUES (4, 'Ice Song', 'Fantacy', 8.6);
INSERT INTO Cinema VALUES (5, 'House Card', 'Interesting', 9.1);
"""

    if any(term in combined_lower for term in ["consecutive available seats", "seat_id", "free"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Cinema
DROP TABLE IF EXISTS Cinema;
CREATE TABLE Cinema (
    seat_id INTEGER PRIMARY KEY,
    free INTEGER
);

-- Sample Data: Cinema
INSERT INTO Cinema VALUES (1, 1);
INSERT INTO Cinema VALUES (2, 0);
INSERT INTO Cinema VALUES (3, 1);
INSERT INTO Cinema VALUES (4, 1);
INSERT INTO Cinema VALUES (5, 1);
"""

    if any(term in combined_lower for term in ["overall acceptance rate", "friendrequest", "requestaccepted", "accept_rate"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: FriendRequest
DROP TABLE IF EXISTS FriendRequest;
CREATE TABLE FriendRequest (
    sender_id INTEGER,
    send_to_id INTEGER,
    request_date DATE
);

-- Table: RequestAccepted
DROP TABLE IF EXISTS RequestAccepted;
CREATE TABLE RequestAccepted (
    requester_id INTEGER,
    accepter_id INTEGER,
    accept_date DATE
);

-- Sample Data: FriendRequest
INSERT INTO FriendRequest VALUES (1, 2, '2016-06-01');
INSERT INTO FriendRequest VALUES (1, 3, '2016-06-02');
INSERT INTO FriendRequest VALUES (2, 3, '2016-06-02');

-- Sample Data: RequestAccepted
INSERT INTO RequestAccepted VALUES (1, 2, '2016-06-03');
INSERT INTO RequestAccepted VALUES (2, 3, '2016-06-08');
"""

    if any(term in combined_lower for term in ["at least 5 students", "classes with at least 5 students", "courses group by class"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Courses
DROP TABLE IF EXISTS Courses;
CREATE TABLE Courses (
    student VARCHAR(50),
    class VARCHAR(50),
    PRIMARY KEY (student, class)
);

-- Sample Data: Courses
INSERT INTO Courses VALUES ('A', 'Math');
INSERT INTO Courses VALUES ('B', 'Math');
INSERT INTO Courses VALUES ('C', 'Math');
INSERT INTO Courses VALUES ('D', 'Math');
INSERT INTO Courses VALUES ('E', 'Math');
INSERT INTO Courses VALUES ('A', 'Science');
INSERT INTO Courses VALUES ('B', 'Science');
INSERT INTO Courses VALUES ('C', 'Science');
"""

    if any(term in combined_lower for term in ["big countries", "world", "3000000", "25000000"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: World
DROP TABLE IF EXISTS World;
CREATE TABLE World (
    name VARCHAR(50) PRIMARY KEY,
    continent VARCHAR(50),
    area INTEGER,
    population INTEGER,
    gdp BIGINT
);

-- Sample Data: World
INSERT INTO World VALUES ('Afghanistan', 'Asia', 652230, 25500100, 20343000000);
INSERT INTO World VALUES ('Albania', 'Europe', 28748, 2831741, 12960000000);
INSERT INTO World VALUES ('Algeria', 'Africa', 2381741, 37100000, 188681000000);
INSERT INTO World VALUES ('Andorra', 'Europe', 468, 78115, 3712000000);
"""

    if any(term in combined_lower for term in ["largest number of orders", "customer placing the largest", "order_number", "customer_number"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Orders
DROP TABLE IF EXISTS Orders;
CREATE TABLE Orders (
    order_number INTEGER PRIMARY KEY,
    customer_number INTEGER
);

-- Sample Data: Orders
INSERT INTO Orders VALUES (1, 1);
INSERT INTO Orders VALUES (2, 2);
INSERT INTO Orders VALUES (3, 3);
INSERT INTO Orders VALUES (4, 3);
INSERT INTO Orders VALUES (5, 2);
INSERT INTO Orders VALUES (6, 3);
INSERT INTO Orders VALUES (7, 1);
"""

    if any(term in combined_lower for term in ["customer referee", "find customer referee", "referee_id"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Customer
DROP TABLE IF EXISTS Customer;
CREATE TABLE Customer (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50),
    referee_id INTEGER
);

-- Sample Data: Customer
INSERT INTO Customer VALUES (1, 'Will', NULL);
INSERT INTO Customer VALUES (2, 'Jane', NULL);
INSERT INTO Customer VALUES (3, 'Alex', 2);
INSERT INTO Customer VALUES (4, 'Bill', NULL);
INSERT INTO Customer VALUES (5, 'Zack', 1);
INSERT INTO Customer VALUES (6, 'Mark', 2);
"""

    if any(term in combined_lower for term in ["employee bonus", "bonus < 1000", "empid"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Employee
DROP TABLE IF EXISTS Bonus;
DROP TABLE IF EXISTS Employee;
CREATE TABLE Employee (
    empId INTEGER PRIMARY KEY,
    name VARCHAR(50),
    supervisor INTEGER,
    salary INTEGER
);

-- Table: Bonus
CREATE TABLE Bonus (
    empId INTEGER,
    bonus INTEGER
);

-- Sample Data: Employee
INSERT INTO Employee VALUES (3, 'Brad', NULL, 4000);
INSERT INTO Employee VALUES (1, 'John', 3, 1000);
INSERT INTO Employee VALUES (2, 'Dan', 3, 2000);
INSERT INTO Employee VALUES (4, 'Thomas', 3, 4000);

-- Sample Data: Bonus
INSERT INTO Bonus VALUES (2, 500);
INSERT INTO Bonus VALUES (4, 2000);
"""

    if any(term in combined_lower for term in ["employees earning more than their managers", "more than their manager", "managerid"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Employee
DROP TABLE IF EXISTS Employee;
CREATE TABLE Employee (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50),
    salary INTEGER,
    managerId INTEGER
);

-- Sample Data: Employee
INSERT INTO Employee VALUES (1, 'Joe', 70000, 3);
INSERT INTO Employee VALUES (2, 'Henry', 80000, 4);
INSERT INTO Employee VALUES (3, 'Sam', 60000, NULL);
INSERT INTO Employee VALUES (4, 'Max', 90000, NULL);
"""

    if any(term in combined_lower for term in ["game play analysis", "activity", "first_login", "games_played"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Activity
DROP TABLE IF EXISTS Activity;
CREATE TABLE Activity (
    player_id INTEGER,
    device_id INTEGER,
    event_date DATE,
    games_played INTEGER,
    PRIMARY KEY (player_id, event_date)
);

-- Sample Data: Activity
INSERT INTO Activity VALUES (1, 2, '2016-03-01', 5);
INSERT INTO Activity VALUES (1, 3, '2016-05-02', 6);
INSERT INTO Activity VALUES (2, 1, '2017-06-25', 1);
INSERT INTO Activity VALUES (3, 4, '2016-03-02', 0);
INSERT INTO Activity VALUES (3, 5, '2018-07-03', 5);
"""

    if any(term in combined_lower for term in ["rising temperature", "weather", "recorddate"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Weather
DROP TABLE IF EXISTS Weather;
CREATE TABLE Weather (
    id INTEGER PRIMARY KEY,
    recordDate DATE,
    temperature INTEGER
);

-- Sample Data: Weather
INSERT INTO Weather VALUES (1, '2015-01-01', 10);
INSERT INTO Weather VALUES (2, '2015-01-02', 25);
INSERT INTO Weather VALUES (3, '2015-01-03', 20);
INSERT INTO Weather VALUES (4, '2015-01-04', 30);
"""

    if any(term in combined_lower for term in ["delete duplicate emails", "delete all duplicate email"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Person
DROP TABLE IF EXISTS Person;
CREATE TABLE Person (
    id INTEGER PRIMARY KEY,
    email VARCHAR(50)
);

-- Sample Data: Person
INSERT INTO Person VALUES (1, 'john@mail.com');
INSERT INTO Person VALUES (2, 'bob@mail.com');
INSERT INTO Person VALUES (3, 'john@mail.com');
INSERT INTO Person VALUES (4, 'alice@mail.com');
INSERT INTO Person VALUES (5, 'bob@mail.com');
"""

    if any(term in combined_lower for term in ["duplicate emails", "duplicate email", "report all duplicate email"]):
        return """-- Step 1: Database Schema & Data Setup
-- Run this script to create and populate the practice database tables.

-- Table: Person
DROP TABLE IF EXISTS Person;
CREATE TABLE Person (
    id INTEGER PRIMARY KEY,
    email VARCHAR(50)
);

-- Sample Data: Person
INSERT INTO Person VALUES (1, 'a@example.com');
INSERT INTO Person VALUES (2, 'b@example.com');
INSERT INTO Person VALUES (3, 'a@example.com');
"""

    tables = get_relevant_tables_for_challenge(title, objective, starter_code, story)
    parts = ["-- Step 1: Database Schema & Data Setup", "-- Run this script to create and populate the practice database tables.\n"]
    
    for tbl in tables:
            if tbl in ["customers", "orders"] and any(term in (title + " " + objective).lower() for term in ["customers with orders", "customers without orders", "never placed an order", "orders without customers", "not have a matching customer", "orphan"]):
                if tbl == "customers":
                    if any(term in (title + " " + objective).lower() for term in ["orders without customers", "not have a matching customer", "orphan"]):
                        cust_rows = """INSERT INTO customers VALUES (1, 'John');
INSERT INTO customers VALUES (2, 'Alice');
INSERT INTO customers VALUES (3, 'Bob');"""
                    elif any(term in (title + " " + objective).lower() for term in ["without orders", "never placed an order"]):
                        cust_rows = """INSERT INTO customers VALUES (1, 'John');
INSERT INTO customers VALUES (2, 'Alice');
INSERT INTO customers VALUES (3, 'Bob');
INSERT INTO customers VALUES (4, 'David');"""
                    else:
                        cust_rows = """INSERT INTO customers VALUES (1, 'John');
INSERT INTO customers VALUES (2, 'Alice');
INSERT INTO customers VALUES (3, 'Bob');"""
                    parts.append(f"""-- Table: customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT
);

-- Sample Data: customers
{cust_rows}
""")
                elif tbl == "orders":
                    if any(term in (title + " " + objective).lower() for term in ["orders without customers", "not have a matching customer", "orphan"]):
                        orders_rows = """INSERT INTO orders VALUES (101, 1, '2026-01-10', 500);
INSERT INTO orders VALUES (102, 2, '2026-01-12', 900);
INSERT INTO orders VALUES (103, 5, '2026-01-15', 1200);
INSERT INTO orders VALUES (104, 6, '2026-01-18', 750);"""
                    else:
                        orders_rows = """INSERT INTO orders VALUES (101, 1, '2026-01-10', 500);
INSERT INTO orders VALUES (102, 2, '2026-01-15', 800);
INSERT INTO orders VALUES (103, 1, '2026-01-18', 1200);"""
                    parts.append(f"""-- Table: orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date DATE,
    total_amount REAL
);

-- Sample Data: orders
{orders_rows}
""")
                continue

            if tbl in ["students", "courses"] and any(term in (title + " " + objective).lower() for term in ["course name", "course names", "enrolled in"]):
                if tbl == "students":
                    parts.append("""-- Table: students
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT,
    course_id INTEGER
);

-- Sample Data: students
INSERT INTO students VALUES (1, 'Rahul', 101);
INSERT INTO students VALUES (2, 'Priya', 102);
INSERT INTO students VALUES (3, 'Ankit', 103);
""")
                elif tbl == "courses":
                    parts.append("""-- Table: courses
DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT
);

-- Sample Data: courses
INSERT INTO courses VALUES (101, 'Python');
INSERT INTO courses VALUES (102, 'SQL');
INSERT INTO courses VALUES (103, 'Java');
""")
                continue

            if "multiple table joins" in (title + " " + objective).lower():
                if tbl == "employees":
                    parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    department_id INTEGER
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 101);
INSERT INTO employees VALUES (2, 'Alice', 102);
INSERT INTO employees VALUES (3, 'Bob', 101);
""")
                elif tbl == "departments":
                    parts.append("""-- Table: departments
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT,
    location_id INTEGER
);

-- Sample Data: departments
INSERT INTO departments VALUES (101, 'IT', 1);
INSERT INTO departments VALUES (102, 'HR', 2);
""")
                elif tbl == "locations":
                    parts.append("""-- Table: locations
DROP TABLE IF EXISTS locations;
CREATE TABLE locations (
    location_id INTEGER PRIMARY KEY,
    city TEXT
);

-- Sample Data: locations
INSERT INTO locations VALUES (1, 'Bangalore');
INSERT INTO locations VALUES (2, 'Mumbai');
""")
                continue

            if tbl == "customers" and any(term in (title + " " + objective).lower() for term in ["customer classification", "classify customers based on their total purchase", "customer_type", "total_purchase"]):
                parts.append("""-- Table: customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT,
    total_purchase REAL
);

-- Sample Data: customers
INSERT INTO customers VALUES (1, 'John', 150000);
INSERT INTO customers VALUES (2, 'Alice', 80000);
INSERT INTO customers VALUES (3, 'Bob', 35000);
INSERT INTO customers VALUES (4, 'David', 12000);
""")
                continue

            if any(term in (title + " " + objective).lower() for term in ["join three tables", "customer's name and the product details", "customer_name and the product"]):
                if tbl == "customers":
                    parts.append("""-- Table: customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT
);

-- Sample Data: customers
INSERT INTO customers VALUES (1, 'John');
INSERT INTO customers VALUES (2, 'Alice');
""")
                elif tbl == "orders":
                    parts.append("""-- Table: orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    product_id INTEGER
);

-- Sample Data: orders
INSERT INTO orders VALUES (101, 1, 501);
INSERT INTO orders VALUES (102, 2, 502);
INSERT INTO orders VALUES (103, 1, 503);
""")
                elif tbl == "products":
                    parts.append("""-- Table: products
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    price REAL
);

-- Sample Data: products
INSERT INTO products VALUES (501, 'Laptop', 75000);
INSERT INTO products VALUES (502, 'Keyboard', 1500);
INSERT INTO products VALUES (503, 'Mouse', 800);
""")
                continue

            if tbl == "employees" and any(term in (title + " " + objective).lower() for term in ["multiple case conditions", "generate two new columns"]):
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    age INTEGER,
    salary REAL
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 25, 120000);
INSERT INTO employees VALUES (2, 'Alice', 35, 80000);
INSERT INTO employees VALUES (3, 'Bob', 55, 45000);
""")
                continue

            if tbl == "employees" and any(term in (title + " " + objective).lower() for term in ["gender formatting", "display the full gender name", "gender_name"]):
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    gender TEXT
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'M');
INSERT INTO employees VALUES (2, 'Alice', 'F');
INSERT INTO employees VALUES (3, 'Chris', 'O');
INSERT INTO employees VALUES (4, 'David', 'X');
""")
                continue

            if tbl == "employees" and any(term in (title + " " + objective).lower() for term in ["bonus calculation", "calculate the employee's bonus", "calculate the employee bonus"]):
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    salary REAL
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 120000);
INSERT INTO employees VALUES (2, 'Alice', 85000);
INSERT INTO employees VALUES (3, 'Bob', 50000);
INSERT INTO employees VALUES (4, 'David', 30000);
""")
                continue

            if tbl == "employees" and any(term in title.lower() for term in ["salary bands", "salary band"]):
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    salary REAL
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 120000);
INSERT INTO employees VALUES (2, 'Alice', 85000);
INSERT INTO employees VALUES (3, 'Bob', 55000);
INSERT INTO employees VALUES (4, 'David', 32000);
""")
                continue

            if tbl == "employees" and "lowest salary department" in (title + " " + objective).lower():
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    department_name TEXT,
    salary REAL
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'IT', 70000);
INSERT INTO employees VALUES (2, 'Alice', 'IT', 90000);
INSERT INTO employees VALUES (3, 'Bob', 'HR', 50000);
INSERT INTO employees VALUES (4, 'Emma', 'HR', 60000);
INSERT INTO employees VALUES (5, 'David', 'Finance', 100000);
INSERT INTO employees VALUES (6, 'Sophia', 'Finance', 110000);
""")
                continue

            if tbl == "employees" and "groups using multiple columns" in (title + " " + objective).lower():
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    department_name TEXT,
    city TEXT,
    salary REAL
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'IT', 'Bangalore', 70000);
INSERT INTO employees VALUES (2, 'Alice', 'IT', 'Bangalore', 90000);
INSERT INTO employees VALUES (3, 'Bob', 'IT', 'Delhi', 60000);
INSERT INTO employees VALUES (4, 'Emma', 'HR', 'Delhi', 50000);
INSERT INTO employees VALUES (5, 'David', 'HR', 'Mumbai', 100000);
INSERT INTO employees VALUES (6, 'Sophia', 'HR', 'Mumbai', 110000);
""")
                continue

            if tbl == "persons" or (tbl == "employees" and "classify each person into an age group" in (title + " " + objective).lower()):
                parts.append("""-- Table: persons
DROP TABLE IF EXISTS persons;
CREATE TABLE persons (
    person_id INTEGER PRIMARY KEY,
    person_name TEXT,
    age INTEGER
);

-- Sample Data: persons
INSERT INTO persons VALUES (1, 'John', 8);
INSERT INTO persons VALUES (2, 'Alice', 16);
INSERT INTO persons VALUES (3, 'Bob', 30);
INSERT INTO persons VALUES (4, 'David', 67);
""")
                continue

            if tbl == "sales" and any(term in (title + " " + objective).lower() for term in ["sales categories", "sales category", "classify each sale into a category"]):
                parts.append("""-- Table: sales
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    customer_name TEXT,
    sale_amount REAL
);

-- Sample Data: sales
INSERT INTO sales VALUES (101, 'John', 120000);
INSERT INTO sales VALUES (102, 'Alice', 75000);
INSERT INTO sales VALUES (103, 'Bob', 35000);
INSERT INTO sales VALUES (104, 'David', 15000);
""")
                continue

            if tbl == "students" and any(term in (title + " " + objective).lower() for term in ["conditional aggregation", "total_students", "passed_students", "failed_students"]):
                parts.append("""-- Table: students
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT,
    marks INTEGER
);

-- Sample Data: students
INSERT INTO students VALUES (1, 'John', 85);
INSERT INTO students VALUES (2, 'Alice', 38);
INSERT INTO students VALUES (3, 'Bob', 40);
INSERT INTO students VALUES (4, 'David', 25);
INSERT INTO students VALUES (5, 'Emma', 91);
""")
                continue

            if tbl == "students" and any(term in (title + " " + objective).lower() for term in ["pass/fail status", "pass/fail", "passed or failed", "marks >= 40", "marks < 40"]):
                parts.append("""-- Table: students
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT,
    marks INTEGER
);

-- Sample Data: students
INSERT INTO students VALUES (1, 'John', 82);
INSERT INTO students VALUES (2, 'Alice', 39);
INSERT INTO students VALUES (3, 'Bob', 40);
INSERT INTO students VALUES (4, 'David', 25);
""")
                continue

            if tbl == "students" and any(term in (title + " " + objective).lower() for term in ["grade students", "assign grades", "marks obtained (0–100)", "marks obtained (0-100)"]):
                parts.append("""-- Table: students
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT,
    marks INTEGER
);

-- Sample Data: students
INSERT INTO students VALUES (1, 'John', 95);
INSERT INTO students VALUES (2, 'Alice', 82);
INSERT INTO students VALUES (3, 'Bob', 74);
INSERT INTO students VALUES (4, 'David', 63);
INSERT INTO students VALUES (5, 'Emma', 48);
""")
                continue

            if tbl == "students" and "average marks above 80" in (title + " " + objective).lower():
                parts.append("""-- Table: students
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name TEXT,
    class_name TEXT,
    marks REAL
);

-- Sample Data: students
INSERT INTO students VALUES (1, 'Rahul', '10A', 90);
INSERT INTO students VALUES (2, 'Priya', '10A', 80);
INSERT INTO students VALUES (3, 'Amit', '10B', 70);
INSERT INTO students VALUES (4, 'Neha', '10B', 75);
INSERT INTO students VALUES (5, 'Rohan', '10C', 95);
INSERT INTO students VALUES (6, 'Sneha', '10C', 90);
""")
                continue
                
            if tbl == "employees" and any(term in (title + " " + objective).lower() for term in [
                "group employees by department",
                "count employees per department",
                "departments having more than 5 employees",
                "more than 5 employees",
                "average salary greater than"
            ]):
                dept_emp_extra = ""
                if "more than 5 employees" in (title + " " + objective).lower():
                    dept_emp_extra = """
INSERT INTO employees VALUES (9, 'Chris', 'Evans', 'chris.e@email.com', '555-0109', '2021-02-15', 'HR Recruiter', 65000, 6, 104, 'HR', 31, 'Boston', 'Male', 'MA');
INSERT INTO employees VALUES (10, 'Mike', 'Ross', 'mike.r@email.com', '555-0110', '2022-05-10', 'HR Associate', 58000, 6, 104, 'HR', 27, 'Boston', 'Male', 'MA');
INSERT INTO employees VALUES (11, 'Kevin', 'Hart', 'kevin.h@email.com', '555-0111', '2020-11-20', 'HR Generalist', 62000, 6, 104, 'HR', 34, 'Boston', 'Male', 'MA');
INSERT INTO employees VALUES (12, 'Sophia', 'Loren', 'sophia.l@email.com', '555-0112', '2019-08-14', 'HR Specialist', 71000, 6, 104, 'HR', 36, 'Boston', 'Female', 'MA');
INSERT INTO employees VALUES (13, 'Tom', 'Hanks', 'tom.h@email.com', '555-0113', '2018-04-18', 'HR Director', 95000, NULL, 104, 'HR', 45, 'Boston', 'Male', 'MA');"""
                parts.append(f"""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
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
    department_name TEXT,
    age INTEGER,
    city TEXT,
    gender TEXT,
    state TEXT
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'Doe', 'john.doe@email.com', '555-0101', '2020-01-15', 'Software Engineer', 85000, NULL, 101, 'Engineering', 28, 'New York', 'Male', 'NY');
INSERT INTO employees VALUES (2, 'Jane', 'Smith', 'jane.smith@email.com', '555-0102', '2019-03-22', 'Engineering Manager', 120000, NULL, 101, 'Engineering', 35, 'New York', 'Female', 'NY');
INSERT INTO employees VALUES (3, 'Bob', 'Johnson', 'bob.j@email.com', '555-0103', '2021-06-01', 'Sales Exec', 60000, 2, 102, 'Sales', 32, 'Chicago', 'Male', 'IL');
INSERT INTO employees VALUES (4, 'Alice', 'Williams', 'alice.w@email.com', '555-0104', '2018-11-12', 'Sales Director', 110000, NULL, 102, 'Sales', 40, 'Chicago', 'Female', 'IL');
INSERT INTO employees VALUES (5, 'Charlie', 'Brown', 'charlie.b@email.com', '555-0105', '2022-02-10', 'Marketing Specialist', 55000, 4, 103, 'Marketing', 25, 'San Francisco', 'Male', 'CA');
INSERT INTO employees VALUES (6, 'Diana', 'Prince', 'diana.p@email.com', '555-0106', '2017-08-05', 'HR Lead', 75000, NULL, 104, 'HR', 38, 'Boston', 'Female', 'MA');
INSERT INTO employees VALUES (7, 'Eva', 'Green', 'eva.g@email.com', '555-0107', '2023-01-01', 'Software Engineer', 90000, 2, 101, 'Engineering', 26, 'New York', 'Female', 'NY');
INSERT INTO employees VALUES (8, 'Frank', 'Miller', 'frank.m@email.com', '555-0108', '2020-09-15', 'Financial Analyst', 70000, NULL, 105, 'Finance', 30, 'New York', 'Male', 'NY');{dept_emp_extra}
""")
                continue

            if tbl in ["employees", "departments"] and not title.lower().startswith("retrieve") and "self join" not in (title + " " + objective).lower() and any(term in (title + " " + objective).lower() for term in ["inner join", "left join", "right join", "full join", "cross join", "department name", "department names"]):
                if tbl == "employees":
                    parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    employee_name TEXT,
    department_id INTEGER
);

-- Sample Data: employees""")
                    if "cross join" in (title + " " + objective).lower():
                        parts.append("""INSERT INTO employees VALUES (1, 'John', 'John', 101);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 102);
INSERT INTO employees VALUES (3, 'Bob', 'Bob', 103);""")
                    elif "right join" in (title + " " + objective).lower():
                        parts.append("""INSERT INTO employees VALUES (1, 'John', 'John', 101);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 102);
INSERT INTO employees VALUES (3, 'Bob', 'Bob', 103);""")
                    elif "inner join" in (title + " " + objective).lower():
                        parts.append("""INSERT INTO employees VALUES (1, 'John', 'John', 101);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 102);
INSERT INTO employees VALUES (3, 'Bob', 'Bob', 103);
INSERT INTO employees VALUES (4, 'David', 'David', NULL);""")
                    else:
                        parts.append("""INSERT INTO employees VALUES (1, 'John', 'John', 101);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 102);
INSERT INTO employees VALUES (3, 'Bob', 'Bob', 103);
INSERT INTO employees VALUES (4, 'David', 'David', NULL);
INSERT INTO employees VALUES (5, 'Emma', 'Emma', 105);""")
                elif tbl == "departments":
                    parts.append("""-- Table: departments
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT
);

-- Sample Data: departments""")
                    if "cross join" in (title + " " + objective).lower():
                        parts.append("""INSERT INTO departments VALUES (101, 'HR');
INSERT INTO departments VALUES (102, 'IT');""")
                    else:
                        parts.append("""INSERT INTO departments VALUES (101, 'HR');
INSERT INTO departments VALUES (102, 'IT');
INSERT INTO departments VALUES (103, 'Finance');
INSERT INTO departments VALUES (104, 'Marketing');""")
                continue

            if tbl == "employees" and "manager and employee names" in title.lower():
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    employee_name TEXT,
    manager_id INTEGER
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'John', NULL);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 1);
INSERT INTO employees VALUES (3, 'Bob', 'Bob', 1);
INSERT INTO employees VALUES (4, 'David', 'David', 2);
INSERT INTO employees VALUES (5, 'Emma', 'Emma', 2);
""")
                continue

            if tbl == "employees" and any(term in title.lower() for term in ["without managers", "no manager"]):
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    employee_name TEXT,
    manager_id INTEGER
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'John', NULL);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 1);
INSERT INTO employees VALUES (3, 'Bob', 'Bob', 1);
INSERT INTO employees VALUES (4, 'David', 'David', 2);
INSERT INTO employees VALUES (5, 'Emma', 'Emma', NULL);
""")
                continue

            if tbl == "employees" and title.strip().lower() == "self join":
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    employee_name TEXT,
    manager_id INTEGER
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'John', 3);
INSERT INTO employees VALUES (2, 'Alice', 'Alice', 3);
INSERT INTO employees VALUES (3, 'Robert', 'Robert', 5);
INSERT INTO employees VALUES (4, 'David', 'David', 3);
INSERT INTO employees VALUES (5, 'Sophia', 'Sophia', NULL);
""")
                continue

            if tbl == "products" and "having with count" in (title + " " + objective).lower():
                sports_rows = "\n".join([f"INSERT INTO products VALUES ({i}, 'Item {i}', 'Sports');" for i in range(1, 21)])
                elec_rows = "\n".join([f"INSERT INTO products VALUES ({i}, 'Item {i}', 'Electronics');" for i in range(21, 36)])
                fash_rows = "\n".join([f"INSERT INTO products VALUES ({i}, 'Item {i}', 'Fashion');" for i in range(36, 48)])
                groc_rows = "\n".join([f"INSERT INTO products VALUES ({i}, 'Item {i}', 'Grocery');" for i in range(48, 56)])
                parts.append(f"""-- Table: products
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    category_name TEXT
);

-- Sample Data: products
{sports_rows}
{elec_rows}
{fash_rows}
{groc_rows}
""")
                continue

            if tbl == "purchases" and "having with sum" in (title + " " + objective).lower():
                parts.append("""-- Table: purchases
DROP TABLE IF EXISTS purchases;
CREATE TABLE purchases (
    purchase_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    customer_name TEXT,
    purchase_amount REAL
);

-- Sample Data: purchases
INSERT INTO purchases VALUES (1, 101, 'Rahul', 15000);
INSERT INTO purchases VALUES (2, 101, 'Rahul', 20000);
INSERT INTO purchases VALUES (3, 101, 'Rahul', 25000);
INSERT INTO purchases VALUES (4, 102, 'Priya', 10000);
INSERT INTO purchases VALUES (5, 102, 'Priya', 12000);
INSERT INTO purchases VALUES (6, 103, 'Amit', 30000);
INSERT INTO purchases VALUES (7, 103, 'Amit', 25000);
""")
                continue

            if tbl == "employees" and "highest salary department" in (title + " " + objective).lower():
                parts.append("""-- Table: employees
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    employee_name TEXT,
    department_name TEXT,
    salary REAL
);

-- Sample Data: employees
INSERT INTO employees VALUES (1, 'John', 'IT', 70000);
INSERT INTO employees VALUES (2, 'Alice', 'IT', 90000);
INSERT INTO employees VALUES (3, 'Bob', 'HR', 50000);
INSERT INTO employees VALUES (4, 'Emma', 'HR', 60000);
INSERT INTO employees VALUES (5, 'David', 'Finance', 100000);
INSERT INTO employees VALUES (6, 'Sophia', 'Finance', 110000);
""")
                continue

            if tbl == "orders" and "yearly sales summary" in (title + " " + objective).lower():
                parts.append("""-- Table: orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    order_date DATE,
    total_amount REAL
);

-- Sample Data: orders
INSERT INTO orders VALUES (1, '2023-01-10', 800);
INSERT INTO orders VALUES (2, '2023-05-15', 1200);
INSERT INTO orders VALUES (3, '2024-02-20', 1500);
INSERT INTO orders VALUES (4, '2024-07-08', 900);
INSERT INTO orders VALUES (5, '2025-03-12', 2000);
""")
                continue

            if tbl == "orders" and "monthly sales summary" in (title + " " + objective).lower():
                parts.append("""-- Table: orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    order_date DATE,
    total_amount REAL
);

-- Sample Data: orders
INSERT INTO orders VALUES (1, '2025-01-05', 500);
INSERT INTO orders VALUES (2, '2025-01-15', 700);
INSERT INTO orders VALUES (3, '2025-02-10', 900);
INSERT INTO orders VALUES (4, '2025-02-18', 400);
INSERT INTO orders VALUES (5, '2025-03-08', 600);
""")
                continue

            if tbl == "orders" and "more than 5 orders" in (title + " " + objective).lower():
                parts.append("""-- Table: orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    customer_name TEXT,
    order_date DATE,
    total_amount REAL,
    status TEXT
);

-- Sample Data: orders
INSERT INTO orders VALUES (1, 101, 'Rahul', '2024-01-10', 1500.00, 'Completed');
INSERT INTO orders VALUES (2, 101, 'Rahul', '2024-01-15', 2500.00, 'Completed');
INSERT INTO orders VALUES (3, 102, 'Priya', '2024-01-20', 800.00, 'Completed');
INSERT INTO orders VALUES (4, 101, 'Rahul', '2024-02-01', 1200.00, 'Completed');
INSERT INTO orders VALUES (5, 103, 'Amit', '2024-02-14', 450.00, 'Completed');
INSERT INTO orders VALUES (6, 101, 'Rahul', '2024-02-20', 3100.00, 'Completed');
INSERT INTO orders VALUES (7, 102, 'Priya', '2024-03-01', 950.00, 'Completed');
INSERT INTO orders VALUES (8, 101, 'Rahul', '2024-03-05', 1800.00, 'Completed');
INSERT INTO orders VALUES (9, 101, 'Rahul', '2024-03-12', 2200.00, 'Completed');
INSERT INTO orders VALUES (10, 102, 'Priya', '2024-03-15', 1100.00, 'Completed');
""")
                continue

            if tbl == "customers" and "average age by city" in (title + " " + objective).lower():
                parts.append("""-- Table: customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT,
    city TEXT,
    age INTEGER
);

-- Sample Data: customers
INSERT INTO customers VALUES (1, 'Rahul', 'Bangalore', 25);
INSERT INTO customers VALUES (2, 'Priya', 'Bangalore', 35);
INSERT INTO customers VALUES (3, 'Amit', 'Delhi', 20);
INSERT INTO customers VALUES (4, 'Neha', 'Delhi', 30);
INSERT INTO customers VALUES (5, 'Rohan', 'Mumbai', 40);
""")
                continue

            if tbl == "customers" and "states with highest customers" in (title + " " + objective).lower():
                parts.append("""-- Table: customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT,
    state TEXT
);

-- Sample Data: customers
INSERT INTO customers VALUES (1, 'Rahul', 'Karnataka');
INSERT INTO customers VALUES (2, 'Priya', 'Delhi');
INSERT INTO customers VALUES (3, 'Ankit', 'Karnataka');
INSERT INTO customers VALUES (4, 'Neha', 'Maharashtra');
INSERT INTO customers VALUES (5, 'Rohan', 'Karnataka');
INSERT INTO customers VALUES (6, 'Sneha', 'Delhi');
INSERT INTO customers VALUES (7, 'Amit', 'Karnataka');
""")
                continue

            if tbl == "sales" and "more than 100 times" in (title + " " + objective).lower():
                parts.append("""-- Table: sales
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    order_id INTEGER PRIMARY KEY,
    product_id INTEGER,
    product_name TEXT,
    quantity INTEGER
);

-- Sample Data: sales
INSERT INTO sales VALUES (1, 101, 'Laptop', 20);
INSERT INTO sales VALUES (2, 101, 'Laptop', 30);
INSERT INTO sales VALUES (3, 102, 'Mouse', 15);
INSERT INTO sales VALUES (4, 101, 'Laptop', 60);
INSERT INTO sales VALUES (5, 103, 'Keyboard', 25);
""")
                continue

            if tbl == "sales" and "branch_name" in (title + " " + objective + " " + starter_code).lower():
                parts.append("""-- Table: sales
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    branch_name TEXT,
    cost_price REAL,
    selling_price REAL
);

-- Sample Data: sales
INSERT INTO sales VALUES (1, 'Bangalore', 300, 500);
INSERT INTO sales VALUES (2, 'Bangalore', 700, 900);
INSERT INTO sales VALUES (3, 'Delhi', 400, 600);
INSERT INTO sales VALUES (4, 'Delhi', 500, 650);
INSERT INTO sales VALUES (5, 'Mumbai', 800, 900);
""")
                continue

            if tbl == "sales" and "category_name" in (title + " " + objective + " " + starter_code).lower():
                parts.append("""-- Table: sales
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    category_name TEXT,
    sales_amount REAL
);

-- Sample Data: sales
INSERT INTO sales VALUES (1, 'Electronics', 50000);
INSERT INTO sales VALUES (2, 'Electronics', 30000);
INSERT INTO sales VALUES (3, 'Clothing', 2000);
INSERT INTO sales VALUES (4, 'Electronics', 5000);
INSERT INTO sales VALUES (5, 'Clothing', 3000);
INSERT INTO sales VALUES (6, 'Footwear', 4000);
""")
                continue

            ddl = TABLE_DDL.get(tbl)
            seed = TABLE_SEED.get(tbl)
            if ddl:
                parts.append(f"-- Table: {tbl}\nDROP TABLE IF EXISTS {tbl};")
                parts.append(ddl)
            if seed:
                parts.append(f"\n-- Sample Data: {tbl}\n{seed}\n")
                if tbl == "customers" and "more than 10 customers" in (title + " " + objective).lower():
                    extra_cust_lines = []
                    cid = 6
                    for i in range(1, 16):
                        extra_cust_lines.append(f"INSERT INTO customers VALUES ({cid}, 'BangaloreCust{i}', 'Kumar', 'b_cust{i}@example.com', 'Bangalore', 'KA', 'India', 28, 'Regular');")
                        cid += 1
                    for i in range(1, 13):
                        extra_cust_lines.append(f"INSERT INTO customers VALUES ({cid}, 'DelhiCust{i}', 'Sharma', 'd_cust{i}@example.com', 'Delhi', 'DL', 'India', 30, 'Regular');")
                        cid += 1
                    for i in range(1, 9):
                        extra_cust_lines.append(f"INSERT INTO customers VALUES ({cid}, 'MumbaiCust{i}', 'Patel', 'm_cust{i}@example.com', 'Mumbai', 'MH', 'India', 32, 'Regular');")
                        cid += 1
                    for i in range(1, 6):
                        extra_cust_lines.append(f"INSERT INTO customers VALUES ({cid}, 'ChennaiCust{i}', 'Rao', 'c_cust{i}@example.com', 'Chennai', 'TN', 'India', 27, 'Regular');")
                        cid += 1
                    parts.append(f"-- Additional City Customers for Grouping Practice:\n" + "\n".join(extra_cust_lines) + "\n")
            
    return "\n".join(parts)

def inspect_sqlite_connection(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    tables = [row[0] for row in cursor.fetchall()]
    
    result = []
    for tbl in tables:
        safe_tbl = tbl.replace('"', '""')
        cursor.execute(f'PRAGMA table_info("{safe_tbl}");')
        cols_raw = cursor.fetchall()
        columns = [
            {
                "name": c[1],
                "type": c[2] or "TEXT",
                "pk": bool(c[5]),
                "nullable": not bool(c[3])
            }
            for c in cols_raw
        ]
        
        try:
            cursor.execute(f'SELECT COUNT(*) FROM "{safe_tbl}";')
            row_count = cursor.fetchone()[0]
        except Exception:
            row_count = 0
            
        try:
            cursor.execute(f'SELECT * FROM "{safe_tbl}" LIMIT 10;')
            raw_rows = cursor.fetchall()
            col_names = [c["name"] for c in columns]
            sample_rows = [dict(zip(col_names, r)) for r in raw_rows]
        except Exception:
            sample_rows = []
            
        result.append({
            "name": tbl,
            "columns": columns,
            "row_count": row_count,
            "sample_rows": sample_rows
        })
        
    return result


def get_baseline_tables_for_challenge(title: str = "", objective: str = "", starter_code: str = "", story: str = "") -> List[Dict[str, Any]]:
    """Generates schema metadata for default sandbox tables relevant to this specific challenge."""
    conn = sqlite3.connect(":memory:")
    try:
        from app.sandbox.sql_runner import SAMPLE_SCHEMAS, SAMPLE_DATA
        conn.executescript(SAMPLE_SCHEMAS)
        conn.executescript(SAMPLE_DATA)
        all_tables = inspect_sqlite_connection(conn)
        relevant_names = set(get_relevant_tables_for_challenge(title, objective, starter_code, story))
        
        filtered_tables = [t for t in all_tables if t["name"].lower() in relevant_names]
        if not filtered_tables:
            filtered_tables = [t for t in all_tables if t["name"].lower() == "employees"]
        return filtered_tables
    except Exception:
        return []
    finally:
        conn.close()

def validate_schema_against_expected(
    actual_tables: List[str],
    expected_tables: List[str]
) -> Tuple[bool, Optional[str]]:
    actual_set = set(t.lower() for t in actual_tables)
    for exp in expected_tables:
        exp_lower = exp.lower()
        if exp_lower not in actual_set:
            candidates = [a for a in actual_tables if a.lower() == exp_lower[:-1] or a.lower() == exp_lower + "s" or exp_lower in a.lower()]
            if candidates:
                return False, f"Expected table '{exp}', but found '{candidates[0]}'. Did you mean '{exp}'?"
            return False, f"Missing required table '{exp}'. Please check your CREATE TABLE statement."
    return True, None
