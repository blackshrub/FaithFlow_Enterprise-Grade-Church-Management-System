"""
Test data factories for generating realistic test data.

Uses Faker library to generate realistic names, emails, phone numbers, etc.
Factories provide a clean way to create test data without hardcoding values.

Usage:
    member = MemberFactory.create(full_name="John Doe")
    event = EventFactory.create(church_id=church["id"])
"""

from faker import Faker
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
import uuid

fake = Faker()


class ChurchFactory:
    """Factory for creating test church data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create a church document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Church document
        """
        return {
            "id": kwargs.get("id", f"church-{uuid.uuid4().hex[:12]}"),
            "name": kwargs.get("name", f"{fake.company()} Church"),
            "email": kwargs.get("email", fake.company_email()),
            "timezone": kwargs.get("timezone", "Asia/Jakarta"),
            "locale": kwargs.get("locale", "id"),
            "address": kwargs.get("address", fake.address()),
            "phone": kwargs.get("phone", fake.phone_number()),
            "website": kwargs.get("website", fake.url()),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class UserFactory:
    """Factory for creating test user data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create a user document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: User document
        """
        from utils.auth import get_password_hash

        return {
            "id": kwargs.get("id", f"user-{uuid.uuid4().hex[:12]}"),
            "email": kwargs.get("email", fake.email()),
            "password_hash": kwargs.get("password_hash", get_password_hash("test123")),
            "full_name": kwargs.get("full_name", fake.name()),
            "role": kwargs.get("role", "staff"),
            "church_id": kwargs.get("church_id"),
            "is_active": kwargs.get("is_active", True),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class MemberFactory:
    """Factory for creating test member data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create a member document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Member document
        """
        gender = kwargs.get("gender", fake.random_element(["Male", "Female"]))
        first_name = fake.first_name_male() if gender == "Male" else fake.first_name_female()
        last_name = fake.last_name()

        return {
            "id": kwargs.get("id", f"member-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "full_name": kwargs.get("full_name", f"{first_name} {last_name}"),
            "first_name": kwargs.get("first_name", first_name),
            "last_name": kwargs.get("last_name", last_name),
            "email": kwargs.get("email", fake.email()),
            "phone_whatsapp": kwargs.get("phone_whatsapp", "+628" + str(fake.random_number(digits=10))),
            "gender": gender,
            "date_of_birth": kwargs.get("date_of_birth", fake.date_of_birth(minimum_age=18, maximum_age=80).isoformat()),
            "address": kwargs.get("address", fake.address()),
            "member_status": kwargs.get("member_status", "Active"),
            "current_status_id": kwargs.get("current_status_id"),
            "is_active": kwargs.get("is_active", True),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class EventFactory:
    """Factory for creating test event data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create an event document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Event document
        """
        event_date = kwargs.get("event_date", datetime.utcnow() + timedelta(days=7))

        return {
            "id": kwargs.get("id", f"event-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "name": kwargs.get("name", f"{fake.catch_phrase()} Event"),
            "description": kwargs.get("description", fake.text(max_nb_chars=200)),
            "event_type": kwargs.get("event_type", "single"),
            "event_date": event_date.isoformat() if isinstance(event_date, datetime) else event_date,
            "start_time": kwargs.get("start_time", "10:00"),
            "end_time": kwargs.get("end_time", "12:00"),
            "location": kwargs.get("location", fake.address()),
            "max_participants": kwargs.get("max_participants", fake.random_int(min=50, max=200)),
            "requires_rsvp": kwargs.get("requires_rsvp", True),
            "enable_seat_selection": kwargs.get("enable_seat_selection", False),
            "is_active": kwargs.get("is_active", True),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class GroupFactory:
    """Factory for creating test group/ministry data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create a group document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Group document
        """
        return {
            "id": kwargs.get("id", f"group-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "name": kwargs.get("name", f"{fake.word().title()} Ministry"),
            "description": kwargs.get("description", fake.text(max_nb_chars=200)),
            "category": kwargs.get("category", "fellowship"),
            "leader_id": kwargs.get("leader_id"),
            "meeting_day": kwargs.get("meeting_day", fake.random_element(["Sunday", "Monday", "Wednesday", "Friday"])),
            "meeting_time": kwargs.get("meeting_time", "19:00"),
            "location": kwargs.get("location", fake.address()),
            "is_active": kwargs.get("is_active", True),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class AppointmentFactory:
    """Factory for creating test counseling appointment data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create an appointment document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Appointment document
        """
        appointment_date = kwargs.get("date", datetime.utcnow() + timedelta(days=3))

        return {
            "id": kwargs.get("id", f"appointment-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "member_id": kwargs.get("member_id"),
            "member_name": kwargs.get("member_name", fake.name()),
            "counselor_id": kwargs.get("counselor_id"),
            "counselor_name": kwargs.get("counselor_name", fake.name()),
            "date": appointment_date.isoformat() if isinstance(appointment_date, datetime) else appointment_date,
            "start_time": kwargs.get("start_time", "10:00"),
            "end_time": kwargs.get("end_time", "11:00"),
            "type": kwargs.get("type", "counseling"),
            "topic": kwargs.get("topic", fake.sentence()),
            "urgency": kwargs.get("urgency", "normal"),
            "status": kwargs.get("status", "pending"),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class ArticleFactory:
    """Factory for creating test article data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create an article document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Article document
        """
        title = kwargs.get("title", fake.sentence())
        slug = kwargs.get("slug", fake.slug())

        return {
            "id": kwargs.get("id", f"article-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "title": title,
            "slug": slug,
            "content": kwargs.get("content", f"<p>{fake.text(max_nb_chars=500)}</p>"),
            "excerpt": kwargs.get("excerpt", fake.text(max_nb_chars=150)),
            "author_id": kwargs.get("author_id"),
            "author_name": kwargs.get("author_name", fake.name()),
            "status": kwargs.get("status", "draft"),
            "category_ids": kwargs.get("category_ids", []),
            "tag_ids": kwargs.get("tag_ids", []),
            "featured_image": kwargs.get("featured_image"),
            "publish_date": kwargs.get("publish_date"),
            "views_count": kwargs.get("views_count", 0),
            "reading_time": kwargs.get("reading_time", 5),
            "allow_comments": kwargs.get("allow_comments", True),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class PrayerRequestFactory:
    """Factory for creating test prayer request data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create a prayer request document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Prayer request document
        """
        return {
            "id": kwargs.get("id", f"prayer-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "requester_name": kwargs.get("requester_name", fake.name()),
            "requester_contact": kwargs.get("requester_contact", "+628" + str(fake.random_number(digits=10))),
            "title": kwargs.get("title", fake.sentence()),
            "description": kwargs.get("description", fake.text(max_nb_chars=300)),
            "category": kwargs.get("category", fake.random_element(["healing", "family", "work", "guidance"])),
            "status": kwargs.get("status", "new"),
            "source": kwargs.get("source", "admin_input"),
            "prayed_at": kwargs.get("prayed_at"),
            "internal_notes": kwargs.get("internal_notes"),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }


class ChartOfAccountFactory:
    """Factory for creating test chart of account data."""

    @staticmethod
    def create(**kwargs) -> Dict[str, Any]:
        """
        Create a chart of account document.

        Args:
            **kwargs: Override default values

        Returns:
            dict: Chart of account document
        """
        account_types = ["Asset", "Liability", "Equity", "Income", "Expense"]
        account_type = kwargs.get("account_type", fake.random_element(account_types))

        # Normal balance based on account type
        if account_type in ["Asset", "Expense"]:
            normal_balance = "Debit"
        else:
            normal_balance = "Credit"

        return {
            "id": kwargs.get("id", f"coa-{uuid.uuid4().hex[:12]}"),
            "church_id": kwargs.get("church_id"),
            "code": kwargs.get("code", str(fake.random_number(digits=4, fix_len=True))),
            "name": kwargs.get("name", fake.bs().title()),
            "description": kwargs.get("description", fake.text(max_nb_chars=100)),
            "account_type": account_type,
            "normal_balance": kwargs.get("normal_balance", normal_balance),
            "parent_id": kwargs.get("parent_id"),
            "level": kwargs.get("level", 0),
            "is_active": kwargs.get("is_active", True),
            "tags": kwargs.get("tags", []),
            "default_responsibility_center_id": kwargs.get("default_responsibility_center_id"),
            "created_at": kwargs.get("created_at", datetime.utcnow()),
            "updated_at": kwargs.get("updated_at", datetime.utcnow())
        }
