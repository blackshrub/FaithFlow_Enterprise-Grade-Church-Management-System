"""
Contextual Companion API Routes

Provides context-bounded Faith Assistant interactions:
- Devotion reflection Q&A
- Bible study lesson Q&A
- Journey day companion
- Verse meditation
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from utils.dependencies import get_current_user, get_session_church_id, get_db
from services.explore.contextual_companion_service import (
    get_contextual_companion_service,
    ContextType,
)

router = APIRouter(prefix="/explore/companion", tags=["Explore Companion"])


# ==================== REQUEST/RESPONSE MODELS ====================

class ContextualChatRequest(BaseModel):
    context_type: str  # devotion_reflection, bible_study_lesson, journey_day, verse_meditation
    content_id: str  # ID of the content piece
    messages: List[dict]  # [{"role": "user", "content": "..."}]
    language: str = "en"

    # Additional context for specific types
    lesson_number: Optional[int] = None  # For bible_study_lesson
    week_number: Optional[int] = None  # For journey_day
    day_number: Optional[int] = None  # For journey_day


class GetContextRequest(BaseModel):
    context_type: str
    content_id: str
    language: str = "en"
    lesson_number: Optional[int] = None
    week_number: Optional[int] = None
    day_number: Optional[int] = None


# ==================== ENDPOINTS ====================

@router.post("/context")
async def get_contextual_prompt(
    request: GetContextRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """
    Get the system prompt and context for contextual companion

    This is used to set up the companion with proper context before chatting.
    """
    service = get_contextual_companion_service(db)

    # Validate context type
    valid_types = ["devotion_reflection", "bible_study_lesson", "journey_day", "verse_meditation", "quiz_explanation"]
    if request.context_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid context_type. Must be one of: {valid_types}")

    # Build context based on type
    context_data = {}

    if request.context_type == "devotion_reflection":
        context_data = await service.build_devotion_context(
            church_id, request.content_id, request.language
        )
    elif request.context_type == "bible_study_lesson":
        if not request.lesson_number:
            raise HTTPException(status_code=400, detail="lesson_number required for bible_study_lesson")
        context_data = await service.build_bible_study_lesson_context(
            church_id, request.content_id, request.lesson_number, request.language
        )
    elif request.context_type == "journey_day":
        if not request.week_number or not request.day_number:
            raise HTTPException(status_code=400, detail="week_number and day_number required for journey_day")
        context_data = await service.build_journey_day_context(
            church_id, request.content_id, request.week_number, request.day_number, request.language
        )
    elif request.context_type == "verse_meditation":
        context_data = await service.build_verse_meditation_context(
            church_id, request.content_id, request.language
        )

    if not context_data:
        raise HTTPException(status_code=404, detail="Content not found or context could not be built")

    # Get the system prompt
    system_prompt = await service.get_contextual_system_prompt(
        context_type=request.context_type,
        context_data=context_data,
        language=request.language,
    )

    return {
        "success": True,
        "data": {
            "context_type": request.context_type,
            "content_id": request.content_id,
            "system_prompt": system_prompt,
            "context_data": context_data,
        }
    }


@router.post("/chat")
async def contextual_chat(
    request: ContextualChatRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """
    Chat with contextual companion (non-streaming)

    For streaming, use /chat/stream endpoint.
    """
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_contextual_companion_service(db)

    # Build context
    context_data = {}
    if request.context_type == "devotion_reflection":
        context_data = await service.build_devotion_context(
            church_id, request.content_id, request.language
        )
    elif request.context_type == "bible_study_lesson":
        context_data = await service.build_bible_study_lesson_context(
            church_id, request.content_id, request.lesson_number, request.language
        )
    elif request.context_type == "journey_day":
        context_data = await service.build_journey_day_context(
            church_id, request.content_id, request.week_number, request.day_number, request.language
        )
    elif request.context_type == "verse_meditation":
        context_data = await service.build_verse_meditation_context(
            church_id, request.content_id, request.language
        )

    if not context_data:
        raise HTTPException(status_code=404, detail="Content not found")

    system_prompt = await service.get_contextual_system_prompt(
        context_type=request.context_type,
        context_data=context_data,
        language=request.language,
    )

    # Track interaction
    await service.track_interaction(
        church_id=church_id,
        user_id=user_id,
        context_type=request.context_type,
        content_id=request.content_id,
        messages_count=len(request.messages),
    )

    # Return context for frontend to use with existing companion API
    return {
        "success": True,
        "data": {
            "system_prompt": system_prompt,
            "context_type": request.context_type,
            "ready_for_chat": True,
            "hint": "Use this system_prompt with the main companion chat API",
        }
    }


@router.post("/chat/stream")
async def contextual_chat_stream(
    request: ContextualChatRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """
    Streaming contextual chat

    Returns Server-Sent Events with the AI response.
    """
    import anthropic
    import os

    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_contextual_companion_service(db)

    # Build context
    context_data = {}
    if request.context_type == "devotion_reflection":
        context_data = await service.build_devotion_context(
            church_id, request.content_id, request.language
        )
    elif request.context_type == "bible_study_lesson":
        context_data = await service.build_bible_study_lesson_context(
            church_id, request.content_id, request.lesson_number, request.language
        )
    elif request.context_type == "journey_day":
        context_data = await service.build_journey_day_context(
            church_id, request.content_id, request.week_number, request.day_number, request.language
        )
    elif request.context_type == "verse_meditation":
        context_data = await service.build_verse_meditation_context(
            church_id, request.content_id, request.language
        )

    if not context_data:
        raise HTTPException(status_code=404, detail="Content not found")

    system_prompt = await service.get_contextual_system_prompt(
        context_type=request.context_type,
        context_data=context_data,
        language=request.language,
    )

    # Track interaction
    await service.track_interaction(
        church_id=church_id,
        user_id=user_id,
        context_type=request.context_type,
        content_id=request.content_id,
        messages_count=len(request.messages),
    )

    async def generate():
        try:
            client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

            async with client.messages.stream(
                model="claude-sonnet-4-5-20250929",
                max_tokens=1024,
                system=system_prompt,
                messages=request.messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'text': text})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/starters/{context_type}")
async def get_conversation_starters(
    context_type: str,
    language: str = "en",
    current_user: dict = Depends(get_current_user),
):
    """Get contextual conversation starters"""
    starters = {
        "devotion_reflection": {
            "en": [
                "What does this passage mean to you?",
                "How can I apply this to my life today?",
                "I'm struggling to understand this verse...",
                "This reminds me of something I'm going through...",
            ],
            "id": [
                "Apa arti ayat ini bagi Anda?",
                "Bagaimana saya bisa menerapkan ini dalam hidup saya hari ini?",
                "Saya kesulitan memahami ayat ini...",
                "Ini mengingatkan saya pada sesuatu yang sedang saya alami...",
            ],
        },
        "bible_study_lesson": {
            "en": [
                "Can you explain this concept further?",
                "How does this connect to the main passage?",
                "What's the historical context here?",
                "How should I apply this lesson?",
            ],
            "id": [
                "Bisakah Anda menjelaskan konsep ini lebih lanjut?",
                "Bagaimana ini terhubung dengan ayat utama?",
                "Apa konteks sejarah di sini?",
                "Bagaimana saya harus menerapkan pelajaran ini?",
            ],
        },
        "journey_day": {
            "en": [
                "I'm finding this day's content really meaningful...",
                "I'm struggling with today's challenge...",
                "How do others usually experience this part?",
                "Can you help me reflect on today's scripture?",
            ],
            "id": [
                "Saya menemukan konten hari ini sangat bermakna...",
                "Saya kesulitan dengan tantangan hari ini...",
                "Bagaimana biasanya orang lain mengalami bagian ini?",
                "Bisakah Anda membantu saya merenungkan ayat hari ini?",
            ],
        },
        "verse_meditation": {
            "en": [
                "What does this verse mean in the original context?",
                "How can I meditate on this throughout the day?",
                "This verse is comforting/challenging because...",
                "Help me memorize this verse",
            ],
            "id": [
                "Apa arti ayat ini dalam konteks aslinya?",
                "Bagaimana saya bisa merenungkan ini sepanjang hari?",
                "Ayat ini menghibur/menantang karena...",
                "Bantu saya menghafal ayat ini",
            ],
        },
    }

    lang_key = language if language in ["en", "id"] else "en"
    context_starters = starters.get(context_type, starters["devotion_reflection"])

    return {
        "success": True,
        "data": {
            "starters": context_starters.get(lang_key, context_starters["en"]),
        }
    }
