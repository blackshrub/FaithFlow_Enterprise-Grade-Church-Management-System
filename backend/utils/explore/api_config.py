"""
API Configuration Management

Handles configuration for external AI providers:
- Anthropic Claude (primary)
- OpenAI (fallback)
- Stability AI (images)

Supports priority-based fallback and secure key storage.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from cryptography.fernet import Fernet
import os
import logging

from backend.models.explore import APIConfiguration

logger = logging.getLogger(__name__)


class APIConfigManager:
    """Manages API provider configurations"""

    def __init__(self):
        # Get encryption key from environment
        encryption_key = os.getenv("API_KEY_ENCRYPTION_KEY")
        if not encryption_key:
            raise ValueError("API_KEY_ENCRYPTION_KEY environment variable not set")

        self.cipher = Fernet(encryption_key.encode())

    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt API key for storage"""
        return self.cipher.encrypt(api_key.encode()).decode()

    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt API key for use"""
        return self.cipher.decrypt(encrypted_key.encode()).decode()

    def get_active_providers(
        self, provider_configs: List[APIConfiguration], provider_type: Optional[str] = None
    ) -> List[APIConfiguration]:
        """
        Get active providers sorted by priority

        Args:
            provider_configs: List of API configurations
            provider_type: Optional filter by provider ("anthropic", "openai", etc.)

        Returns:
            List of active providers sorted by priority (ascending)
        """
        active = [p for p in provider_configs if p.enabled]

        if provider_type:
            active = [p for p in active if p.provider == provider_type]

        # Sort by priority (lower = higher priority)
        active.sort(key=lambda p: p.priority)

        return active

    def get_primary_provider(
        self, provider_configs: List[APIConfiguration], provider_type: Optional[str] = None
    ) -> Optional[APIConfiguration]:
        """Get the highest priority active provider"""
        active = self.get_active_providers(provider_configs, provider_type)
        return active[0] if active else None

    def validate_provider(self, config: APIConfiguration) -> bool:
        """Validate provider configuration"""
        if not config.enabled:
            return False

        if not config.api_key_encrypted:
            logger.error(f"Provider {config.provider} has no API key")
            return False

        if not config.model_id:
            logger.error(f"Provider {config.provider} has no model_id")
            return False

        return True


# ==================== PROVIDER CLIENTS ====================


class AnthropicClient:
    """Client for Anthropic Claude API"""

    def __init__(self, api_key: str, model_id: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = "https://api.anthropic.com/v1"

    async def generate_text(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Generate text using Claude

        Args:
            prompt: User prompt
            system: System prompt
            max_tokens: Maximum tokens to generate
            temperature: Temperature (0-1)

        Returns:
            Response dict with 'content', 'usage', 'model'
        """
        import httpx

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": self.model_id,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }

        if system:
            payload["system"] = system

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/messages", headers=headers, json=payload, timeout=60.0
            )
            response.raise_for_status()
            data = response.json()

            return {
                "content": data["content"][0]["text"],
                "usage": data.get("usage", {}),
                "model": data.get("model", self.model_id),
            }


class OpenAIClient:
    """Client for OpenAI API"""

    def __init__(self, api_key: str, model_id: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = "https://api.openai.com/v1"

    async def generate_text(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 1.0,
    ) -> Dict[str, Any]:
        """
        Generate text using OpenAI

        Args:
            prompt: User prompt
            system: System prompt
            max_tokens: Maximum tokens to generate
            temperature: Temperature (0-2)

        Returns:
            Response dict with 'content', 'usage', 'model'
        """
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

            return {
                "content": data["choices"][0]["message"]["content"],
                "usage": data.get("usage", {}),
                "model": data.get("model", self.model_id),
            }


class StabilityAIClient:
    """Client for Stability AI Image Generation"""

    def __init__(self, api_key: str, model_id: str = "stable-diffusion-xl-1024-v1-0"):
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = "https://api.stability.ai/v1"

    async def generate_image(
        self,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        steps: int = 30,
        cfg_scale: float = 7.0,
    ) -> Dict[str, Any]:
        """
        Generate image using Stability AI

        Args:
            prompt: Image description
            width: Image width (multiples of 64)
            height: Image height (multiples of 64)
            steps: Generation steps (10-50)
            cfg_scale: Prompt adherence (1-35)

        Returns:
            Response dict with 'image_base64', 'seed'
        """
        import httpx

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "text_prompts": [{"text": prompt, "weight": 1}],
            "cfg_scale": cfg_scale,
            "height": height,
            "width": width,
            "steps": steps,
            "samples": 1,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/generation/{self.model_id}/text-to-image",
                headers=headers,
                json=payload,
                timeout=120.0,
            )
            response.raise_for_status()
            data = response.json()

            return {
                "image_base64": data["artifacts"][0]["base64"],
                "seed": data["artifacts"][0]["seed"],
            }


# ==================== CLIENT FACTORY ====================


class AIClientFactory:
    """Factory for creating AI provider clients"""

    def __init__(self, config_manager: APIConfigManager):
        self.config_manager = config_manager

    def create_text_client(self, config: APIConfiguration):
        """Create text generation client"""
        api_key = self.config_manager.decrypt_api_key(config.api_key_encrypted)

        if config.provider == "anthropic":
            return AnthropicClient(api_key, config.model_id)
        elif config.provider == "openai":
            return OpenAIClient(api_key, config.model_id)
        else:
            raise ValueError(f"Unknown text provider: {config.provider}")

    def create_image_client(self, config: APIConfiguration):
        """Create image generation client"""
        api_key = self.config_manager.decrypt_api_key(config.api_key_encrypted)

        if config.provider == "stability_ai":
            return StabilityAIClient(api_key, config.model_id)
        else:
            raise ValueError(f"Unknown image provider: {config.provider}")
