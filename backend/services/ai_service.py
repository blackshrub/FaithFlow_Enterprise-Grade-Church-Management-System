"""
AI Content Generation Service
Handles Claude API integration and content generation for Explore feature
"""

import os
import json
import asyncio
import base64
import logging
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime
import anthropic
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.system_config import get_ai_settings
from services.image_prompt_builder import ImagePromptBuilder, build_image_prompt

logger = logging.getLogger(__name__)


class AIService:
    """
    World-class AI service for generating spiritual content
    Uses Anthropic Claude for text generation and Stability AI for images
    Settings are loaded from database (System Settings page) with .env fallback.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._anthropic_api_key: Optional[str] = None
        self._stability_api_key: Optional[str] = None
        self._client: Optional[anthropic.Anthropic] = None
        self._initialized = False

        # Generation queue collection
        self.queue_collection = db.ai_generation_queue

        logger.info("AI Service created (settings will be loaded from database on first use)")

    async def _ensure_initialized(self):
        """Lazy initialization - load settings from database on first use"""
        if self._initialized:
            return

        ai_settings = await get_ai_settings(self.db)

        self._anthropic_api_key = ai_settings.get("anthropic_api_key")
        self._stability_api_key = ai_settings.get("stability_api_key")

        if not self._anthropic_api_key:
            logger.warning("Anthropic API key not configured - AI text generation will not work")
        else:
            self._client = anthropic.Anthropic(api_key=self._anthropic_api_key)

        if not self._stability_api_key:
            logger.warning("Stability API key not configured - Image generation will not work")

        self._initialized = True
        logger.info(f"AI Service initialized (Claude: {'✓' if self._anthropic_api_key else '✗'}, Stability: {'✓' if self._stability_api_key else '✗'})")

    @property
    def anthropic_api_key(self) -> Optional[str]:
        return self._anthropic_api_key

    @property
    def stability_api_key(self) -> Optional[str]:
        return self._stability_api_key

    @property
    def client(self) -> Optional[anthropic.Anthropic]:
        return self._client

    async def get_ai_config(self, church_id: str) -> Dict[str, Any]:
        """Get AI configuration for a church"""
        # Check if church has custom AI settings
        church_settings = await self.db.explore_church_settings.find_one(
            {"church_id": church_id}
        )

        if church_settings and church_settings.get("ai_generation_enabled"):
            return {
                "provider": "Anthropic Claude",
                "enabled": True,
                "model": church_settings.get("ai_model_preference", "claude-3-5-sonnet-20241022"),
                "credits_remaining": "Unlimited",  # Could implement credit tracking
                "auto_publish": church_settings.get("ai_auto_publish", False),
                "review_required": church_settings.get("ai_review_required", True),
            }

        # Default configuration
        return {
            "provider": "Anthropic Claude",
            "enabled": True,
            "model": "claude-3-5-sonnet-20241022",
            "credits_remaining": "Unlimited",
            "auto_publish": False,
            "review_required": True,
        }

    async def generate_content(
        self,
        content_type: str,
        model: str,
        church_id: str,
        user_id: str,
        custom_prompt: Optional[str] = None,
        generate_both_languages: bool = True,
    ) -> Dict[str, Any]:
        """
        Queue content generation job
        Returns job ID for tracking
        """
        # Ensure settings are loaded from database
        await self._ensure_initialized()

        if not self.client:
            raise ValueError("AI service not configured - please configure Anthropic API key in System Settings")

        # Create generation job
        job = {
            "content_type": content_type,
            "model": model,
            "church_id": church_id,
            "user_id": user_id,
            "custom_prompt": custom_prompt,
            "generate_both_languages": generate_both_languages,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "error_message": None,
            "generated_content": None,
        }

        result = await self.queue_collection.insert_one(job)
        job["_id"] = result.inserted_id

        # Start generation in background
        asyncio.create_task(self._process_generation_job(str(result.inserted_id)))

        logger.info(f"Queued AI generation job: {result.inserted_id} for {content_type}")

        return {
            "job_id": str(result.inserted_id),
            "status": "pending",
            "message": "Content generation started"
        }

    async def _process_generation_job(self, job_id: str):
        """Process a generation job asynchronously"""
        from bson import ObjectId

        try:
            # Update status to generating
            await self.queue_collection.update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$set": {
                        "status": "generating",
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Get job details
            job = await self.queue_collection.find_one({"_id": ObjectId(job_id)})
            if not job:
                logger.error(f"Job {job_id} not found")
                return

            # Generate content based on type
            content_type = job["content_type"]
            model = job["model"]
            custom_prompt = job.get("custom_prompt")
            generate_both_languages = job.get("generate_both_languages", True)

            # Generate text content
            if content_type == "devotion":
                generated = await self._generate_devotion(model, custom_prompt, generate_both_languages)
            elif content_type == "verse":
                generated = await self._generate_verse(model, custom_prompt, generate_both_languages)
            elif content_type == "figure":
                generated = await self._generate_figure(model, custom_prompt, generate_both_languages)
            elif content_type == "quiz":
                generated = await self._generate_quiz(model, custom_prompt, generate_both_languages)
            else:
                raise ValueError(f"Unknown content type: {content_type}")

            # Generate cover image for the content using enhanced prompt builder
            logger.info(f"Generating cover image for {content_type}...")

            # Get church-specific image configuration if available
            church_image_config = await self._get_church_image_config(church_id)

            # Build enhanced image prompt using the ImagePromptBuilder
            prompt_result = build_image_prompt(
                content_type=content_type,
                content_data=generated,
                church_config=church_image_config
            )

            logger.info(f"Built enhanced image prompt for {content_type}. Themes: {prompt_result.get('extracted_themes', [])}")

            # Generate image with enhanced prompt and negative prompt
            image_url = await self.generate_image_enhanced(
                prompt=prompt_result["prompt"],
                negative_prompt=prompt_result.get("negative_prompt", ""),
                content_type=content_type,
                aspect_ratio=church_image_config.get("aspect_ratio", "16:9") if church_image_config else "16:9"
            )

            if image_url:
                generated["image_url"] = image_url
                generated["image_metadata"] = {
                    "prompt_used": prompt_result["prompt"][:500],  # Store truncated prompt for reference
                    "extracted_mood": prompt_result.get("extracted_mood"),
                    "extracted_themes": prompt_result.get("extracted_themes", [])[:5],
                    "generated_at": datetime.utcnow().isoformat()
                }
                logger.info(f"Successfully generated image for job {job_id}")
            else:
                logger.warning(f"Image generation failed for job {job_id}, continuing without image")
                generated["image_url"] = ""  # Empty string indicates no image

            # Update job with generated content
            await self.queue_collection.update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$set": {
                        "status": "completed",
                        "generated_content": generated,
                        "updated_at": datetime.utcnow(),
                        "completed_at": datetime.utcnow()
                    }
                }
            )

            logger.info(f"Successfully generated content for job {job_id}")

        except Exception as e:
            logger.error(f"Error processing generation job {job_id}: {str(e)}")

            # Update job with error
            await self.queue_collection.update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )

    async def _generate_devotion(
        self,
        model: str,
        custom_prompt: Optional[str],
        generate_both_languages: bool
    ) -> Dict[str, Any]:
        """Generate a daily devotion using Claude"""

        # Build prompt
        base_prompt = custom_prompt or self._get_devotion_prompt()

        if generate_both_languages:
            prompt = f"""{base_prompt}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON, no other text
