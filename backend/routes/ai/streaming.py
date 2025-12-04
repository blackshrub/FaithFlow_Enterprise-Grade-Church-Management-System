"""
Streaming AI Responses via Server-Sent Events (SSE)

Real-time AI content generation for Explore/Content Center feature:
- Instant feedback as content generates (ChatGPT-like UX)
- Better UX than polling-based approach
- Lower perceived latency
- Bilingual support (English + Indonesian)
- Integrated image generation for visual content

Endpoints:
- POST /api/ai/stream/explore/{content_type} - Stream Explore content
- POST /api/ai/stream/explore - Generic streaming with content_type in body
- POST /api/ai/stream/image - Generate coherent image from content
"""

import asyncio
import json
import logging
import os
import base64
from typing import AsyncGenerator, Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from utils.dependencies import get_current_user, get_session_church_id
from services.image_prompt_builder import ImagePromptBuilder, ImageStyle, ImageMood, ColorPalette

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/stream", tags=["AI Streaming"])


# ==============================================================================
# Request Models for Explore Content Types
# ==============================================================================

class ExploreStreamRequest(BaseModel):
    """Generic request for streaming Explore content generation."""
    content_type: str = Field(..., description="Explore content type")
    model: str = Field(default="claude-sonnet-4-5-20250929", description="Claude model to use")
    custom_prompt: Optional[str] = Field(None, description="Custom instructions")
    generate_both_languages: bool = Field(default=True, description="Generate EN + ID")

    # Optional parameters based on content type
    topic: Optional[str] = Field(None, description="Topic/theme")
    scripture_reference: Optional[str] = Field(None, description="Bible reference")
    figure_name: Optional[str] = Field(None, description="Bible figure name")
    quiz_difficulty: Optional[str] = Field(None, description="Quiz difficulty: easy/medium/hard")
    num_questions: Optional[int] = Field(default=5, description="Number of quiz questions")
    study_duration: Optional[int] = Field(None, description="Bible study duration in days")

    # Image generation options
    generate_image: bool = Field(default=False, description="Generate coherent image after text")
    image_style: Optional[str] = Field(default="spiritual_art", description="Image style preference")
    image_width: int = Field(default=1024, description="Image width")
    image_height: int = Field(default=1024, description="Image height")


class ImageGenerationRequest(BaseModel):
    """Request for standalone image generation from content."""
    content_type: str = Field(..., description="Content type for prompt building")
    content_data: Dict[str, Any] = Field(..., description="Generated content JSON to base image on")
    style: Optional[str] = Field(default="spiritual_art", description="Image style")
    mood: Optional[str] = Field(default=None, description="Mood override (auto-detected if not set)")
    color_palette: Optional[str] = Field(default="warm_golden", description="Color palette")
    width: int = Field(default=1024, description="Image width")
    height: int = Field(default=1024, description="Image height")
    steps: int = Field(default=30, description="Generation steps (quality)")
    cfg_scale: float = Field(default=7.0, description="Prompt adherence (1-35)")


# ==============================================================================
# Content Type Prompts - Structured for JSON output
# ==============================================================================

