# Payment Provider Abstraction Layer

## Overview

FaithFlow's payment system is designed for **multi-tenant flexibility**, allowing each church to configure their own payment gateway provider. This abstraction layer supports multiple payment providers (iPaymu, Xendit, Midtrans, Stripe) with a clean, pluggable architecture.

## Architecture

```
┌─────────────────────────────────────────┐
│      FastAPI Routes (giving.py)         │
│  - POST /api/giving/submit              │
│  - GET  /api/giving/config              │
│  - POST /api/giving/webhook/{provider}  │
└──────────────┬──────────────────────────┘
               │
      ┌────────▼────────┐
      │ Payment Factory │ (per-church config)
      │ get_payment_provider()
      └────────┬────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    │                     │              │
┌───▼────────┐     ┌─────▼──────┐  ┌───▼──────┐
│  iPaymu    │     │  Xendit    │  │ Midtrans │
│  Provider  │     │  Provider  │  │ Provider │
└────────────┘     └────────────┘  └──────────┘
```

## Directory Structure

```
backend/services/payments/
├── __init__.py           # Module exports
├── base.py               # Abstract PaymentProvider interface
├── ipaymu_provider.py    # iPaymu implementation
├── factory.py            # Provider factory
└── README.md             # This file
```

## Core Components

### 1. PaymentProvider (base.py)

Abstract base class defining the contract for all payment providers.

**Key Methods:**
- `create_payment()` - Create payment transaction
- `check_transaction_status()` - Check payment status
- `verify_webhook_signature()` - Verify webhook authenticity
- `parse_webhook_payload()` - Parse webhook into standard format
- `get_payment_instructions()` - Get localized payment instructions
- `get_supported_methods()` - List supported payment methods
- `provider_name` - Provider identifier property

**Standardized Enums:**
- `PaymentMethod` - Payment methods (VA, QRIS, e-wallets, etc.)
- `PaymentStatus` - Transaction status (pending, success, failed, etc.)

**Response Models:**
- `PaymentResult` - Payment creation response
- `PaymentStatusResult` - Status check response

### 2. IPaymuProvider (ipaymu_provider.py)

Complete iPaymu payment gateway implementation.

**Features:**
- HMAC SHA256 signature generation
- Direct payment API integration
- Multiple payment methods: VA, QRIS, GoPay, OVO, Dana, Credit Card
- Webhook signature verification
- Localized payment instructions (EN/ID)

**Configuration:**
```python
{
    "va_number": "1179002264684497",
    "api_key": "SANDBOXB48E4D9E-F618-428E-B32D-FD91F98BE17C",
    "environment": "sandbox"  # or "production"
}
```

### 3. Payment Factory (factory.py)

Factory pattern for creating payment provider instances.

**Usage:**
```python
from services.payments import get_payment_provider

provider = get_payment_provider(
    payment_online_enabled=True,
    payment_provider="ipaymu",
    payment_provider_config={
        "va_number": "...",
        "api_key": "..."
    },
    environment="production"
)

if provider:
    result = await provider.create_payment(...)
```

## Church Settings Configuration

Each church has payment configuration in `church_settings`:

```python
{
    "church_id": "church-001",

    # Payment Configuration
    "payment_online_enabled": True,
    "payment_provider": "ipaymu",
    "payment_provider_config": {
        "va_number": "1179002264684497",
        "api_key": "SANDBOXB48E4D9E..."
    },
    "payment_manual_bank_accounts": [
        {
            "bank_name": "BCA",
            "account_number": "1234567890",
            "account_holder": "Gereja ABC",
            "branch": "Jakarta Pusat"
        }
    ]
}
```

## API Endpoints

### GET /api/giving/config

Returns payment configuration for mobile app.

**Response:**
```json
{
    "online_enabled": true,
    "provider": "ipaymu",
    "supported_methods": [
        "virtual_account",
        "qris",
        "gopay",
        "ovo",
        "dana",
        "credit_card"
    ],
    "manual_bank_accounts": [...],
    "currency": "IDR",
    "minimum_amount": 10000
}
```

### POST /api/giving/submit

Submit giving/offering with dynamic provider selection.

**Flow:**
1. Validate fund and member
2. Get church payment settings
3. Create provider instance via factory
4. Call `provider.create_payment()`
5. Return payment URL/VA/QR to mobile

### POST /api/giving/webhook/{provider_name}

Generic webhook handler for all providers.

**Flow:**
1. Extract reference_id from payload
2. Lookup transaction → get church_id
3. Get church settings → initialize provider
4. Verify signature via `provider.verify_webhook_signature()`
5. Parse payload via `provider.parse_webhook_payload()`
6. Update transaction status
7. Send WhatsApp notification (TODO)

## Adding a New Provider

To add a new payment provider (e.g., Xendit):

1. **Create provider implementation:**

```python
# services/payments/xendit_provider.py
from .base import PaymentProvider, PaymentResult, PaymentMethod

class XenditProvider(PaymentProvider):
    def __init__(self, api_key: str, environment: str = "production"):
        self.api_key = api_key
        self.base_url = "https://api.xendit.co" if environment == "production" else "..."

    @property
    def provider_name(self) -> str:
        return "xendit"

    async def create_payment(self, ...) -> PaymentResult:
        # Xendit-specific implementation
        pass

    # ... implement all abstract methods
```

