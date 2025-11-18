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
        from TTS.utils.synthesizer import Synthesizer
        from g2p_id import G2P
        import numpy as np
        import scipy.io.wavfile as wavfile
        import html
        import re
        
        # Preprocess text (same as TTS-Indonesia-Gratis)
        text = html.unescape(text)  # Decode HTML entities
        text = re.sub(r'<[^>]+>', '', text)  # Remove HTML tags
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        text = text.strip()
        
        # Fix 'g' pronunciation issue by adding 'h' after 'g'
        # This helps the model pronounce 'g' correctly (model lacks plain 'g' in vocabulary)
        # Pattern: Replace 'g' + vowel with 'gh' + vowel, except 'ng' combinations
        text = re.sub(r'(^|[\s])([Gg])([aeiouAEIOU])', r'\1\2h\3', text)  # Start of word
        text = re.sub(r'([^nN])([Gg])([aeiouAEIOU])', r'\1\2h\3', text)  # Middle of word (not after n)
        
        # Fix 'd' at end of words - pronounce as 't' for smoother sound
        # Examples: "murid" → "murit", "tekad" → "tekat"
        text = re.sub(r'([aeiouAEIOU])d(\s|$|[,.\?!;:])', r'\1t\2', text)  # Vowel + d + word boundary
        
        logger.info(f"Text after pronunciation fixes (first 100 chars): {text[:100]}")
        
        # Convert Indonesian text to phonemes
        g2p = G2P()
        phonemes = g2p(text)
        logger.info(f"Converting {len(text)} chars to phonemes")
        
        synth = Synthesizer(
            tts_checkpoint=str(CHECKPOINT_PATH),
            tts_config_path=str(CONFIG_PATH),
            use_cuda=False
        )
        
        logger.info("Generating Indonesian TTS with Wibowo voice...")
        # Use phonemes instead of raw text
        wav = synth.tts(text=phonemes, speaker_name="wibowo")
        
        # Convert to numpy array and normalize
        wav_data = np.array(wav) if isinstance(wav, list) else wav
        wav_data = wav_data.flatten()
        
        # Ensure valid audio data
        if wav_data.size == 0:
            raise Exception("Generated audio is empty")
        
        # Normalize to int16
        if np.max(np.abs(wav_data)) > 0:
            wav_data = np.int16(wav_data / np.max(np.abs(wav_data)) * 32767)
        else:
            wav_data = np.int16(wav_data)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            wavfile.write(tmp_file.name, synth.output_sample_rate, wav_data)
            
            # Read and convert to base64
            with open(tmp_file.name, 'rb') as f:
                audio_data = f.read()
            
            os.unlink(tmp_file.name)
        
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        logger.info(f"✓ Coqui TTS (Wibowo) successful - {len(audio_data)} bytes WAV")
        return f"data:audio/wav;base64,{audio_base64}"
    
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
