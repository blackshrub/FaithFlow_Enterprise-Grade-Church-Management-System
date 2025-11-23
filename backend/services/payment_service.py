"""
Payment Service - DEPRECATED

This file is deprecated. Please use the new payment provider abstraction:
- services/payments/base.py - Payment provider interface
- services/payments/ipaymu_provider.py - iPaymu implementation
- services/payments/factory.py - Provider factory

Usage:
    from services.payments import get_payment_provider

    provider = get_payment_provider(
        payment_online_enabled=True,
        payment_provider="ipaymu",
        payment_provider_config={"va_number": "...", "api_key": "..."},
        environment="production"
    )

    if provider:
        result = await provider.create_payment(...)
"""

import warnings

warnings.warn(
    "payment_service.py is deprecated. Use services.payments instead.",
    DeprecationWarning,
    stacklevel=2
)
