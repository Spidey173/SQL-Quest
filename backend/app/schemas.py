from typing import List, Optional, Any, Dict, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# --- Auth Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: Optional[str] = None
    identifier: Optional[str] = None
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    streak: int = 0
    avatar: str
    theme: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Challenge Schemas ---
class TestCaseSchema(BaseModel):
    input: str = ""
    expected: str
    hidden: bool = False
    description: Optional[str] = None


class ChallengeSummary(BaseModel):
    id: int
    code_id: str  # "Basics-001" to "Basics-035", "SQL-001" to "SQL-215"
    track: str = "core"  # "fundamentals", "core", "advanced"
    chapter_id: int
    chapter_title: str
    level_number: int
    title: str
    difficulty: str
    passed: bool = False
    stars: int = 0
    locked: bool = False

    model_config = ConfigDict(from_attributes=True)


class ChapterGroup(BaseModel):
    chapter_id: int
    chapter_title: str
    levels: List[ChallengeSummary]
    completion_percentage: float


class ChallengeDetail(BaseModel):
    id: int
    code_id: str  # "Basics-001" to "Basics-035", "SQL-001" to "SQL-215"
    track: str = "core"  # "fundamentals", "core", "advanced"
    chapter_id: int
    chapter_title: str
    level_number: int
    title: str
    story: str
    objective: str
    starter_code: str
    expected_output: str
    hints: List[str]
    visible_test_cases: List[TestCaseSchema]
    total_test_cases: int
    explanation: Optional[str] = None
    difficulty: str
    passed: bool = False
    stars: int = 0
    saved_code: Optional[str] = None
    setup_sql: Optional[str] = None
    expected_tables: List[str] = []

    model_config = ConfigDict(from_attributes=True)


# --- Execution Schemas ---
class CodeRunRequest(BaseModel):
    challenge_id: Union[int, str]
    code: str
    custom_input: Optional[str] = None
    session_id: Optional[str] = None


class TestCaseResult(BaseModel):
    test_case_index: int
    description: str
    passed: bool
    input: str
    expected_output: str
    actual_output: str
    error: Optional[str] = None
    execution_time_ms: float
    hidden: bool = False


class QueryPlanNode(BaseModel):
    id: int
    parent: int
    detail: str
    op_type: str = "EXECUTE"  # "INDEX_SEARCH", "TEMP_B_TREE", "FULL_TABLE_SCAN", "EXECUTE"
    efficiency: str = "Standard"  # "Optimal", "Memory Sort", "Sequential Scan", "Standard"


class CodeRunResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    columns: List[str] = []
    rows: List[List[Any]] = []
    test_results: List[TestCaseResult]
    passed_all: bool
    execution_time_ms: float
    security_error: Optional[str] = None
    query_plan: List[QueryPlanNode] = []


class SchemaTableColumn(BaseModel):
    name: str
    type: str
    pk: bool = False
    nullable: bool = True


class SchemaTableInfo(BaseModel):
    name: str
    columns: List[SchemaTableColumn]
    row_count: int = 0
    sample_rows: List[Dict[str, Any]] = []


class SchemaSetupRequest(BaseModel):
    challenge_id: Union[int, str]
    schema_sql: str
    session_id: Optional[str] = None


class SchemaSetupResponse(BaseModel):
    success: bool
    message: str
    tables: List[SchemaTableInfo] = []
    error: Optional[str] = None
    execution_time_ms: float = 0.0


class CodeSubmitRequest(BaseModel):
    challenge_id: Union[int, str]
    code: str
    hints_used: int = 0
    session_id: Optional[str] = None


class CodeSubmitResponse(BaseModel):
    success: bool
    passed_all: bool
    stars_earned: int
    test_results: List[TestCaseResult]
    columns: List[str] = []
    rows: List[List[Any]] = []
    stdout: str = ""
    stderr: str = ""
    execution_time_ms: float = 0.0
    next_challenge_id: Optional[Union[int, str]] = None
    next_code_id: Optional[str] = None
    message: str
    query_plan: List[QueryPlanNode] = []


class GuestMigrationSubmission(BaseModel):
    problemId: Union[int, str]
    passed: bool = True
    runtimeMs: float = 12.0
    code: str = ""
    timestamp: Optional[float] = None


class GuestMigrationRequest(BaseModel):
    solved_ids: List[Union[int, str]] = []
    submissions: List[GuestMigrationSubmission] = []


class GuestMigrationResponse(BaseModel):
    success: bool
    migrated_solved_count: int
    migrated_submissions_count: int
    message: str









# --- Profile & Admin Schemas ---
class ChapterMastery(BaseModel):
    chapter_id: int
    chapter_title: str
    total_levels: int
    completed_levels: int
    stars_earned: int
    total_stars: int
    percentage: float


class ProfileResponse(BaseModel):
    user: UserResponse
    total_completed: int
    total_challenges: int
    total_stars: int
    max_stars: int
    accuracy_percentage: float
    chapter_mastery: List[ChapterMastery]
    weak_topics: List[str]
    strengths: List[str]
    recent_activity: List[Dict[str, Any]]


class AdminMetricsResponse(BaseModel):
    total_users: int
    total_challenges: int
    total_submissions: int
    overall_pass_rate: float
    popular_challenges: List[Dict[str, Any]]


class AdminChallengeCreate(BaseModel):
    chapter_id: int
    chapter_title: str
    level_number: int
    title: str
    story: str
    objective: str
    starter_code: str
    expected_output: str
    hints: List[str] = []
    test_cases: List[TestCaseSchema] = []
    explanation: str
    difficulty: str = "Beginner"
