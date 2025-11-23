"""
Payment Provider Factory.

Dynamically creates payment provider instances based on church configuration.
"""

import logging
from typing import Optional

from .base import PaymentProvider
from .ipaymu_provider import IPaymuProvider

logger = logging.getLogger(__name__)


class PaymentProviderFactory:
    """Factory for creating payment provider instances."""

    @staticmethod
    def create_provider(
        provider_name: str,
        provider_config: dict,
        environment: str = "production",
    ) -> Optional[PaymentProvider]:
        """
        Create payment provider instance.

        Args:
            provider_name: Provider identifier (ipaymu, xendit, etc.)
            provider_config: Provider-specific configuration
            environment: production or sandbox

        Returns:
            PaymentProvider instance or None if invalid config

        Raises:
            ValueError: If provider not supported
        """
        provider_name = provider_name.lower()

        if provider_name == "ipaymu":
            return PaymentProviderFactory._create_ipaymu(provider_config, environment)
        elif provider_name == "xendit":
            # Future implementation
            raise NotImplementedError("Xendit provider not yet implemented")
        elif provider_name == "midtrans":
            # Future implementation
            raise NotImplementedError("Midtrans provider not yet implemented")
        elif provider_name == "stripe":
            # Future implementation
            raise NotImplementedError("Stripe provider not yet implemented")
        else:
            raise ValueError(f"Unsupported payment provider: {provider_name}")

    @staticmethod
    def _create_ipaymu(
        provider_config: dict, environment: str = "production"
    ) -> Optional[IPaymuProvider]:
        """
        Create iPaymu provider instance.

        Args:
            provider_config: iPaymu configuration with va_number and api_key
            environment: production or sandbox

        Returns:
            IPaymuProvider instance or None if invalid config
        """
        va_number = provider_config.get("va_number")
        api_key = provider_config.get("api_key")

        if not va_number or not api_key:
            logger.error(
                "iPaymu configuration incomplete: missing va_number or api_key"
            )
            return None

        return IPaymuProvider(
            va_number=va_number, api_key=api_key, environment=environment
        )


def get_payment_provider(
    payment_online_enabled: bool,
    payment_provider: Optional[str],
    payment_provider_config: dict,
    environment: str = "production",
) -> Optional[PaymentProvider]:
    """
    Get payment provider for church based on settings.

    Args:
        payment_online_enabled: Whether online payment is enabled
        payment_provider: Provider name (ipaymu, xendit, etc.)
        payment_provider_config: Provider configuration dict
        environment: production or sandbox

    Returns:
        PaymentProvider instance or None if online payment disabled or invalid config
    """
    if not payment_online_enabled:
        logger.info("Online payment disabled for this church")
        return None

    if not payment_provider:
        logger.error("Payment provider not specified in church settings")
        return None

    try:
        provider = PaymentProviderFactory.create_provider(
            provider_name=payment_provider,
            provider_config=payment_provider_config,
            environment=environment,
        )

        if provider:
            logger.info(
                f"Payment provider initialized: {provider.provider_name} ({environment})"
            )
        else:
            logger.error("Failed to initialize payment provider")

        return provider

    except (ValueError, NotImplementedError) as e:
        logger.error(f"Payment provider creation failed: {e}")
        return None
