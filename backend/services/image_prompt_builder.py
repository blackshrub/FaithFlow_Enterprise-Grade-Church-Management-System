"""
Enhanced Image Prompt Builder for Explore Content

This service creates rich, context-aware image prompts by:
1. Analyzing generated content for themes, emotions, and visual elements
2. Using church-specific style configurations
3. Applying content-type specific templates
4. Adding negative prompts to avoid inappropriate imagery

The goal is to generate images that are highly relevant and meaningful
for the spiritual content they accompany.
"""

import re
import logging
from typing import Dict, Any, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================================================
# IMAGE STYLE ENUMS
# ============================================================================

class ImageStyle(str, Enum):
    """Available image styles for content generation"""
    SPIRITUAL_ART = "spiritual_art"
    BIBLICAL_CLASSICAL = "biblical_classical"
    MODERN_MINIMAL = "modern_minimal"
    PHOTOREALISTIC = "photorealistic"
    WATERCOLOR = "watercolor"
    STAINED_GLASS = "stained_glass"
    CONTEMPORARY_WORSHIP = "contemporary_worship"
    NATURE_INSPIRED = "nature_inspired"


class ImageMood(str, Enum):
    """Mood/atmosphere for generated images"""
    PEACEFUL = "peaceful"
    JOYFUL = "joyful"
    REVERENT = "reverent"
    POWERFUL = "powerful"
    CONTEMPLATIVE = "contemplative"
    HOPEFUL = "hopeful"
    COMFORTING = "comforting"
    CELEBRATORY = "celebratory"


class ColorPalette(str, Enum):
    """Color palette preferences"""
    WARM_GOLDEN = "warm_golden"
    COOL_SERENE = "cool_serene"
    EARTH_TONES = "earth_tones"
    VIBRANT = "vibrant"
    PASTEL = "pastel"
    MONOCHROME = "monochrome"
    ROYAL_DEEP = "royal_deep"
    SUNRISE_SUNSET = "sunrise_sunset"


# ============================================================================
# STYLE PROMPT MAPPINGS
# ============================================================================

STYLE_PROMPTS = {
    ImageStyle.SPIRITUAL_ART: (
        "beautiful spiritual art, soft divine lighting, warm ethereal colors, "
        "peaceful sacred atmosphere, high quality digital painting, professional artwork, "
        "gentle rays of light, subtle holy presence"
    ),
    ImageStyle.BIBLICAL_CLASSICAL: (
        "classical biblical painting style, renaissance religious art, "
        "divine golden light, reverent mood, oil painting texture, "
        "traditional religious iconography, masterpiece quality"
    ),
    ImageStyle.MODERN_MINIMAL: (
        "modern minimalist design, clean aesthetic, contemporary spiritual theme, "
        "simple geometric shapes, negative space, subtle symbolism, "
        "professional graphic design, sophisticated"
    ),
    ImageStyle.PHOTOREALISTIC: (
        "photorealistic, natural lighting, high detail, professional photography, "
        "8K resolution, cinematic composition, realistic textures, "
        "dramatic natural scenery"
    ),
    ImageStyle.WATERCOLOR: (
        "beautiful watercolor painting, soft flowing colors, artistic brush strokes, "
        "dreamy atmosphere, delicate details, fine art quality, "
        "gentle color bleeding, artistic impression"
    ),
    ImageStyle.STAINED_GLASS: (
        "stained glass window style, vibrant jewel tones, light streaming through, "
        "cathedral aesthetic, intricate patterns, luminous colors, "
        "sacred art tradition, radiant beauty"
    ),
    ImageStyle.CONTEMPORARY_WORSHIP: (
        "contemporary Christian worship aesthetic, modern church style, "
        "dynamic lighting, concert atmosphere, inspirational mood, "
        "community gathering feel, uplifting energy"
    ),
    ImageStyle.NATURE_INSPIRED: (
        "nature photography with spiritual undertones, majestic landscapes, "
        "creation's beauty, sunrise or sunset colors, mountains rivers forests, "
        "God's creation, awe-inspiring natural scenery"
    ),
}

