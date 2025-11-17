from gtts import gTTS
import base64
import io
import os
import logging

logger = logging.getLogger(__name__)


def generate_tts_audio(text: str, lang: str = 'id') -> str:
    """
    Generate Text-to-Speech audio using gTTS
    
    Args:
        text: Text content to convert to speech
        lang: Language code ('id' for Indonesian, 'en' for English, 'zh-CN' for Chinese)
    
    Returns:
        Base64 encoded MP3 audio
    """
    try:
        # Create gTTS object
        tts = gTTS(text=text, lang=lang, slow=False)
        
        # Save to BytesIO buffer
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        # Convert to base64
        audio_base64 = base64.b64encode(audio_buffer.getvalue()).decode('utf-8')
        
        return f"data:audio/mp3;base64,{audio_base64}"
    
    except Exception as e:
        logger.error(f"TTS generation error: {str(e)}")
        raise Exception(f"Failed to generate audio: {str(e)}")