2. **Update factory:**

```python
# services/payments/factory.py
elif provider_name == "xendit":
    return PaymentProviderFactory._create_xendit(provider_config, environment)

@staticmethod
def _create_xendit(provider_config: dict, environment: str):
    api_key = provider_config.get("api_key")
    if not api_key:
        logger.error("Xendit configuration incomplete")
        return None
    return XenditProvider(api_key=api_key, environment=environment)
```

3. **Update church_settings model:**

```python
payment_provider: Optional[Literal['ipaymu', 'xendit', 'midtrans', 'stripe']] = ...
```

4. **Update __init__.py:**

```python
from .xendit_provider import XenditProvider

__all__ = [..., "XenditProvider"]
```

## Payment Methods Mapping

Each provider may use different codes for payment methods. The abstraction uses `PaymentMethod` enum, and each provider maps it to their API codes:

**iPaymu Mapping:**
```python
PaymentMethod.VIRTUAL_ACCOUNT → "va"
PaymentMethod.QRIS → "qris"
PaymentMethod.GOPAY → "gopay"
PaymentMethod.OVO → "ovo"
PaymentMethod.DANA → "dana"
PaymentMethod.CREDIT_CARD → "cc"
```

## Webhook Standardization

Each provider sends different webhook formats. The `parse_webhook_payload()` method standardizes them:

**Standardized Output:**
```python
{
    "reference_id": "our-txn-001",
    "provider_transaction_id": "ipaymu-123456",
    "status": PaymentStatus.SUCCESS,
    "status_description": "Payment successful",
    "amount": Decimal("100000"),
    "payment_method": "gopay",
    "customer_name": "John Doe",
    "customer_phone": "081234567890"
}
```

## Testing

### Test Payment Creation

```python
from services.payments import get_payment_provider, PaymentMethod
from decimal import Decimal

provider = get_payment_provider(
    payment_online_enabled=True,
    payment_provider="ipaymu",
    payment_provider_config={
        "va_number": "1179002264684497",
        "api_key": "SANDBOXB48E4D9E-F618-428E-B32D-FD91F98BE17C"
    },
    environment="sandbox"
)

result = await provider.create_payment(
    transaction_id="test-001",
    customer_name="Test User",
    customer_phone="081234567890",
    customer_email="test@example.com",
    amount=Decimal("50000"),
    payment_method=PaymentMethod.QRIS,
    description="Test Offering",
    notify_url="https://app.faithflow.com/api/giving/webhook/ipaymu",
    return_url="faithflow://giving/success",
    cancel_url="faithflow://giving/cancelled",
    expired_duration=24
)

print(result.payment_url)
print(result.qr_string)
```

### Test Webhook Verification

```python
payload = {
    "trx_id": "ipaymu-123456",
    "reference_id": "test-001",
    "status": "1",
    "amount": "50000"
}

signature = "abc123..."

is_valid = provider.verify_webhook_signature(payload, signature)
print(f"Webhook valid: {is_valid}")

parsed = provider.parse_webhook_payload(payload)
print(f"Status: {parsed['status']}")
```

## Security Considerations

1. **Signature Verification:**
   - Always verify webhook signatures before processing
   - Use `hmac.compare_digest()` for timing-safe comparison

2. **Credential Storage:**
   - Store API keys in `church_settings.payment_provider_config`
   - Never expose credentials in responses
   - Use environment-specific keys (sandbox vs production)

3. **Multi-Tenant Isolation:**
   - Always scope by `church_id`
   - Provider instances are created per-request (not singleton)
   - Each church has isolated payment configuration

4. **Webhook Security:**
   - Verify signature header
   - Check reference_id exists before processing
   - Return 401 for invalid signatures
   - Log all webhook attempts

## Migration from Old iPaymu Service

The old `services/ipaymu_service.py` has been deprecated. Migration:

**Old Code:**
```python
from services.ipaymu_service import get_ipaymu_service

ipaymu = get_ipaymu_service()
success, data, error = await ipaymu.create_payment(...)
```

**New Code:**
```python
from services.payments import get_payment_provider, PaymentMethod

provider = get_payment_provider(
    payment_online_enabled=church_settings.payment_online_enabled,
    payment_provider=church_settings.payment_provider,
    payment_provider_config=church_settings.payment_provider_config,
    environment="production"
)

result = await provider.create_payment(...)
if result.success:
    # Use result.payment_url, result.va_number, etc.
else:
    # Handle result.error_message
```

## Future Enhancements

- [ ] Add Xendit provider implementation
- [ ] Add Midtrans provider implementation
- [ ] Add Stripe provider implementation (international)
- [ ] Payment retry mechanism
- [ ] Payment status polling/cron job
- [ ] Automatic refund support
- [ ] Payment analytics per provider
- [ ] A/B testing multiple providers
- [ ] Failover to secondary provider

## Support

For questions or issues:
- Check `/api/docs` for API documentation
- Review provider-specific documentation
- Check logs for payment errors
- Test with sandbox credentials first

---

**Generated with Claude Code**