MOOD_PROMPTS = {
    ImageMood.PEACEFUL: "serene tranquil calm atmosphere, sense of inner peace, restful stillness",
    ImageMood.JOYFUL: "joyful celebration, bright uplifting mood, happiness and gratitude",
    ImageMood.REVERENT: "reverent sacred atmosphere, holy presence, worship and awe",
    ImageMood.POWERFUL: "powerful dramatic presence, strength and majesty, bold impactful",
    ImageMood.CONTEMPLATIVE: "contemplative reflective mood, quiet meditation, thoughtful depth",
    ImageMood.HOPEFUL: "hopeful optimistic atmosphere, new beginnings, light breaking through",
    ImageMood.COMFORTING: "comforting warm embrace, gentle reassurance, safe and loved",
    ImageMood.CELEBRATORY: "celebratory festive mood, praise and thanksgiving, joyous occasion",
}

COLOR_PALETTE_PROMPTS = {
    ColorPalette.WARM_GOLDEN: "warm golden yellow amber colors, sunset tones, honey and gold hues",
    ColorPalette.COOL_SERENE: "cool blue teal silver colors, peaceful ocean sky tones, calming",
    ColorPalette.EARTH_TONES: "earth tones brown green beige, natural organic colors, grounded",
    ColorPalette.VIBRANT: "vibrant rich saturated colors, bold and dynamic palette",
    ColorPalette.PASTEL: "soft pastel colors, gentle muted tones, delicate and subtle",
    ColorPalette.MONOCHROME: "monochrome grayscale with accent, sophisticated single hue",
    ColorPalette.ROYAL_DEEP: "deep royal purple blue gold, majestic rich colors, regal",
    ColorPalette.SUNRISE_SUNSET: "sunrise sunset colors, pink orange purple gradient, divine light",
}


# ============================================================================
# NEGATIVE PROMPTS (Things to avoid in religious content)
# ============================================================================

BASE_NEGATIVE_PROMPT = (
    "text, words, letters, watermark, signature, logo, "
    "ugly, deformed, disfigured, blurry, low quality, "
    "violence, blood, gore, weapons, "
    "inappropriate, offensive, disrespectful, "
    "modern technology, smartphones, computers, "
    "cartoon, anime, childish (unless specified), "
    "dark occult satanic symbols, "
    "historically inaccurate clothing (for biblical scenes), "
    "multiple limbs, extra fingers, distorted faces"
)

CONTENT_TYPE_NEGATIVE_PROMPTS = {
    "devotion": "scary, frightening, disturbing, nightmare imagery",
    "verse": "cluttered, busy, distracting elements, too many objects",
    "figure": "caricature, mockery, undignified portrayal, fantasy creature features",
    "quiz": "boring, plain, unappealing, childish cartoon",
    "bible_study": "casual, unprofessional, distracting",
    "topical_category": "generic stock photo, corporate, impersonal",
    "topical_verse": "abstract meaningless, disconnected from theme",
    "devotion_plan": "inconsistent style, jarring",
    "shareable_image": "poor composition, hard to read overlay area",
}


# ============================================================================
# CONTENT-TYPE SPECIFIC PROMPT TEMPLATES
# ============================================================================

