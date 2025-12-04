"""
Claude AI Streaming Service

Provides streaming content generation using Anthropic's Claude API.
Uses async streaming for real-time content delivery via SSE.

Features:
- Streaming text generation
- Multiple content types (devotional, sermon notes, etc.)
- Church-specific settings support
- Token usage tracking
"""

import os
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional

import anthropic
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

# Default Claude model
DEFAULT_MODEL = "claude-3-5-sonnet-20241022"

# Content type prompts
CONTENT_PROMPTS = {
    "devotional": """You are a spiritual content writer creating a daily devotional for church members.
Write a thoughtful, encouraging devotional that:
- Is biblically grounded
- Relates to daily life
- Includes practical application
- Ends with a prayer

{topic_instruction}
{scripture_instruction}

Length: {length}
Language: {language}

Write in a warm, personal tone as if speaking to a beloved congregation member.""",

    "sermon_notes": """You are a skilled pastor preparing sermon notes.
Create structured sermon notes for: {title}

Scripture references: {scripture_references}
{key_points_instruction}
Style: {style}

Include:
1. Introduction with hook
2. Main points with scripture support
3. Relevant illustrations
4. Practical application points
5. Conclusion with call to action

Language: {language}

Write in a clear, organized format suitable for preaching.""",

    "prayer_prompt": """You are a prayer guide helping believers deepen their prayer life.
Create a guided prayer based on:

Theme: {theme}
Scripture: {scripture}

Include:
- Opening praise
- Thanksgiving section
- Confession prompt
- Supplication guidance
- Closing meditation

Language: {language}""",

    "bible_study_guide": """You are a Bible study leader creating an engaging study guide.

Passage: {passage}
Topic: {topic}

Create a study guide with:
1. Context and background
2. Key observations
3. Discussion questions (5-7)
4. Cross-references
5. Application points
6. Prayer points

Language: {language}""",

    "announcement": """You are a church communications specialist.
Write a church announcement for:

Event/Topic: {topic}
Key details: {details}
Call to action: {cta}

Make it engaging, clear, and concise.
Language: {language}""",

    "newsletter_article": """You are writing for a church newsletter.
Create an article about: {topic}

Style: {style}
Length: {length}
Key points to cover: {key_points}

Write in an engaging, accessible style.
Language: {language}""",
}


async def get_claude_client(church_id: Optional[str] = None) -> AsyncAnthropic:
    """
    Get an async Anthropic client.

    Args:
        church_id: Optional church ID for church-specific API keys

    Returns:
        AsyncAnthropic client
    """
    # Could load church-specific API key from database
    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    return AsyncAnthropic(api_key=api_key)


def build_prompt(content_type: str, params: Dict[str, Any]) -> str:
    """
    Build the prompt for a specific content type.

    Args:
        content_type: Type of content to generate
        params: Parameters for the prompt

    Returns:
        Formatted prompt string
    """
    template = CONTENT_PROMPTS.get(content_type)
    if not template:
        raise ValueError(f"Unknown content type: {content_type}")

    # Build instruction parts based on params
    if content_type == "devotional":
        topic_instruction = f"Topic: {params.get('topic')}" if params.get('topic') else "Choose an uplifting spiritual topic"
        scripture_instruction = f"Base it on: {params.get('scripture_reference')}" if params.get('scripture_reference') else ""

        length_map = {
            "short": "Around 200-300 words",
            "medium": "Around 400-500 words",
            "long": "Around 700-800 words"
        }
        length = length_map.get(params.get('length', 'medium'), length_map['medium'])

        return template.format(
            topic_instruction=topic_instruction,
            scripture_instruction=scripture_instruction,
            length=length,
            language=params.get('language', 'English')
        )

    elif content_type == "sermon_notes":
        key_points_instruction = ""
        if params.get('key_points'):
            key_points_instruction = f"Key points to cover: {', '.join(params['key_points'])}"

        return template.format(
            title=params.get('title', 'Untitled Sermon'),
            scripture_references=', '.join(params.get('scripture_references', [])),
            key_points_instruction=key_points_instruction,
            style=params.get('style', 'expository'),
            language=params.get('language', 'English')
        )

    elif content_type == "prayer_prompt":
        return template.format(
            theme=params.get('theme', 'general prayer'),
            scripture=params.get('scripture', ''),
            language=params.get('language', 'English')
        )

    elif content_type == "bible_study_guide":
        return template.format(
            passage=params.get('passage', ''),
            topic=params.get('topic', ''),
            language=params.get('language', 'English')
        )

    elif content_type == "announcement":
        return template.format(
            topic=params.get('topic', ''),
            details=params.get('details', ''),
            cta=params.get('cta', 'Join us!'),
            language=params.get('language', 'English')
        )

    elif content_type == "newsletter_article":
        return template.format(
            topic=params.get('topic', ''),
            style=params.get('style', 'informative'),
            length=params.get('length', 'medium'),
            key_points=', '.join(params.get('key_points', [])),
            language=params.get('language', 'English')
        )

    return template


async def stream_content_generation(
    content_type: str,
    params: Dict[str, Any],
    church_id: Optional[str] = None,
    model: str = DEFAULT_MODEL
) -> AsyncGenerator[str, None]:
    """
    Stream AI content generation.

    Args:
        content_type: Type of content to generate
        params: Generation parameters
        church_id: Church ID for settings
        model: Claude model to use

    Yields:
        Content chunks as they are generated
    """
    try:
        client = await get_claude_client(church_id)
        prompt = build_prompt(content_type, params)

        logger.info(f"Starting streaming generation: {content_type} for church {church_id}")

        async with client.messages.stream(
            model=model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text

        logger.info(f"Completed streaming generation: {content_type}")

    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        yield f"\n\n[Error: AI service temporarily unavailable. Please try again.]"
        raise

    except Exception as e:
        logger.error(f"Streaming generation error: {e}")
        raise


async def generate_content(
    content_type: str,
    params: Dict[str, Any],
    church_id: Optional[str] = None,
    model: str = DEFAULT_MODEL
) -> Dict[str, Any]:
    """
    Generate content (non-streaming).

    Args:
        content_type: Type of content to generate
        params: Generation parameters
        church_id: Church ID for settings
        model: Claude model to use

    Returns:
        Generated content with metadata
    """
    try:
        client = await get_claude_client(church_id)
        prompt = build_prompt(content_type, params)

        logger.info(f"Starting generation: {content_type} for church {church_id}")

        response = await client.messages.create(
            model=model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        content = response.content[0].text

        return {
            "content": content,
            "content_type": content_type,
            "model": model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }

    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise
