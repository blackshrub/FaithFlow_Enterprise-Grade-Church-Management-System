"""
AI Prompt Management

Template-based prompt system with:
- Multi-language support
- Variable interpolation
- Versioning
- Best practices for content generation
"""

from typing import Dict, Any, Optional, List
from string import Template
import logging

from models.explore import PromptConfiguration

logger = logging.getLogger(__name__)


class PromptManager:
    """Manages AI prompt templates"""

    def __init__(self, prompts: List[PromptConfiguration]):
        """
        Initialize with list of prompt configurations

        Args:
            prompts: List of PromptConfiguration objects
        """
        self.prompts = {
            f"{p.content_type}:{p.language}:{p.version}": p
            for p in prompts
            if p.active
        }

    def get_prompt(
        self,
        content_type: str,
        language: str = "en",
        version: Optional[str] = None,
    ) -> Optional[PromptConfiguration]:
        """
        Get prompt configuration

        Args:
            content_type: Type of content to generate
            language: Language code (en, id)
            version: Specific version (defaults to latest)

        Returns:
            PromptConfiguration or None if not found
        """
        if version:
            key = f"{content_type}:{language}:{version}"
            return self.prompts.get(key)

        # Find latest version
        matching = [
            (k, p)
            for k, p in self.prompts.items()
            if k.startswith(f"{content_type}:{language}:")
        ]

        if not matching:
            logger.warning(
                f"No prompt found for content_type={content_type}, language={language}"
            )
            return None

        # Sort by version (semantic versioning)
        matching.sort(key=lambda x: self._version_key(x[1].version), reverse=True)
        return matching[0][1]

    def render_prompt(
        self,
        content_type: str,
        variables: Dict[str, Any],
        language: str = "en",
        version: Optional[str] = None,
    ) -> Optional[str]:
        """
        Render prompt with variables

        Args:
            content_type: Type of content
            variables: Variables to interpolate
            language: Language code
            version: Specific version

        Returns:
            Rendered prompt string or None
        """
        prompt_config = self.get_prompt(content_type, language, version)
        if not prompt_config:
            return None

        # Validate variables
        missing = set(prompt_config.variables) - set(variables.keys())
        if missing:
            logger.error(
                f"Missing required variables for {content_type}: {missing}"
            )
            return None

        # Render template
        try:
            template = Template(prompt_config.template)
            return template.safe_substitute(variables)
        except Exception as e:
            logger.error(f"Failed to render prompt: {e}")
            return None

    def _version_key(self, version: str) -> tuple:
        """Convert semantic version to tuple for sorting"""
        try:
            parts = version.split(".")
            return tuple(int(p) for p in parts)
        except:
            return (0, 0, 0)


# ==================== DEFAULT PROMPTS ====================

