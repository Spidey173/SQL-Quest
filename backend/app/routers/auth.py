from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from app.database import get_db
from app.models import User, UserProgress, Submission
from app.crud import resolve_challenge
from app.cache import cache
from app.schemas import UserCreate, UserLogin, Token, UserResponse, GuestMigrationRequest, GuestMigrationResponse
from app.security import hash_password, verify_password, verify_password_async, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    clean_username = user_in.username.strip()
    clean_email = user_in.email.strip().lower()

    if len(clean_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )

    # Check username & email case-insensitively
    existing = await db.execute(
        select(User).where(
            (func.lower(User.username) == clean_username.lower()) | 
            (func.lower(User.email) == clean_email.lower())
        )
    )
    existing_user = existing.scalars().first()
    if existing_user:
        if existing_user.username.lower() == clean_username.lower():
            detail = "This username is already taken. Please choose another."
        else:
            detail = "This email is already registered. Please sign in instead."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

    user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=hash_password(user_in.password),
        role="user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": user.username})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    identifier = (user_in.username or user_in.identifier or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username or email is required."
        )
    res = await db.execute(
        select(User).where(
            (func.lower(User.username) == identifier.lower()) | 
            (func.lower(User.email) == identifier.lower())
        )
    )
    user = res.scalars().first()
    if not user or not await verify_password_async(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token(data={"sub": user.username})
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/migrate-guest", response_model=GuestMigrationResponse)
async def migrate_guest_progress(
    req: GuestMigrationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Seamlessly migrates local guest solved challenges and submissions into the user's permanent cloud account.
    """
    migrated_solved = 0
    migrated_subs = 0

    existing_progress_res = await db.execute(
        select(UserProgress.challenge_id).where(UserProgress.user_id == current_user.id)
    )
    existing_ch_ids = set(existing_progress_res.scalars().all())

    for raw_id in req.solved_ids:
        ch = await resolve_challenge(db, raw_id)
        if ch and ch.id not in existing_ch_ids:
            prog = UserProgress(
                user_id=current_user.id,
                challenge_id=ch.id,
                passed=True,
                stars=3,
                attempts=1,
                best_time_ms=14.0
            )
            db.add(prog)
            existing_ch_ids.add(ch.id)
            migrated_solved += 1

    for sub in req.submissions:
        ch = await resolve_challenge(db, sub.problemId)
        if ch:
            submission_entry = Submission(
                user_id=current_user.id,
                challenge_id=ch.id,
                code=sub.code or "-- Guest solution",
                status="PASSED" if sub.passed else "FAILED",
                tests_passed=1 if sub.passed else 0,
                total_tests=1,
                execution_time_ms=sub.runtimeMs or 12.0
            )
            db.add(submission_entry)
            migrated_subs += 1

    if migrated_solved > 0 or migrated_subs > 0:
        await db.commit()
        cache.invalidate_progress(current_user.id)

    return GuestMigrationResponse(
        success=True,
        migrated_solved_count=migrated_solved,
        migrated_submissions_count=migrated_subs,
        message=f"Migrated {migrated_solved} solved challenges and {migrated_subs} submissions to cloud account."
    )

