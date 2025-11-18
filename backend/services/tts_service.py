from gtts import gTTS
import base64
import io
import os
import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

# Coqui TTS model paths
TTS_MODEL_DIR = Path(__file__).parent.parent / 'models' / 'tts_indonesian'
CHECKPOINT_PATH = TTS_MODEL_DIR / 'checkpoint.pth'
CONFIG_PATH = TTS_MODEL_DIR / 'config.json'

# Check if Indonesian TTS model is available
INDONESIAN_TTS_AVAILABLE = CHECKPOINT_PATH.exists() and CONFIG_PATH.exists()

if INDONESIAN_TTS_AVAILABLE:
    logger.info(f"✓ Indonesian TTS model found: {CHECKPOINT_PATH}")
else:
    logger.warning(f"Indonesian TTS model not found, using gTTS fallback")


def generate_indonesian_tts_coqui(text: str) -> str:
    """
    Generate Indonesian TTS using Coqui TTS with Wibowo voice
    """
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_audio:
            output_path = tmp_audio.name
        
        # Run TTS command with Indonesian model
        cmd = [
            'tts',
            '--text', text,
            '--model_path', str(CHECKPOINT_PATH),
            '--config_path', str(CONFIG_PATH),
            '--speaker_idx', 'wibowo',
            '--out_path', output_path
        ]
        
        logger.info("Generating Indonesian TTS with Wibowo voice...")
        result = subprocess.run(cmd, capture_output=True, timeout=60, text=True)
        
        if result.returncode == 0 and os.path.exists(output_path):
            # Read and convert to base64
            with open(output_path, 'rb') as f:
                audio_data = f.read()
            
            os.unlink(output_path)
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            logger.info("✓ Coqui TTS generation successful")
            return f"data:audio/wav;base64,{audio_base64}"
        else:
            error_msg = result.stderr if result.stderr else "Unknown error"
            logger.warning(f"Coqui TTS failed: {error_msg}")
            raise Exception(f"TTS command failed: {error_msg}")
    
    except Exception as e:
        logger.warning(f"Coqui TTS failed, falling back to gTTS: {str(e)}")
        raise  # Re-raise to trigger fallback


def generate_tts_gtts(text: str, lang: str = 'id') -> str:
    """
    Fallback TTS using gTTS (Google Text-to-Speech)
    """
    try:
        tts = gTTS(text=text, lang=lang, slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        audio_base64 = base64.b64encode(audio_buffer.getvalue()).decode('utf-8')
        return f"data:audio/mp3;base64,{audio_base64}"
    except Exception as e:
        logger.error(f"gTTS generation error: {str(e)}")
        raise Exception(f"Failed to generate audio: {str(e)}")


def generate_tts_audio(text: str, lang: str = 'id') -> str:
    """
    Generate Text-to-Speech audio
    
    For Indonesian: Try Coqui TTS (Wibowo voice) first, fallback to gTTS
    For other languages: Use gTTS
    
    Args:
        text: Text content to convert to speech
        lang: Language code ('id' for Indonesian, 'en' for English, 'zh-CN' for Chinese)
    
    Returns:
        Base64 encoded audio (WAV or MP3)
    """
    # Strip HTML tags
    import re
    text = re.sub(r'<[^>]+>', '', text)
    text = text.strip()
    
    if not text:
        raise Exception("No text to convert")
    
    # For Indonesian, try Coqui TTS first
    if lang == 'id' and INDONESIAN_TTS_AVAILABLE:
        try:
            return generate_indonesian_tts_coqui(text)
        except Exception as e:
            logger.warning(f"Indonesian TTS failed, using gTTS: {str(e)}")
    
    # Fallback to gTTS for all cases
    return generate_tts_gtts(text, lang)