DEFAULT_PROMPTS = {
    # Daily Devotion
    "daily_devotion:en": """You are a Christian devotional writer creating inspiring daily devotions.

Create a daily devotion with the following characteristics:
- Length: 300-500 words
- Tone: Warm, encouraging, relatable
- Style: Conversational yet reverent
- Focus: Practical application of biblical truth to daily life

Main verse: $main_verse
Theme: $theme
Target audience: $audience

Structure:
1. Opening: Brief story or relatable scenario
2. Scripture exploration: Unpack the meaning of the main verse
3. Application: How does this apply to daily life?
4. Closing prayer or reflection prompt

Please write in markdown format with clear sections. Be authentic and avoid clichés.""",

    "daily_devotion:id": """Anda adalah penulis renungan Kristen yang menciptakan renungan harian yang menginspirasi.

Buatlah renungan harian dengan karakteristik berikut:
- Panjang: 300-500 kata
- Nada: Hangat, mendorong, relevan
- Gaya: Percakapan namun penuh hormat
- Fokus: Aplikasi praktis kebenaran alkitabiah dalam kehidupan sehari-hari

Ayat utama: $main_verse
Tema: $theme
Audiens target: $audience

Struktur:
1. Pembukaan: Cerita singkat atau skenario yang relevan
2. Eksplorasi Alkitab: Uraikan makna ayat utama
3. Aplikasi: Bagaimana ini berlaku dalam kehidupan sehari-hari?
4. Doa penutup atau pertanyaan refleksi

Tolong tulis dalam format markdown dengan bagian yang jelas. Jadilah autentik dan hindari klise.""",

    # Verse Commentary
    "verse_commentary:en": """You are a biblical scholar providing accessible commentary on Scripture.

Write a brief commentary on the following verse:
Verse: $verse_text
Reference: $verse_reference

Guidelines:
- Length: 100-150 words
- Explain the context (historical, cultural, literary)
- Highlight the key message
- Provide one practical application
- Write for a general Christian audience
- Avoid technical jargon

Be clear, concise, and encouraging.""",

    "verse_commentary:id": """Anda adalah seorang sarjana alkitabiah yang memberikan komentar yang dapat diakses tentang Alkitab.

Tulis komentar singkat tentang ayat berikut:
Ayat: $verse_text
Referensi: $verse_reference

Pedoman:
- Panjang: 100-150 kata
- Jelaskan konteksnya (historis, budaya, sastra)
- Sorot pesan utama
- Berikan satu aplikasi praktis
- Tulis untuk audiens Kristen umum
- Hindari jargon teknis

Jadilah jelas, ringkas, dan mendorong.""",

    # Bible Figure
    "bible_figure:en": """You are a biblical historian writing engaging profiles of biblical figures.

Create a profile for: $figure_name

Include:
1. Summary (100 words): Who they were, their role
2. Full Story (400-600 words): Their journey, key events, challenges
3. Key Lessons (3-5 bullet points): What we can learn
4. Key Verses: List 3-5 important scripture references

Guidelines:
- Write engagingly but accurately
- Highlight their humanity (strengths AND weaknesses)
- Draw practical lessons for modern readers
- Use markdown formatting
- Cite scripture references clearly

Make it inspiring and educational.""",

    "bible_figure:id": """Anda adalah seorang sejarawan alkitabiah yang menulis profil tokoh alkitabiah yang menarik.

Buatlah profil untuk: $figure_name

Termasuk:
1. Ringkasan (100 kata): Siapa mereka, peran mereka
2. Kisah Lengkap (400-600 kata): Perjalanan mereka, peristiwa kunci, tantangan
3. Pelajaran Kunci (3-5 poin): Apa yang bisa kita pelajari
4. Ayat Kunci: Daftar 3-5 referensi alkitab penting

Pedoman:
- Tulis secara menarik namun akurat
- Sorot kemanusiaan mereka (kekuatan DAN kelemahan)
- Tarik pelajaran praktis untuk pembaca modern
- Gunakan format markdown
- Kutip referensi alkitab dengan jelas

Jadikan inspiratif dan edukatif.""",

    # Quiz Questions
    "quiz_questions:en": """You are a Christian educator creating engaging Bible knowledge quizzes.

Generate $num_questions multiple-choice questions about: $topic

For each question:
- Provide 4 options (A, B, C, D)
- Mark the correct answer
- Provide a brief explanation (50 words)
- Include scripture reference if applicable
- Vary difficulty: $difficulty

Guidelines:
- Make questions clear and unambiguous
- Avoid trick questions
- Test understanding, not just memorization
- Include context in questions when needed
- Make explanations educational

Format as JSON array.""",

    "quiz_questions:id": """Anda adalah seorang pendidik Kristen yang membuat kuis pengetahuan Alkitab yang menarik.

Buatlah $num_questions pertanyaan pilihan ganda tentang: $topic

Untuk setiap pertanyaan:
- Berikan 4 pilihan (A, B, C, D)
- Tandai jawaban yang benar
- Berikan penjelasan singkat (50 kata)
- Sertakan referensi alkitab jika berlaku
- Variasikan kesulitan: $difficulty

Pedoman:
- Buat pertanyaan yang jelas dan tidak ambigu
- Hindari pertanyaan jebakan
- Uji pemahaman, bukan hanya hafalan
- Sertakan konteks dalam pertanyaan bila diperlukan
- Buat penjelasan yang edukatif

Format sebagai array JSON.""",

    # Bible Study
    "bible_study:en": """You are a Christian educator creating in-depth Bible studies.

Create a Bible study on: $topic
Main passage: $passage

Structure:
1. Introduction (100 words): Overview and why this matters
2. Context (150 words): Historical, cultural, and literary background
3. Verse-by-verse Analysis (400-600 words): Deep dive into the passage
4. Key Themes (3-5 bullet points): Main theological concepts
5. Application Questions (3-5 questions): For personal reflection or group discussion
6. Prayer: Closing prayer related to the study

Guidelines:
- Write for small group or personal study
- Balance scholarship with accessibility
- Encourage deeper thinking
- Provide practical application
- Use markdown formatting with clear sections

Make it transformative.""",

    "bible_study:id": """Anda adalah seorang pendidik Kristen yang membuat studi Alkitab mendalam.

Buatlah studi Alkitab tentang: $topic
Bagian utama: $passage

Struktur:
1. Pendahuluan (100 kata): Gambaran umum dan mengapa ini penting
2. Konteks (150 kata): Latar belakang historis, budaya, dan sastra
3. Analisis Ayat demi Ayat (400-600 kata): Pendalaman bagian tersebut
4. Tema Kunci (3-5 poin): Konsep teologis utama
5. Pertanyaan Aplikasi (3-5 pertanyaan): Untuk refleksi pribadi atau diskusi kelompok
6. Doa: Doa penutup terkait studi

Pedoman:
- Tulis untuk kelompok kecil atau studi pribadi
- Seimbangkan keilmuan dengan aksesibilitas
- Dorong pemikiran lebih dalam
- Berikan aplikasi praktis
- Gunakan format markdown dengan bagian yang jelas

Jadikan transformatif.""",

    # Topical Category
    "topical_category:en": """You are creating topical Bible study categories.

Create a category description for: $category_name

Include:
1. Name: A clear, searchable name (3-5 words max)
2. Description: A 50-75 word description explaining what verses in this category address
3. Suggested icon: One of (heart, book-open, cross, star, shield, sun, moon, cloud, flame, crown, dove, lamp, mountain, water, tree, hand-praying, lightbulb, compass, anchor, users)
4. Color suggestion: A hex color that fits the theme

Guidelines:
- Make it relatable to everyday life
- Focus on the felt need this category addresses
- Use inclusive, welcoming language
- Be specific but not too narrow

Format as JSON with keys: name, description, icon, color""",

    "topical_category:id": """Anda sedang membuat kategori studi Alkitab topikal.

Buat deskripsi kategori untuk: $category_name

Termasuk:
1. Nama: Nama yang jelas dan dapat dicari (maksimal 3-5 kata)
2. Deskripsi: Deskripsi 50-75 kata yang menjelaskan apa yang dibahas ayat-ayat dalam kategori ini
3. Ikon yang disarankan: Salah satu dari (heart, book-open, cross, star, shield, sun, moon, cloud, flame, crown, dove, lamp, mountain, water, tree, hand-praying, lightbulb, compass, anchor, users)
4. Saran warna: Warna hex yang sesuai dengan tema

Pedoman:
- Buat relevan dengan kehidupan sehari-hari
- Fokus pada kebutuhan yang dirasakan yang ditangani kategori ini
- Gunakan bahasa yang inklusif dan menyambut
- Spesifik tapi tidak terlalu sempit

Format sebagai JSON dengan kunci: name, description, icon, color""",

    # Topical Verse Commentary
    "topical_verse:en": """You are a biblical commentator explaining Scripture for practical application.

Write commentary and application for this verse:
Verse: $verse_reference
Text: $verse_text
Topic/Category: $category

Provide:
1. Commentary (100-150 words):
   - Historical/cultural context
   - What this meant to original readers
   - Key words and their meanings
   - Connection to broader biblical themes

2. Application (75-100 words):
   - How this applies to modern life
   - Specific, actionable guidance
   - A question for personal reflection

Guidelines:
- Write accessibly for general audience
- Be encouraging yet truthful
- Connect to real-life situations
- Avoid theological jargon

Format as JSON with keys: commentary, application""",

    "topical_verse:id": """Anda adalah seorang komentator alkitabiah yang menjelaskan Alkitab untuk aplikasi praktis.

Tulis komentar dan aplikasi untuk ayat ini:
Ayat: $verse_reference
Teks: $verse_text
Topik/Kategori: $category

Berikan:
1. Komentar (100-150 kata):
   - Konteks historis/budaya
   - Apa arti ini bagi pembaca asli
   - Kata-kata kunci dan maknanya
   - Koneksi ke tema alkitabiah yang lebih luas

2. Aplikasi (75-100 kata):
   - Bagaimana ini berlaku untuk kehidupan modern
   - Panduan yang spesifik dan dapat ditindaklanjuti
   - Pertanyaan untuk refleksi pribadi

Pedoman:
- Tulis secara mudah diakses untuk audiens umum
- Jadilah mendorong namun jujur
- Hubungkan dengan situasi kehidupan nyata
- Hindari jargon teologis

Format sebagai JSON dengan kunci: commentary, application""",

    # Devotion Plan
    "devotion_plan:en": """You are creating a multi-day devotion plan for spiritual growth.

Create a $duration_days day devotion plan on: $theme

Structure:
1. Plan Overview:
   - Title (compelling, memorable)
   - Subtitle (what readers will gain)
   - Description (100 words): Theme, why it matters, what to expect
   - Introduction (150 words): Set up the journey

2. For each day (Day 1 to Day $duration_days):
   - Title: Unique title for the day
   - Main verse: Scripture reference with full text
   - Content (200-300 words): Teaching, story, or reflection
   - Reflection questions (2-3): For deeper thought
   - Prayer (50-75 words): Closing prayer for the day

Guidelines:
- Create a logical progression through the theme
- Each day should build on previous days
- Make it doable in 10-15 minutes per day
- Include practical applications
- Vary the approach (stories, teachings, reflections)
- End with transformation/action

Format as JSON with structure matching DevotionPlan model.""",

    "devotion_plan:id": """Anda sedang membuat rencana renungan multi-hari untuk pertumbuhan spiritual.

Buat rencana renungan $duration_days hari tentang: $theme

Struktur:
1. Gambaran Rencana:
   - Judul (menarik, mudah diingat)
   - Subjudul (apa yang akan didapat pembaca)
   - Deskripsi (100 kata): Tema, mengapa penting, apa yang diharapkan
   - Pendahuluan (150 kata): Siapkan perjalanan

2. Untuk setiap hari (Hari 1 sampai Hari $duration_days):
   - Judul: Judul unik untuk hari itu
   - Ayat utama: Referensi Alkitab dengan teks lengkap
   - Konten (200-300 kata): Pengajaran, cerita, atau refleksi
   - Pertanyaan refleksi (2-3): Untuk pemikiran lebih dalam
   - Doa (50-75 kata): Doa penutup untuk hari itu

Pedoman:
- Buat progresi logis melalui tema
- Setiap hari harus membangun dari hari-hari sebelumnya
- Buat dapat diselesaikan dalam 10-15 menit per hari
- Sertakan aplikasi praktis
- Variasikan pendekatan (cerita, pengajaran, refleksi)
- Akhiri dengan transformasi/tindakan

Format sebagai JSON dengan struktur yang cocok dengan model DevotionPlan.""",

    # Shareable Image
    "shareable_image:en": """You are creating social media-ready Bible verse images.

Create content for a shareable verse image:
Verse: $verse_reference
Text: $verse_text
Theme: $theme

Provide:
1. Overlay Text: A shortened, impactful version of the verse (max 50 words)
   - May paraphrase for impact
   - Focus on the key message
   - Should be readable on an image

2. Caption: A 20-30 word caption for social media sharing

3. Design suggestions:
   - Text position: top, center, or bottom
   - Font style: serif, sans-serif, or script
   - Color scheme: light, dark, or colorful
   - Mood: peaceful, powerful, joyful, contemplative

Guidelines:
- Make it shareable and visually appealing
- The message should stand alone
- Consider Instagram/Facebook formatting

Format as JSON with keys: overlay_text, caption, text_position, font_style, color_scheme, mood""",

    "shareable_image:id": """Anda sedang membuat gambar ayat Alkitab yang siap untuk media sosial.

Buat konten untuk gambar ayat yang dapat dibagikan:
Ayat: $verse_reference
Teks: $verse_text
Tema: $theme

Berikan:
1. Teks Overlay: Versi ayat yang dipersingkat dan berdampak (maksimal 50 kata)
   - Dapat parafrase untuk dampak
   - Fokus pada pesan kunci
   - Harus dapat dibaca pada gambar

2. Caption: Caption 20-30 kata untuk berbagi di media sosial

3. Saran desain:
   - Posisi teks: atas, tengah, atau bawah
   - Gaya font: serif, sans-serif, atau script
   - Skema warna: terang, gelap, atau berwarna
   - Suasana: damai, kuat, gembira, kontemplatif

Pedoman:
- Buat dapat dibagikan dan menarik secara visual
- Pesan harus berdiri sendiri
- Pertimbangkan format Instagram/Facebook

Format sebagai JSON dengan kunci: overlay_text, caption, text_position, font_style, color_scheme, mood""",

    # Verse of the Day (enhanced)
    "verse_of_the_day:en": """You are creating a Verse of the Day experience.

Create content for this verse:
Verse: $verse_reference
Text: $verse_text

Provide:
1. Commentary (150-200 words):
   - What does this verse mean?
   - Historical/literary context
   - Key insights

2. Reflection Prompt (50 words):
   - A thought-provoking question or statement
   - Helps readers apply the verse personally

3. Suggested background:
   - Color: A calming hex color that matches the mood
   - Image keywords: 3-5 keywords for finding suitable background images

Guidelines:
- Make it suitable for morning meditation
- Keep the tone peaceful and encouraging
- Focus on one main takeaway

Format as JSON with keys: commentary, reflection_prompt, background_color, image_keywords""",

    "verse_of_the_day:id": """Anda sedang membuat pengalaman Ayat Hari Ini.

Buat konten untuk ayat ini:
Ayat: $verse_reference
Teks: $verse_text

Berikan:
1. Komentar (150-200 kata):
   - Apa arti ayat ini?
   - Konteks historis/sastra
   - Wawasan kunci

2. Prompt Refleksi (50 kata):
   - Pertanyaan atau pernyataan yang memancing pemikiran
   - Membantu pembaca menerapkan ayat secara pribadi

3. Latar belakang yang disarankan:
   - Warna: Warna hex yang menenangkan yang cocok dengan suasana
   - Kata kunci gambar: 3-5 kata kunci untuk menemukan gambar latar yang sesuai

Pedoman:
- Buat cocok untuk meditasi pagi
- Jaga nada damai dan mendorong
- Fokus pada satu takeaway utama

Format sebagai JSON dengan kunci: commentary, reflection_prompt, background_color, image_keywords""",
}


def create_default_prompt_configs() -> List[PromptConfiguration]:
    """Create default prompt configurations"""
    configs = []

    for key, template in DEFAULT_PROMPTS.items():
        parts = key.split(":")
        content_type = parts[0]
        language = parts[1]

        # Extract variables from template
        import re

        variables = re.findall(r"\$(\w+)", template)

        config = PromptConfiguration(
            prompt_id=f"{content_type}_{language}_v1",
            content_type=content_type,
            language=language,
            version="1.0.0",
            template=template,
            variables=list(set(variables)),
            active=True,
        )
        configs.append(config)

    return configs
