"""Service for managing counseling appointments.

Handles:
- Creating appointments (from member or staff)
- Approval/rejection workflow
- Cancellation and completion
- Slot booking atomicity
"""

from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import uuid

logger = logging.getLogger(__name__)


class CounselingAppointmentService:
    """Service for managing counseling appointments."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_appointment_from_member(
        self,
        church_id: str,
        member_id: str,
        slot_id: str,
        form_data: dict
    ) -> dict:
        """
        Create appointment from member (mobile app).
        
        Atomically:
        1. Verify slot is open
        2. Mark slot as booked
        3. Create appointment with status=pending
        
        Returns:
            dict: Created appointment document
            
        Raises:
            ValueError: If slot not available or validation fails
        """
        # Step 1: Get slot and verify
        slot = await self.db.counseling_time_slots.find_one({
            "id": slot_id,
            "church_id": church_id
        })
        
        if not slot:
            raise ValueError("SLOT_NOT_FOUND")
        
        if slot["status"] != "open":
            raise ValueError("SLOT_NOT_AVAILABLE")
        
        # Step 2: Create appointment document
        appointment_id = str(uuid.uuid4())
        appointment = {
            "id": appointment_id,
            "church_id": church_id,
            "member_id": member_id,
            "counselor_id": slot["counselor_id"],
            "slot_id": slot_id,
            "date": slot["date"],
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
            "type": form_data.get("type", "counseling"),
            "status": "pending",
            "urgency": form_data.get("urgency", "normal"),
            "topic": form_data["topic"],
            "description": form_data["description"],
            "preferred_channel": form_data.get("preferred_channel"),
            "preferred_location": form_data.get("preferred_location"),
            "contact_phone": form_data.get("contact_phone"),
            "created_by_member": True,
            "created_by_staff_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Step 3: Atomic update - mark slot as booked AND link appointment
        result = await self.db.counseling_time_slots.update_one(
            {
                "id": slot_id,
                "church_id": church_id,
                "status": "open"  # Only update if still open
            },
            {
                "$set": {
                    "status": "booked",
                    "appointment_id": appointment_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            # Slot was taken by someone else between our checks
            raise ValueError("SLOT_ALREADY_BOOKED")
        
        # Step 4: Insert appointment
        await self.db.counseling_appointments.insert_one(appointment)
        
        # Step 5: Log to audit
        await self._log_audit(
            church_id,
            "appointment_created",
            f"Member {member_id} requested appointment on {slot['date']} at {slot['start_time']}",
            {"appointment_id": appointment_id, "member_id": member_id}
        )

        # Send WhatsApp notifications to admins, counselor, and member
        await self._notify_appointment_created(church_id, appointment)

        logger.info(f"Appointment {appointment_id} created by member {member_id}")

        return appointment
    
    async def create_appointment_from_staff(
        self,
        church_id: str,
        staff_id: str,
        member_id: str,
        slot_id: str,
        form_data: dict
    ) -> dict:
        """
        Create appointment from staff (admin creates on behalf of member).
        
        Similar to create_from_member but marks as staff-created.
        """
        # Get slot and verify
        slot = await self.db.counseling_time_slots.find_one({
            "id": slot_id,
            "church_id": church_id
        })
        
        if not slot:
            raise ValueError("SLOT_NOT_FOUND")
        
        if slot["status"] != "open":
            raise ValueError("SLOT_NOT_AVAILABLE")
        
        # Create appointment
        appointment_id = str(uuid.uuid4())
        appointment = {
            "id": appointment_id,
            "church_id": church_id,
            "member_id": member_id,
            "counselor_id": slot["counselor_id"],
            "slot_id": slot_id,
            "date": slot["date"],
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
            "type": form_data.get("type", "counseling"),
            "status": "approved",  # Staff-created appointments are auto-approved
            "urgency": form_data.get("urgency", "normal"),
            "topic": form_data["topic"],
            "description": form_data["description"],
            "preferred_channel": form_data.get("preferred_channel"),
            "preferred_location": form_data.get("preferred_location"),
            "contact_phone": form_data.get("contact_phone"),
            "created_by_member": False,
            "created_by_staff_id": staff_id,
            "approved_by_staff_id": staff_id,
            "approved_at": datetime.utcnow(),
            "admin_notes": form_data.get("admin_notes"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Atomic slot booking
        result = await self.db.counseling_time_slots.update_one(
            {
                "id": slot_id,
                "church_id": church_id,
                "status": "open"
            },
            {
                "$set": {
                    "status": "booked",
                    "appointment_id": appointment_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise ValueError("SLOT_ALREADY_BOOKED")
        
        # Insert appointment
        await self.db.counseling_appointments.insert_one(appointment)
        
        # Log
        await self._log_audit(
            church_id,
            "appointment_created_by_staff",
            f"Staff {staff_id} created appointment for member {member_id} on {slot['date']}",
            {"appointment_id": appointment_id, "staff_id": staff_id, "member_id": member_id}
        )

        # Send WhatsApp notifications to admins, counselor, and member
        await self._notify_appointment_created(church_id, appointment)

        return appointment
    
    async def approve_appointment(
        self,
        church_id: str,
        appointment_id: str,
        staff_id: str,
        admin_notes: Optional[str] = None
    ) -> dict:
        """
        Approve a pending appointment.
        """
        appointment = await self.db.counseling_appointments.find_one({
            "id": appointment_id,
            "church_id": church_id
        })
        
        if not appointment:
            raise ValueError("APPOINTMENT_NOT_FOUND")
        
        if appointment["status"] != "pending":
            raise ValueError("APPOINTMENT_ALREADY_PROCESSED")
        
        # Update appointment
        update_data = {
            "status": "approved",
            "approved_by_staff_id": staff_id,
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if admin_notes:
            update_data["admin_notes"] = admin_notes
        
        await self.db.counseling_appointments.update_one(
            {"id": appointment_id},
            {"$set": update_data}
        )
        
        # Log
        await self._log_audit(
            church_id,
            "appointment_approved",
            f"Staff {staff_id} approved appointment {appointment_id}",
            {"appointment_id": appointment_id, "staff_id": staff_id}
        )
        
        logger.info(f"Appointment {appointment_id} approved by staff {staff_id}")
        
        # Fetch updated appointment
        return await self.db.counseling_appointments.find_one({"id": appointment_id})
    
    async def reject_appointment(
        self,
        church_id: str,
        appointment_id: str,
        staff_id: str,
        reason: str
    ) -> dict:
        """
        Reject a pending appointment and free the slot.
        """
        appointment = await self.db.counseling_appointments.find_one({
            "id": appointment_id,
            "church_id": church_id
        })
        
        if not appointment:
            raise ValueError("APPOINTMENT_NOT_FOUND")
        
        if appointment["status"] != "pending":
            raise ValueError("APPOINTMENT_ALREADY_PROCESSED")
        
        # Update appointment
        await self.db.counseling_appointments.update_one(
            {"id": appointment_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejected_reason": reason,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Free the slot
        await self.db.counseling_time_slots.update_one(
            {"id": appointment["slot_id"]},
            {
                "$set": {
                    "status": "open",
                    "appointment_id": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Log
        await self._log_audit(
            church_id,
            "appointment_rejected",
            f"Staff {staff_id} rejected appointment {appointment_id}: {reason}",
            {"appointment_id": appointment_id, "staff_id": staff_id, "reason": reason}
        )
        
        return await self.db.counseling_appointments.find_one({"id": appointment_id})
    
    async def cancel_appointment(
        self,
        church_id: str,
        appointment_id: str,
        canceled_by: str,
        reason: Optional[str] = None
    ) -> dict:
        """
        Cancel an appointment and free the slot if future.
        """
        appointment = await self.db.counseling_appointments.find_one({
            "id": appointment_id,
            "church_id": church_id
        })
        
        if not appointment:
            raise ValueError("APPOINTMENT_NOT_FOUND")
        
        if appointment["status"] in ["completed", "canceled"]:
            raise ValueError("APPOINTMENT_CANNOT_BE_CANCELED")
        
        # Update appointment
        await self.db.counseling_appointments.update_one(
            {"id": appointment_id},
            {
                "$set": {
                    "status": "canceled",
                    "admin_notes": f"Canceled by {canceled_by}. Reason: {reason or 'Not specified'}",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Free slot if future date
        from datetime import date
        if date.fromisoformat(appointment["date"]) >= date.today():
            await self.db.counseling_time_slots.update_one(
                {"id": appointment["slot_id"]},
                {
                    "$set": {
                        "status": "open",
                        "appointment_id": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        # Log
        await self._log_audit(
            church_id,
            "appointment_canceled",
            f"Appointment {appointment_id} canceled by {canceled_by}",
            {"appointment_id": appointment_id, "canceled_by": canceled_by}
        )
        
        return await self.db.counseling_appointments.find_one({"id": appointment_id})
    
    async def complete_appointment(
        self,
        church_id: str,
        appointment_id: str,
        staff_id: str,
        outcome_notes: str
    ) -> dict:
        """
        Mark appointment as completed with outcome notes.
        """
        appointment = await self.db.counseling_appointments.find_one({
            "id": appointment_id,
            "church_id": church_id
        })
        
        if not appointment:
            raise ValueError("APPOINTMENT_NOT_FOUND")
        
        if appointment["status"] != "approved":
            raise ValueError("APPOINTMENT_MUST_BE_APPROVED_FIRST")
        
        # Update appointment
        await self.db.counseling_appointments.update_one(
            {"id": appointment_id},
            {
                "$set": {
                    "status": "completed",
                    "outcome_notes": outcome_notes,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Slot stays booked for history
        
        # Log
        await self._log_audit(
            church_id,
            "appointment_completed",
            f"Staff {staff_id} completed appointment {appointment_id}",
            {"appointment_id": appointment_id, "staff_id": staff_id}
        )
        
        return await self.db.counseling_appointments.find_one({"id": appointment_id})
    
    async def _log_audit(
        self,
        church_id: str,
        action: str,
        description: str,
        metadata: dict
    ):
        """Log action to audit_logs collection."""
        try:
            await self.db.audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "action": action,
                "description": description,
                "metadata": metadata,
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")

    async def _notify_appointment_created(
        self,
        church_id: str,
        appointment: dict
    ):
        """
        Send WhatsApp notifications when a new appointment is created.
        - Notifies all church admins
        - Notifies the assigned counselor
        - Sends confirmation to the member
        """
        try:
            from services.whatsapp_service import send_member_care_confirmation
            from models.whatsapp_template import WhatsAppTemplateType

            # Get church name
            church = await self.db.churches.find_one(
                {"id": church_id},
                {"name": 1}
            )
            church_name = church.get("name", "Your Church") if church else "Your Church"

            # Get member info
            member = await self.db.members.find_one(
                {"id": appointment["member_id"]},
                {"full_name": 1, "phone_whatsapp": 1, "phone": 1}
            )
            member_name = member.get("full_name", "Member") if member else "Member"
            member_phone = member.get("phone_whatsapp") or member.get("phone") if member else None

            # Get counselor info
            counselor = await self.db.counseling_counselors.find_one(
                {"id": appointment["counselor_id"]},
                {"name": 1, "phone": 1, "user_id": 1}
            )
            counselor_name = counselor.get("name", "Counselor") if counselor else "Counselor"
            counselor_phone = counselor.get("phone") if counselor else None

            # Format date and time
            appointment_date = appointment.get("date", "")
            appointment_time = f"{appointment.get('start_time', '')} - {appointment.get('end_time', '')}"

            # Appointment type label
            type_labels = {
                "counseling": "Counseling / Konseling",
                "prayer": "Prayer / Doa",
            }
            appointment_type = type_labels.get(appointment.get("type", "counseling"), appointment.get("type", ""))

            # Urgency label
            urgency_labels = {
                "normal": "Normal",
                "urgent": "Urgent / Mendesak",
            }
            urgency = urgency_labels.get(appointment.get("urgency", "normal"), "Normal")

            # Build variables for admin notification
            admin_variables = {
                "church_name": church_name,
                "member_name": member_name,
                "member_phone": member_phone or "-",
                "appointment_type": appointment_type,
                "topic": appointment.get("topic", "-"),
                "date": appointment_date,
                "time": appointment_time,
                "counselor_name": counselor_name,
                "urgency": urgency,
            }

            # Collect admin phones to notify
            admin_phones = set()

            # 1. Notify assigned counselor
            if counselor_phone:
                admin_phones.add(counselor_phone)

            # 2. Notify all church admins
            admin_cursor = self.db.users.find(
                {"church_id": church_id, "role": {"$in": ["admin", "super_admin"]}},
                {"phone": 1}
            )
            async for admin in admin_cursor:
                if admin.get("phone"):
                    admin_phones.add(admin["phone"])

            # Send to all admins/counselors
            for phone in admin_phones:
                try:
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.COUNSELING_APPOINTMENT_ADMIN_NOTIFICATION.value,
                        phone_number=phone,
                        variables=admin_variables,
                        language="id",
                    )
                    logger.info(f"Sent counseling admin notification to {phone}")
                except Exception as e:
                    logger.error(f"Failed to send counseling admin notification to {phone}: {e}")

            # 3. Send confirmation to member
            if member_phone:
                member_variables = {
                    "church_name": church_name,
                    "name": member_name,
                    "appointment_type": appointment_type,
                    "topic": appointment.get("topic", "-"),
                    "date": appointment_date,
                    "time": appointment_time,
                    "counselor_name": counselor_name,
                }
                try:
                    await send_member_care_confirmation(
                        db=self.db,
                        church_id=church_id,
                        template_type=WhatsAppTemplateType.COUNSELING_APPOINTMENT_MEMBER_CONFIRMATION.value,
                        phone_number=member_phone,
                        variables=member_variables,
                        language="id",
                    )
                    logger.info(f"Sent counseling confirmation to member {member_phone}")
                except Exception as e:
                    logger.error(f"Failed to send counseling confirmation to member: {e}")

        except Exception as e:
            logger.error(f"Failed to send appointment notifications: {e}")
            # Don't raise - notification failure shouldn't block the appointment
