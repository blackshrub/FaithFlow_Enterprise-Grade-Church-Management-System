"""
Member Care Service

Business logic for member care requests including:
- Request creation with validation
- Status workflow management
- WhatsApp notification dispatch
- Auto-registration of new members (spouses/couples)
- Guided prayer text retrieval from church settings
- Unread count aggregation
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.member_care_request import (
    RequestType,
    RequestStatus,
    MemberCareRequest,
    AcceptJesusCreate,
    BaptismCreate,
    ChildDedicationCreate,
    HolyMatrimonyCreate,
    MemberCareRequestUpdate,
    AcceptJesusData,
    BaptismData,
    ChildDedicationData,
    HolyMatrimonyData,
    PersonInfo,
    ChildInfo,
    UnreadCountsResponse,
    GuidedPrayerConfig,
)
from models.whatsapp_template import WhatsAppTemplateType


logger = logging.getLogger(__name__)


class MemberCareService:
    """Service class for member care request operations."""

    COLLECTION_NAME = "member_care_requests"

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    # =========================================================================
    # CREATE OPERATIONS
    # =========================================================================

    async def create_accept_jesus_request(
        self,
        church_id: str,
        data: AcceptJesusCreate,
        source: str = "kiosk",
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new Accept Jesus / Recommitment request."""
        # Get guided prayer text from church settings
        guided_prayer = await self.get_guided_prayer(church_id, "id")  # Default to Indonesian

        request_dict = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "request_type": RequestType.ACCEPT_JESUS.value,
            "member_id": data.member_id,
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "status": RequestStatus.NEW.value,
            "notes": data.notes,
            "source": source,
            "accept_jesus_data": {
                "commitment_type": data.commitment_type,
                "prayer_read": data.prayer_read,
                "guided_prayer_text": guided_prayer,
                "follow_up_requested": data.follow_up_requested,
            },
            "created_by": created_by or data.member_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "staff_notified": False,
        }

        await self.db[self.COLLECTION_NAME].insert_one(request_dict)

        # Send WhatsApp notification to staff
        await self._notify_staff(church_id, request_dict)

        # Send WhatsApp confirmation to requester
        await self._notify_requester(church_id, request_dict, language="id")

        return request_dict

    async def create_baptism_request(
        self,
        church_id: str,
        data: BaptismCreate,
        source: str = "kiosk",
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new Baptism request."""
        request_dict = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "request_type": RequestType.BAPTISM.value,
            "member_id": data.member_id,
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "status": RequestStatus.NEW.value,
            "notes": data.notes,
            "source": source,
            "baptism_data": {
                "preferred_date": data.preferred_date.isoformat() if data.preferred_date else None,
                "previous_baptism": data.previous_baptism,
                "testimony": data.testimony,
            },
            "created_by": created_by or data.member_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "staff_notified": False,
        }

        await self.db[self.COLLECTION_NAME].insert_one(request_dict)

        # Send WhatsApp notification to staff
        await self._notify_staff(church_id, request_dict)

        # Send WhatsApp confirmation to requester
        await self._notify_requester(church_id, request_dict, language="id")

        return request_dict

    async def create_child_dedication_request(
        self,
        church_id: str,
        data: ChildDedicationCreate,
        source: str = "kiosk",
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new Child Dedication request."""
        # Auto-register father/mother if they don't have member_id
        father_info = await self._process_person_info(church_id, data.father)
        mother_info = await self._process_person_info(church_id, data.mother)

        request_dict = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "request_type": RequestType.CHILD_DEDICATION.value,
            "member_id": data.member_id,
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "status": RequestStatus.NEW.value,
            "notes": data.notes,
            "source": source,
            "child_dedication_data": {
                "father": father_info,
                "mother": mother_info,
                "child": {
                    "name": data.child.name,
                    "birth_date": data.child.birth_date.isoformat(),
                    "gender": data.child.gender,
                    "photo_url": data.child.photo_url,
                    "photo_fid": data.child.photo_fid,
                    "photo_thumbnail_url": data.child.photo_thumbnail_url,
                },
                "preferred_date": data.preferred_date.isoformat() if data.preferred_date else None,
            },
            "created_by": created_by or data.member_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "staff_notified": False,
        }

        await self.db[self.COLLECTION_NAME].insert_one(request_dict)

        # Send WhatsApp notification to staff
        await self._notify_staff(church_id, request_dict)

        # Send WhatsApp confirmation to father and mother
        await self._notify_requester(church_id, request_dict, language="id")

        return request_dict

    async def create_holy_matrimony_request(
        self,
        church_id: str,
        data: HolyMatrimonyCreate,
        source: str = "kiosk",
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new Holy Matrimony request."""
        # Auto-register persons if they don't have member_id
        person_a_info = await self._process_person_info(church_id, data.person_a, include_baptized=True)
        person_b_info = await self._process_person_info(church_id, data.person_b, include_baptized=True)

        # Calculate both_baptized
        both_baptized = (
            person_a_info.get("is_baptized", False) and
            person_b_info.get("is_baptized", False)
        )

        request_dict = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "request_type": RequestType.HOLY_MATRIMONY.value,
            "member_id": data.member_id,
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "status": RequestStatus.NEW.value,
            "notes": data.notes,
            "source": source,
            "holy_matrimony_data": {
                "person_a": person_a_info,
                "person_b": person_b_info,
                "planned_wedding_date": data.planned_wedding_date.isoformat() if data.planned_wedding_date else None,
                "venue_preference": data.venue_preference,
                "both_baptized": both_baptized,
            },
            "created_by": created_by or data.member_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "staff_notified": False,
        }

        await self.db[self.COLLECTION_NAME].insert_one(request_dict)

        # Send WhatsApp notification to staff
        await self._notify_staff(church_id, request_dict)

        # Send WhatsApp confirmation to both partners
        await self._notify_requester(church_id, request_dict, language="id")

        return request_dict

    # =========================================================================
    # READ OPERATIONS
    # =========================================================================

    async def get_request(
        self,
        church_id: str,
        request_id: str,
        enrich: bool = True,
    ) -> Optional[Dict[str, Any]]:
        """Get a single request by ID."""
        request = await self.db[self.COLLECTION_NAME].find_one(
            {"church_id": church_id, "id": request_id},
            {"_id": 0}
        )

        if request and enrich:
            request = await self._enrich_request(request)

        return request

    async def list_requests(
        self,
        church_id: str,
        request_type: Optional[str] = None,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """List requests with filters and pagination."""
        query: Dict[str, Any] = {"church_id": church_id}

        # Apply filters
        if request_type:
            query["request_type"] = request_type
        if status:
            query["status"] = status
        if assigned_to:
            query["assigned_to_user_id"] = assigned_to
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
            ]
        if start_date:
            query["created_at"] = {"$gte": start_date}
        if end_date:
            if "created_at" in query:
                query["created_at"]["$lte"] = end_date
            else:
                query["created_at"] = {"$lte": end_date}

        # Get total count
        total = await self.db[self.COLLECTION_NAME].count_documents(query)

        # Get paginated results
        cursor = self.db[self.COLLECTION_NAME].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)

        requests = await cursor.to_list(length=limit)

        # Enrich each request
        enriched_requests = []
        for request in requests:
            enriched = await self._enrich_request(request)
            enriched_requests.append(enriched)

        return {
            "data": enriched_requests,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total,
            }
        }

    async def get_unread_counts(self, church_id: str) -> UnreadCountsResponse:
        """Get unread (status=new) counts per request type."""
        pipeline = [
            {"$match": {"church_id": church_id, "status": RequestStatus.NEW.value}},
            {"$group": {"_id": "$request_type", "count": {"$sum": 1}}}
        ]

        results = await self.db[self.COLLECTION_NAME].aggregate(pipeline).to_list(10)

        counts = {
            "accept_jesus": 0,
            "baptism": 0,
            "child_dedication": 0,
            "holy_matrimony": 0,
        }

        for result in results:
            request_type = result["_id"]
            if request_type in counts:
                counts[request_type] = result["count"]

        counts["total"] = sum(counts.values())

        return UnreadCountsResponse(**counts)

    # =========================================================================
    # UPDATE OPERATIONS
    # =========================================================================

    async def update_request(
        self,
        church_id: str,
        request_id: str,
        data: MemberCareRequestUpdate,
        updated_by: str,
    ) -> Optional[Dict[str, Any]]:
        """Update a request."""
        # Build update dict
        update_dict: Dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc),
            "updated_by": updated_by,
        }

        # Apply status change with timestamp
        if data.status:
            update_dict["status"] = data.status
            if data.status == RequestStatus.CONTACTED.value:
                update_dict["contacted_at"] = datetime.now(timezone.utc)
            elif data.status == RequestStatus.SCHEDULED.value:
                update_dict["scheduled_at"] = datetime.now(timezone.utc)
            elif data.status == RequestStatus.COMPLETED.value:
                update_dict["completed_at"] = datetime.now(timezone.utc)
            elif data.status == RequestStatus.CANCELLED.value:
                update_dict["cancelled_at"] = datetime.now(timezone.utc)

        # Apply other updates
        if data.assigned_to_user_id is not None:
            update_dict["assigned_to_user_id"] = data.assigned_to_user_id
        if data.internal_notes is not None:
            update_dict["internal_notes"] = data.internal_notes
        if data.notes is not None:
            update_dict["notes"] = data.notes
        if data.scheduled_date:
            # Update type-specific scheduled_date based on request type
            request = await self.db[self.COLLECTION_NAME].find_one(
                {"church_id": church_id, "id": request_id}
            )
            if request:
                request_type = request.get("request_type")
                if request_type == RequestType.BAPTISM.value:
                    update_dict["baptism_data.scheduled_date"] = data.scheduled_date.isoformat()
                elif request_type == RequestType.CHILD_DEDICATION.value:
                    update_dict["child_dedication_data.scheduled_date"] = data.scheduled_date.isoformat()
                elif request_type == RequestType.HOLY_MATRIMONY.value:
                    update_dict["holy_matrimony_data.scheduled_date"] = data.scheduled_date.isoformat()

        if data.location:
            request = await self.db[self.COLLECTION_NAME].find_one(
                {"church_id": church_id, "id": request_id}
            )
            if request:
                request_type = request.get("request_type")
                if request_type == RequestType.BAPTISM.value:
                    update_dict["baptism_data.baptism_location"] = data.location
                elif request_type == RequestType.CHILD_DEDICATION.value:
                    update_dict["child_dedication_data.dedication_location"] = data.location
                elif request_type == RequestType.HOLY_MATRIMONY.value:
                    update_dict["holy_matrimony_data.wedding_location"] = data.location

        # Perform update
        result = await self.db[self.COLLECTION_NAME].update_one(
            {"church_id": church_id, "id": request_id},
            {"$set": update_dict}
        )

        if result.modified_count == 0:
            return None

        # Return updated document
        return await self.get_request(church_id, request_id)

    async def delete_request(
        self,
        church_id: str,
        request_id: str,
        soft_delete: bool = True,
    ) -> bool:
        """Delete a request (soft delete by default)."""
        if soft_delete:
            result = await self.db[self.COLLECTION_NAME].update_one(
                {"church_id": church_id, "id": request_id},
                {
                    "$set": {
                        "status": RequestStatus.CANCELLED.value,
                        "cancelled_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )
            return result.modified_count > 0
        else:
            result = await self.db[self.COLLECTION_NAME].delete_one(
                {"church_id": church_id, "id": request_id}
            )
            return result.deleted_count > 0

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    async def get_guided_prayer(
        self,
        church_id: str,
        language: str = "id",
    ) -> str:
        """Get guided prayer text from church settings or return default."""
        # Try to get from church settings
        church_settings = await self.db.church_settings.find_one(
            {"church_id": church_id},
            {"member_care_settings": 1}
        )

        if church_settings:
            member_care_settings = church_settings.get("member_care_settings", {})
            prayer_key = f"guided_prayer_{language}"
            if prayer_key in member_care_settings and member_care_settings[prayer_key]:
                return member_care_settings[prayer_key]

        # Return default prayer
        default_config = GuidedPrayerConfig.get_default()
        return default_config.prayer_id if language == "id" else default_config.prayer_en

    async def _process_person_info(
        self,
        church_id: str,
        person_data: Any,
        include_baptized: bool = False,
    ) -> Dict[str, Any]:
        """Process person info, auto-registering if no member_id."""
        person_dict = {
            "name": person_data.name,
            "phone": person_data.phone,
            "member_id": person_data.member_id,
        }

        # Include photo_url if passed
        if hasattr(person_data, "photo_url") and person_data.photo_url:
            person_dict["photo_url"] = person_data.photo_url

        if include_baptized:
            person_dict["is_baptized"] = person_data.is_baptized or False

        # If no member_id but has name and phone, auto-register
        if not person_data.member_id and person_data.name and person_data.phone:
            new_member_id = await self._auto_register_member(
                church_id,
                person_data.name,
                person_data.phone,
            )
            if new_member_id:
                person_dict["member_id"] = new_member_id
                person_dict["auto_registered"] = True

        return person_dict

    async def _auto_register_member(
        self,
        church_id: str,
        full_name: str,
        phone: str,
    ) -> Optional[str]:
        """Auto-register a new member for spouse/couple not in system."""
        # Get default membership status from church settings
        church_settings = await self.db.church_settings.find_one(
            {"church_id": church_id},
            {"member_care_settings": 1}
        )

        default_status = "Pre-Visitor"
        if church_settings:
            member_care_settings = church_settings.get("member_care_settings", {})
            default_status = member_care_settings.get("default_membership_status", "Pre-Visitor")

        # Check if member with same phone already exists
        existing = await self.db.members.find_one(
            {"church_id": church_id, "phone_whatsapp": phone},
            {"id": 1}
        )
        if existing:
            return existing.get("id")

        # Create new member
        member_id = str(uuid.uuid4())
        member_doc = {
            "id": member_id,
            "church_id": church_id,
            "full_name": full_name,
            "phone_whatsapp": phone,
            "membership_status": default_status,
            "source": "auto_registered_member_care",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "deleted": False,
        }

        await self.db.members.insert_one(member_doc)
        logger.info(f"Auto-registered member {member_id} for {full_name} ({phone})")

        return member_id

    async def _enrich_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich request with member and staff info."""
        # Get member info
        if request.get("member_id"):
            member = await self.db.members.find_one(
                {"id": request["member_id"]},
                {"id": 1, "full_name": 1, "phone_whatsapp": 1, "photo_url": 1, "photo_thumbnail_url": 1}
            )
            if member:
                member.pop("_id", None)
                request["member_info"] = member
                # Add photo_url at top level for frontend convenience
                request["member_photo"] = member.get("photo_url") or member.get("photo_thumbnail_url")

        # Get assigned staff info
        if request.get("assigned_to_user_id"):
            staff = await self.db.users.find_one(
                {"id": request["assigned_to_user_id"]},
                {"id": 1, "full_name": 1, "email": 1}
            )
            if staff:
                staff.pop("_id", None)
                request["assigned_to_info"] = staff

        # Enrich child_dedication_data with photos for father and mother
        if request.get("child_dedication_data"):
            cd_data = request["child_dedication_data"]
            for person_key in ["father", "mother"]:
                person = cd_data.get(person_key)
                if person and person.get("member_id") and not person.get("photo_url"):
                    member = await self.db.members.find_one(
                        {"id": person["member_id"]},
                        {"photo_url": 1, "photo_thumbnail_url": 1}
                    )
                    if member:
                        person["photo_url"] = member.get("photo_url") or member.get("photo_thumbnail_url")

        # Enrich holy_matrimony_data with photos for person_a and person_b
        if request.get("holy_matrimony_data"):
            hm_data = request["holy_matrimony_data"]
            for person_key in ["person_a", "person_b"]:
                person = hm_data.get(person_key)
                if person and person.get("member_id") and not person.get("photo_url"):
                    member = await self.db.members.find_one(
                        {"id": person["member_id"]},
                        {"photo_url": 1, "photo_thumbnail_url": 1}
                    )
                    if member:
                        person["photo_url"] = member.get("photo_url") or member.get("photo_thumbnail_url")

        return request

    async def _notify_staff(
        self,
        church_id: str,
        request: Dict[str, Any],
    ) -> None:
        """Send WhatsApp notification to church admin about new request."""
        try:
            from services.whatsapp_service import send_member_care_confirmation

            # Get church settings for notification config
            church_settings = await self.db.church_settings.find_one(
                {"church_id": church_id},
                {"member_care_settings": 1}
            )

            member_care_settings = church_settings.get("member_care_settings", {}) if church_settings else {}
            if not member_care_settings.get("notify_on_new_request", True):
                return

            # Get church name
            church = await self.db.churches.find_one(
                {"id": church_id},
                {"name": 1}
            )
            church_name = church.get("name", "Your Church") if church else "Your Church"

            # Get all church admins to notify
            admin_phones = []

            # 1. Get default assigned user if set
            recipient_user_id = member_care_settings.get("default_assigned_user_id")
            if recipient_user_id:
                staff = await self.db.users.find_one(
                    {"id": recipient_user_id},
                    {"phone": 1}
                )
                if staff and staff.get("phone"):
                    admin_phones.append(staff["phone"])

            # 2. Always get church admin(s) as well
            admin_cursor = self.db.users.find(
                {"church_id": church_id, "role": {"$in": ["admin", "super_admin"]}},
                {"phone": 1}
            )
            async for admin in admin_cursor:
                if admin.get("phone") and admin["phone"] not in admin_phones:
                    admin_phones.append(admin["phone"])

            if not admin_phones:
                logger.warning(f"No admin phones found for church {church_id}")
                return

            # Build request type label
            request_type_labels = {
                "accept_jesus": "Accept Jesus / Komitmen",
                "baptism": "Baptism / Baptisan",
                "child_dedication": "Child Dedication / Penyerahan Anak",
                "holy_matrimony": "Holy Matrimony / Pernikahan",
            }

            request_type = request.get("request_type", "")
            type_label = request_type_labels.get(request_type, request_type)
            requester_name = request.get("full_name", "Unknown")

            # Build details based on request type
            details = ""
            if request_type == "accept_jesus":
                accept_data = request.get("accept_jesus_data", {})
                details = f"Commitment: {accept_data.get('commitment_type', '-')}"
            elif request_type == "baptism":
                baptism_data = request.get("baptism_data", {})
                details = f"Preferred Date: {baptism_data.get('preferred_date', 'Not specified')}"
            elif request_type == "child_dedication":
                child_data = request.get("child_dedication_data", {})
                child = child_data.get("child", {})
                details = f"Child: {child.get('name', '-')} ({child.get('gender', '-')})"
            elif request_type == "holy_matrimony":
                matrimony_data = request.get("holy_matrimony_data", {})
                person_a = matrimony_data.get("person_a", {})
                person_b = matrimony_data.get("person_b", {})
                details = f"Couple: {person_a.get('name', '-')} & {person_b.get('name', '-')}"

            variables = {
                "church_name": church_name,
                "request_type": type_label,
                "requester_name": requester_name,
                "requester_phone": request.get("phone", "-"),
                "details": details,
            }

            # Send to all admin phones
            for phone in admin_phones:
                try:
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.NEW_REQUEST_ADMIN_NOTIFICATION.value,
                        phone_number=phone,
                        variables=variables,
                        language="id",  # Default to Indonesian for admin notifications
                    )
                    logger.info(f"Sent admin notification to {phone} for request {request['id']}")
                except Exception as e:
                    logger.error(f"Failed to send admin notification to {phone}: {e}")

            # Update request with notification status
            await self.db[self.COLLECTION_NAME].update_one(
                {"id": request["id"]},
                {
                    "$set": {
                        "staff_notified": True,
                        "staff_notified_at": datetime.now(timezone.utc),
                    }
                }
            )

        except Exception as e:
            logger.error(f"Failed to send staff notification: {e}")

    async def _notify_requester(
        self,
        church_id: str,
        request: Dict[str, Any],
        language: str = "en",
    ) -> None:
        """
        Send WhatsApp confirmation to all relevant participants.

        - Accept Jesus: requester only
        - Baptism: requester only
        - Child Dedication: father + mother phones
        - Holy Matrimony: person_a + person_b phones
        """
        try:
            from services.whatsapp_service import send_member_care_confirmation

            # Get church name
            church = await self.db.churches.find_one(
                {"id": church_id},
                {"name": 1}
            )
            church_name = church.get("name", "Your Church") if church else "Your Church"

            request_type = request.get("request_type")
            base_variables = {
                "church_name": church_name,
                "name": request.get("full_name", ""),
                "phone": request.get("phone", ""),
            }

            if request_type == RequestType.ACCEPT_JESUS.value:
                # Send to requester
                accept_data = request.get("accept_jesus_data", {})
                variables = {
                    **base_variables,
                    "commitment_type": accept_data.get("commitment_type", ""),
                }

                if request.get("phone"):
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.ACCEPT_JESUS_CONFIRMATION.value,
                        phone_number=request["phone"],
                        variables=variables,
                        language=language,
                    )
                    logger.info(f"Sent Accept Jesus confirmation to {request['phone']}")

            elif request_type == RequestType.BAPTISM.value:
                # Send to requester
                baptism_data = request.get("baptism_data", {})
                variables = {
                    **base_variables,
                    "preferred_date": baptism_data.get("preferred_date", "To be scheduled"),
                }

                if request.get("phone"):
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.BAPTISM_CONFIRMATION.value,
                        phone_number=request["phone"],
                        variables=variables,
                        language=language,
                    )
                    logger.info(f"Sent Baptism confirmation to {request['phone']}")

            elif request_type == RequestType.CHILD_DEDICATION.value:
                # Send to BOTH father AND mother
                child_data = request.get("child_dedication_data", {})
                father = child_data.get("father", {})
                mother = child_data.get("mother", {})
                child = child_data.get("child", {})

                variables = {
                    "church_name": church_name,
                    "child_name": child.get("name", ""),
                    "child_gender": child.get("gender", ""),
                    "father_name": father.get("name", ""),
                    "mother_name": mother.get("name", ""),
                }

                # Send to father
                if father.get("phone"):
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.CHILD_DEDICATION_CONFIRMATION.value,
                        phone_number=father["phone"],
                        variables={**variables, "name": father.get("name", "")},
                        language=language,
                    )
                    logger.info(f"Sent Child Dedication confirmation to father: {father['phone']}")

                # Send to mother
                if mother.get("phone"):
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.CHILD_DEDICATION_CONFIRMATION.value,
                        phone_number=mother["phone"],
                        variables={**variables, "name": mother.get("name", "")},
                        language=language,
                    )
                    logger.info(f"Sent Child Dedication confirmation to mother: {mother['phone']}")

            elif request_type == RequestType.HOLY_MATRIMONY.value:
                # Send to BOTH partners
                matrimony_data = request.get("holy_matrimony_data", {})
                person_a = matrimony_data.get("person_a", {})
                person_b = matrimony_data.get("person_b", {})

                base_matrimony_vars = {
                    "church_name": church_name,
                    "both_baptized": "Yes" if matrimony_data.get("both_baptized") else "No",
                    "planned_date": matrimony_data.get("planned_wedding_date", "To be scheduled"),
                }

                # Send to person A
                if person_a.get("phone"):
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.HOLY_MATRIMONY_CONFIRMATION.value,
                        phone_number=person_a["phone"],
                        variables={
                            **base_matrimony_vars,
                            "name": person_a.get("name", ""),
                            "partner_name": person_b.get("name", ""),
                        },
                        language=language,
                    )
                    logger.info(f"Sent Holy Matrimony confirmation to person A: {person_a['phone']}")

                # Send to person B
                if person_b.get("phone"):
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.HOLY_MATRIMONY_CONFIRMATION.value,
                        phone_number=person_b["phone"],
                        variables={
                            **base_matrimony_vars,
                            "name": person_b.get("name", ""),
                            "partner_name": person_a.get("name", ""),
                        },
                        language=language,
                    )
                    logger.info(f"Sent Holy Matrimony confirmation to person B: {person_b['phone']}")

            # Update request with requester notification status
            await self.db[self.COLLECTION_NAME].update_one(
                {"id": request["id"]},
                {
                    "$set": {
                        "requester_notified": True,
                        "requester_notified_at": datetime.now(timezone.utc),
                    }
                }
            )

        except Exception as e:
            logger.error(f"Failed to send requester notification: {e}")
            # Don't raise - notification failure shouldn't block the request


# =============================================================================
# MEMBER SEARCH SERVICE
# =============================================================================

class MemberSearchService:
    """Service for searching members (for spouse/couple selection)."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def search_members(
        self,
        church_id: str,
        query: str,
        limit: int = 10,
        exclude_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Search members by name or phone."""
        if len(query) < 2:
            return {"members": [], "total": 0, "query": query}

        search_query: Dict[str, Any] = {
            "church_id": church_id,
            "deleted": {"$ne": True},
            "$or": [
                {"full_name": {"$regex": query, "$options": "i"}},
                {"phone_whatsapp": {"$regex": query, "$options": "i"}},
            ]
        }

        if exclude_ids:
            search_query["id"] = {"$nin": exclude_ids}

        cursor = self.db.members.find(
            search_query,
            {
                "_id": 0,
                "id": 1,
                "full_name": 1,
                "phone_whatsapp": 1,
                "photo_url": 1,
                "photo_thumbnail_url": 1,
                "membership_status": 1,
            }
        ).limit(limit)

        members = await cursor.to_list(length=limit)

        return {
            "members": members,
            "total": len(members),
            "query": query,
        }