CONTENT_TYPE_TEMPLATES = {
    "devotion": {
        "base": (
            "Create a spiritual cover image for a daily devotion titled '{title}'. "
            "The devotion is based on {bible_reference} and explores the theme of {theme}. "
            "Key visual elements to consider: {visual_elements}. "
            "The mood should be {mood} with {color_description} colors."
        ),
        "visual_elements_extraction": [
            "title", "content", "reflection_questions", "prayer"
        ],
    },
    "verse": {
        "base": (
            "Create a beautiful background image for a Bible verse display. "
            "The verse is {bible_reference}: '{verse_snippet}'. "
            "The verse speaks about {theme}. "
            "Visual setting: {visual_setting}. "
            "Mood: {mood}, leaving space for text overlay."
        ),
        "visual_elements_extraction": [
            "verse_text", "commentary", "reflection_prompt"
        ],
    },
    "figure": {
        "base": (
            "Create a dignified portrait representation of the biblical figure {name}. "
            "{name} was {brief_description}. "
            "Era: {era}, Testament: {testament}. "
            "Key life moment to capture: {key_moment}. "
            "Style: {style}, historically respectful and spiritually meaningful."
        ),
        "visual_elements_extraction": [
            "name", "biography", "timeline", "life_lessons"
        ],
    },
    "quiz": {
        "base": (
            "Create an engaging, welcoming image for a Bible quiz titled '{title}'. "
            "Quiz topic: {topic}. Difficulty: {difficulty}. "
            "Visual theme: open Bible, ancient scrolls, soft study lighting. "
            "Mood: inviting and educational, encouraging participation."
        ),
        "visual_elements_extraction": [
            "title", "questions"
        ],
    },
    "bible_study": {
        "base": (
            "Create a cover image for a Bible study series titled '{title}'. "
            "Study theme: {theme}. Duration: {duration}. "
            "The study explores {description}. "
            "Visual elements: {visual_elements}. "
            "Mood: {mood}, inviting deep exploration."
        ),
        "visual_elements_extraction": [
            "title", "description", "lessons"
        ],
    },
    "topical_category": {
        "base": (
            "Create a category icon/cover for a topical Bible study category: '{name}'. "
            "This category addresses: {description}. "
            "Visual symbol: {icon_suggestion}. "
            "Color theme: {color}. "
            "Style: clean, recognizable, spiritually meaningful."
        ),
        "visual_elements_extraction": [
            "name", "description"
        ],
    },
    "topical_verse": {
        "base": (
            "Create an image for a topical verse about {topic}. "
            "Verse: {verse_reference}. "
            "Key theme: {key_theme}. "
            "Visual metaphor: {visual_metaphor}. "
            "Mood: {mood}, connecting scripture to daily life."
        ),
        "visual_elements_extraction": [
            "verse", "commentary", "application"
        ],
    },
    "devotion_plan": {
        "base": (
            "Create a cover image for a {duration}-day devotion plan titled '{title}'. "
            "Theme: {theme}. Journey concept: {journey_description}. "
            "Visual representation of spiritual growth and progression. "
            "Mood: {mood}, inviting users to commit to the journey."
        ),
        "visual_elements_extraction": [
            "title", "description", "days"
        ],
    },
    "shareable_image": {
        "base": (
            "Create a social media-ready background image for a Bible verse. "
            "Verse: {verse_reference}. Theme: {theme}. "
            "Leave clear space for text overlay at {text_position}. "
            "Color scheme: {color_scheme}. Mood: {mood}. "
            "Optimized for Instagram/Facebook sharing."
        ),
        "visual_elements_extraction": [
            "verse_reference", "verse_text", "overlay_text"
        ],
    },
}


# ============================================================================
# THEME EXTRACTION KEYWORDS
# ============================================================================