EXPLORE_PROMPTS = {
    "daily_devotion": """Create a daily devotional with this EXACT JSON structure:
{{
  "title": {{ "en": "English title", "id": "Indonesian title" }},
  "bible_reference": "Book Chapter:Verse (e.g. John 3:16)",
  "verse_text": {{ "en": "English verse text", "id": "Indonesian verse text" }},
  "content": {{ "en": "Main devotional content (300-500 words)", "id": "Indonesian translation" }},
  "prayer": {{ "en": "Closing prayer", "id": "Indonesian prayer" }},
  "reflection_questions": {{
    "en": ["Question 1?", "Question 2?", "Question 3?"],
    "id": ["Pertanyaan 1?", "Pertanyaan 2?", "Pertanyaan 3?"]
  }},
  "author": "AI Generated",
  "read_time_minutes": 4,
  "category": "faith"
}}

COHERENCE REQUIREMENTS:
- Title must summarize the main theme of the devotional
- Bible reference must be the foundation - the verse that the entire devotional explores
- verse_text is the exact text of that Bible reference
- content must deeply explain and apply that specific verse
- prayer must relate directly to the devotional theme and verse
- reflection_questions must help readers apply the verse's message

{custom_instructions}
Topic: {topic}
Scripture: {scripture_reference}
Language requirement: {language_requirement}

Output ONLY valid JSON.""",

    "verse_of_the_day": """Create a verse of the day feature with this EXACT JSON structure:
{{
  "bible_reference": "Book Chapter:Verse",
  "verse_text": {{ "en": "English verse", "id": "Indonesian verse" }},
  "reflection": {{ "en": "Deep reflection (200-300 words)", "id": "Indonesian translation" }},
  "prayer_points": {{
    "en": ["Prayer point 1", "Prayer point 2", "Prayer point 3"],
    "id": ["Poin doa 1", "Poin doa 2", "Poin doa 3"]
  }},
  "practical_application": {{ "en": "How to apply this today", "id": "Indonesian translation" }},
  "theme": "peace"
}}

COHERENCE REQUIREMENTS:
- verse_text must be the EXACT biblical text for bible_reference
- reflection must explain THIS specific verse's meaning and context
- prayer_points must be prayers inspired BY this verse
- practical_application must show how to live out THIS verse today
- theme must accurately categorize the verse's main message

{custom_instructions}
Topic: {topic}
Scripture: {scripture_reference}
Language requirement: {language_requirement}

Output ONLY valid JSON.""",

    "bible_figure": """Create a Bible figure profile with this EXACT JSON structure:
{{
  "name": {{ "en": "English name", "id": "Indonesian name" }},
  "title": {{ "en": "Title/role (e.g. 'The Shepherd King')", "id": "Indonesian title" }},
  "testament": "old" or "new",
  "summary": {{ "en": "Brief summary (50-100 words)", "id": "Indonesian translation" }},
  "biography": {{ "en": "Full biography (500-800 words)", "id": "Indonesian translation" }},
  "timeline": [
    {{
      "event": {{ "en": "Event description", "id": "Indonesian" }},
      "date_estimate": "~1000 BC",
      "scripture_reference": "1 Samuel 16:1-13"
    }}
  ],
  "life_lessons": {{
    "en": ["Lesson 1", "Lesson 2", "Lesson 3"],
    "id": ["Pelajaran 1", "Pelajaran 2", "Pelajaran 3"]
  }},
  "related_scriptures": ["Reference 1", "Reference 2"]
}}

COHERENCE REQUIREMENTS:
- title must capture THIS person's most significant role in the Bible
- summary must introduce the same story expanded in biography
- biography must cover events listed in timeline chronologically
- timeline events must have accurate scripture_reference from the Bible
- life_lessons must be derived FROM this person's actual biblical story
- related_scriptures must be verses where THIS person appears or is mentioned

{custom_instructions}
Figure: {figure_name}
Language requirement: {language_requirement}

Output ONLY valid JSON.""",

    "daily_quiz": """Create a Bible quiz with this EXACT JSON structure:
{{
  "title": {{ "en": "Quiz title", "id": "Judul kuis" }},
  "description": {{ "en": "Brief description", "id": "Indonesian" }},
  "difficulty": "{difficulty}",
  "time_limit_seconds": 300,
  "pass_percentage": 70,
  "questions": [
    {{
      "question": {{ "en": "Question text?", "id": "Indonesian question?" }},
      "options": {{
        "en": ["Option A", "Option B", "Option C", "Option D"],
        "id": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"]
      }},
      "correct_answer": 0,
      "explanation": {{ "en": "Why this is correct", "id": "Indonesian explanation" }},
      "scripture_reference": "John 3:16"
    }}
  ]
}}

COHERENCE REQUIREMENTS:
- title and description must reflect the quiz's topic/theme
- ALL questions must relate to the SAME topic/theme
- Each question must have exactly 4 options
- correct_answer (0-3) must index the actually correct option
- explanation must cite the scripture_reference that proves the answer
- scripture_reference must be a real Bible verse supporting the answer
- Questions should progress from easier to harder

{custom_instructions}
Topic: {topic}
Number of questions: {num_questions}
Difficulty: {difficulty}
Language requirement: {language_requirement}

Generate exactly {num_questions} questions. Output ONLY valid JSON.""",

    "bible_study": """Create a Bible study guide with this EXACT JSON structure:
{{
  "title": {{ "en": "Study title", "id": "Indonesian title" }},
  "description": {{ "en": "Study description", "id": "Indonesian" }},
  "duration_days": {study_duration},
  "difficulty": "beginner",
  "main_scripture": "Ephesians 6:10-18",
  "learning_objectives": {{
    "en": ["Objective 1", "Objective 2"],
    "id": ["Tujuan 1", "Tujuan 2"]
  }},
  "lessons": [
    {{
      "day": 1,
      "title": {{ "en": "Lesson title", "id": "Indonesian" }},
      "scripture_reading": "Ephesians 6:10-12",
      "content": {{ "en": "Lesson content (300-400 words)", "id": "Indonesian" }},
      "discussion_questions": {{
        "en": ["Question 1?", "Question 2?"],
        "id": ["Pertanyaan 1?", "Pertanyaan 2?"]
      }},
      "prayer_focus": {{ "en": "Prayer focus", "id": "Indonesian" }}
    }}
  ]
}}

COHERENCE REQUIREMENTS:
- title must reflect the overarching theme of the entire study
- main_scripture is the primary passage - all lessons should connect to it
- learning_objectives must be achievable through completing ALL lessons
- Each lesson must build on previous lessons (progressive learning)
- scripture_reading for each day should be a portion of main_scripture or related passages
- content must directly explain that day's scripture_reading
- discussion_questions must relate to that specific lesson's content
- prayer_focus should connect the lesson to practical spiritual life
- Final lesson should tie everything together

{custom_instructions}
Topic: {topic}
Duration: {study_duration} days
Scripture: {scripture_reference}
Language requirement: {language_requirement}

Generate exactly {study_duration} lessons. Output ONLY valid JSON.""",

    "devotion_plan": """Create a multi-day devotion plan with this EXACT JSON structure:
{{
  "title": {{ "en": "Plan title", "id": "Indonesian title" }},
  "description": {{ "en": "Plan description", "id": "Indonesian" }},
  "duration_days": {study_duration},
  "category": "spiritual_growth",
  "days": [
    {{
      "day": 1,
      "title": {{ "en": "Day title", "id": "Indonesian" }},
      "scripture": "Reference",
      "devotion": {{ "en": "Devotional content", "id": "Indonesian" }},
      "prayer": {{ "en": "Prayer", "id": "Indonesian" }},
      "action_step": {{ "en": "Today's action", "id": "Indonesian" }}
    }}
  ]
}}

COHERENCE REQUIREMENTS:
- title must capture the journey/transformation theme of the entire plan
- description should explain what users will gain from completing all days
- Each day must build on the previous day's theme (spiritual progression)
- scripture for each day should support that day's specific focus
- devotion must explain and apply that day's scripture
- prayer must relate directly to that day's devotion theme
- action_step must be a practical, doable activity for THAT specific day
- Day 1 should introduce the theme, final day should bring closure/commitment

{custom_instructions}
Topic: {topic}
Duration: {study_duration} days
Language requirement: {language_requirement}

Generate exactly {study_duration} days. Output ONLY valid JSON.""",

    "topical_category": """Create a topical Bible category with this EXACT JSON structure:
{{
  "name": {{ "en": "Category name", "id": "Indonesian name" }},
  "description": {{ "en": "Category description", "id": "Indonesian" }},
  "icon": "heart",
  "color": "#3B82F6",
  "verse_count": 0,
  "featured_verse": "John 3:16",
  "subcategories": [
    {{
      "name": {{ "en": "Subcategory", "id": "Indonesian" }},
      "verse_count": 0
    }}
  ]
}}

COHERENCE REQUIREMENTS:
- name must clearly identify the spiritual topic
- description should explain what users will find in this category
- icon should visually represent the topic (heart, shield, book, pray, etc.)
- featured_verse must be THE most representative verse for this topic
- subcategories must be logical sub-divisions of the main topic

{custom_instructions}
Topic: {topic}
Language requirement: {language_requirement}

Output ONLY valid JSON.""",

    "topical_verse": """Create a topical verse collection with this EXACT JSON structure:
{{
  "topic": {{ "en": "Topic name", "id": "Indonesian" }},
  "description": {{ "en": "Why these verses matter", "id": "Indonesian" }},
  "verses": [
    {{
      "reference": "Book Chapter:Verse",
      "text": {{ "en": "Verse text", "id": "Indonesian" }},
      "context": {{ "en": "Brief context", "id": "Indonesian" }},
      "application": {{ "en": "How to apply", "id": "Indonesian" }}
    }}
  ]
}}

COHERENCE REQUIREMENTS:
- topic and description must match - description explains why these verses matter for THIS topic
- ALL verses must genuinely relate to the stated topic
- text must be the EXACT biblical text for the reference
- context should explain where this verse appears in the Bible and its original meaning
- application must show how THIS specific verse applies to the topic today
- Verses should be ordered from most directly relevant to supporting verses

{custom_instructions}
Topic: {topic}
Language requirement: {language_requirement}

Include 5-10 relevant verses. Output ONLY valid JSON.""",
}