2. Include both English (en) and Indonesian (id) for all text fields
3. Use proper JSON escaping for quotes and special characters
4. Follow the exact structure below

Return JSON in this exact format:
{{
  "title": {{"en": "English title", "id": "Indonesian title"}},
  "bible_reference": "Book Chapter:Verse",
  "verse_text": "The actual Bible verse text in English",
  "content": {{"en": "English devotional content (300-400 words)", "id": "Indonesian devotional content"}},
  "prayer": {{"en": "English prayer", "id": "Indonesian prayer"}},
  "reflection_questions": {{
    "en": ["Question 1 in English", "Question 2 in English", "Question 3 in English"],
    "id": ["Question 1 in Indonesian", "Question 2 in Indonesian", "Question 3 in Indonesian"]
  }},
  "author": "FaithFlow AI",
  "tags": ["faith", "spiritual-growth"]
}}"""
        else:
            prompt = f"""{base_prompt}

Return JSON with English only, in this exact format:
{{
  "title": {{"en": "Title"}},
  "bible_reference": "Book Chapter:Verse",
  "verse_text": "The actual Bible verse text",
  "content": {{"en": "Devotional content (300-400 words)"}},
  "prayer": {{"en": "Prayer"}},
  "reflection_questions": {{"en": ["Question 1", "Question 2", "Question 3"]}},
  "author": "FaithFlow AI",
  "tags": ["faith", "spiritual-growth"]
}}"""

        # Call Claude API
        message = self.client.messages.create(
            model=model,
            max_tokens=4096,
            temperature=0.7,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        # Parse response
        response_text = message.content[0].text

        # Extract JSON from response (in case Claude adds explanation)
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("No valid JSON found in Claude response")

        json_text = response_text[json_start:json_end]
        generated = json.loads(json_text)

        return generated

    async def _generate_verse(
        self,
        model: str,
        custom_prompt: Optional[str],
        generate_both_languages: bool
    ) -> Dict[str, Any]:
        """Generate a verse of the day with all 4 required fields:
        - verse: BibleReference object (book, chapter, verse_start, verse_end, translation)
        - verse_text: The actual Scripture text (multilingual)
        - commentary: Theological explanation (multilingual)
        - reflection_prompt: Practical application prompt for personal reflection (multilingual)
        """

        base_prompt = custom_prompt or self._get_verse_prompt()

        if generate_both_languages:
            prompt = f"""{base_prompt}

