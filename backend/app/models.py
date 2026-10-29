from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, Index, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # "user", "admin"


    avatar = Column(String(50), default="cyber-snake", nullable=False)
    theme = Column(String(50), default="cyber-dark", nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    # Relationships
    progress = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    code_id = Column(String(20), unique=True, index=True, nullable=False)  # "Basis-001" to "Basis-035", "SQL-001" to "SQL-215"
    track = Column(String(20), default="core", nullable=False)  # "fundamentals", "core", "advanced"
    chapter_id = Column(Integer, index=True, nullable=False)
    chapter_title = Column(String(100), nullable=False)
    level_number = Column(Integer, index=True, nullable=False)  # 1 to 35 for Basis, 1 to 215 for SQL
    title = Column(String(120), nullable=False)
    story = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    hints_json = Column(Text, default="[]", nullable=False)
    test_cases_json = Column(Text, default="[]", nullable=False)
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(20), default="Beginner", nullable=False)

    # Helper properties for JSON handling
    @property
    def hints(self):
        try:
            val = json.loads(self.hints_json or "[]")
            while isinstance(val, str):
                val = json.loads(val)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    @hints.setter
    def hints(self, val):
        if isinstance(val, (list, dict)):
            self.hints_json = json.dumps(val)
        elif isinstance(val, str):
            self.hints_json = val

    @property
    def test_cases(self):
        try:
            val = json.loads(self.test_cases_json or "[]")
            while isinstance(val, str):
                val = json.loads(val)
            return val if isinstance(val, list) else []
        except Exception:
            return []

    @test_cases.setter
    def test_cases(self, val):
        if isinstance(val, (list, dict)):
            self.test_cases_json = json.dumps(val)
        elif isinstance(val, str):
            self.test_cases_json = val

    progress_entries = relationship("UserProgress", back_populates="challenge", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="challenge", cascade="all, delete-orphan")


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    passed = Column(Boolean, default=False, nullable=False)
    stars = Column(Integer, default=0, nullable=False)  # 1 to 3
    attempts = Column(Integer, default=1, nullable=False)
    best_time_ms = Column(Float, default=0.0, nullable=False)
    code_submitted = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="progress")
    challenge = relationship("Challenge", back_populates="progress_entries")

    __table_args__ = (
        Index("idx_user_challenge", "user_id", "challenge_id", unique=True),
    )



class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(Text, nullable=False)
    status = Column(String(30), nullable=False)  # PASSED, FAILED, TIMEOUT, ERROR
    tests_passed = Column(Integer, default=0, nullable=False)
    total_tests = Column(Integer, default=0, nullable=False)
    execution_time_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="submissions")
    challenge = relationship("Challenge", back_populates="submissions")


class SandboxSession(Base):
    """
    Stores user SQLite in-memory database dumps across serverless Vercel workers,
    ensuring student practice sessions and custom schemas persist without state loss.
    """
    __tablename__ = "sandbox_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_key = Column(String(128), unique=True, index=True, nullable=False)
    dump_sql = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)



