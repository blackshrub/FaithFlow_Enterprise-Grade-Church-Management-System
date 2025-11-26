"""Seed Explore feature with initial data.

This script:
1. Enables Explore for all existing churches
2. Creates sample daily content (devotions, verses, figures, quizzes)
3. Schedules content for today

Safe to run multiple times (idempotent).

Usage:
    python scripts/seed_explore.py
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import uuid

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')


async def enable_explore_for_churches(db):
    """Enable Explore for all existing churches."""
    print("\n⚙️  Enabling Explore for all churches...")

    churches = await db.churches.find({}).to_list(length=None)

    if not churches:
        print("   ⚠️  No churches found. Skipping.")
        return

    enabled_count = 0

    for church in churches:
        church_id = church.get('id')
        if not church_id:
            continue

        # Check if settings already exist
        existing = await db.church_explore_settings.find_one({
            "church_id": church_id,
            "deleted": False
        })

        if existing:
            # Update to ensure enabled
            if not existing.get("explore_enabled"):
                await db.church_explore_settings.update_one(
                    {"church_id": church_id},
                    {"$set": {
                        "explore_enabled": True,
                        "updated_at": datetime.now()
                    }}
                )
                print(f"   ✓ Updated settings for church: {church.get('name', church_id)}")
                enabled_count += 1
        else:
            # Create new settings
            settings = {
                "church_id": church_id,
                "explore_enabled": True,
                "features": {
                    "daily_devotion": {"enabled": True, "order": 1},
                    "verse_of_the_day": {"enabled": True, "order": 2},
                    "bible_figure_of_the_day": {"enabled": True, "order": 3},
                    "daily_quiz": {"enabled": True, "order": 4},
                    "bible_study": {"enabled": True, "order": 5},
                    "topical_exploration": {"enabled": True, "order": 6},
                    "shareable_images": {"enabled": True, "order": 7},
                },
                "preferred_bible_translation": "NIV",
                "content_language": "en",
                "allow_church_content": False,
                "prioritize_church_content": False,
                "takeover_enabled": False,
                "takeover_content_types": [],
                "timezone": "UTC",
                "show_church_branding": False,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "deleted": False,
            }

            await db.church_explore_settings.insert_one(settings)
            print(f"   ✓ Created settings for church: {church.get('name', church_id)}")
            enabled_count += 1

    print(f"   ✅ Explore enabled for {enabled_count} church(es)")


async def create_sample_devotion(db):
    """Create a sample daily devotion."""
    print("\n📖 Creating sample daily devotion...")

    devotion_id = f"devotion_sample_{uuid.uuid4().hex[:8]}"

    existing = await db.daily_devotions.find_one({"id": devotion_id})
    if existing:
        print("   ⚠️  Sample devotion already exists. Skipping.")
        return devotion_id

    devotion = {
        "id": devotion_id,
        "scope": "global",
        "title": {
            "en": "Finding Peace in the Storm",
            "id": "Menemukan Kedamaian dalam Badai"
        },
        "content": {
            "en": "Life's storms can be overwhelming. Just as Jesus calmed the storm on the Sea of Galilee, He offers us peace in the midst of our trials. When the disciples were afraid, Jesus asked them, 'Where is your faith?' Today, remember that faith is not the absence of fear, but trusting God in the midst of it.\n\nThe storms we face—whether financial struggles, health issues, or relationship problems—are opportunities to deepen our trust in God. He doesn't always remove the storm immediately, but He promises to be with us through it. His presence is our greatest comfort.",
            "id": "Badai kehidupan bisa sangat mengkhawatirkan. Seperti Yesus menenangkan badai di Laut Galilea, Dia menawarkan kita kedamaian di tengah pencobaan kita. Ketika para murid takut, Yesus bertanya, 'Di mana imanmu?' Hari ini, ingatlah bahwa iman bukanlah ketiadaan rasa takut, tetapi mempercayai Tuhan di tengah-tengahnya.\n\nBadai yang kita hadapi—baik itu kesulitan keuangan, masalah kesehatan, atau masalah hubungan—adalah kesempatan untuk memperdalam kepercayaan kita kepada Tuhan. Dia tidak selalu segera menghilangkan badai, tetapi Dia berjanji untuk bersama kita melaluinya. Kehadiran-Nya adalah penghiburan terbesar kita."
        },
        "bible_reference": "Mark 4:39-40",
        "verse_text": {
            "en": "He got up, rebuked the wind and said to the waves, 'Quiet! Be still!' Then the wind died down and it was completely calm. He said to his disciples, 'Why are you so afraid? Do you still have no faith?'",
            "id": "Lalu Ia bangun, menghardik angin itu dan berkata kepada danau itu: 'Diam! Tenanglah!' Maka angin pun berhenti dan danau menjadi sangat tenang. Ia berkata kepada mereka: 'Mengapa kamu begitu takut? Mengapa kamu tidak percaya?'"
        },
        "reflection_questions": [
            {
                "en": "What 'storms' are you currently facing in your life?",
                "id": "Badai apa yang sedang Anda hadapi dalam hidup Anda saat ini?"
            },
            {
                "en": "How can you invite Jesus into this situation today?",
                "id": "Bagaimana Anda bisa mengundang Yesus ke dalam situasi ini hari ini?"
            },
            {
                "en": "What does it mean to have faith in the midst of fear?",
                "id": "Apa artinya memiliki iman di tengah ketakutan?"
            }
        ],
        "prayer": {
            "en": "Lord Jesus, thank You for being with me in every storm. Help me to trust You even when I cannot see the way forward. Calm my anxious heart and remind me that You are greater than any challenge I face. Give me the faith to rest in Your presence. Amen.",
            "id": "Tuhan Yesus, terima kasih telah bersama saya di setiap badai. Tolong saya untuk mempercayai-Mu bahkan ketika saya tidak dapat melihat jalan ke depan. Tenangkan hati saya yang cemas dan ingatkan saya bahwa Engkau lebih besar dari tantangan apa pun yang saya hadapi. Berikan saya iman untuk beristirahat dalam kehadiran-Mu. Amin."
        },
        "author": {
            "en": "FaithFlow Team",
            "id": "Tim FaithFlow"
        },
        "categories": ["faith", "peace", "trust"],
        "read_time_minutes": 4,
        "image_url": "https://images.unsplash.com/photo-1500829243541-74b677fecc30?w=800",
        "status": "published",
        "published_at": datetime.now(),
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "deleted": False,
    }

    await db.daily_devotions.insert_one(devotion)
    print("   ✅ Sample devotion created")
    return devotion_id


async def create_sample_verse(db):
    """Create a sample verse of the day."""
    print("\n📜 Creating sample verse of the day...")

    verse_id = f"verse_sample_{uuid.uuid4().hex[:8]}"

    existing = await db.verses_of_the_day.find_one({"id": verse_id})
    if existing:
        print("   ⚠️  Sample verse already exists. Skipping.")
        return verse_id

    verse = {
        "id": verse_id,
        "scope": "global",
        "bible_reference": "Philippians 4:6-7",
        "verse_text": {
            "en": "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.",
            "id": "Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur. Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus."
        },
        "commentary": {
            "en": "Paul's instruction to the Philippians is a timeless remedy for anxiety. Instead of worrying, we're called to pray—not just asking, but thanking God in advance for His faithfulness. The result is supernatural peace that defies human logic.",
            "id": "Instruksi Paulus kepada jemaat Filipi adalah obat abadi untuk kecemasan. Alih-alih khawatir, kita dipanggil untuk berdoa—tidak hanya meminta, tetapi mengucap syukur kepada Tuhan sebelumnya atas kesetiaan-Nya. Hasilnya adalah damai sejahtera supernatural yang melampaui logika manusia."
        },
        "application": {
            "en": "Today, when anxiety rises, pause and pray. Write down three things you're thankful for, then present your worries to God. Trust that His peace will guard your heart.",
            "id": "Hari ini, ketika kecemasan muncul, berhenti dan berdoa. Tuliskan tiga hal yang Anda syukuri, kemudian serahkan kekhawatiran Anda kepada Tuhan. Percayalah bahwa damai sejahtera-Nya akan menjaga hati Anda."
        },
        "prayer_points": [
            {
                "en": "Thank God for three specific blessings in your life",
                "id": "Ucapkan syukur kepada Tuhan atas tiga berkat khusus dalam hidup Anda"
            },
            {
                "en": "Present your current worries to Him",
                "id": "Serahkan kekhawatiran Anda saat ini kepada-Nya"
            },
            {
                "en": "Ask for His supernatural peace",
                "id": "Minta damai sejahtera supernatural-Nya"
            }
        ],
        "theme": "Peace & Anxiety",
        "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        "status": "published",
        "published_at": datetime.now(),
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "deleted": False,
    }

    await db.verses_of_the_day.insert_one(verse)
    print("   ✅ Sample verse created")
    return verse_id


async def create_sample_figure(db):
    """Create a sample Bible figure."""
    print("\n👤 Creating sample Bible figure...")

    figure_id = f"figure_sample_{uuid.uuid4().hex[:8]}"

    existing = await db.bible_figures_of_the_day.find_one({"id": figure_id})
    if existing:
        print("   ⚠️  Sample figure already exists. Skipping.")
        return figure_id

    figure = {
        "id": figure_id,
        "scope": "global",
        "name": {
            "en": "David",
            "id": "Daud"
        },
        "title": {
            "en": "The Shepherd King",
            "id": "Raja Gembala"
        },
        "testament": "Old Testament",
        "summary": {
            "en": "From shepherd boy to king of Israel, David's life demonstrates God's faithfulness and the power of a heart devoted to Him.",
            "id": "Dari anak gembala menjadi raja Israel, kehidupan Daud menunjukkan kesetiaan Tuhan dan kuasa hati yang mengabdi kepada-Nya."
        },
        "full_story": {
            "en": "David was the youngest of Jesse's eight sons, tending sheep in Bethlehem when God chose him to be king. Despite being overlooked by his own family, God saw David's heart—a heart after His own. David's faith was displayed when he defeated Goliath with just a sling and stone, trusting in God's power rather than conventional weapons.\n\nAs king, David united Israel and established Jerusalem as its capital. Though he made serious mistakes, including adultery with Bathsheba and arranging her husband's death, David's genuine repentance set him apart. The Psalms reveal his honest wrestling with God, showing us that authenticity in our relationship with God matters more than perfection.\n\nDavid's legacy extends beyond his lifetime—Jesus Christ is called the 'Son of David,' connecting the shepherd king to the eternal King of Kings.",
            "id": "Daud adalah anak bungsu dari delapan anak Isai, menggembalakan domba di Betlehem ketika Tuhan memilihnya untuk menjadi raja. Meskipun diabaikan oleh keluarganya sendiri, Tuhan melihat hati Daud—hati yang berkenan kepada-Nya. Iman Daud ditunjukkan ketika ia mengalahkan Goliat hanya dengan umban dan batu, mempercayai kuasa Tuhan daripada senjata konvensional.\n\nSebagai raja, Daud mempersatukan Israel dan menjadikan Yerusalem sebagai ibukotanya. Meskipun ia membuat kesalahan serius, termasuk perzinahan dengan Batsyeba dan mengatur kematian suaminya, pertobatan sejati Daud membedakannya. Mazmur-mazmur mengungkapkan pergumulan jujurnya dengan Tuhan, menunjukkan bahwa keaslian dalam hubungan kita dengan Tuhan lebih penting daripada kesempurnaan.\n\nWarisan Daud melampaui masa hidupnya—Yesus Kristus disebut 'Anak Daud,' menghubungkan raja gembala dengan Raja segala raja yang kekal."
        },
        "timeline_events": [
            {
                "year_range": "c. 1040 BC",
                "event": {
                    "en": "Born in Bethlehem",
                    "id": "Lahir di Betlehem"
                }
            },
            {
                "year_range": "c. 1025 BC",
                "event": {
                    "en": "Anointed by Samuel",
                    "id": "Diurapi oleh Samuel"
                }
            },
            {
                "year_range": "c. 1020 BC",
                "event": {
                    "en": "Defeated Goliath",
                    "id": "Mengalahkan Goliat"
                }
            },
            {
                "year_range": "c. 1010 BC",
                "event": {
                    "en": "Became King of Judah",
                    "id": "Menjadi Raja Yehuda"
                }
            },
            {
                "year_range": "c. 1003 BC",
                "event": {
                    "en": "Became King of all Israel",
                    "id": "Menjadi Raja seluruh Israel"
                }
            },
            {
                "year_range": "c. 970 BC",
                "event": {
                    "en": "Died; Solomon succeeded him",
                    "id": "Wafat; Salomo menggantikannya"
                }
            }
        ],
        "life_lessons": [
            {
                "en": "God looks at the heart, not outward appearance",
                "id": "Tuhan melihat hati, bukan penampilan luar"
            },
            {
                "en": "True repentance leads to restoration",
                "id": "Pertobatan sejati mengarah pada pemulihan"
            },
            {
                "en": "Authenticity with God is more important than perfection",
                "id": "Keaslian dengan Tuhan lebih penting daripada kesempurnaan"
            },
            {
                "en": "Faith enables us to face giants",
                "id": "Iman memberdayakan kita untuk menghadapi raksasa"
            }
        ],
        "related_scriptures": ["1 Samuel 16", "2 Samuel 11-12", "Psalm 23", "Psalm 51"],
        "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
        "status": "published",
        "published_at": datetime.now(),
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "deleted": False,
    }

    await db.bible_figures_of_the_day.insert_one(figure)
    print("   ✅ Sample figure created")
    return figure_id


async def create_sample_quiz(db):
    """Create a sample daily quiz."""
    print("\n❓ Creating sample daily quiz...")

    quiz_id = f"quiz_sample_{uuid.uuid4().hex[:8]}"

    existing = await db.daily_quizzes.find_one({"id": quiz_id})
    if existing:
        print("   ⚠️  Sample quiz already exists. Skipping.")
        return quiz_id

    quiz = {
        "id": quiz_id,
        "scope": "global",
        "title": {
            "en": "Life of Jesus: Key Moments",
            "id": "Kehidupan Yesus: Momen-Momen Penting"
        },
        "description": {
            "en": "Test your knowledge of Jesus Christ's life and ministry",
            "id": "Uji pengetahuan Anda tentang kehidupan dan pelayanan Yesus Kristus"
        },
        "category": "New Testament",
        "difficulty": "medium",
        "time_limit_seconds": 300,
        "pass_percentage": 70,
        "questions": [
            {
                "question": {
                    "en": "Where was Jesus born?",
                    "id": "Di mana Yesus dilahirkan?"
                },
                "options": [
                    {"en": "Nazareth", "id": "Nazaret"},
                    {"en": "Bethlehem", "id": "Betlehem"},
                    {"en": "Jerusalem", "id": "Yerusalem"},
                    {"en": "Capernaum", "id": "Kapernaum"}
                ],
                "correct_answer": 1,
                "explanation": {
                    "en": "Jesus was born in Bethlehem, fulfilling the prophecy in Micah 5:2.",
                    "id": "Yesus dilahirkan di Betlehem, menggenapi nubuat dalam Mikha 5:2."
                },
                "scripture_reference": "Luke 2:4-7"
            },
            {
                "question": {
                    "en": "Who baptized Jesus?",
                    "id": "Siapa yang membaptis Yesus?"
                },
                "options": [
                    {"en": "Peter", "id": "Petrus"},
                    {"en": "John the Baptist", "id": "Yohanes Pembaptis"},
                    {"en": "James", "id": "Yakobus"},
                    {"en": "Andrew", "id": "Andreas"}
                ],
                "correct_answer": 1,
                "explanation": {
                    "en": "John the Baptist baptized Jesus in the Jordan River.",
                    "id": "Yohanes Pembaptis membaptis Yesus di Sungai Yordan."
                },
                "scripture_reference": "Matthew 3:13-17"
            },
            {
                "question": {
                    "en": "How many disciples did Jesus choose?",
                    "id": "Berapa banyak murid yang dipilih Yesus?"
                },
                "options": [
                    {"en": "7", "id": "7"},
                    {"en": "10", "id": "10"},
                    {"en": "12", "id": "12"},
                    {"en": "70", "id": "70"}
                ],
                "correct_answer": 2,
                "explanation": {
                    "en": "Jesus chose 12 disciples to be His closest followers and apostles.",
                    "id": "Yesus memilih 12 murid untuk menjadi pengikut terdekat dan rasul-Nya."
                },
                "scripture_reference": "Mark 3:13-19"
            },
            {
                "question": {
                    "en": "What was Jesus' first miracle?",
                    "id": "Apa mukjizat pertama Yesus?"
                },
                "options": [
                    {"en": "Healing a blind man", "id": "Menyembuhkan orang buta"},
                    {"en": "Walking on water", "id": "Berjalan di atas air"},
                    {"en": "Turning water into wine", "id": "Mengubah air menjadi anggur"},
                    {"en": "Feeding 5000", "id": "Memberi makan 5000 orang"}
                ],
                "correct_answer": 2,
                "explanation": {
                    "en": "Jesus turned water into wine at a wedding in Cana of Galilee.",
                    "id": "Yesus mengubah air menjadi anggur di sebuah pernikahan di Kana, Galilea."
                },
                "scripture_reference": "John 2:1-11"
            },
            {
                "question": {
                    "en": "On which day did Jesus rise from the dead?",
                    "id": "Pada hari apa Yesus bangkit dari kematian?"
                },
                "options": [
                    {"en": "Friday", "id": "Jumat"},
                    {"en": "Saturday", "id": "Sabtu"},
                    {"en": "Sunday", "id": "Minggu"},
                    {"en": "Monday", "id": "Senin"}
                ],
                "correct_answer": 2,
                "explanation": {
                    "en": "Jesus rose from the dead on the third day, which was Sunday, now celebrated as Easter.",
                    "id": "Yesus bangkit dari kematian pada hari ketiga, yaitu hari Minggu, yang sekarang dirayakan sebagai Paskah."
                },
                "scripture_reference": "Matthew 28:1-10"
            }
        ],
        "image_url": "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800",
        "status": "published",
        "published_at": datetime.now(),
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "deleted": False,
    }

    await db.daily_quizzes.insert_one(quiz)
    print("   ✅ Sample quiz created")
    return quiz_id


async def schedule_content_for_today(db, devotion_id, verse_id, figure_id, quiz_id):
    """Schedule all content for today for the global scope."""
    print("\n📅 Scheduling content for today...")

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    content_types = [
        ("daily_devotion", devotion_id),
        ("verse_of_the_day", verse_id),
        ("bible_figure_of_the_day", figure_id),
        ("daily_quiz", quiz_id),
    ]

    scheduled_count = 0

    for content_type, content_id in content_types:
        # Check if already scheduled
        existing = await db.content_schedule.find_one({
            "church_id": "global",
            "content_type": content_type,
            "date": today,
            "deleted": False
        })

        if existing:
            print(f"   ⚠️  {content_type} already scheduled for today. Skipping.")
            continue

        schedule_entry = {
            "church_id": "global",
            "content_type": content_type,
            "content_id": content_id,
            "date": today,
            "is_takeover": False,
            "published": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "deleted": False,
        }

        await db.content_schedule.insert_one(schedule_entry)
        print(f"   ✓ Scheduled {content_type} for today")
        scheduled_count += 1

    print(f"   ✅ {scheduled_count} content item(s) scheduled for today")


async def main():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_management')

    print("="*70)
    print("🌱 FaithFlow Explore Feature Seeder")
    print("="*70)
    print(f"\n🔌 Connecting to: {mongo_url}")
    print(f"📂 Database: {db_name}\n")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    try:
        # Test connection
        await db.command('ping')
        print("✓ Database connection successful\n")

        # Step 1: Enable Explore for all churches
        await enable_explore_for_churches(db)

        # Step 2: Create sample content
        devotion_id = await create_sample_devotion(db)
        verse_id = await create_sample_verse(db)
        figure_id = await create_sample_figure(db)
        quiz_id = await create_sample_quiz(db)

        # Step 3: Schedule content for today
        await schedule_content_for_today(db, devotion_id, verse_id, figure_id, quiz_id)

        print("\n" + "="*70)
        print("✅ Explore feature seeding complete!")
        print("="*70)
        print("\n📱 The mobile app should now display today's content.")
        print("🔄 Restart the backend service to apply changes.")
        print("\n")

    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