CRITICAL: Return JSON in this EXACT format with all 4 required fields:
{{
  "verse": {{
    "book": "Book Name",
    "chapter": 1,
    "verse_start": 1,
    "verse_end": 2,
    "translation": "NIV"
  }},
  "verse_text": {{
    "en": "The actual Scripture verse text in English (exactly as written in the Bible)",
    "id": "Teks ayat Alkitab yang sebenarnya dalam Bahasa Indonesia"
  }},
  "commentary": {{
    "en": "Rich theological commentary (200-300 words) explaining the verse's context, meaning, and significance",
    "id": "Komentar teologis yang kaya (200-300 kata) menjelaskan konteks, makna, dan signifikansi ayat"
  }},
  "reflection_prompt": {{
    "en": "A thoughtful question or prompt for personal reflection and application (50-100 words)",
    "id": "Pertanyaan atau dorongan yang bijaksana untuk refleksi dan aplikasi pribadi (50-100 kata)"
  }},
  "theme": "main-theme-keyword",
  "tags": ["faith", "hope", "encouragement"]
}}

IMPORTANT:
- verse_text MUST contain the actual Scripture text from the Bible (not a paraphrase)
- commentary should explain the theological meaning and context
- reflection_prompt should help the reader apply this verse to their daily life"""
        else:
            prompt = f"""{base_prompt}

Return JSON with English only, same structure but only "en" field for text."""

        message = self.client.messages.create(
            model=model,
            max_tokens=3072,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        json_text = response_text[json_start:json_end]

        return json.loads(json_text)

    async def _generate_figure(
        self,
        model: str,
        custom_prompt: Optional[str],
        generate_both_languages: bool
    ) -> Dict[str, Any]:
        """Generate a Bible figure profile"""

        base_prompt = custom_prompt or self._get_figure_prompt()

        if generate_both_languages:
            prompt = f"""{base_prompt}

