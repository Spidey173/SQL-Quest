import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
import uuid

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200

@pytest.mark.asyncio
async def test_get_chapters():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/challenges/chapters")
        assert res.status_code == 200
        chapters = res.json()
        assert len(chapters) >= 1

@pytest.mark.asyncio
async def test_get_challenge_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/challenges/1")
        assert res.status_code == 200
        data = res.json()
        assert data["level_number"] == 1

@pytest.mark.asyncio
async def test_case_insensitive_login():
    u_tag = str(uuid.uuid4())[:8]
    uname = f"fresh_user_{u_tag}"
    email = f"fresh_{u_tag}@sqlquest.io"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg = await ac.post("/api/auth/register", json={
            "username": uname,
            "email": email,
            "password": "password123"
        })
        assert reg.status_code == 200

        res1 = await ac.post("/api/auth/login", json={"username": uname, "password": "password123"})
        assert res1.status_code == 200

@pytest.mark.asyncio
async def test_user_registration_flow():
    u_tag = str(uuid.uuid4())[:8]
    uname = f"reg_user_{u_tag}"
    email = f"reg_{u_tag}@sqlquest.io"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg = await ac.post("/api/auth/register", json={
            "username": uname,
            "email": email,
            "password": "password123"
        })
        assert reg.status_code == 200


@pytest.mark.asyncio
async def test_code_id_routing_and_execution():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Test Basics-001 (Fundamentals 1)
        r_basis = await ac.get("/api/challenges/Basics-001")
        assert r_basis.status_code == 200
        d_basis = r_basis.json()
        assert d_basis["code_id"] == "Basics-001"
        assert d_basis["track"] == "fundamentals"
        assert d_basis["level_number"] == 1

        # 2. Test Basics-002 (Fundamentals 2)
        r_basis_2 = await ac.get("/api/challenges/Basics-002")
        assert r_basis_2.status_code == 200
        d_basis_2 = r_basis_2.json()
        assert d_basis_2["code_id"] == "Basics-002"
        assert d_basis_2["level_number"] == 2

        # 3. Test execution with string challenge_id
        r_exec = await ac.post("/api/execution/run", json={
            "challenge_id": "Basics-001",
            "code": "SELECT * FROM employees;"
        })
        assert r_exec.status_code == 200
        assert r_exec.json()["success"] is True

        r_exec_sql = await ac.post("/api/execution/run", json={
            "challenge_id": "Basics-002",
            "code": "SELECT employee_id, first_name, last_name, job_title, salary FROM employees;"
        })
        assert r_exec_sql.status_code == 200
        assert r_exec_sql.json()["success"] is True


@pytest.mark.asyncio
async def test_query_plan_generation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/execution/run", json={
            "challenge_id": "Basics-001",
            "code": "SELECT employee_id, first_name FROM employees WHERE salary > 50000 ORDER BY salary DESC;"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "query_plan" in data
        assert isinstance(data["query_plan"], list)
        assert len(data["query_plan"]) >= 1
        # Check plan structure
        first_node = data["query_plan"][0]
        assert "op_type" in first_node
        assert "efficiency" in first_node
        assert "detail" in first_node


@pytest.mark.asyncio
async def test_migrate_guest_progress():
    u_tag = str(uuid.uuid4())[:8]
    uname = f"migrate_user_{u_tag}"
    email = f"migrate_{u_tag}@sqlquest.io"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg = await ac.post("/api/auth/register", json={
            "username": uname,
            "email": email,
            "password": "password123"
        })
        assert reg.status_code == 200
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Migrate guest data
        mig_res = await ac.post("/api/auth/migrate-guest", json={
            "solved_ids": ["Basics-001", "Basics-002"],
            "submissions": [
                {
                    "problemId": "Basics-001",
                    "passed": True,
                    "runtimeMs": 11.5,
                    "code": "SELECT * FROM employees;"
                }
            ]
        }, headers=headers)
        assert mig_res.status_code == 200
        mig_data = mig_res.json()
        assert mig_data["success"] is True
        assert mig_data["migrated_solved_count"] >= 1