# ==============================================================================
# Streaming Generator
# ==============================================================================

async def stream_explore_content(
    content_type: str,
    params: dict,
    church_id: str,
    model: str = "claude-sonnet-4-5-20250929"
) -> AsyncGenerator[str, None]:
    """
    Stream Explore content generation using Claude API.

    Uses a two-step approach for coherence:
    1. System prompt establishes the structure and style
    2. Assistant prefill starts the JSON to ensure valid output
    3. Content is generated field-by-field maintaining context

    Yields JSON content chunks in real-time.
    """
    import anthropic
    import os

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        yield '{"error": "AI service not configured"}'
        return

    # Get the prompt template
    prompt_template = EXPLORE_PROMPTS.get(content_type)
    if not prompt_template:
        yield f'{{"error": "Unknown content type: {content_type}"}}'
        return

    # Build the prompt with parameters
    language_requirement = "Generate content in BOTH English and Indonesian" if params.get("generate_both_languages", True) else "Generate content in English only"

    user_prompt = prompt_template.format(
        custom_instructions=params.get("custom_prompt", ""),
        topic=params.get("topic", "general spiritual growth"),
        scripture_reference=params.get("scripture_reference", ""),
        figure_name=params.get("figure_name", "David"),
        difficulty=params.get("quiz_difficulty", "medium"),
        num_questions=params.get("num_questions", 5),
        study_duration=params.get("study_duration", 7),
        language_requirement=language_requirement,
    )

    # System prompt for coherence and quality
    system_prompt = """You are an expert Christian content creator with deep biblical knowledge.

CRITICAL RULES FOR COHERENT CONTENT:
1. ALL fields must relate to the SAME theme/topic throughout
2. The title must accurately reflect the content
3. Scripture references must be real and correctly cited
4. English and Indonesian content must be translations of each other, not different content
5. Questions/reflections must directly relate to the main content
6. Maintain consistent theological perspective throughout

QUALITY STANDARDS:
- Use warm, pastoral tone
- Be biblically accurate
- Make content practical and applicable
- Ensure cultural sensitivity for Indonesian audience
- Avoid controversial interpretations

OUTPUT FORMAT:
- Output ONLY valid JSON
- No markdown, no explanations before or after
- Start directly with { and end with }"""

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)

        # Use prefill technique: start assistant response with "{" to ensure JSON
        # This forces the model to continue with valid JSON
        async with client.messages.stream(
            model=model,
            max_tokens=8192,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt},
                # Prefill: start the assistant's response with "{"
                # This ensures valid JSON output
                {"role": "assistant", "content": "{"}
            ]
        ) as stream:
            # Yield the prefilled "{" first
            yield "{"
            async for text in stream.text_stream:
                yield text

    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        yield f'"error": "AI generation failed: {str(e)}"}}'
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f'"error": "Generation failed: {str(e)}"}}'


