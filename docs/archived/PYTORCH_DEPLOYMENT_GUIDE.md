# PyTorch/Coqui TTS Deployment Strategy

## Problem
PyTorch (torch) is required for Coqui TTS but is too large (>700MB) for standard Emergent deployment (1Gi memory limit).

## Solution: Conditional Installation

### Option 1: Use Build-Time Flag (Recommended)

Create a custom requirements file structure:

**requirements.txt** (base, always installed):
```txt
fastapi==0.110.1
... all other dependencies ...
gTTS==2.5.1  # Lightweight fallback
```

**requirements-tts.txt** (optional, for TTS-enabled deployments):
```txt
-r requirements.txt
torch==2.1.0
TTS==0.22.0
```

**Deployment:**
- Standard: `pip install -r requirements.txt` (no torch, uses gTTS)
- TTS-enabled: `pip install -r requirements-tts.txt` (with torch)

### Option 2: Platform-Specific Requirements

Use environment variable to control installation:

**In Dockerfile or deployment script:**
```bash
if [ "$ENABLE_COQUI_TTS" = "true" ]; then
    pip install torch==2.1.0 TTS==0.22.0
else
    echo "Skipping torch - using gTTS fallback"
fi
```

### Option 3: Separate TTS Microservice (Enterprise)

Deploy TTS as a separate service:
- **Main app** (lightweight, 1Gi memory)
- **TTS service** (heavy, 2-4Gi memory, CPU-optimized)
- Main app calls TTS service via HTTP

## Current Implementation

**The code already supports both modes:**

```python
# backend/services/tts_service.py
try:
    from TTS.api import TTS
    INDONESIAN_TTS_AVAILABLE = True
except ImportError:
    INDONESIAN_TTS_AVAILABLE = False
    # Falls back to gTTS automatically
```

## Recommendations

### For Emergent Standard Deployment:
1. Keep torch commented out in requirements.txt
2. Use gTTS (lightweight, good quality)
3. Deployment succeeds

### For High-Quality TTS:
1. Request memory upgrade to 2Gi from Emergent support
2. Uncomment torch and TTS in requirements.txt
3. Upload Indonesian model file (checkpoint.pth)
4. Deploy with higher resources

### For Production (Best):
1. Use external TTS API:
   - Google Cloud Text-to-Speech
   - Azure Cognitive Services
   - AWS Polly
2. No local model needed
3. Better quality, multiple voices
4. Pay per use (usually cheap)

## Current Status

✅ **Working without torch** - gTTS fallback active
✅ **Can add torch back** - just uncomment in requirements.txt
⚠️ **Needs >2Gi memory** - if torch is enabled