Return JSON in this exact format:
{{
  "name": {{"en": "English name", "id": "Indonesian name"}},
  "title": {{"en": "English title", "id": "Indonesian title"}},
  "testament": "old_testament",
  "summary": {{"en": "English summary (100 words)", "id": "Indonesian summary"}},
  "biography": {{"en": "English biography (400-500 words)", "id": "Indonesian biography"}},
  "timeline": [
    {{"year": "1000 BC", "event": {{"en": "Event in English", "id": "Event in Indonesian"}}}},
    {{"year": "990 BC", "event": {{"en": "Another event", "id": "Another event"}}}}
  ],
  "life_lessons": {{
    "en": ["Lesson 1 English", "Lesson 2 English", "Lesson 3 English"],
    "id": ["Lesson 1 Indonesian", "Lesson 2 Indonesian", "Lesson 3 Indonesian"]
  }},
  "related_scriptures": ["Genesis 12:1-3", "Hebrews 11:8-10"],
  "tags": ["patriarch", "faith"]
}}"""
        else:
            prompt = f"""{base_prompt}

Return JSON with English only."""

        message = self.client.messages.create(
            model=model,
            max_tokens=4096,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        json_text = response_text[json_start:json_end]

        return json.loads(json_text)

    async def _generate_quiz(
        self,
        model: str,
        custom_prompt: Optional[str],
        generate_both_languages: bool
    ) -> Dict[str, Any]:
        """Generate a Bible quiz"""

        base_prompt = custom_prompt or self._get_quiz_prompt()

        if generate_both_languages:
            prompt = f"""{base_prompt}

Return JSON in this exact format:
{{
  "title": {{"en": "English title", "id": "Indonesian title"}},
  "description": {{"en": "English description", "id": "Indonesian description"}},
  "category": "bible-knowledge",
  "difficulty": "medium",
  "time_limit_seconds": 300,
  "pass_percentage": 70,
  "questions": [
    {{
      "question": {{"en": "Question in English?", "id": "Question in Indonesian?"}},
      "options": {{
        "en": ["Option A English", "Option B English", "Option C English", "Option D English"],
        "id": ["Option A Indonesian", "Option B Indonesian", "Option C Indonesian", "Option D Indonesian"]
      }},
      "correct_answer": 0,
      "explanation": {{"en": "English explanation", "id": "Indonesian explanation"}}
    }}
  ]
}}

Generate 5-10 questions."""
        else:
            prompt = f"""{base_prompt}

Return JSON with English only. Generate 5-10 questions."""

        message = self.client.messages.create(
            model=model,
            max_tokens=4096,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        json_text = response_text[json_start:json_end]

        return json.loads(json_text)

    def _get_devotion_prompt(self) -> str:
        """Get default prompt for devotion generation"""
        return """You are a wise, theologically sound Christian devotional writer with deep knowledge of Scripture and pastoral care.

Generate an inspiring daily devotion that:
1. Centers on a specific Bible verse with proper reference
2. Provides deep, practical spiritual insight (300-400 words)
3. Connects Scripture to everyday Christian life
4. Includes a heartfelt prayer
5. Ends with 3 thoughtful reflection questions
6. Is theologically orthodox and Christ-centered
7. Is encouraging yet challenging
8. Uses clear, accessible language

The devotion should help readers grow in their faith and apply Scripture to daily life."""

    def _get_verse_prompt(self) -> str:
        """Get default prompt for verse generation"""
        return """You are a biblical scholar and theologian with expertise in hermeneutics and practical theology.

Generate a "Verse of the Day" with ALL 4 required components:

1. VERSE REFERENCE: Choose a meaningful, encouraging Bible verse (can be 1-3 verses max)
   - Prefer well-known, uplifting verses
   - Include book, chapter, verse numbers, and translation (NIV)

