import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Challenge, User, Submission
from app.schemas import (
    AdminMetricsResponse, AdminChallengeCreate, UserResponse
)
from app.security import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_admin_metrics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    ch_count = (await db.execute(select(func.count(Challenge.id)))).scalar() or 0
    subs_count = (await db.execute(select(func.count(Submission.id)))).scalar() or 0
    passed_count = (await db.execute(select(func.count(Submission.id)).where(Submission.status == "PASSED"))).scalar() or 0

    pass_rate = round((passed_count / subs_count * 100), 1) if subs_count > 0 else 0.0

    # Popular challenges
    pop_res = await db.execute(
        select(Challenge.code_id, Challenge.title, func.count(Submission.id).label("sub_count"))
        .join(Submission, Challenge.id == Submission.challenge_id)
        .group_by(Challenge.id)
        .order_by(func.count(Submission.id).desc())
        .limit(5)
    )
    popular = [
        {"level": r[0], "title": r[1], "runs": r[2]}
        for r in pop_res.all()
    ]

    return AdminMetricsResponse(
        total_users=users_count,
        total_challenges=ch_count,
        total_submissions=subs_count,
        overall_pass_rate=pass_rate,
        popular_challenges=popular
    )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    res = await db.execute(select(User).order_by(User.id.desc()).limit(100))
    users = res.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    updates: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, val in updates.items():
        if hasattr(user, key) and key not in ("id", "hashed_password"):
            setattr(user, key, val)

    await db.commit()
    await db.refresh(user)
    return {"success": True, "user": UserResponse.model_validate(user)}


@router.post("/challenges")
async def create_challenge(
    ch_in: AdminChallengeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    new_ch = Challenge(
        code_id=f"SQL-{ch_in.level_number:03d}",
        track="core",
        chapter_id=ch_in.chapter_id,
        chapter_title=ch_in.chapter_title,
        level_number=ch_in.level_number,
        title=ch_in.title,
        story=ch_in.story,
        objective=ch_in.objective,
        starter_code=ch_in.starter_code,
        expected_output=ch_in.expected_output,
        hints_json=json.dumps(ch_in.hints),
        test_cases_json=json.dumps([t.model_dump() for t in ch_in.test_cases]),
        explanation=ch_in.explanation,
        difficulty=ch_in.difficulty
    )
    db.add(new_ch)
    await db.commit()
    await db.refresh(new_ch)
    return {"success": True, "challenge_id": new_ch.id}


@router.put("/challenges/{challenge_id}")
async def update_challenge(
    challenge_id: int,
    ch_in: AdminChallengeCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    res = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    ch = res.scalars().first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    ch.chapter_id = ch_in.chapter_id
    ch.chapter_title = ch_in.chapter_title
    ch.level_number = ch_in.level_number
    ch.title = ch_in.title
    ch.story = ch_in.story
    ch.objective = ch_in.objective
    ch.starter_code = ch_in.starter_code
    ch.expected_output = ch_in.expected_output
    ch.hints_json = json.dumps(ch_in.hints)
    ch.test_cases_json = json.dumps([t.model_dump() for t in ch_in.test_cases])
    ch.explanation = ch_in.explanation
    ch.difficulty = ch_in.difficulty

    await db.commit()
    return {"success": True, "message": "Challenge updated successfully"}


@router.delete("/challenges/{challenge_id}")
async def delete_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    res = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    ch = res.scalars().first()
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    await db.delete(ch)
    await db.commit()
    return {"success": True, "message": f"Challenge {challenge_id} deleted"}
