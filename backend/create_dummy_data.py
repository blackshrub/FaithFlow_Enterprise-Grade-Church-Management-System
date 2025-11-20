"""Create realistic dummy data for FaithFlow demo/preview.

Creates:
- Prayer requests
- Counselors
- Counseling availability
- Counseling appointments
- Events
- Groups with members
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta, date, time
import uuid
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


async def create_dummy_data():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Get church
    church = await db.churches.find_one({}, {"_id": 0})
    if not church:
        print("❌ No church found. Please create a church first.")
        return
    
    church_id = church["id"]
    print(f"✅ Using church: {church['name']} ({church_id})\n")
    
    # Get members and staff
    members = await db.members.find(
        {"church_id": church_id},
        {"_id": 0, "id": 1, "full_name": 1, "gender": 1, "phone_whatsapp": 1}
    ).to_list(100)
    
    staff_users = await db.users.find(
        {"church_id": church_id},
        {"_id": 0, "id": 1, "full_name": 1, "role": 1}
    ).to_list(10)
    
    print(f"📊 Found {len(members)} members and {len(staff_users)} staff\n")
    
    if len(members) < 5:
        print("❌ Need at least 5 members. Please import members first.")
        return
    
    # Separate by gender for realistic scenarios
    male_members = [m for m in members if m.get('gender') == 'Male']
    female_members = [m for m in members if m.get('gender') == 'Female']
    
    # ==================== PRAYER REQUESTS ====================
    print("🙏 Creating prayer requests...")
    
    prayer_requests_data = [
        {
            "title": "Healing for my mother",
            "description": "My mother was diagnosed with diabetes last week. Please pray for her healing and strength as she adjusts to this new reality. Pray that God will guide us through this challenging time.",
            "category": "health",
            "is_anonymous": False,
            "is_urgent": True,
            "status": "active",
        },
        {
            "title": "Job interview this Friday",
            "description": "I have a very important job interview this Friday for a position I've been praying about for months. Please pray that God's will be done and that I will have peace regardless of the outcome.",
            "category": "provision",
            "is_anonymous": False,
            "is_urgent": False,
            "status": "active",
        },
        {
            "title": "Marriage restoration",
            "description": "My spouse and I are going through a very difficult season. We're committed to working through it, but we need prayer for patience, understanding, and God's wisdom in our conversations.",
            "category": "family",
            "is_anonymous": True,
            "is_urgent": False,
            "status": "active",
        },
        {
            "title": "Guidance for major decision",
            "description": "We're considering relocating to another city for work, but this would mean leaving our church family and starting over. Please pray for clear direction from God about whether to stay or go.",
            "category": "guidance",
            "is_anonymous": False,
            "is_urgent": False,
            "status": "active",
        },
        {
            "title": "Strength during grief",
            "description": "It's been three months since my father passed away, and some days are still very hard. Pray that God will comfort our family and help us find joy again while honoring his memory.",
            "category": "comfort",
            "is_anonymous": False,
            "is_urgent": False,
            "status": "active",
        },
        {
            "title": "Salvation for my brother",
            "description": "My younger brother has been running from God for years. Please pray that the Holy Spirit will soften his heart and that he will come to know Jesus personally.",
            "category": "salvation",
            "is_anonymous": False,
            "is_urgent": True,
            "status": "active",
        },
        {
            "title": "Financial breakthrough",
            "description": "We've been struggling with finances after unexpected medical bills. Praying for God's provision and wisdom in managing what we have. Trust that He will provide for our needs.",
            "category": "provision",
            "is_anonymous": True,
            "is_urgent": False,
            "status": "active",
        },
    ]
    
    prayer_count = 0
    for i, pr_data in enumerate(prayer_requests_data):
        if i >= len(members):
            break
        
        member = members[i]
        prayer_request = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "member_id": member["id"],
            "member_name": "Anonymous" if pr_data["is_anonymous"] else member["full_name"],
            **pr_data,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(0, 7)),
            "updated_at": datetime.utcnow(),
        }
        await db.prayer_requests.insert_one(prayer_request)
        prayer_count += 1
    
    print(f"   ✅ Created {prayer_count} prayer requests\n")
    
    # ==================== COUNSELORS ====================
    print("👨‍⚕️ Creating counselors...")
    
    counselors_data = []
    if len(staff_users) >= 2:
        counselors_data = [
            {
                "staff_user_id": staff_users[0]["id"],
                "display_name": "Pastor " + staff_users[0]["full_name"].split()[0],
                "whatsapp_number": "+6281234567890",
                "bio": "Senior pastor with 15 years of ministry experience. Specializes in marriage counseling and life transitions.",
                "specialties": ["Marriage", "Family", "Life Transitions", "Grief"],
                "max_daily_appointments": 6,
            },
            {
                "staff_user_id": staff_users[1]["id"],
                "display_name": "Pastor " + staff_users[1]["full_name"].split()[0],
                "whatsapp_number": "+6289876543210",
                "bio": "Youth pastor and certified counselor. Passionate about helping young adults navigate faith and life challenges.",
                "specialties": ["Youth", "Addiction", "Depression", "Identity"],
                "max_daily_appointments": 8,
            },
        ]
    
    counselor_ids = []
    for counselor_data in counselors_data:
        counselor = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            **counselor_data,
        }
        await db.counselors.insert_one(counselor)
        counselor_ids.append(counselor["id"])
    
    print(f"   ✅ Created {len(counselor_ids)} counselors\n")
    
    # ==================== COUNSELING AVAILABILITY ====================
    print("📅 Creating counseling availability rules...")
    
    rules_count = 0
    if counselor_ids:
        # Pastor 1: Monday, Wednesday, Friday (9 AM - 5 PM)
        for day in [0, 2, 4]:  # Mon, Wed, Fri
            rule = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "counselor_id": counselor_ids[0],
                "day_of_week": day,
                "start_time": "09:00",
                "end_time": "17:00",
                "slot_length_minutes": 60,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            await db.counseling_recurring_rules.insert_one(rule)
            rules_count += 1
        
        # Pastor 2: Tuesday, Thursday (2 PM - 8 PM) - Evening sessions
        if len(counselor_ids) > 1:
            for day in [1, 3]:  # Tue, Thu
                rule = {
                    "id": str(uuid.uuid4()),
                    "church_id": church_id,
                    "counselor_id": counselor_ids[1],
                    "day_of_week": day,
                    "start_time": "14:00",
                    "end_time": "20:00",
                    "slot_length_minutes": 60,
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
                await db.counseling_recurring_rules.insert_one(rule)
                rules_count += 1
    
    print(f"   ✅ Created {rules_count} recurring availability rules\n")
    
    # ==================== COUNSELING APPOINTMENTS ====================
    print("📝 Creating counseling appointments...")
    
    # Generate some slots first
    from services.counseling_availability_service import CounselingAvailabilityService
    
    availability_service = CounselingAvailabilityService(db)
    
    if counselor_ids:
        start_date = date.today()
        end_date = start_date + timedelta(days=30)
        
        for counselor_id in counselor_ids:
            await availability_service.generate_slots_for_range(
                church_id, counselor_id, start_date, end_date
            )
        print("   ✅ Generated counseling slots for next 30 days\n")
    
    # Create realistic appointments
    appointments_data = [
        {
            "type": "counseling",
            "urgency": "high",
            "topic": "Marriage difficulties",
            "description": "My spouse and I have been having communication problems for the past few months. We love each other but keep having the same arguments. Would really appreciate some biblical guidance on how to work through this together.",
            "preferred_channel": "in_person",
            "status": "pending",
        },
        {
            "type": "counseling",
            "urgency": "normal",
            "topic": "Career guidance",
            "description": "I've been offered a promotion that would require working Sundays. I'm torn because it's a great opportunity but I don't want to miss church. Need wisdom on how to handle this situation.",
            "preferred_channel": "online",
            "status": "approved",
        },
        {
            "type": "prayer",
            "urgency": "crisis",
            "topic": "Family crisis",
            "description": "Going through an extremely difficult family situation right now and need urgent prayer support. Would appreciate talking with a pastor as soon as possible.",
            "preferred_channel": "in_person",
            "status": "approved",
        },
        {
            "type": "counseling",
            "urgency": "normal",
            "topic": "Parenting challenges",
            "description": "Our teenage son is going through a rebellious phase and we're struggling to connect with him. Looking for biblical wisdom on parenting teens while maintaining relationship.",
            "preferred_channel": "in_person",
            "status": "pending",
        },
        {
            "type": "pastoral_visit",
            "urgency": "low",
            "topic": "New to the church",
            "description": "We recently started attending and would love to meet with a pastor to learn more about the church, membership process, and how we can get involved in ministry.",
            "preferred_channel": "in_person",
            "status": "completed",
        },
    ]
    
    appt_count = 0
    # Get available slots
    slots = await db.counseling_time_slots.find(
        {"church_id": church_id, "status": "open"},
        {"_id": 0}
    ).limit(10).to_list(10)
    
    if slots and len(members) >= 5:
        for i, appt_data in enumerate(appointments_data):
            if i >= len(slots) or i >= len(members):
                break
            
            slot = slots[i]
            member = members[i]
            
            appointment = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "member_id": member["id"],
                "counselor_id": slot["counselor_id"],
                "slot_id": slot["id"],
                "date": slot["date"],
                "start_time": slot["start_time"],
                "end_time": slot["end_time"],
                "created_by_member": True,
                "contact_phone": member.get("phone_whatsapp"),
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 5)),
                "updated_at": datetime.utcnow(),
                **appt_data,
            }
            
            # Add approval data for approved/completed
            if appt_data["status"] in ["approved", "completed"]:
                appointment["approved_by_staff_id"] = staff_users[0]["id"]
                appointment["approved_at"] = datetime.utcnow() - timedelta(days=1)
            
            # Add outcome notes for completed
            if appt_data["status"] == "completed":
                appointment["outcome_notes"] = "Had a good conversation. Provided biblical resources and will follow up next week. Member is in a better place spiritually."
            
            await db.counseling_appointments.insert_one(appointment)
            
            # Update slot status
            if appt_data["status"] != "rejected":
                await db.counseling_time_slots.update_one(
                    {"id": slot["id"]},
                    {"$set": {"status": "booked", "appointment_id": appointment["id"]}}
                )
            
            appt_count += 1
    
    print(f"   ✅ Created {appt_count} counseling appointments\n")
    
    # ==================== EVENTS ====================
    print("🎉 Creating events...")
    
    # Get event categories
    categories = await db.event_categories.find(
        {"church_id": church_id},
        {"_id": 0}
    ).to_list(10)
    
    sunday_service_cat = next((c for c in categories if c.get("is_default_sunday_service")), categories[0] if categories else None)
    
    events_data = [
        {
            "event_name": "Sunday Worship Service",
            "description": "Join us for our weekly worship service with praise, worship, and biblical teaching. All are welcome!",
            "event_type": "single",
            "event_date": (datetime.utcnow() + timedelta(days=((6 - datetime.utcnow().weekday()) % 7))).isoformat(),  # Next Sunday
            "start_time": "10:00",
            "end_time": "12:00",
            "location_text": "Main Sanctuary",
            "rsvp_required": True,
            "max_capacity": 500,
        },
        {
            "event_name": "Youth Night",
            "description": "An evening of worship, games, and fellowship for ages 13-25. Bring your friends!",
            "event_type": "single",
            "event_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "start_time": "19:00",
            "end_time": "21:30",
            "location_text": "Youth Center",
            "rsvp_required": True,
            "max_capacity": 100,
        },
        {
            "event_name": "Women's Bible Study",
            "description": "A warm and welcoming space for women to study God's Word together, share life, and grow in faith. Currently studying the book of Philippians.",
            "event_type": "single",
            "event_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "start_time": "10:00",
            "end_time": "11:30",
            "location_text": "Fellowship Hall",
            "rsvp_required": False,
        },
        {
            "event_name": "Men's Prayer Breakfast",
            "description": "Join us for breakfast, prayer, and encouragement. A time for men to connect, share struggles, and support each other in faith.",
            "event_type": "single",
            "event_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            "start_time": "07:00",
            "end_time": "08:30",
            "location_text": "Church Cafe",
            "rsvp_required": True,
            "max_capacity": 50,
        },
        {
            "event_name": "Family Movie Night",
            "description": "Bring the whole family for a fun evening! We'll watch an inspiring family film, enjoy popcorn, and have fellowship. Great for kids of all ages.",
            "event_type": "single",
            "event_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "start_time": "18:00",
            "end_time": "20:30",
            "location_text": "Main Sanctuary",
            "rsvp_required": True,
            "max_capacity": 200,
        },
        {
            "event_name": "Community Outreach",
            "description": "Join us as we serve our local community! We'll be distributing food packages and sharing God's love with our neighbors. Volunteers needed!",
            "event_type": "single",
            "event_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
            "start_time": "09:00",
            "end_time": "13:00",
            "location_text": "Community Center",
            "rsvp_required": True,
        },
    ]
    
    event_count = 0
    for event_data in events_data:
        event = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "event_category_id": sunday_service_cat["id"] if sunday_service_cat else None,
            "created_by": staff_users[0]["id"],
            "reservation_start": datetime.utcnow().isoformat(),
            "reservation_end": event_data["event_date"],
            "created_at": datetime.utcnow() - timedelta(days=random.randint(3, 10)),
            "updated_at": datetime.utcnow(),
            **event_data,
        }
        await db.events.insert_one(event)
        event_count += 1
    
    print(f"   ✅ Created {event_count} events\n")
    
    # ==================== GROUPS ====================
    print("👥 Creating groups...")
    
    groups_data = [
        {
            "name": "Young Professionals Fellowship",
            "description": "A community for young working professionals (ages 22-35) to connect, grow in faith, and support each other through the challenges of career and life. We meet bi-weekly for Bible study, prayer, and fellowship.",
            "category": "cell_group",
            "location": "Coffee Shop near church",
            "meeting_schedule": "Every other Friday, 7:00 PM",
            "max_members": 15,
            "is_open_for_join": True,
        },
        {
            "name": "Worship Team",
            "description": "Our church worship team serves during Sunday services and special events. We're looking for singers, musicians, and tech volunteers who want to serve through music and media.",
            "category": "ministry_team",
            "location": "Church Main Sanctuary",
            "meeting_schedule": "Thursday rehearsal 7:00 PM, Sunday 8:00 AM",
            "max_members": 25,
            "is_open_for_join": True,
        },
        {
            "name": "Moms Prayer Group",
            "description": "A safe space for mothers to pray together, share parenting joys and struggles, and encourage one another. All moms welcome - from new moms to grandmothers!",
            "category": "support_group",
            "location": "Room 203",
            "meeting_schedule": "Wednesday mornings, 10:00 AM",
            "is_open_for_join": True,
        },
        {
            "name": "Youth Ministry Volunteers",
            "description": "Passionate about investing in the next generation? Join our youth ministry team! We need small group leaders, event coordinators, and mentors for teens.",
            "category": "ministry_team",
            "location": "Youth Center",
            "meeting_schedule": "Monthly planning meeting + weekly activities",
            "max_members": 20,
            "is_open_for_join": False,
        },
        {
            "name": "Hiking & Outdoors Fellowship",
            "description": "Love the outdoors? Join us for monthly hikes, camping trips, and outdoor adventures. A great way to build friendships while enjoying God's creation together.",
            "category": "activity",
            "location": "Various outdoor locations",
            "meeting_schedule": "First Saturday of each month",
            "is_open_for_join": True,
        },
        {
            "name": "Children's Ministry Team",
            "description": "Serve our youngest members! We need teachers, helpers, and creative volunteers for Sunday School, VBS, and special children's programs. Background check required.",
            "category": "ministry_team",
            "location": "Children's Wing",
            "meeting_schedule": "Sunday mornings 9:30 AM",
            "max_members": 30,
            "is_open_for_join": False,
        },
    ]
    
    group_count = 0
    created_groups = []
    for i, group_data in enumerate(groups_data):
        # Assign leader
        leader_member = members[i % len(members)]
        
        group = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "leader_member_id": leader_member["id"],
            "leader_name": leader_member["full_name"],
            "leader_contact": leader_member.get("phone_whatsapp"),
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
            "updated_at": datetime.utcnow(),
            **group_data,
        }
        await db.groups.insert_one(group)
        created_groups.append(group)
        group_count += 1
    
    print(f"   ✅ Created {group_count} groups\n")
    
    # ==================== GROUP MEMBERS ====================
    print("👤 Adding members to groups...")
    
    membership_count = 0
    for group in created_groups:
        # Add 3-8 random members to each group
        num_members = random.randint(3, min(8, len(members)))
        selected_members = random.sample(members, num_members)
        
        for member in selected_members:
            # Skip if member is already the leader
            if member["id"] == group["leader_member_id"]:
                continue
            
            membership = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "group_id": group["id"],
                "member_id": member["id"],
                "status": "active",
                "joined_at": datetime.utcnow() - timedelta(days=random.randint(1, 90)),
                "left_at": None,
            }
            await db.group_memberships.insert_one(membership)
            membership_count += 1
    
    print(f"   ✅ Added {membership_count} group memberships\n")
    
    # ==================== SUMMARY ====================
    print("\n" + "="*50)
    print("✨ DUMMY DATA CREATION COMPLETE!")
    print("="*50)
    print(f"\n📊 Summary:")
    print(f"   🙏 Prayer Requests: {prayer_count}")
    print(f"   👨‍⚕️ Counselors: {len(counselor_ids)}")
    print(f"   📅 Availability Rules: {rules_count}")
    print(f"   📝 Appointments: {appt_count}")
    print(f"   🎉 Events: {event_count}")
    print(f"   👥 Groups: {group_count}")
    print(f"   👤 Group Memberships: {membership_count}")
    print(f"\n✅ Ready for preview and testing!\n")
    
    client.close()


if __name__ == "__main__":
    print("🚀 Creating realistic dummy data for FaithFlow...\n")
    asyncio.run(create_dummy_data())
