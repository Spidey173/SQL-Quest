from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import time

from app.database import get_db
from app.models import User, UserProgress, Challenge, Submission
from app.schemas import ProfileResponse, UserResponse, ChapterMastery
from app.security import get_current_user

router = APIRouter(prefix="/profile", tags=["Player Profile"])


@router.get("/me", response_model=ProfileResponse)
async def get_player_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.cache import cache

    # Use cached challenges instead of hitting Neon for total count
    if cache.is_curriculum_loaded():
        all_challenges = cache.get_all_challenges()
        total_challenges = len(all_challenges)
    else:
        total_ch_res = await db.execute(select(func.count(Challenge.id)))
        total_challenges = total_ch_res.scalar() or 100
        ch_res = await db.execute(select(Challenge).order_by(Challenge.id.asc()))
        all_challenges = ch_res.scalars().all()
        if all_challenges:
            cache.set_challenges(all_challenges)

    # User progress — single query
    prog_res = await db.execute(
        select(UserProgress, Challenge).join(Challenge, UserProgress.challenge_id == Challenge.id)
        .where(UserProgress.user_id == current_user.id)
    )
    user_progs = prog_res.all()

    completed_count = sum(1 for p, ch in user_progs if p.passed)
    total_stars = sum(p.stars for p, ch in user_progs if p.passed)
    max_stars = total_challenges * 3

    # Chapter breakdown using cached challenges
    chapter_map = {}
    for ch in all_challenges:
        cid = ch.chapter_id
        if cid not in chapter_map:
            chapter_map[cid] = {
                "chapter_id": cid,
                "chapter_title": ch.chapter_title,
                "total_levels": 0,
                "completed_levels": 0,
                "stars_earned": 0
            }
        chapter_map[cid]["total_levels"] += 1

    prog_dict = {p.challenge_id: p for p, ch in user_progs}
    for ch in all_challenges:
        p = prog_dict.get(ch.id)
        if p and p.passed:
            chapter_map[ch.chapter_id]["completed_levels"] += 1
            chapter_map[ch.chapter_id]["stars_earned"] += p.stars

    chapter_mastery = []
    strengths = []
    weak_topics = []

    for cid in sorted(chapter_map.keys()):
        c = chapter_map[cid]
        tot_lvl = c["total_levels"]
        comp = c["completed_levels"]
        pct = round((comp / tot_lvl * 100), 1) if tot_lvl > 0 else 0.0
        stars = c["stars_earned"]
        tot_possible_stars = tot_lvl * 3

        chapter_mastery.append(
            ChapterMastery(
                chapter_id=cid,
                chapter_title=c["chapter_title"].split(": ")[-1],
                total_levels=tot_lvl,
                completed_levels=comp,
                stars_earned=stars,
                total_stars=tot_possible_stars,
                percentage=pct
            )
        )

        title_clean = c["chapter_title"].split(": ")[-1]
        if pct >= 80.0:
            strengths.append(f"{title_clean} ({int(pct)}% mastery)")
        elif comp > 0 and pct < 60.0:
            weak_topics.append(f"{title_clean} (Needs Practice)")

    if not strengths:
        strengths.append("Quick Learner (Starting Journey)")
    if not weak_topics:
        weak_topics.append("Keep practicing advanced SQL queries!")

    # Consolidated: get total and passed submission counts in ONE query
    sub_res = await db.execute(
        select(
            func.count(Submission.id),
            func.count(Submission.id).filter(Submission.status == "PASSED")
        ).where(Submission.user_id == current_user.id)
    )
    sub_row = sub_res.one()
    total_subs = sub_row[0] or 0
    passed_subs = sub_row[1] or 0

    accuracy = round((passed_subs / total_subs * 100), 1) if total_subs > 0 else 100.0

    # Recent submissions
    recent_sub_res = await db.execute(
        select(Submission, Challenge)
        .join(Challenge, Submission.challenge_id == Challenge.id)
        .where(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(5)
    )
    recent_activity = []
    for s, ch in recent_sub_res.all():
        recent_activity.append({
            "challenge_title": ch.title,
            "code_id": ch.code_id,
            "level_number": ch.level_number,
            "status": s.status,
            "execution_time_ms": s.execution_time_ms,
            "date": s.created_at.isoformat() if s.created_at else None
        })

    return ProfileResponse(
        user=UserResponse.model_validate(current_user),
        total_completed=completed_count,
        total_challenges=total_challenges,
        total_stars=total_stars,
        max_stars=max_stars,
        accuracy_percentage=accuracy,
        chapter_mastery=chapter_mastery,
        weak_topics=weak_topics,
        strengths=strengths,
        recent_activity=recent_activity
    )


@router.get("/submissions")
async def get_user_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch user's submission history for accurate client-side telemetry."""
    sub_res = await db.execute(
        select(Submission, Challenge)
        .join(Challenge, Submission.challenge_id == Challenge.id)
        .where(Submission.user_id == current_user.id)
        .order_by(Submission.created_at.desc())
        .limit(200)
    )
    results = []
    for s, ch in sub_res.all():
        ts = int(s.created_at.timestamp() * 1000) if s.created_at else int(time.time() * 1000)
        results.append({
            "id": f"sub_{s.id}",
            "problemId": ch.code_id or ch.level_number or ch.id,
            "code_id": ch.code_id,
            "problemTitle": ch.title,
            "passed": s.status == "PASSED",
            "runtimeMs": int(s.execution_time_ms) if s.execution_time_ms else 12,
            "timestamp": ts,
            "code": s.code
        })
    return results

