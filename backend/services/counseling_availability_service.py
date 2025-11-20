"""Service for managing counseling availability and slot generation.

Handles:
- Generating time slots from recurring rules
- Applying date-specific overrides
- Managing slot availability status
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, Literal
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class CounselingAvailabilityService:
    """Service for generating and managing counseling time slots."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def generate_slots_for_date(
        self,
        church_id: str,
        counselor_id: str,
        target_date: date
    ) -> dict:
        """
        Generate time slots for a specific date based on recurring rules and overrides.
        
        Returns:
            dict: { "generated": int, "blocked": int, "skipped": int }
        """
        generated = 0
        blocked = 0
        skipped = 0
        
        date_str = target_date.isoformat()
        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        
        # Step 1: Check for overrides first
        overrides = await self.db.counseling_overrides.find({
            "church_id": church_id,
            "counselor_id": counselor_id,
            "date": date_str
        }).to_list(100)
        
        # Step 2: Get recurring rules for this day of week
        recurring_rules = await self.db.counseling_recurring_rules.find({
            "church_id": church_id,
            "counselor_id": counselor_id,
            "day_of_week": day_of_week,
            "is_active": True
        }).to_list(100)
        
        # Step 3: Generate base slots from recurring rules
        base_slots = []
        for rule in recurring_rules:
            slots = self._generate_slots_from_rule(date_str, rule, church_id, counselor_id)
            base_slots.extend(slots)
        
        # Step 4: Apply overrides
        block_ranges = []
        add_extra_slots = []
        
        for override in overrides:
            if override["action"] == "block":
                block_ranges.append({
                    "start": time.fromisoformat(override["start_time"]),
                    "end": time.fromisoformat(override["end_time"])
                })
            elif override["action"] == "add_extra":
                # Generate extra slots from override
                extra_slots = self._generate_slots_from_time_range(
                    date_str,
                    override["start_time"],
                    override["end_time"],
                    60,  # default 1-hour slots
                    "override_add",
                    church_id,
                    counselor_id
                )
                add_extra_slots.extend(extra_slots)
        
        # Step 5: Filter blocked slots from base slots
        final_slots = []
        for slot in base_slots:
            slot_start = time.fromisoformat(slot["start_time"])
            slot_end = time.fromisoformat(slot["end_time"])
            
            is_blocked = any(
                self._time_ranges_overlap(slot_start, slot_end, br["start"], br["end"])
                for br in block_ranges
            )
            
            if is_blocked:
                # Create blocked slot
                slot["status"] = "blocked"
                slot["source"] = "override_block"
                blocked += 1
            
            final_slots.append(slot)
        
        # Step 6: Add extra slots
        final_slots.extend(add_extra_slots)
        
        # Step 7: Insert/update slots in database (avoid duplicates)
        for slot in final_slots:
            # Check if slot already exists
            existing = await self.db.counseling_time_slots.find_one({
                "church_id": church_id,
                "counselor_id": counselor_id,
                "date": slot["date"],
                "start_time": slot["start_time"]
            })
            
            if existing:
                # Don't overwrite booked slots
                if existing["status"] in ["booked", "reserved"]:
                    skipped += 1
                    continue
                
                # Update existing slot
                await self.db.counseling_time_slots.update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "status": slot["status"],
                            "source": slot["source"],
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            else:
                # Insert new slot
                await self.db.counseling_time_slots.insert_one(slot)
                if slot["status"] == "open":
                    generated += 1
        
        return {
            "generated": generated,
            "blocked": blocked,
            "skipped": skipped
        }
    
    async def generate_slots_for_range(
        self,
        church_id: str,
        counselor_id: str,
        start_date: date,
        end_date: date
    ) -> dict:
        """
        Generate slots for a date range.
        
        Returns:
            dict: Aggregated stats { "total_generated": int, "total_blocked": int, "total_skipped": int }
        """
        total_generated = 0
        total_blocked = 0
        total_skipped = 0
        
        current_date = start_date
        while current_date <= end_date:
            result = await self.generate_slots_for_date(church_id, counselor_id, current_date)
            total_generated += result["generated"]
            total_blocked += result["blocked"]
            total_skipped += result["skipped"]
            
            current_date += timedelta(days=1)
        
        logger.info(
            f"Generated slots for {counselor_id}: "
            f"{total_generated} open, {total_blocked} blocked, {total_skipped} skipped"
        )
        
        return {
            "total_generated": total_generated,
            "total_blocked": total_blocked,
            "total_skipped": total_skipped
        }
    
    async def generate_slots_for_all_counselors(
        self,
        church_id: str,
        days_ahead: int
    ) -> dict:
        """
        Generate slots for all active counselors in a church.
        
        Args:
            church_id: Church ID
            days_ahead: Number of days ahead to generate (or 365 for "forever")
        
        Returns:
            dict: Stats per counselor
        """
        # Get all active counselors
        counselors = await self.db.counselors.find({
            "church_id": church_id,
            "is_active": True
        }).to_list(1000)
        
        start_date = date.today()
        end_date = start_date + timedelta(days=days_ahead)
        
        results = {}
        for counselor in counselors:
            counselor_id = counselor["id"]
            result = await self.generate_slots_for_range(
                church_id,
                counselor_id,
                start_date,
                end_date
            )
            results[counselor_id] = result
        
        return results
    
    async def get_available_slots(
        self,
        church_id: str,
        counselor_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: Literal["open", "booked", "blocked", "reserved"] = "open"
    ) -> list:
        """
        Query available time slots.
        
        Returns:
            list: List of slot documents
        """
        query = {
            "church_id": church_id,
            "status": status
        }
        
        if counselor_id:
            query["counselor_id"] = counselor_id
        
        if date_from:
            query["date"] = {"$gte": date_from}
        
        if date_to:
            if "date" in query:
                query["date"]["$lte"] = date_to
            else:
                query["date"] = {"$lte": date_to}
        
        slots = await self.db.counseling_time_slots.find(query).sort([
            ("date", 1),
            ("start_time", 1)
        ]).to_list(1000)
        
        return slots
    
    def _generate_slots_from_rule(self, date_str: str, rule: dict) -> list:
        """Generate slots from a recurring rule."""
        return self._generate_slots_from_time_range(
            date_str,
            rule["start_time"],
            rule["end_time"],
            rule["slot_length_minutes"],
            "recurring"
        )
    
    def _generate_slots_from_time_range(
        self,
        date_str: str,
        start_time_str: str,
        end_time_str: str,
        slot_length_minutes: int,
        source: str
    ) -> list:
        """Generate individual time slots from a time range."""
        import uuid
        
        start_time = time.fromisoformat(start_time_str)
        end_time = time.fromisoformat(end_time_str)
        
        # Convert to minutes
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute
        
        slots = []
        current_minutes = start_minutes
        
        while current_minutes + slot_length_minutes <= end_minutes:
            slot_start = time(hour=current_minutes // 60, minute=current_minutes % 60)
            slot_end_minutes = current_minutes + slot_length_minutes
            slot_end = time(hour=slot_end_minutes // 60, minute=slot_end_minutes % 60)
            
            slots.append({
                "id": str(uuid.uuid4()),
                "date": date_str,
                "start_time": slot_start.isoformat(timespec='minutes'),
                "end_time": slot_end.isoformat(timespec='minutes'),
                "status": "open",
                "source": source,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            current_minutes += slot_length_minutes
        
        return slots
    
    @staticmethod
    def _time_ranges_overlap(
        start1: time,
        end1: time,
        start2: time,
        end2: time
    ) -> bool:
        """Check if two time ranges overlap."""
        # Convert to minutes for easier comparison
        s1 = start1.hour * 60 + start1.minute
        e1 = end1.hour * 60 + end1.minute
        s2 = start2.hour * 60 + start2.minute
        e2 = end2.hour * 60 + end2.minute
        
        return not (e1 <= s2 or e2 <= s1)