# ==============================================================================
# Coherent Image Generation
# ==============================================================================

async def generate_coherent_image(
    content_type: str,
    content_data: Dict[str, Any],
    style: Optional[str] = None,
    mood: Optional[str] = None,
    color_palette: Optional[str] = None,
    width: int = 1024,
    height: int = 1024,
    steps: int = 30,
    cfg_scale: float = 7.0,
) -> Dict[str, Any]:
    """
    Generate a coherent image based on generated text content.

    This ensures the image matches the text content by:
    1. Using ImagePromptBuilder to extract visual elements from text
    2. Building a coherent prompt that references specific details
    3. Using negative prompts to avoid inappropriate imagery

    For Bible figures specifically:
    - Extracts name, era, testament from generated content
    - Includes key life moments from timeline
    - Adds figure-specific visual objects (David → harp, Moses → tablets)
    - Ensures historically accurate, dignified portrayal

    Args:
        content_type: Type of content (bible_figure, devotion, verse, etc.)
        content_data: The generated JSON content
        style: Image style override
        mood: Mood override (auto-detected if not set)
        color_palette: Color palette preference
        width: Image width
        height: Image height
        steps: Generation quality (10-50)
        cfg_scale: Prompt adherence (1-35)

    Returns:
        Dict with 'image_base64', 'prompt_used', 'negative_prompt', 'extracted_themes'
    """
    import httpx

    # Get Stability AI API key
    stability_api_key = os.getenv("STABILITY_API_KEY")
    if not stability_api_key:
        raise ValueError("STABILITY_API_KEY not configured")

    # Build church config from style preferences
    church_config = {}
    if style:
        try:
            church_config["image_style"] = ImageStyle(style)
        except ValueError:
            church_config["image_style"] = ImageStyle.SPIRITUAL_ART

    if color_palette:
        try:
            church_config["color_palette"] = ColorPalette(color_palette)
        except ValueError:
            church_config["color_palette"] = ColorPalette.WARM_GOLDEN

    # Build coherent image prompt from content
    builder = ImagePromptBuilder(church_config)

    # Map content types to prompt builder types
    prompt_type_map = {
        "daily_devotion": "devotion",
        "verse_of_the_day": "verse",
        "bible_figure": "figure",
        "daily_quiz": "quiz",
        "bible_study": "bible_study",
        "devotion_plan": "devotion_plan",
        "topical_category": "topical_category",
        "topical_verse": "topical_verse",
    }
    prompt_content_type = prompt_type_map.get(content_type, content_type)

    # Build the prompt (extracts visual elements from content)
    mood_override = None
    if mood:
        try:
            mood_override = ImageMood(mood)
        except ValueError:
            pass

    prompt_result = builder.build_prompt(
        content_type=prompt_content_type,
        content_data=content_data,
        mood_override=mood_override,
    )

    prompt = prompt_result["prompt"]
    negative_prompt = prompt_result["negative_prompt"]

    logger.info(f"Generating image for {content_type}")
    logger.debug(f"Image prompt: {prompt[:200]}...")

    # Call Stability AI API
    headers = {
        "Authorization": f"Bearer {stability_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    payload = {
        "text_prompts": [
            {"text": prompt, "weight": 1},
            {"text": negative_prompt, "weight": -1},
        ],
        "cfg_scale": cfg_scale,
        "height": height,
        "width": width,
        "steps": steps,
        "samples": 1,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            headers=headers,
            json=payload,
            timeout=120.0,
        )
        response.raise_for_status()
        data = response.json()

        return {
            "image_base64": data["artifacts"][0]["base64"],
            "seed": data["artifacts"][0]["seed"],
            "prompt_used": prompt,
            "negative_prompt": negative_prompt,
            "extracted_mood": prompt_result.get("extracted_mood"),
            "extracted_themes": prompt_result.get("extracted_themes", []),
        }


