from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Challenge, UserProgress, User
from app.schemas import ChapterGroup, ChallengeSummary, ChallengeDetail, TestCaseSchema
from app.security import get_current_user_optional

router = APIRouter(prefix="/challenges", tags=["Challenges"])


from app.cache import cache

# In-memory pre-computed public chapters cache
_PUBLIC_CHAPTERS_CACHE: List[ChapterGroup] = []


@router.get("/chapters", response_model=List[ChapterGroup])
async def list_chapters(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    global _PUBLIC_CHAPTERS_CACHE

    # Edge caching headers:
    # If anonymous user, cache at edge CDN for 5 minutes, allow stale-while-revalidate for 24h
    if not current_user:
        response.headers["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=86400"
    else:
        # Private per user so browsers cache locally for 30s
        response.headers["Cache-Control"] = "private, max-age=30, stale-while-revalidate=300"


    # CACHE-FIRST: Use in-memory cache for challenges instead of hitting Neon DB every time
    # This alone saves ~200-500ms per request on Neon serverless
    if cache.is_curriculum_loaded():
        challenges = cache.get_all_challenges()
    else:
        # Cold start: load from DB once, then cache
        res = await db.execute(select(Challenge).order_by(Challenge.id.asc()))
        challenges = res.scalars().all()
        if challenges:
            cache.set_challenges(challenges)
        else:
            cache.load_from_json_fallback()
            challenges = cache.get_all_challenges()

    # Fetch user progress if user logged in (direct from DB to ensure immediate consistency)
    user_progress_map = {}
    if current_user:
        prog_res = await db.execute(
            select(UserProgress).where(UserProgress.user_id == current_user.id)
        )
        for p in prog_res.scalars().all():
            user_progress_map[p.challenge_id] = p

    # Group by chapter
    chapters_dict = {}
    current_cid = None
    prev_passed = True

    for ch in challenges:
        cid = ch.chapter_id
        if cid not in chapters_dict:
            chapters_dict[cid] = {
                "chapter_id": cid,
                "chapter_title": ch.chapter_title,
                "levels": [],
                "completed_count": 0
            }
            # The first problem in each chapter is always unlocked for discovery
            prev_passed = True

        # IMPORTANT: Only look up by exact primary key (ch.id), NOT by level_number.
        prog = user_progress_map.get(ch.id)
        passed = bool(prog.passed) if prog else False
        stars = prog.stars if prog else 0

        # Unlocked if first in chapter, previous passed, already passed, or admin
        is_first_in_chapter = len(chapters_dict[cid]["levels"]) == 0
        is_unlocked = is_first_in_chapter or prev_passed or passed or (current_user and current_user.role == "admin")

        summary = ChallengeSummary(
            id=ch.id,
            code_id=ch.code_id,
            track=ch.track,
            chapter_id=ch.chapter_id,
            chapter_title=ch.chapter_title,
            level_number=ch.level_number,
            title=ch.title,
            difficulty=ch.difficulty,
            passed=passed,
            stars=stars,
            locked=not is_unlocked
        )

        chapters_dict[cid]["levels"].append(summary)
        if passed:
            chapters_dict[cid]["completed_count"] += 1

        prev_passed = passed

    response = []
    for cid in sorted(chapters_dict.keys()):
        cdata = chapters_dict[cid]
        total_lvl = len(cdata["levels"])
        comp_pct = round((cdata["completed_count"] / total_lvl * 100), 1) if total_lvl > 0 else 0.0
        response.append(
            ChapterGroup(
                chapter_id=cdata["chapter_id"],
                chapter_title=cdata["chapter_title"],
                levels=cdata["levels"],
                completion_percentage=comp_pct,
            )
        )

    if not current_user:
        _PUBLIC_CHAPTERS_CACHE = response

    return response


from app.crud import resolve_challenge


@router.get("/{level_id}", response_model=ChallengeDetail)
async def get_challenge_detail(
    level_id: str,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    if not current_user:
        response.headers["Cache-Control"] = "public, s-maxage=600, stale-while-revalidate=86400"
    else:
        response.headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=300"

    ch = await resolve_challenge(db, level_id)

    if not ch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID/Code '{level_id}' not found."
        )

    passed = False
    stars = 0
    saved_code = None

    if current_user:
        prog_res = await db.execute(
            select(UserProgress).where(
                UserProgress.user_id == current_user.id,
                UserProgress.challenge_id == ch.id
            )
        )
        prog = prog_res.scalars().first()
        if prog:
            passed = prog.passed
            stars = prog.stars
            saved_code = prog.code_submitted

    # Filter visible test cases for student
    visible_tests = [
        TestCaseSchema(
            input=t.get("input", ""),
            expected=t.get("expected", ""),
            hidden=False,
            description=t.get("description", "Public test case")
        )
        for t in ch.test_cases if not t.get("hidden", False)
    ]

    from app.sandbox.schema_manager import generate_setup_sql_for_challenge, get_relevant_tables_for_challenge

    setup_sql = generate_setup_sql_for_challenge(ch.title, ch.objective, ch.starter_code)
    expected_tables = get_relevant_tables_for_challenge(ch.title, ch.objective, ch.starter_code)

    return ChallengeDetail(
        id=ch.id,
        code_id=ch.code_id,
        track=ch.track,
        chapter_id=ch.chapter_id,
        chapter_title=ch.chapter_title,
        level_number=ch.level_number,
        title=ch.title,
        story=ch.story,
        objective=ch.objective,
        starter_code=ch.starter_code,
        expected_output=ch.expected_output,
        hints=ch.hints,
        visible_test_cases=visible_tests,
        total_test_cases=len(ch.test_cases),
        explanation=ch.explanation if passed else None,
        difficulty=ch.difficulty,
        passed=passed,
        stars=stars,
        saved_code=saved_code,
        setup_sql=setup_sql,
        expected_tables=expected_tables
    )