2. VERSE TEXT: The EXACT Scripture text as written in the Bible
   - Must be word-for-word from the Bible (NIV translation)
   - No paraphrasing or summarizing
   - Include the full text of all verses referenced

3. COMMENTARY: Rich theological explanation (200-300 words)
   - Historical and cultural context
   - Original Hebrew/Greek meaning (briefly)
   - Theological significance
   - How it fits in the broader biblical narrative

4. REFLECTION PROMPT: A personal application question (50-100 words)
   - Help the reader connect the verse to their daily life
   - Ask a thought-provoking question for meditation
   - Encourage practical steps of faith

The content should be scholarly yet accessible, theologically sound, and spiritually encouraging."""

    def _get_figure_prompt(self) -> str:
        """Get default prompt for Bible figure generation"""
        return """You are a biblical historian and theologian with expertise in ancient Near Eastern history and biblical biography.

Generate a comprehensive profile of a significant Bible figure that includes:
1. Name and title/description
2. Brief summary (100 words)
3. Detailed biography (400-500 words) covering:
   - Their background and historical context
   - Key events in their life
   - Their relationship with God
   - Their character strengths and weaknesses
   - Their lasting impact
4. Timeline of major life events with approximate dates
5. 3-5 key life lessons we can learn from them
6. Related Scripture references
7. Appropriate tags

Choose figures from both Old and New Testament. Be historically accurate and theologically sound."""

    def _get_quiz_prompt(self) -> str:
        """Get default prompt for quiz generation"""
        return """You are a Christian educator skilled in creating engaging biblical quizzes.

Generate a Bible knowledge quiz with:
1. A clear title and description
2. 5-10 multiple choice questions that:
   - Cover various aspects of Scripture
   - Range from easy to challenging (medium difficulty overall)
   - Test both knowledge and understanding
   - Include 4 plausible options each
   - Have clear, educational explanations for correct answers
3. Appropriate category and tags
4. Reasonable time limit (5 minutes)
5. Pass percentage of 70%