async def generate_sse_stream(
    content_generator: AsyncGenerator[str, None],
    content_type: str,
    church_id: str,
    user_id: str,
    generate_image: bool = False,
    image_options: Optional[Dict[str, Any]] = None,
) -> AsyncGenerator[str, None]:
    """
    Convert async generator to SSE format with structured events.

    Optionally generates a coherent image after text content completes.

    Events emitted:
    - start: Generation started
    - chunk: Text content chunk
    - complete: Text generation finished
    - image_start: Image generation starting (if generate_image=True)
    - image_complete: Image generation finished with base64 data
    - image_error: Image generation failed
    - error: General error
    - cancelled: Stream was cancelled
    """
    total_content = ""
    chunk_count = 0
    parsed_content = None

    try:
        # Send start event
        yield f"event: start\ndata: {json.dumps({'started': True, 'content_type': content_type, 'timestamp': datetime.utcnow().isoformat(), 'will_generate_image': generate_image})}\n\n"

        async for chunk in content_generator:
            chunk_count += 1
            total_content += chunk

            # Send content chunk
            yield f"event: chunk\ndata: {json.dumps({'content': chunk, 'chunk_number': chunk_count})}\n\n"

            # Small delay to prevent overwhelming client
            await asyncio.sleep(0.005)

        # Try to parse final JSON to validate
        try:
            parsed_content = json.loads(total_content)
            # Send completion event with parsed content
            yield f"event: complete\ndata: {json.dumps({'done': True, 'total_chunks': chunk_count, 'content': parsed_content})}\n\n"
        except json.JSONDecodeError:
            # Send raw content if not valid JSON
            yield f"event: complete\ndata: {json.dumps({'done': True, 'total_chunks': chunk_count, 'raw_content': total_content})}\n\n"

        # Generate coherent image if requested and content was valid
        if generate_image and parsed_content:
            yield f"event: image_start\ndata: {json.dumps({'started': True, 'content_type': content_type})}\n\n"

            try:
                options = image_options or {}
                image_result = await generate_coherent_image(
                    content_type=content_type,
                    content_data=parsed_content,
                    style=options.get("style", "spiritual_art"),
                    mood=options.get("mood"),
                    color_palette=options.get("color_palette", "warm_golden"),
                    width=options.get("width", 1024),
                    height=options.get("height", 1024),
                    steps=options.get("steps", 30),
                    cfg_scale=options.get("cfg_scale", 7.0),
                )

                # Send image result (base64 can be large, but SSE handles it)
                yield f"event: image_complete\ndata: {json.dumps({'done': True, 'image_base64': image_result['image_base64'], 'seed': image_result['seed'], 'prompt_used': image_result['prompt_used'][:500], 'extracted_themes': image_result['extracted_themes']})}\n\n"

            except Exception as img_error:
                logger.error(f"Image generation error: {img_error}")
                yield f"event: image_error\ndata: {json.dumps({'error': str(img_error)})}\n\n"

    except asyncio.CancelledError:
        yield f"event: cancelled\ndata: {json.dumps({'cancelled': True})}\n\n"
        raise
    except Exception as e:
        logger.error(f"SSE stream error: {e}")
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"