THEME_VISUAL_MAPPINGS = {
    # Emotions and States
    "peace": {"visuals": "calm waters, gentle breeze, soft clouds, resting place", "mood": ImageMood.PEACEFUL},
    "anxiety": {"visuals": "storm calming, safe shelter, steady anchor", "mood": ImageMood.COMFORTING},
    "fear": {"visuals": "light breaking darkness, protective presence, strong fortress", "mood": ImageMood.HOPEFUL},
    "joy": {"visuals": "sunrise, dancing light, celebration, blooming flowers", "mood": ImageMood.JOYFUL},
    "hope": {"visuals": "dawn breaking, new growth, path forward, horizon", "mood": ImageMood.HOPEFUL},
    "love": {"visuals": "warm embrace, gentle hands, heart symbolism, connection", "mood": ImageMood.COMFORTING},
    "faith": {"visuals": "stepping stones, mountain peak, steady rock, anchor", "mood": ImageMood.REVERENT},
    "trust": {"visuals": "solid foundation, guiding hand, clear path", "mood": ImageMood.PEACEFUL},
    "strength": {"visuals": "mighty mountain, strong tower, oak tree, lion", "mood": ImageMood.POWERFUL},
    "courage": {"visuals": "warrior shield, lion, rising sun, standing firm", "mood": ImageMood.POWERFUL},
    "wisdom": {"visuals": "ancient scrolls, lamp light, olive tree, owl", "mood": ImageMood.CONTEMPLATIVE},
    "guidance": {"visuals": "shepherd's staff, lighthouse, compass, star", "mood": ImageMood.HOPEFUL},
    "forgiveness": {"visuals": "broken chains, open arms, fresh start, clean water", "mood": ImageMood.COMFORTING},
    "grace": {"visuals": "flowing water, gentle rain, soft light descending", "mood": ImageMood.PEACEFUL},
    "mercy": {"visuals": "gentle hands, healing touch, morning dew", "mood": ImageMood.COMFORTING},
    "salvation": {"visuals": "cross on hill, empty tomb, bridge over chasm", "mood": ImageMood.HOPEFUL},
    "worship": {"visuals": "raised hands, cathedral light, kneeling figure", "mood": ImageMood.REVERENT},
    "prayer": {"visuals": "folded hands, quiet room, sunrise meditation", "mood": ImageMood.CONTEMPLATIVE},
    "gratitude": {"visuals": "harvest abundance, open hands receiving, thanksgiving", "mood": ImageMood.JOYFUL},
    "healing": {"visuals": "gentle touch, sunrise, flowing stream, restoration", "mood": ImageMood.COMFORTING},
    "patience": {"visuals": "growing seed, waiting dawn, steady river", "mood": ImageMood.PEACEFUL},
    "perseverance": {"visuals": "climbing mountain, marathon runner, steady flame", "mood": ImageMood.POWERFUL},
    "humility": {"visuals": "bowing figure, servant's basin, low valley", "mood": ImageMood.REVERENT},
    "obedience": {"visuals": "following path, sheep and shepherd, open door", "mood": ImageMood.PEACEFUL},

    # Biblical Themes
    "creation": {"visuals": "starry sky, garden paradise, forming hands, light emerging", "mood": ImageMood.REVERENT},
    "redemption": {"visuals": "cross, breaking chains, rescue, paid price", "mood": ImageMood.HOPEFUL},
    "covenant": {"visuals": "rainbow, handshake, scroll, promise symbol", "mood": ImageMood.REVERENT},
    "kingdom": {"visuals": "crown, throne, golden city, royal robes", "mood": ImageMood.POWERFUL},
    "resurrection": {"visuals": "empty tomb, sunrise, new life, butterfly", "mood": ImageMood.JOYFUL},
    "holy spirit": {"visuals": "dove descending, flame, wind, water flowing", "mood": ImageMood.REVERENT},
    "trinity": {"visuals": "three-fold symbol, intertwined circles, unified light", "mood": ImageMood.REVERENT},

    # Life Situations
    "marriage": {"visuals": "two becoming one, intertwined rings, united path", "mood": ImageMood.JOYFUL},
    "family": {"visuals": "gathered table, protective arms, home hearth", "mood": ImageMood.COMFORTING},
    "work": {"visuals": "skilled hands, honest labor, building together", "mood": ImageMood.PEACEFUL},
    "finances": {"visuals": "open hands, stewardship, treasure in heaven", "mood": ImageMood.PEACEFUL},
    "health": {"visuals": "healing waters, wholeness, vitality", "mood": ImageMood.HOPEFUL},
    "grief": {"visuals": "comforting presence, tears held, valley walking", "mood": ImageMood.COMFORTING},
    "loneliness": {"visuals": "never alone presence, companion on path", "mood": ImageMood.COMFORTING},
    "temptation": {"visuals": "shield of faith, armor, standing firm", "mood": ImageMood.POWERFUL},
    "purpose": {"visuals": "calling, mission path, destined journey", "mood": ImageMood.HOPEFUL},
}


