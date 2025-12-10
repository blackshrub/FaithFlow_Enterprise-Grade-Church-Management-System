"""
Environment Variable Validation for FaithFlow

Validates required environment variables on startup to prevent:
- Running with insecure defaults
- Missing critical configuration
- Weak secrets

This runs before the application starts and will exit with an error
if critical security requirements are not met.
"""

import os
import sys
import re
import logging
from typing import List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class Severity(Enum):
    """Validation severity levels."""
    CRITICAL = "critical"  # App will not start
    WARNING = "warning"    # App starts but logs warning
    INFO = "info"          # Informational only


@dataclass
class ValidationResult:
    """Result of a validation check."""
    name: str
    passed: bool
    severity: Severity
    message: str


class EnvironmentValidator:
    """Validates environment configuration for security and correctness."""

    def __init__(self):
        self.results: List[ValidationResult] = []

    def _add_result(
        self,
        name: str,
        passed: bool,
        severity: Severity,
        message: str
    ):
        self.results.append(ValidationResult(name, passed, severity, message))

    def validate_required(self, name: str, severity: Severity = Severity.CRITICAL) -> Optional[str]:
        """Check if required environment variable is set."""
        value = os.environ.get(name)
        if not value:
            self._add_result(
                name,
                False,
                severity,
                f"Required environment variable '{name}' is not set"
            )
            return None

        self._add_result(name, True, Severity.INFO, f"'{name}' is configured")
        return value

    def validate_secret_strength(
        self,
        name: str,
        min_length: int = 32,
        severity: Severity = Severity.CRITICAL
    ) -> bool:
        """Validate that a secret meets minimum security requirements."""
        value = os.environ.get(name, "")

        # Check if using default/weak value
        weak_patterns = [
            r"^change.?this",
            r"^your.?secret",
            r"^default",
            r"^password",
            r"^secret$",
            r"^admin",
            r"^123",
            r"^test",
            r"^dev",
        ]

        for pattern in weak_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                self._add_result(
                    name,
                    False,
                    severity,
                    f"'{name}' appears to use a weak/default value. Generate a strong secret with: openssl rand -hex 64"
                )
                return False

        # Check length
        if len(value) < min_length:
            self._add_result(
                name,
                False,
                severity,
                f"'{name}' is too short ({len(value)} chars). Minimum {min_length} chars required. Generate with: openssl rand -hex 64"
            )
            return False

        self._add_result(name, True, Severity.INFO, f"'{name}' meets security requirements")
        return True

    def validate_url(self, name: str, severity: Severity = Severity.WARNING) -> bool:
        """Validate URL format."""
        value = os.environ.get(name, "")
        if not value:
            return True  # Skip if not set

        url_pattern = r"^(https?|wss?|mongodb(\+srv)?|redis)://[^\s]+"
        if not re.match(url_pattern, value):
            self._add_result(
                name,
                False,
                severity,
                f"'{name}' has invalid URL format: {value[:50]}..."
            )
            return False

        self._add_result(name, True, Severity.INFO, f"'{name}' has valid URL format")
        return True

    def validate_cors_origins(self, severity: Severity = Severity.WARNING) -> bool:
        """Validate CORS configuration."""
        origins = os.environ.get("CORS_ORIGINS", "*")

        if origins == "*":
            # Only warn in production
            is_prod = os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod")
            if is_prod:
                self._add_result(
                    "CORS_ORIGINS",
                    False,
                    severity,
                    "CORS_ORIGINS is set to '*' (allow all) in production. This is a security risk."
                )
                return False

            self._add_result(
                "CORS_ORIGINS",
                True,
                Severity.WARNING,
                "CORS_ORIGINS is set to '*'. Restrict this in production."
            )
            return True

        self._add_result("CORS_ORIGINS", True, Severity.INFO, "CORS_ORIGINS is properly restricted")
        return True

    def validate_mongodb_auth(self, severity: Severity = Severity.WARNING) -> bool:
        """Check if MongoDB connection uses authentication."""
        mongo_url = os.environ.get("MONGO_URL", "")

        # Check for authentication in URL
        if mongo_url and "@" not in mongo_url:
            self._add_result(
                "MONGO_URL",
                False,
                severity,
                "MongoDB connection does not appear to use authentication. Consider enabling auth."
            )
            return False

        self._add_result("MONGO_URL", True, Severity.INFO, "MongoDB connection configured")
        return True

    def validate_all(self) -> Tuple[bool, List[ValidationResult]]:
        """
        Run all validation checks.

        Returns:
            (all_passed, results) - all_passed is False if any CRITICAL check failed
        """
        self.results = []

        # Required variables
        self.validate_required("MONGO_URL")
        self.validate_required("DB_NAME")
        self.validate_required("JWT_SECRET")

        # Secret strength - HS256 requires strong secrets, 64+ bytes recommended
        self.validate_secret_strength("JWT_SECRET", min_length=64)

        # URL formats
        self.validate_url("MONGO_URL")
        self.validate_url("REDIS_URL", Severity.INFO)
        self.validate_url("SEAWEEDFS_FILER_URL", Severity.INFO)

        # Security configurations
        self.validate_cors_origins()
        self.validate_mongodb_auth()

        # Check for debug mode in production
        debug_mode = os.environ.get("DEBUG", "").lower() in ("true", "1", "yes")
        is_prod = os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod")
        if debug_mode and is_prod:
            self._add_result(
                "DEBUG",
                False,
                Severity.WARNING,
                "DEBUG mode is enabled in production environment"
            )

        # Check all critical validations passed
        critical_failed = any(
            r for r in self.results
            if not r.passed and r.severity == Severity.CRITICAL
        )

        return not critical_failed, self.results


def validate_environment(exit_on_failure: bool = True) -> bool:
    """
    Validate environment and log results.

    Args:
        exit_on_failure: If True, exit the process on critical failures

    Returns:
        True if all critical checks passed
    """
    validator = EnvironmentValidator()
    passed, results = validator.validate_all()

    # Log results
    print("\n" + "=" * 60)
    print("Environment Validation Results")
    print("=" * 60)

    for result in results:
        if result.passed:
            status = "✓"
            level = logging.INFO
        else:
            status = "✗" if result.severity == Severity.CRITICAL else "⚠"
            level = logging.ERROR if result.severity == Severity.CRITICAL else logging.WARNING

        message = f"{status} [{result.severity.value.upper()}] {result.message}"
        print(message)
        logger.log(level, result.message)

    print("=" * 60)

    if not passed:
        print("\n❌ CRITICAL: Environment validation failed!")
        print("   Fix the issues above before starting the application.")
        print("   Tip: Generate secure secrets with: openssl rand -hex 64\n")

        if exit_on_failure:
            sys.exit(1)

    else:
        print("✓ Environment validation passed\n")

    return passed


# Run validation when module is imported with RUN_ENV_VALIDATION=true
if os.environ.get("RUN_ENV_VALIDATION", "").lower() in ("true", "1", "yes"):
    validate_environment(exit_on_failure=True)