# ==============================================================================
# API Endpoints
# ==============================================================================

@router.post("/explore/{content_type}")
async def stream_explore_by_type(
    content_type: str,
    request: ExploreStreamRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream AI-generated Explore content by type with optional image generation.

    Supported content_types:
    - daily_devotion
    - verse_of_the_day
    - bible_figure
    - daily_quiz
    - bible_study
    - devotion_plan
    - topical_category
    - topical_verse

    Returns Server-Sent Events (SSE) stream.

    Events:
    - start: Generation started
    - chunk: Content chunk received
    - complete: Generation finished with parsed JSON
    - image_start: Image generation starting (if generate_image=True)
    - image_complete: Image generated with base64 data
    - image_error: Image generation failed
    - error: Error occurred
    - cancelled: Stream was cancelled

    For Bible figures with generate_image=True, the image will:
    - Use the figure's name, era, testament from generated text
    - Include key life moments from the timeline
    - Add figure-specific visual objects (David → harp, Moses → tablets)
    - Ensure historically accurate, dignified portrayal
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    valid_types = list(EXPLORE_PROMPTS.keys())
    if content_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content_type. Must be one of: {valid_types}"
        )

    # Build params from request
    params = {
        "custom_prompt": request.custom_prompt,
        "generate_both_languages": request.generate_both_languages,
        "topic": request.topic,
        "scripture_reference": request.scripture_reference,
        "figure_name": request.figure_name,
        "quiz_difficulty": request.quiz_difficulty or "medium",
        "num_questions": request.num_questions or 5,
        "study_duration": request.study_duration or 7,
    }

    # Build image options if image generation is requested
    image_options = None
    if request.generate_image:
        image_options = {
            "style": request.image_style or "spiritual_art",
            "width": request.image_width,
            "height": request.image_height,
        }

    content_generator = stream_explore_content(
        content_type=content_type,
        params=params,
        church_id=church_id,
        model=request.model
    )

    return StreamingResponse(
        generate_sse_stream(
            content_generator,
            content_type,
            church_id,
            user_id,
            generate_image=request.generate_image,
            image_options=image_options,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        }
    )