Questions should be engaging, educational, and encourage deeper Bible study."""

    async def get_generation_queue(self, church_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Get all generation jobs for a church/user"""

        cursor = self.queue_collection.find({
            "church_id": church_id,
            "user_id": user_id
        }).sort("created_at", -1).limit(50)

        jobs = await cursor.to_list(length=50)

        # Convert ObjectId to string
        for job in jobs:
            job["id"] = str(job.pop("_id"))

        return jobs

    async def accept_generated_content(
        self,
        job_id: str,
        church_id: str,
        user_id: str,
        edits: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Accept generated content and create actual content entry"""
        from bson import ObjectId

        # Get job
        job = await self.queue_collection.find_one({
            "_id": ObjectId(job_id),
            "church_id": church_id,
            "user_id": user_id
        })

        if not job:
            raise ValueError("Job not found")

        if job["status"] != "completed":
            raise ValueError("Job is not completed")

        # Get generated content
        content = job["generated_content"]

        # Apply edits if provided
        if edits:
            content.update(edits)

        # Add metadata
        content["church_id"] = church_id
        content["created_by"] = user_id
        content["created_at"] = datetime.utcnow()
        content["updated_at"] = datetime.utcnow()
        content["published"] = False  # Will be published via normal workflow
        content["ai_generated"] = True

        # Insert into appropriate collection
        content_type = job["content_type"]
        collection_name = f"explore_{content_type}s"
        collection = self.db[collection_name]

        result = await collection.insert_one(content)

        # Mark job as accepted
        await self.queue_collection.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "accepted": True,
                    "accepted_at": datetime.utcnow(),
                    "content_id": str(result.inserted_id)
                }
            }
        )

        logger.info(f"Accepted AI-generated {content_type} from job {job_id}")

        return {
            "content_id": str(result.inserted_id),
            "content_type": content_type,
            "message": "Content accepted and saved"
        }

    async def reject_generated_content(self, job_id: str, church_id: str, user_id: str):
        """Reject generated content"""
        from bson import ObjectId

        result = await self.queue_collection.update_one(
            {
                "_id": ObjectId(job_id),
                "church_id": church_id,
                "user_id": user_id
            },
            {
                "$set": {
                    "rejected": True,
                    "rejected_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count == 0:
            raise ValueError("Job not found or already processed")

        return {"message": "Content rejected"}

    async def regenerate_content(self, job_id: str, church_id: str, user_id: str) -> Dict[str, Any]:
        """Regenerate content with same parameters"""
        from bson import ObjectId

        # Get original job
        original_job = await self.queue_collection.find_one({
            "_id": ObjectId(job_id),
            "church_id": church_id,
            "user_id": user_id
        })

        if not original_job:
            raise ValueError("Original job not found")

        # Create new job with same parameters
        return await self.generate_content(
            content_type=original_job["content_type"],
            model=original_job["model"],
            church_id=church_id,
            user_id=user_id,
            custom_prompt=original_job.get("custom_prompt"),
            generate_both_languages=original_job.get("generate_both_languages", True)
        )

    async def generate_image(
        self,
        prompt: str,
        content_type: str,
        style: str = "spiritual-art"
    ) -> str:
        """
        Generate image using Stability AI
        Returns base64 encoded image or empty string if fails
        """
        # Ensure settings are loaded from database
        await self._ensure_initialized()

        if not self.stability_api_key:
            logger.warning("Stability AI key not set - skipping image generation")
            return ""

        try:
            # Style-specific enhancements
            style_prompts = {
                "spiritual-art": "beautiful spiritual art, soft lighting, warm colors, peaceful atmosphere, high quality, professional",
                "biblical": "biblical scene, religious art, classical painting style, divine light, reverent mood",
                "modern": "modern minimalist design, clean aesthetic, contemporary spiritual theme",
                "photorealistic": "photorealistic, natural lighting, high detail, professional photography"
            }

            enhanced_prompt = f"{prompt}, {style_prompts.get(style, style_prompts['spiritual-art'])}"

            # Call Stability AI API (using Ultra model for best quality)
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.stability.ai/v2beta/stable-image/generate/ultra",
                    headers={
                        "authorization": f"Bearer {self.stability_api_key}",
                        "accept": "image/*"
                    },
                    files={"none": ''},
                    data={
                        "prompt": enhanced_prompt,
                        "output_format": "png",
                        "aspect_ratio": "16:9",  # Perfect for cover images
                    }
                )

                if response.status_code == 200:
                    # Convert to base64 for storage
                    image_data = base64.b64encode(response.content).decode('utf-8')
                    logger.info(f"Successfully generated image for {content_type}")
                    return f"data:image/png;base64,{image_data}"
                else:
                    logger.error(f"Stability AI error: {response.status_code} - {response.text}")
                    return ""

        except Exception as e:
            logger.error(f"Image generation failed: {str(e)}")
            return ""

    async def generate_image_enhanced(
        self,
        prompt: str,
        negative_prompt: str = "",
        content_type: str = "devotion",
        aspect_ratio: str = "16:9"
    ) -> str:
        """
        Enhanced image generation using Stability AI with negative prompts.
        This is the new method that uses the ImagePromptBuilder's rich prompts.

        Args:
            prompt: The detailed, context-aware image prompt
            negative_prompt: Things to avoid in the image
            content_type: Type of content for logging
            aspect_ratio: Image aspect ratio (16:9, 1:1, 4:3, 9:16, 3:2)

        Returns:
            Base64 encoded image URL or empty string if fails
        """
        await self._ensure_initialized()

        if not self.stability_api_key:
            logger.warning("Stability AI key not set - skipping image generation")
            return ""

        try:
            # Validate aspect ratio
            valid_ratios = ["16:9", "1:1", "4:3", "9:16", "3:2", "21:9", "2:3", "4:5", "5:4"]
            if aspect_ratio not in valid_ratios:
                aspect_ratio = "16:9"

            # Build the request data
            request_data = {
                "prompt": prompt,
                "output_format": "png",
                "aspect_ratio": aspect_ratio,
            }

            # Add negative prompt if provided (Stability AI Ultra supports this)
            if negative_prompt:
                request_data["negative_prompt"] = negative_prompt

            logger.info(f"Generating enhanced image for {content_type} with {len(prompt)} char prompt")
            logger.debug(f"Negative prompt: {negative_prompt[:200]}..." if negative_prompt else "No negative prompt")

            # Call Stability AI API (using Ultra model for best quality)
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    "https://api.stability.ai/v2beta/stable-image/generate/ultra",
                    headers={
                        "authorization": f"Bearer {self.stability_api_key}",
                        "accept": "image/*"
                    },
                    files={"none": ''},
                    data=request_data
                )

                if response.status_code == 200:
                    # Convert to base64 for storage
                    image_data = base64.b64encode(response.content).decode('utf-8')
                    logger.info(f"Successfully generated enhanced image for {content_type}")
                    return f"data:image/png;base64,{image_data}"
                else:
                    logger.error(f"Stability AI error: {response.status_code} - {response.text}")
                    # Fall back to legacy method if enhanced fails
                    logger.info("Falling back to legacy image generation...")
                    return await self.generate_image(prompt[:500], content_type, "spiritual-art")

        except Exception as e:
            logger.error(f"Enhanced image generation failed: {str(e)}")
            # Fall back to legacy method
            try:
                return await self.generate_image(prompt[:500], content_type, "spiritual-art")
            except Exception:
                return ""

    async def _get_church_image_config(self, church_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the church's image generation configuration from their prompt config.

        Args:
            church_id: The church's ID

        Returns:
            Dictionary with image configuration or None if not found
        """
        try:
            # Try to get church's prompt configuration from database
            prompt_config = await self.db.explore_prompt_configs.find_one({
                "church_id": church_id
            })

            if prompt_config and "image_config" in prompt_config:
                image_config = prompt_config["image_config"]
                logger.debug(f"Found custom image config for church {church_id}")
                return image_config

            # Return default configuration if no custom config found
            logger.debug(f"Using default image config for church {church_id}")
            return {
                "image_style": "spiritual_art",
                "image_mood": "peaceful",
                "color_palette": "warm_golden",
                "aspect_ratio": "16:9",
                "include_people": True,
                "people_style": "silhouette",
                "avoid_elements": ["text_on_image", "modern_technology", "violence"],
            }

        except Exception as e:
            logger.warning(f"Error fetching church image config: {str(e)}")
            return None

    def _get_image_prompt_for_content(self, content_type: str, content_data: Dict[str, Any]) -> str:
        """Generate appropriate image prompt based on content type and data"""

        if content_type == "devotion":
            title = content_data.get("title", {}).get("en", "")
            ref = content_data.get("bible_reference", "")
            return f"Inspiring spiritual scene representing {title}, based on {ref}, peaceful and uplifting"

        elif content_type == "verse":
            ref = content_data.get("bible_reference", "")
            verse = content_data.get("verse_text", {}).get("en", "")[:100]
            return f"Beautiful spiritual imagery for Bible verse {ref}: {verse}, serene and meaningful"

        elif content_type == "figure":
            name = content_data.get("name", {}).get("en", "")
            testament = content_data.get("testament", "old_testament")
            era = "ancient biblical times" if testament == "old_testament" else "first century"
            return f"Dignified portrait representation of biblical figure {name} from {era}, respectful and historically evocative"

        elif content_type == "quiz":
            title = content_data.get("title", {}).get("en", "Bible Quiz")
            return f"Engaging biblical knowledge theme for {title}, open Bible, scrolls, ancient texts, welcoming and educational"

        return "Beautiful spiritual scene, peaceful and inspiring"