# ============================================================================
# IMAGE PROMPT BUILDER CLASS
# ============================================================================

class ImagePromptBuilder:
    """
    Builds rich, context-aware image prompts for Explore content.

    This class analyzes the generated text content and combines it with
    church-specific style preferences to create optimal image generation prompts.
    """

    def __init__(self, church_config: Optional[Dict[str, Any]] = None):
        """
        Initialize the prompt builder with optional church configuration.

        Args:
            church_config: Church-specific image preferences from prompt_config
        """
        self.church_config = church_config or {}

        # Extract church preferences with defaults
        self.default_style = self.church_config.get("image_style", ImageStyle.SPIRITUAL_ART)
        self.default_mood = self.church_config.get("image_mood", ImageMood.PEACEFUL)
        self.default_palette = self.church_config.get("color_palette", ColorPalette.WARM_GOLDEN)
        self.custom_style_notes = self.church_config.get("custom_style_notes", "")

    def build_prompt(
        self,
        content_type: str,
        content_data: Dict[str, Any],
        style_override: Optional[ImageStyle] = None,
        mood_override: Optional[ImageMood] = None,
        palette_override: Optional[ColorPalette] = None,
    ) -> Dict[str, str]:
        """
        Build a complete image generation prompt for the given content.

        Args:
            content_type: Type of content (devotion, verse, figure, etc.)
            content_data: The generated content data
            style_override: Optional style override
            mood_override: Optional mood override
            palette_override: Optional color palette override

        Returns:
            Dict with 'prompt' and 'negative_prompt' keys
        """
        # Determine style settings
        style = style_override or self.default_style
        mood = mood_override or self._extract_mood_from_content(content_data)
        palette = palette_override or self.default_palette

        # Extract visual elements from content
        visual_elements = self._extract_visual_elements(content_type, content_data)

        # Build the base prompt from template
        base_prompt = self._build_base_prompt(content_type, content_data, visual_elements, mood)

        # Enhance with style, mood, and palette
        enhanced_prompt = self._enhance_prompt(base_prompt, style, mood, palette)

        # Add church-specific customizations
        if self.custom_style_notes:
            enhanced_prompt += f", {self.custom_style_notes}"

        # Build negative prompt
        negative_prompt = self._build_negative_prompt(content_type)

        logger.info(f"Built image prompt for {content_type}: {len(enhanced_prompt)} chars")

        return {
            "prompt": enhanced_prompt,
            "negative_prompt": negative_prompt,
            "extracted_mood": mood.value if isinstance(mood, ImageMood) else mood,
            "extracted_themes": visual_elements.get("themes", []),
        }

    def _extract_visual_elements(
        self,
        content_type: str,
        content_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract visual elements and themes from content data."""
        elements = {
            "themes": [],
            "visual_suggestions": [],
            "setting": "",
            "key_objects": [],
        }

        # Get all text content for theme extraction
        text_content = self._get_all_text_content(content_data)

        # Extract themes from text
        elements["themes"] = self._extract_themes(text_content)

        # Get visual suggestions based on themes
        for theme in elements["themes"][:3]:  # Top 3 themes
            if theme.lower() in THEME_VISUAL_MAPPINGS:
                mapping = THEME_VISUAL_MAPPINGS[theme.lower()]
                elements["visual_suggestions"].append(mapping["visuals"])

        # Content-type specific extraction
        if content_type == "devotion":
            elements["setting"] = self._extract_devotion_setting(content_data)
            elements["key_objects"] = self._extract_devotion_objects(content_data)
        elif content_type == "verse":
            elements["setting"] = self._extract_verse_setting(content_data)
        elif content_type == "figure":
            elements["setting"] = self._extract_figure_setting(content_data)
            elements["key_objects"] = self._extract_figure_objects(content_data)
        elif content_type == "bible_study":
            elements["setting"] = "study environment, open Bible, gathering space"
        elif content_type == "shareable_image":
            elements["setting"] = content_data.get("mood", "peaceful contemplative")

        return elements

    def _get_all_text_content(self, content_data: Dict[str, Any]) -> str:
        """Concatenate all text fields from content data."""
        text_parts = []

        def extract_text(obj, depth=0):
            if depth > 3:  # Prevent infinite recursion
                return
            if isinstance(obj, str):
                text_parts.append(obj)
            elif isinstance(obj, dict):
                for key, value in obj.items():
                    if key in ['en', 'id', 'title', 'content', 'description',
                               'commentary', 'reflection', 'prayer', 'application',
                               'biography', 'life_lessons', 'verse_text']:
                        extract_text(value, depth + 1)
            elif isinstance(obj, list):
                for item in obj[:5]:  # Limit list items
                    extract_text(item, depth + 1)

        extract_text(content_data)
        return " ".join(text_parts)

    def _extract_themes(self, text: str) -> List[str]:
        """Extract main themes from text content."""
        themes = []
        text_lower = text.lower()

        # Check for theme keywords
        for theme, mapping in THEME_VISUAL_MAPPINGS.items():
            if theme in text_lower:
                themes.append(theme)

        # Sort by frequency/importance (simple heuristic: earlier mention = more important)
        themes_with_position = [(theme, text_lower.find(theme)) for theme in themes]
        themes_with_position.sort(key=lambda x: x[1])

        return [t[0] for t in themes_with_position[:5]]  # Top 5 themes

    def _extract_mood_from_content(self, content_data: Dict[str, Any]) -> ImageMood:
        """Determine the appropriate mood from content analysis."""
        text = self._get_all_text_content(content_data)
        text_lower = text.lower()

        # Check themes and return associated mood
        for theme, mapping in THEME_VISUAL_MAPPINGS.items():
            if theme in text_lower:
                return mapping["mood"]

        return self.default_mood

    def _extract_devotion_setting(self, content_data: Dict[str, Any]) -> str:
        """Extract visual setting from devotion content."""
        text = self._get_all_text_content(content_data)

        # Look for location/setting keywords
        settings = []
        setting_keywords = {
            "garden": "peaceful garden with flowers",
            "mountain": "majestic mountain landscape",
            "sea": "calm seashore with gentle waves",
            "river": "flowing river with greenery",
            "forest": "serene forest with light filtering through",
            "valley": "green valley with soft hills",
            "desert": "desert with oasis, stars visible",
            "city": "rooftop view at golden hour",
            "home": "warm interior with soft lighting",
            "church": "sacred space with divine light",
            "path": "winding path through nature",
            "sky": "expansive sky with clouds",
        }

        text_lower = text.lower()
        for keyword, setting in setting_keywords.items():
            if keyword in text_lower:
                settings.append(setting)

        return ", ".join(settings[:2]) if settings else "peaceful natural landscape with soft lighting"

    def _extract_devotion_objects(self, content_data: Dict[str, Any]) -> List[str]:
        """Extract key objects/symbols from devotion content."""
        text = self._get_all_text_content(content_data)
        text_lower = text.lower()

        objects = []
        object_keywords = [
            "cross", "bible", "lamp", "dove", "bread", "wine", "water",
            "light", "fire", "crown", "shepherd", "sheep", "anchor",
            "rainbow", "olive", "vine", "wheat", "fish", "boat"
        ]

        for obj in object_keywords:
            if obj in text_lower:
                objects.append(obj)

        return objects[:3]

    def _extract_verse_setting(self, content_data: Dict[str, Any]) -> str:
        """Extract visual setting from verse content."""
        verse_text = content_data.get("verse_text", {}).get("en", "")
        commentary = content_data.get("commentary", {}).get("en", "")

        combined = f"{verse_text} {commentary}".lower()

        # Simple setting extraction
        if any(word in combined for word in ["water", "sea", "river", "stream"]):
            return "calm waters reflecting sky"
        elif any(word in combined for word in ["mountain", "hill", "rock"]):
            return "majestic mountain with misty peaks"
        elif any(word in combined for word in ["garden", "flower", "tree", "fruit"]):
            return "beautiful garden in soft light"
        elif any(word in combined for word in ["light", "sun", "dawn", "morning"]):
            return "sunrise with golden rays"
        elif any(word in combined for word in ["night", "star", "moon"]):
            return "peaceful starry night sky"
        else:
            return "serene natural backdrop with soft lighting"

    def _extract_figure_setting(self, content_data: Dict[str, Any]) -> str:
        """Extract setting for biblical figure portrait."""
        testament = content_data.get("testament", "old_testament")
        era = content_data.get("era", "")

        if testament == "old_testament":
            return "ancient Middle Eastern setting, desert landscape, clay buildings"
        else:
            return "first century Judea, Roman era architecture, Mediterranean climate"

    def _extract_figure_objects(self, content_data: Dict[str, Any]) -> List[str]:
        """Extract objects associated with biblical figure."""
        name = content_data.get("name", {}).get("en", "").lower()

        # Common figure associations
        figure_objects = {
            "david": ["harp", "shepherd's staff", "crown", "sling"],
            "moses": ["staff", "tablets", "burning bush"],
            "abraham": ["tent", "stars", "altar"],
            "joseph": ["colorful robe", "wheat sheaves", "pharaoh's ring"],
            "daniel": ["lions", "scroll", "prayer posture"],
            "paul": ["scrolls", "chains", "ship"],
            "peter": ["fishing net", "keys", "rooster"],
            "mary": ["gentle light", "humble setting", "infant"],
            "jesus": ["cross", "crown of thorns", "bread and wine", "sheep"],
        }

        for figure_name, objects in figure_objects.items():
            if figure_name in name:
                return objects[:2]

        return ["ancient scroll", "period-appropriate clothing"]

    def _build_base_prompt(
        self,
        content_type: str,
        content_data: Dict[str, Any],
        visual_elements: Dict[str, Any],
        mood: ImageMood
    ) -> str:
        """Build the base prompt using content-type template."""
        template_info = CONTENT_TYPE_TEMPLATES.get(content_type, {})
        template = template_info.get("base", "Beautiful spiritual scene, {mood} atmosphere")

        # Prepare template variables
        variables = {
            "title": self._get_localized_text(content_data.get("title", {}), "Spiritual Content"),
            "theme": ", ".join(visual_elements.get("themes", ["faith", "hope"])),
            "bible_reference": content_data.get("bible_reference", "Scripture"),
            "verse_snippet": self._get_verse_snippet(content_data),
            "visual_elements": ", ".join(visual_elements.get("visual_suggestions", ["peaceful scene"])),
            "visual_setting": visual_elements.get("setting", "serene natural landscape"),
            "mood": MOOD_PROMPTS.get(mood, "peaceful and contemplative"),
            "color_description": COLOR_PALETTE_PROMPTS.get(self.default_palette, "warm harmonious colors"),
            "name": self._get_localized_text(content_data.get("name", {}), "Biblical Figure"),
            "brief_description": self._get_brief_description(content_data),
            "era": content_data.get("era", "biblical times"),
            "testament": content_data.get("testament", "").replace("_", " "),
            "key_moment": self._get_key_moment(content_data),
            "style": STYLE_PROMPTS.get(self.default_style, "spiritual art"),
            "topic": self._get_localized_text(content_data.get("topic", {}), "Biblical wisdom"),
            "difficulty": content_data.get("difficulty", "medium"),
            "description": self._get_localized_text(content_data.get("description", {}), "spiritual growth"),
            "duration": content_data.get("duration_days", content_data.get("duration", "7")),
            "journey_description": self._get_journey_description(content_data),
            "icon_suggestion": content_data.get("icon", "spiritual symbol"),
            "color": content_data.get("color", "#4A90D9"),
            "key_theme": visual_elements.get("themes", ["spiritual growth"])[0] if visual_elements.get("themes") else "spiritual growth",
            "visual_metaphor": visual_elements.get("visual_suggestions", [""])[0] if visual_elements.get("visual_suggestions") else "meaningful imagery",
            "text_position": content_data.get("text_position", "center"),
            "color_scheme": content_data.get("color_scheme", "light"),
            "verse_reference": content_data.get("verse_reference", content_data.get("bible_reference", "")),
        }

        # Format template with available variables
        try:
            prompt = template.format(**variables)
        except KeyError as e:
            logger.warning(f"Missing template variable: {e}")
            prompt = f"Beautiful spiritual scene representing {variables.get('title', 'faith')}"

        return prompt

    def _get_localized_text(self, text_obj: Any, default: str = "") -> str:
        """Get English text from localized object."""
        if isinstance(text_obj, str):
            return text_obj
        if isinstance(text_obj, dict):
            return text_obj.get("en", text_obj.get("id", default))
        return default

    def _get_verse_snippet(self, content_data: Dict[str, Any]) -> str:
        """Get a short snippet of the verse text."""
        verse_text = content_data.get("verse_text", {})
        text = self._get_localized_text(verse_text, "")
        return text[:100] + "..." if len(text) > 100 else text

    def _get_brief_description(self, content_data: Dict[str, Any]) -> str:
        """Get brief description for figure."""
        bio = content_data.get("biography", {})
        text = self._get_localized_text(bio, "")
        if text:
            # Get first sentence
            sentences = text.split(".")
            return sentences[0] + "." if sentences else ""
        return "a significant figure in biblical history"

    def _get_key_moment(self, content_data: Dict[str, Any]) -> str:
        """Extract a key moment from figure's timeline."""
        timeline = content_data.get("timeline", [])
        if timeline and len(timeline) > 0:
            # Get first major event
            event = timeline[0]
            return self._get_localized_text(event.get("event", {}), "pivotal moment in their journey")
        return "defining moment of faith"

    def _get_journey_description(self, content_data: Dict[str, Any]) -> str:
        """Get journey description for devotion plan."""
        desc = content_data.get("description", {})
        text = self._get_localized_text(desc, "")
        if text:
            return text[:150]
        return "spiritual journey of growth and transformation"

    def _enhance_prompt(
        self,
        base_prompt: str,
        style: ImageStyle,
        mood: ImageMood,
        palette: ColorPalette
    ) -> str:
        """Enhance the base prompt with style, mood, and palette."""
        style_text = STYLE_PROMPTS.get(style, STYLE_PROMPTS[ImageStyle.SPIRITUAL_ART])
        mood_text = MOOD_PROMPTS.get(mood, MOOD_PROMPTS[ImageMood.PEACEFUL])
        palette_text = COLOR_PALETTE_PROMPTS.get(palette, COLOR_PALETTE_PROMPTS[ColorPalette.WARM_GOLDEN])

        enhanced = f"{base_prompt}. Style: {style_text}. Atmosphere: {mood_text}. Colors: {palette_text}."

        # Add quality boosters
        enhanced += " Masterpiece quality, highly detailed, professional composition, 8K resolution."

        return enhanced

    def _build_negative_prompt(self, content_type: str) -> str:
        """Build negative prompt for content type."""
        content_specific = CONTENT_TYPE_NEGATIVE_PROMPTS.get(content_type, "")

        negative_prompt = BASE_NEGATIVE_PROMPT
        if content_specific:
            negative_prompt += f", {content_specific}"

        return negative_prompt


# ============================================================================
# CONVENIENCE FUNCTION
# ============================================================================

def build_image_prompt(
    content_type: str,
    content_data: Dict[str, Any],
    church_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    """
    Convenience function to build an image prompt.

    Args:
        content_type: Type of content
        content_data: Generated content data
        church_config: Optional church-specific image preferences

    Returns:
        Dict with 'prompt' and 'negative_prompt'
    """
    builder = ImagePromptBuilder(church_config)
    return builder.build_prompt(content_type, content_data)