@router.post("/explore")
async def stream_explore_generic(
    request: ExploreStreamRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Stream AI-generated Explore content (content_type in body).

    Alternative endpoint where content_type is in request body.
    """
    return await stream_explore_by_type(
        content_type=request.content_type,
        request=request,
        current_user=current_user
    )


@router.post("/image")
async def generate_image_from_content(
    request: ImageGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a coherent image from already-generated content.

    This endpoint is useful when you want to:
    1. Generate an image separately from text generation
    2. Regenerate an image with different style/mood settings
    3. Generate multiple image variations for the same content

    The image generation uses ImagePromptBuilder to extract visual elements
    from the content and build a coherent prompt that matches the text.

    For Bible figures, the prompt will include:
    - Figure's name and historical era
    - Key life moments from timeline
    - Figure-specific visual objects (David → harp, Moses → tablets)
    - Negative prompts to ensure dignified, historically accurate portrayal

    Returns:
    - image_base64: Base64 encoded image
    - prompt_used: The prompt sent to Stability AI
    - negative_prompt: Negative prompt used
    - extracted_themes: Themes detected from content
    - seed: Random seed used for generation
    """
    try:
        result = await generate_coherent_image(
            content_type=request.content_type,
            content_data=request.content_data,
            style=request.style,
            mood=request.mood,
            color_palette=request.color_palette,
            width=request.width,
            height=request.height,
            steps=request.steps,
            cfg_scale=request.cfg_scale,
        )

        return {
            "success": True,
            "image_base64": result["image_base64"],
            "seed": result["seed"],
            "prompt_used": result["prompt_used"],
            "negative_prompt": result["negative_prompt"],
            "extracted_mood": result.get("extracted_mood"),
            "extracted_themes": result.get("extracted_themes", []),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
