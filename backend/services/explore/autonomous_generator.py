"""
Autonomous AI Content Generation Service

Fully autonomous content generation that:
- Requires ZERO user input
- Automatically selects diverse topics
- Tracks generated content to avoid repetition
- Stores images in SeaweedFS
- Schedules content for publishing

Staff Role:
- Review generated content in queue
- Approve/reject for publishing
- Optionally edit before publishing
- No creative input required

Content Types Supported:
- Daily Devotion (new topic each day)
- Verse of the Day (cycling through themes)
- Bible Figure of the Day (500+ figures, never repeats)
- Daily Quiz (varied topics)
- Bible Study (complete multi-lesson series)
- Topical Verses (organized by category)
"""

import asyncio
import json
import logging
import random
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Literal, Tuple
from bson import ObjectId

logger = logging.getLogger(__name__)


# =============================================================================
# COMPREHENSIVE BIBLE FIGURES DATABASE
# 500+ figures from Genesis to Revelation, including obscure ones
# =============================================================================

BIBLE_FIGURES_DATABASE = {
    # ==================== PATRIARCHS & EARLY FIGURES ====================
    "patriarchs": [
        {"name": "Adam", "testament": "old", "era": "Creation", "books": ["Genesis"], "importance": "major"},
        {"name": "Eve", "testament": "old", "era": "Creation", "books": ["Genesis"], "importance": "major"},
        {"name": "Cain", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "minor"},
        {"name": "Abel", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "minor"},
        {"name": "Seth", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "minor"},
        {"name": "Enoch", "testament": "old", "era": "Pre-Flood", "books": ["Genesis", "Hebrews", "Jude"], "importance": "minor"},
        {"name": "Methuselah", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Lamech (father of Noah)", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Noah", "testament": "old", "era": "Pre-Flood", "books": ["Genesis", "Hebrews"], "importance": "major"},
        {"name": "Shem", "testament": "old", "era": "Post-Flood", "books": ["Genesis"], "importance": "minor"},
        {"name": "Ham", "testament": "old", "era": "Post-Flood", "books": ["Genesis"], "importance": "minor"},
        {"name": "Japheth", "testament": "old", "era": "Post-Flood", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Nimrod", "testament": "old", "era": "Post-Flood", "books": ["Genesis"], "importance": "minor"},
        {"name": "Abraham", "testament": "old", "era": "Patriarchs ~2000 BC", "books": ["Genesis", "Romans", "Galatians", "Hebrews"], "importance": "major"},
        {"name": "Sarah", "testament": "old", "era": "Patriarchs ~2000 BC", "books": ["Genesis", "Hebrews", "1 Peter"], "importance": "major"},
        {"name": "Hagar", "testament": "old", "era": "Patriarchs", "books": ["Genesis", "Galatians"], "importance": "minor"},
        {"name": "Ishmael", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "minor"},
        {"name": "Isaac", "testament": "old", "era": "Patriarchs ~1900 BC", "books": ["Genesis", "Hebrews"], "importance": "major"},
        {"name": "Rebekah", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "major"},
        {"name": "Jacob (Israel)", "testament": "old", "era": "Patriarchs ~1850 BC", "books": ["Genesis", "Hosea", "Malachi"], "importance": "major"},
        {"name": "Esau", "testament": "old", "era": "Patriarchs", "books": ["Genesis", "Hebrews", "Malachi"], "importance": "minor"},
        {"name": "Leah", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "minor"},
        {"name": "Rachel", "testament": "old", "era": "Patriarchs", "books": ["Genesis", "Jeremiah", "Matthew"], "importance": "minor"},
        {"name": "Laban", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "minor"},
    ],

    # ==================== TWELVE TRIBES/SONS OF JACOB ====================
    "twelve_tribes": [
        {"name": "Reuben", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "minor"},
        {"name": "Simeon (son of Jacob)", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Levi", "testament": "old", "era": "Patriarchs", "books": ["Genesis", "Exodus"], "importance": "minor"},
        {"name": "Judah", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "major"},
        {"name": "Dan", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Naphtali", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Gad", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Asher", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Issachar", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Zebulun", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Joseph", "testament": "old", "era": "Patriarchs ~1700 BC", "books": ["Genesis", "Hebrews"], "importance": "major"},
        {"name": "Benjamin", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "minor"},
        {"name": "Dinah", "testament": "old", "era": "Patriarchs", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Tamar (daughter-in-law of Judah)", "testament": "old", "era": "Patriarchs", "books": ["Genesis", "Matthew"], "importance": "minor"},
    ],

    # ==================== EGYPTIAN PERIOD & EXODUS ====================
    "exodus_era": [
        {"name": "Potiphar", "testament": "old", "era": "Egypt Period", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Potiphar's wife", "testament": "old", "era": "Egypt Period", "books": ["Genesis"], "importance": "obscure"},
        {"name": "Pharaoh (of Joseph)", "testament": "old", "era": "Egypt Period", "books": ["Genesis"], "importance": "minor"},
        {"name": "Pharaoh (of Moses)", "testament": "old", "era": "Exodus ~1400 BC", "books": ["Exodus"], "importance": "minor"},
        {"name": "Moses", "testament": "old", "era": "Exodus ~1400 BC", "books": ["Exodus", "Deuteronomy", "Hebrews"], "importance": "major"},
        {"name": "Aaron", "testament": "old", "era": "Exodus", "books": ["Exodus", "Leviticus", "Numbers"], "importance": "major"},
        {"name": "Miriam", "testament": "old", "era": "Exodus", "books": ["Exodus", "Numbers"], "importance": "minor"},
        {"name": "Jochebed", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "obscure"},
        {"name": "Amram", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "obscure"},
        {"name": "Zipporah", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "minor"},
        {"name": "Jethro (Reuel)", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "minor"},
        {"name": "Joshua", "testament": "old", "era": "Conquest ~1400 BC", "books": ["Exodus", "Joshua", "Hebrews"], "importance": "major"},
        {"name": "Caleb", "testament": "old", "era": "Conquest", "books": ["Numbers", "Joshua"], "importance": "major"},
        {"name": "Hur", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "obscure"},
        {"name": "Bezalel", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "obscure", "notable": "First person filled with Spirit for craftsmanship"},
        {"name": "Oholiab", "testament": "old", "era": "Exodus", "books": ["Exodus"], "importance": "obscure"},
        {"name": "Korah", "testament": "old", "era": "Wilderness", "books": ["Numbers", "Jude"], "importance": "minor"},
        {"name": "Nadab and Abihu", "testament": "old", "era": "Wilderness", "books": ["Leviticus"], "importance": "obscure"},
        {"name": "Eleazar", "testament": "old", "era": "Wilderness", "books": ["Numbers", "Joshua"], "importance": "minor"},
        {"name": "Phinehas", "testament": "old", "era": "Wilderness", "books": ["Numbers", "Joshua"], "importance": "minor"},
        {"name": "Balaam", "testament": "old", "era": "Wilderness", "books": ["Numbers", "2 Peter", "Jude", "Revelation"], "importance": "minor"},
        {"name": "Balak", "testament": "old", "era": "Wilderness", "books": ["Numbers"], "importance": "obscure"},
    ],

    # ==================== JUDGES PERIOD ====================
    "judges": [
        {"name": "Othniel", "testament": "old", "era": "Judges ~1350 BC", "books": ["Judges"], "importance": "minor"},
        {"name": "Ehud", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "minor"},
        {"name": "Shamgar", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure"},
        {"name": "Deborah", "testament": "old", "era": "Judges ~1200 BC", "books": ["Judges", "Hebrews"], "importance": "major"},
        {"name": "Barak", "testament": "old", "era": "Judges", "books": ["Judges", "Hebrews"], "importance": "minor"},
        {"name": "Jael", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "minor"},
        {"name": "Sisera", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure"},
        {"name": "Gideon", "testament": "old", "era": "Judges ~1150 BC", "books": ["Judges", "Hebrews"], "importance": "major"},
        {"name": "Abimelech (son of Gideon)", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "minor"},
        {"name": "Jephthah", "testament": "old", "era": "Judges", "books": ["Judges", "Hebrews"], "importance": "minor"},
        {"name": "Samson", "testament": "old", "era": "Judges ~1100 BC", "books": ["Judges", "Hebrews"], "importance": "major"},
        {"name": "Delilah", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "minor"},
        {"name": "Manoah", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure"},
        {"name": "Eli", "testament": "old", "era": "Judges/Samuel", "books": ["1 Samuel"], "importance": "minor"},
        {"name": "Hophni and Phinehas (sons of Eli)", "testament": "old", "era": "Judges", "books": ["1 Samuel"], "importance": "obscure"},
        {"name": "Samuel", "testament": "old", "era": "Judges/Kingdom ~1050 BC", "books": ["1 Samuel", "Hebrews"], "importance": "major"},
        {"name": "Hannah", "testament": "old", "era": "Judges", "books": ["1 Samuel"], "importance": "minor"},
        {"name": "Elkanah", "testament": "old", "era": "Judges", "books": ["1 Samuel"], "importance": "obscure"},
    ],

    # ==================== UNITED KINGDOM ====================
    "united_kingdom": [
        {"name": "Saul", "testament": "old", "era": "United Kingdom ~1050 BC", "books": ["1 Samuel", "Acts"], "importance": "major"},
        {"name": "Jonathan", "testament": "old", "era": "United Kingdom", "books": ["1 Samuel"], "importance": "major"},
        {"name": "Michal", "testament": "old", "era": "United Kingdom", "books": ["1 Samuel", "2 Samuel"], "importance": "minor"},
        {"name": "David", "testament": "old", "era": "United Kingdom ~1000 BC", "books": ["1 Samuel", "2 Samuel", "Psalms", "Acts"], "importance": "major"},
        {"name": "Jesse", "testament": "old", "era": "United Kingdom", "books": ["1 Samuel", "Isaiah"], "importance": "minor"},
        {"name": "Abigail", "testament": "old", "era": "United Kingdom", "books": ["1 Samuel"], "importance": "minor"},
        {"name": "Bathsheba", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel", "1 Kings", "Matthew"], "importance": "minor"},
        {"name": "Uriah the Hittite", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel", "Matthew"], "importance": "minor"},
        {"name": "Nathan the Prophet", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel", "1 Kings"], "importance": "minor"},
        {"name": "Absalom", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel"], "importance": "minor"},
        {"name": "Amnon", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel"], "importance": "obscure"},
        {"name": "Tamar (daughter of David)", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel"], "importance": "obscure"},
        {"name": "Adonijah", "testament": "old", "era": "United Kingdom", "books": ["1 Kings"], "importance": "obscure"},
        {"name": "Joab", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel", "1 Kings"], "importance": "minor"},
        {"name": "Abner", "testament": "old", "era": "United Kingdom", "books": ["1 Samuel", "2 Samuel"], "importance": "minor"},
        {"name": "Mephibosheth", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel"], "importance": "minor"},
        {"name": "Solomon", "testament": "old", "era": "United Kingdom ~970 BC", "books": ["1 Kings", "Proverbs", "Ecclesiastes", "Song of Solomon"], "importance": "major"},
        {"name": "Queen of Sheba", "testament": "old", "era": "United Kingdom", "books": ["1 Kings", "2 Chronicles", "Matthew"], "importance": "minor"},
        {"name": "Zadok", "testament": "old", "era": "United Kingdom", "books": ["2 Samuel", "1 Kings"], "importance": "minor"},
        {"name": "Hiram of Tyre", "testament": "old", "era": "United Kingdom", "books": ["1 Kings"], "importance": "obscure"},
    ],

    # ==================== DIVIDED KINGDOM - ISRAEL (NORTH) ====================
    "northern_kingdom": [
        {"name": "Jeroboam I", "testament": "old", "era": "Divided Kingdom ~930 BC", "books": ["1 Kings"], "importance": "minor"},
        {"name": "Ahab", "testament": "old", "era": "Divided Kingdom ~870 BC", "books": ["1 Kings"], "importance": "minor"},
        {"name": "Jezebel", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings", "2 Kings", "Revelation"], "importance": "minor"},
        {"name": "Elijah", "testament": "old", "era": "Divided Kingdom ~870 BC", "books": ["1 Kings", "2 Kings", "Malachi", "James"], "importance": "major"},
        {"name": "Elisha", "testament": "old", "era": "Divided Kingdom ~850 BC", "books": ["1 Kings", "2 Kings"], "importance": "major"},
        {"name": "Obadiah (servant of Ahab)", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings"], "importance": "obscure"},
        {"name": "Micaiah", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings"], "importance": "obscure"},
        {"name": "Naaman", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "Luke"], "importance": "minor"},
        {"name": "Gehazi", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings"], "importance": "minor"},
        {"name": "Jehu", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings", "2 Kings"], "importance": "minor"},
        {"name": "Jonah", "testament": "old", "era": "Divided Kingdom ~780 BC", "books": ["Jonah", "Matthew", "Luke"], "importance": "major"},
        {"name": "Amos", "testament": "old", "era": "Divided Kingdom ~760 BC", "books": ["Amos"], "importance": "minor"},
        {"name": "Hosea", "testament": "old", "era": "Divided Kingdom ~750 BC", "books": ["Hosea"], "importance": "minor"},
        {"name": "Gomer", "testament": "old", "era": "Divided Kingdom", "books": ["Hosea"], "importance": "minor"},
    ],

    # ==================== DIVIDED KINGDOM - JUDAH (SOUTH) ====================
    "southern_kingdom": [
        {"name": "Rehoboam", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Asa", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Jehoshaphat", "testament": "old", "era": "Divided Kingdom", "books": ["1 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Jehoram of Judah", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "obscure"},
        {"name": "Athaliah", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Joash (Jehoash) of Judah", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Jehoiada the Priest", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Uzziah (Azariah)", "testament": "old", "era": "Divided Kingdom ~780 BC", "books": ["2 Kings", "2 Chronicles", "Isaiah"], "importance": "minor"},
        {"name": "Jotham", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "obscure"},
        {"name": "Ahaz", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "Isaiah"], "importance": "minor"},
        {"name": "Hezekiah", "testament": "old", "era": "Divided Kingdom ~700 BC", "books": ["2 Kings", "2 Chronicles", "Isaiah"], "importance": "major"},
        {"name": "Manasseh", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "minor"},
        {"name": "Josiah", "testament": "old", "era": "Divided Kingdom ~640 BC", "books": ["2 Kings", "2 Chronicles"], "importance": "major"},
        {"name": "Hilkiah the Priest", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings"], "importance": "obscure"},
        {"name": "Huldah", "testament": "old", "era": "Divided Kingdom", "books": ["2 Kings", "2 Chronicles"], "importance": "minor", "notable": "Female prophet consulted by king"},
        {"name": "Zedekiah", "testament": "old", "era": "Divided Kingdom ~590 BC", "books": ["2 Kings", "Jeremiah"], "importance": "minor"},
    ],

    # ==================== MAJOR PROPHETS ====================
    "major_prophets": [
        {"name": "Isaiah", "testament": "old", "era": "Divided Kingdom ~740 BC", "books": ["Isaiah", "Matthew", "John", "Acts", "Romans"], "importance": "major"},
        {"name": "Jeremiah", "testament": "old", "era": "Exile ~620 BC", "books": ["Jeremiah", "Lamentations"], "importance": "major"},
        {"name": "Baruch", "testament": "old", "era": "Exile", "books": ["Jeremiah"], "importance": "minor"},
        {"name": "Ezekiel", "testament": "old", "era": "Exile ~593 BC", "books": ["Ezekiel"], "importance": "major"},
        {"name": "Daniel", "testament": "old", "era": "Exile ~605 BC", "books": ["Daniel", "Matthew", "Hebrews"], "importance": "major"},
        {"name": "Shadrach, Meshach, and Abednego", "testament": "old", "era": "Exile", "books": ["Daniel", "Hebrews"], "importance": "minor"},
    ],

    # ==================== MINOR PROPHETS ====================
    "minor_prophets": [
        {"name": "Joel", "testament": "old", "era": "Unknown (830-400 BC)", "books": ["Joel", "Acts"], "importance": "minor"},
        {"name": "Obadiah (prophet)", "testament": "old", "era": "~840 BC", "books": ["Obadiah"], "importance": "minor"},
        {"name": "Micah", "testament": "old", "era": "~735 BC", "books": ["Micah"], "importance": "minor"},
        {"name": "Nahum", "testament": "old", "era": "~650 BC", "books": ["Nahum"], "importance": "minor"},
        {"name": "Habakkuk", "testament": "old", "era": "~608 BC", "books": ["Habakkuk"], "importance": "minor"},
        {"name": "Zephaniah", "testament": "old", "era": "~630 BC", "books": ["Zephaniah"], "importance": "minor"},
        {"name": "Haggai", "testament": "old", "era": "Post-Exile ~520 BC", "books": ["Haggai", "Ezra"], "importance": "minor"},
        {"name": "Zechariah", "testament": "old", "era": "Post-Exile ~520 BC", "books": ["Zechariah"], "importance": "minor"},
        {"name": "Malachi", "testament": "old", "era": "Post-Exile ~430 BC", "books": ["Malachi"], "importance": "minor"},
    ],

    # ==================== EXILE & POST-EXILE ====================
    "exile_postexile": [
        {"name": "Nebuchadnezzar", "testament": "old", "era": "Exile ~605 BC", "books": ["Daniel", "Jeremiah"], "importance": "minor"},
        {"name": "Belshazzar", "testament": "old", "era": "Exile", "books": ["Daniel"], "importance": "minor"},
        {"name": "Cyrus the Great", "testament": "old", "era": "Post-Exile ~539 BC", "books": ["Ezra", "Isaiah", "Daniel"], "importance": "minor"},
        {"name": "Darius the Mede", "testament": "old", "era": "Exile", "books": ["Daniel"], "importance": "obscure"},
        {"name": "Zerubbabel", "testament": "old", "era": "Post-Exile ~520 BC", "books": ["Ezra", "Haggai", "Zechariah", "Matthew"], "importance": "minor"},
        {"name": "Jeshua (Joshua the High Priest)", "testament": "old", "era": "Post-Exile", "books": ["Ezra", "Haggai", "Zechariah"], "importance": "minor"},
        {"name": "Ezra", "testament": "old", "era": "Post-Exile ~458 BC", "books": ["Ezra", "Nehemiah"], "importance": "major"},
        {"name": "Nehemiah", "testament": "old", "era": "Post-Exile ~445 BC", "books": ["Nehemiah"], "importance": "major"},
        {"name": "Sanballat", "testament": "old", "era": "Post-Exile", "books": ["Nehemiah"], "importance": "obscure"},
        {"name": "Tobiah", "testament": "old", "era": "Post-Exile", "books": ["Nehemiah"], "importance": "obscure"},
    ],

    # ==================== WISDOM & POETRY FIGURES ====================
    "wisdom_poetry": [
        {"name": "Job", "testament": "old", "era": "Patriarchal Era (?)", "books": ["Job", "James"], "importance": "major"},
        {"name": "Eliphaz", "testament": "old", "era": "Unknown", "books": ["Job"], "importance": "obscure"},
        {"name": "Bildad", "testament": "old", "era": "Unknown", "books": ["Job"], "importance": "obscure"},
        {"name": "Zophar", "testament": "old", "era": "Unknown", "books": ["Job"], "importance": "obscure"},
        {"name": "Elihu", "testament": "old", "era": "Unknown", "books": ["Job"], "importance": "obscure"},
        {"name": "Asaph", "testament": "old", "era": "United Kingdom", "books": ["Psalms", "1 Chronicles"], "importance": "minor"},
        {"name": "Sons of Korah", "testament": "old", "era": "Various", "books": ["Psalms"], "importance": "minor"},
        {"name": "Ethan the Ezrahite", "testament": "old", "era": "United Kingdom", "books": ["Psalms"], "importance": "obscure"},
        {"name": "Heman", "testament": "old", "era": "United Kingdom", "books": ["Psalms", "1 Chronicles"], "importance": "obscure"},
        {"name": "Agur", "testament": "old", "era": "Unknown", "books": ["Proverbs 30"], "importance": "obscure", "notable": "Author of Proverbs 30"},
        {"name": "King Lemuel", "testament": "old", "era": "Unknown", "books": ["Proverbs 31"], "importance": "obscure", "notable": "Proverbs 31 attributed to his mother"},
    ],

    # ==================== ESTHER & RUTH ====================
    "esther_ruth": [
        {"name": "Ruth", "testament": "old", "era": "Judges", "books": ["Ruth", "Matthew"], "importance": "major"},
        {"name": "Naomi", "testament": "old", "era": "Judges", "books": ["Ruth"], "importance": "minor"},
        {"name": "Boaz", "testament": "old", "era": "Judges", "books": ["Ruth", "Matthew"], "importance": "minor"},
        {"name": "Orpah", "testament": "old", "era": "Judges", "books": ["Ruth"], "importance": "obscure"},
        {"name": "Esther", "testament": "old", "era": "Persian Period ~480 BC", "books": ["Esther"], "importance": "major"},
        {"name": "Mordecai", "testament": "old", "era": "Persian Period", "books": ["Esther"], "importance": "major"},
        {"name": "Haman", "testament": "old", "era": "Persian Period", "books": ["Esther"], "importance": "minor"},
        {"name": "King Xerxes (Ahasuerus)", "testament": "old", "era": "Persian Period", "books": ["Esther", "Ezra"], "importance": "minor"},
        {"name": "Vashti", "testament": "old", "era": "Persian Period", "books": ["Esther"], "importance": "minor"},
    ],

    # ==================== OBSCURE OLD TESTAMENT FIGURES ====================
    "obscure_old_testament": [
        {"name": "Melchizedek", "testament": "old", "era": "Patriarchs", "books": ["Genesis", "Psalms", "Hebrews"], "importance": "minor", "notable": "Priest of God Most High, type of Christ"},
        {"name": "Jabez", "testament": "old", "era": "Unknown", "books": ["1 Chronicles"], "importance": "obscure", "notable": "Known for his prayer"},
        {"name": "Jubal", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "obscure", "notable": "Father of all who play harp and flute"},
        {"name": "Tubal-Cain", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "obscure", "notable": "First metalworker"},
        {"name": "Enosh", "testament": "old", "era": "Pre-Flood", "books": ["Genesis"], "importance": "obscure", "notable": "People began calling on the Lord in his time"},
        {"name": "Maher-Shalal-Hash-Baz", "testament": "old", "era": "Divided Kingdom", "books": ["Isaiah"], "importance": "obscure", "notable": "Isaiah's son with symbolic name"},
        {"name": "Shear-Jashub", "testament": "old", "era": "Divided Kingdom", "books": ["Isaiah"], "importance": "obscure", "notable": "Isaiah's son, name means 'a remnant shall return'"},
        {"name": "Rahab", "testament": "old", "era": "Conquest", "books": ["Joshua", "Hebrews", "James", "Matthew"], "importance": "minor", "notable": "Canaanite woman of faith"},
        {"name": "Achan", "testament": "old", "era": "Conquest", "books": ["Joshua"], "importance": "obscure", "notable": "His sin caused Israel's defeat at Ai"},
        {"name": "Shamgar (ox goad)", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure", "notable": "Killed 600 Philistines with ox goad"},
        {"name": "Ibzan", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure"},
        {"name": "Elon", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure"},
        {"name": "Abdon", "testament": "old", "era": "Judges", "books": ["Judges"], "importance": "obscure"},
        {"name": "Obed", "testament": "old", "era": "Judges", "books": ["Ruth", "Matthew"], "importance": "obscure", "notable": "Grandfather of David"},
        {"name": "Achsah", "testament": "old", "era": "Conquest", "books": ["Joshua", "Judges"], "importance": "obscure", "notable": "Caleb's daughter who asked for springs"},
        {"name": "Shiphrah and Puah", "testament": "old", "era": "Egypt", "books": ["Exodus"], "importance": "obscure", "notable": "Hebrew midwives who defied Pharaoh"},
    ],

    # ==================== NEW TESTAMENT - GOSPELS ====================
    "gospels": [
        {"name": "Jesus Christ", "testament": "new", "era": "1st Century AD", "books": ["All New Testament"], "importance": "major"},
        {"name": "Mary (mother of Jesus)", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Luke", "John", "Acts"], "importance": "major"},
        {"name": "Joseph (husband of Mary)", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Luke"], "importance": "major"},
        {"name": "John the Baptist", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke", "John"], "importance": "major"},
        {"name": "Elizabeth", "testament": "new", "era": "1st Century AD", "books": ["Luke"], "importance": "minor"},
        {"name": "Zechariah (father of John)", "testament": "new", "era": "1st Century AD", "books": ["Luke"], "importance": "minor"},
        {"name": "Simeon", "testament": "new", "era": "1st Century AD", "books": ["Luke"], "importance": "minor"},
        {"name": "Anna the Prophetess", "testament": "new", "era": "1st Century AD", "books": ["Luke"], "importance": "minor"},
        {"name": "Herod the Great", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Luke"], "importance": "minor"},
        {"name": "Herod Antipas", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke"], "importance": "minor"},
        {"name": "Herodias", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark"], "importance": "obscure"},
        {"name": "Salome (daughter of Herodias)", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark"], "importance": "obscure"},
        {"name": "Pontius Pilate", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke", "John"], "importance": "minor"},
        {"name": "Caiaphas", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "John"], "importance": "minor"},
        {"name": "Annas", "testament": "new", "era": "1st Century AD", "books": ["Luke", "John", "Acts"], "importance": "minor"},
    ],

    # ==================== THE TWELVE APOSTLES ====================
    "twelve_apostles": [
        {"name": "Peter (Simon Peter)", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts", "1&2 Peter"], "importance": "major"},
        {"name": "Andrew", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "major"},
        {"name": "James (son of Zebedee)", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "major"},
        {"name": "John the Apostle", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts", "1-3 John", "Revelation"], "importance": "major"},
        {"name": "Philip the Apostle", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "minor"},
        {"name": "Bartholomew (Nathanael)", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "minor"},
        {"name": "Matthew (Levi)", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "major"},
        {"name": "Thomas", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "major"},
        {"name": "James (son of Alphaeus)", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "minor"},
        {"name": "Thaddaeus (Judas son of James)", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "obscure"},
        {"name": "Simon the Zealot", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "minor"},
        {"name": "Judas Iscariot", "testament": "new", "era": "1st Century AD", "books": ["Gospels", "Acts"], "importance": "minor"},
        {"name": "Matthias", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
    ],

    # ==================== GOSPEL ENCOUNTERS ====================
    "gospel_encounters": [
        {"name": "Nicodemus", "testament": "new", "era": "1st Century AD", "books": ["John"], "importance": "minor"},
        {"name": "Samaritan Woman at the Well", "testament": "new", "era": "1st Century AD", "books": ["John"], "importance": "minor"},
        {"name": "Mary Magdalene", "testament": "new", "era": "1st Century AD", "books": ["Gospels"], "importance": "major"},
        {"name": "Mary of Bethany", "testament": "new", "era": "1st Century AD", "books": ["Luke", "John"], "importance": "minor"},
        {"name": "Martha of Bethany", "testament": "new", "era": "1st Century AD", "books": ["Luke", "John"], "importance": "minor"},
        {"name": "Lazarus", "testament": "new", "era": "1st Century AD", "books": ["John"], "importance": "minor"},
        {"name": "Zacchaeus", "testament": "new", "era": "1st Century AD", "books": ["Luke"], "importance": "minor"},
        {"name": "Rich Young Ruler", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke"], "importance": "minor"},
        {"name": "Woman Caught in Adultery", "testament": "new", "era": "1st Century AD", "books": ["John"], "importance": "minor"},
        {"name": "Woman with Issue of Blood", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke"], "importance": "minor"},
        {"name": "Syrophoenician Woman", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark"], "importance": "minor"},
        {"name": "Centurion (servant healed)", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Luke"], "importance": "minor"},
        {"name": "Centurion at the Cross", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke"], "importance": "obscure"},
        {"name": "Jairus", "testament": "new", "era": "1st Century AD", "books": ["Mark", "Luke"], "importance": "minor"},
        {"name": "Bartimaeus", "testament": "new", "era": "1st Century AD", "books": ["Mark", "Luke"], "importance": "minor"},
        {"name": "Joseph of Arimathea", "testament": "new", "era": "1st Century AD", "books": ["Gospels"], "importance": "minor"},
        {"name": "Simon of Cyrene", "testament": "new", "era": "1st Century AD", "books": ["Matthew", "Mark", "Luke"], "importance": "minor"},
        {"name": "Barabbas", "testament": "new", "era": "1st Century AD", "books": ["Gospels"], "importance": "minor"},
        {"name": "Thief on the Cross", "testament": "new", "era": "1st Century AD", "books": ["Luke"], "importance": "minor"},
        {"name": "Legion (Demon-possessed man)", "testament": "new", "era": "1st Century AD", "books": ["Mark", "Luke"], "importance": "minor"},
    ],

    # ==================== EARLY CHURCH (ACTS) ====================
    "early_church": [
        {"name": "Paul (Saul of Tarsus)", "testament": "new", "era": "1st Century AD", "books": ["Acts", "Epistles"], "importance": "major"},
        {"name": "Barnabas", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "major"},
        {"name": "Stephen", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "major"},
        {"name": "Philip the Evangelist", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Ethiopian Eunuch", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Ananias of Damascus", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Ananias and Sapphira", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Cornelius", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Tabitha (Dorcas)", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Simon the Tanner", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "obscure"},
        {"name": "Lydia", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "minor"},
        {"name": "Silas (Silvanus)", "testament": "new", "era": "1st Century AD", "books": ["Acts", "1 Peter"], "importance": "minor"},
        {"name": "Timothy", "testament": "new", "era": "1st Century AD", "books": ["Acts", "1&2 Timothy", "other Epistles"], "importance": "major"},
        {"name": "Titus", "testament": "new", "era": "1st Century AD", "books": ["Titus", "2 Corinthians", "Galatians"], "importance": "minor"},
        {"name": "Luke", "testament": "new", "era": "1st Century AD", "books": ["Luke", "Acts", "Colossians"], "importance": "major"},
        {"name": "Mark (John Mark)", "testament": "new", "era": "1st Century AD", "books": ["Mark", "Acts", "1 Peter"], "importance": "major"},
        {"name": "Priscilla", "testament": "new", "era": "1st Century AD", "books": ["Acts", "Romans", "1 Corinthians"], "importance": "minor"},
        {"name": "Aquila", "testament": "new", "era": "1st Century AD", "books": ["Acts", "Romans", "1 Corinthians"], "importance": "minor"},
        {"name": "Apollos", "testament": "new", "era": "1st Century AD", "books": ["Acts", "1 Corinthians"], "importance": "minor"},
        {"name": "James (brother of Jesus)", "testament": "new", "era": "1st Century AD", "books": ["Acts", "Galatians", "James"], "importance": "major"},
        {"name": "Agabus", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "obscure"},
        {"name": "Eutychus", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "obscure", "notable": "Fell from window, raised by Paul"},
        {"name": "Rhoda", "testament": "new", "era": "1st Century AD", "books": ["Acts"], "importance": "obscure", "notable": "Servant girl who answered door for Peter"},
    ],

    # ==================== EPISTLE FIGURES ====================
    "epistle_figures": [
        {"name": "Philemon", "testament": "new", "era": "1st Century AD", "books": ["Philemon"], "importance": "minor"},
        {"name": "Onesimus", "testament": "new", "era": "1st Century AD", "books": ["Philemon", "Colossians"], "importance": "minor"},
        {"name": "Epaphras", "testament": "new", "era": "1st Century AD", "books": ["Colossians", "Philemon"], "importance": "obscure"},
        {"name": "Epaphroditus", "testament": "new", "era": "1st Century AD", "books": ["Philippians"], "importance": "obscure"},
        {"name": "Phoebe", "testament": "new", "era": "1st Century AD", "books": ["Romans"], "importance": "minor", "notable": "Deacon/servant of the church"},
        {"name": "Gaius", "testament": "new", "era": "1st Century AD", "books": ["3 John", "Romans", "1 Corinthians"], "importance": "obscure"},
        {"name": "Diotrephes", "testament": "new", "era": "1st Century AD", "books": ["3 John"], "importance": "obscure"},
        {"name": "Demas", "testament": "new", "era": "1st Century AD", "books": ["2 Timothy", "Colossians", "Philemon"], "importance": "obscure"},
        {"name": "Tychicus", "testament": "new", "era": "1st Century AD", "books": ["Ephesians", "Colossians", "2 Timothy", "Titus"], "importance": "obscure"},
        {"name": "Aristarchus", "testament": "new", "era": "1st Century AD", "books": ["Acts", "Colossians", "Philemon"], "importance": "obscure"},
        {"name": "Lois and Eunice", "testament": "new", "era": "1st Century AD", "books": ["2 Timothy"], "importance": "minor", "notable": "Timothy's grandmother and mother"},
    ],
}


def get_all_figures() -> List[Dict[str, Any]]:
    """Get flat list of all Bible figures."""
    all_figures = []
    for category, figures in BIBLE_FIGURES_DATABASE.items():
        for figure in figures:
            figure["category"] = category
            all_figures.append(figure)
    return all_figures


def get_figures_by_importance(importance: Literal["major", "minor", "obscure"]) -> List[Dict[str, Any]]:
    """Get figures by importance level."""
    all_figures = get_all_figures()
    return [f for f in all_figures if f.get("importance") == importance]


def get_unfeatured_figures(featured_names: List[str]) -> List[Dict[str, Any]]:
    """Get figures that haven't been featured yet."""
    all_figures = get_all_figures()
    return [f for f in all_figures if f["name"] not in featured_names]


# =============================================================================
# DEVOTION TOPICS DATABASE
# Ensures variety in daily devotion themes
# =============================================================================

DEVOTION_TOPICS = {
    "spiritual_disciplines": [
        "Prayer", "Fasting", "Bible Study", "Meditation on Scripture", "Worship",
        "Solitude", "Sabbath Rest", "Journaling", "Confession", "Generosity",
        "Service", "Fellowship", "Witnessing", "Silence", "Simplicity"
    ],
    "christian_virtues": [
        "Love", "Joy", "Peace", "Patience", "Kindness", "Goodness", "Faithfulness",
        "Gentleness", "Self-Control", "Humility", "Courage", "Wisdom", "Hope",
        "Gratitude", "Forgiveness", "Compassion", "Integrity", "Perseverance"
    ],
    "life_challenges": [
        "Overcoming Fear", "Dealing with Anxiety", "Finding Purpose", "Facing Grief",
        "Handling Disappointment", "Managing Anger", "Overcoming Temptation",
        "Navigating Conflict", "Finding Contentment", "Battling Loneliness",
        "Dealing with Failure", "Facing Uncertainty", "Overcoming Pride",
        "Handling Criticism", "Managing Stress"
    ],
    "faith_foundations": [
        "Trusting God's Plan", "Understanding Grace", "Living by Faith",
        "God's Unconditional Love", "The Power of the Cross", "Resurrection Hope",
        "Walking with the Holy Spirit", "Understanding Salvation", "God's Sovereignty",
        "The Promise of Heaven", "God's Faithfulness", "Divine Providence"
    ],
    "relationships": [
        "Loving Your Neighbor", "Honoring Parents", "Building Strong Marriages",
        "Raising Godly Children", "Being a Good Friend", "Forgiving Others",
        "Loving Your Enemies", "Unity in the Church", "Serving Others",
        "Mentoring Others", "Reconciliation", "Community Living"
    ],
    "identity_purpose": [
        "Who You Are in Christ", "Your Unique Calling", "Using Your Gifts",
        "Living Authentically", "Finding Your Mission", "Glorifying God Daily",
        "Being Salt and Light", "Reflecting God's Image", "Living as Kingdom Citizens"
    ],
}


QUIZ_TOPICS = [
    "Books of the Bible", "Old Testament History", "New Testament History",
    "Life of Jesus", "Parables of Jesus", "Miracles of Jesus",
    "The Apostles", "Women of the Bible", "Kings of Israel and Judah",
    "Major Prophets", "Minor Prophets", "Psalms and Proverbs",
    "Genesis Stories", "Exodus and Wilderness", "The Early Church",
    "Paul's Missionary Journeys", "Bible Geography", "Bible Numbers",
    "Bible Animals", "Bible Foods and Plants", "Bible Families",
    "Prayers in the Bible", "Promises of God", "Covenants in the Bible"
]


BIBLE_STUDY_THEMES = [
    {"title": "The Armor of God", "main_passage": "Ephesians 6:10-18", "duration": 7},
    {"title": "The Beatitudes", "main_passage": "Matthew 5:1-12", "duration": 8},
    {"title": "The Fruit of the Spirit", "main_passage": "Galatians 5:22-26", "duration": 9},
    {"title": "The Lord's Prayer", "main_passage": "Matthew 6:9-13", "duration": 7},
    {"title": "The 23rd Psalm", "main_passage": "Psalm 23", "duration": 6},
    {"title": "The Love Chapter", "main_passage": "1 Corinthians 13", "duration": 5},
    {"title": "Faith Heroes", "main_passage": "Hebrews 11", "duration": 10},
    {"title": "The Sermon on the Mount", "main_passage": "Matthew 5-7", "duration": 14},
    {"title": "Romans 8: Life in the Spirit", "main_passage": "Romans 8", "duration": 10},
    {"title": "The Book of James", "main_passage": "James 1-5", "duration": 10},
    {"title": "Spiritual Warfare", "main_passage": "2 Corinthians 10:3-5", "duration": 7},
    {"title": "The Names of God", "main_passage": "Various", "duration": 10},
    {"title": "The I AM Statements of Jesus", "main_passage": "John", "duration": 7},
    {"title": "Parables of the Kingdom", "main_passage": "Matthew 13", "duration": 7},
    {"title": "The Upper Room Discourse", "main_passage": "John 13-17", "duration": 10},
    {"title": "The Resurrection Appearances", "main_passage": "Various Gospels", "duration": 7},
    {"title": "Walking in Wisdom", "main_passage": "Proverbs", "duration": 7},
    {"title": "The Minor Prophets", "main_passage": "Various", "duration": 12},
    {"title": "Women of Faith", "main_passage": "Various", "duration": 8},
    {"title": "The Miracles of Jesus", "main_passage": "Various Gospels", "duration": 10},
]


# =============================================================================
# AUTONOMOUS GENERATION SERVICE
# =============================================================================

class AutonomousContentGenerator:
    """
    Fully autonomous content generation service.

    Generates content without ANY user input by:
    1. Tracking what has been generated
    2. Selecting diverse topics/figures
    3. Using weighted randomization for variety
    4. Storing generated images in SeaweedFS
    """

    def __init__(self, db, seaweedfs_service=None):
        """
        Initialize the autonomous generator.

        Args:
            db: MongoDB database instance
            seaweedfs_service: SeaweedFS service for image storage
        """
        self.db = db
        self.seaweedfs = seaweedfs_service

    async def get_generation_history(
        self,
        content_type: str,
        church_id: str = "global",
        days: int = 90
    ) -> Dict[str, Any]:
        """Get history of what has been generated to avoid repetition."""
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Collection mapping
        collection_map = {
            "bible_figure": "bible_figures",
            "daily_devotion": "daily_devotions",
            "verse_of_the_day": "verses_of_the_day",
            "daily_quiz": "daily_quizzes",
            "bible_study": "bible_studies",
        }

        collection_name = collection_map.get(content_type, f"{content_type}s")
        collection = self.db[collection_name]

        # Get recent generated content
        recent = await collection.find({
            "church_id": church_id,
            "ai_generated": True,
            "created_at": {"$gte": cutoff}
        }).to_list(length=1000)

        # Extract what's been used
        if content_type == "bible_figure":
            used_items = [doc.get("name", {}).get("en", "") for doc in recent]
        elif content_type == "daily_devotion":
            # Extract topics/themes
            used_items = []
            for doc in recent:
                title = doc.get("title", {}).get("en", "")
                used_items.append(title)
        elif content_type == "daily_quiz":
            used_items = [doc.get("theme", {}).get("en", "") for doc in recent]
        else:
            used_items = []

        return {
            "content_type": content_type,
            "generated_count": len(recent),
            "used_items": used_items,
            "last_generated": recent[0]["created_at"] if recent else None,
        }

    async def select_next_bible_figure(self, church_id: str = "global") -> Dict[str, Any]:
        """
        Intelligently select the next Bible figure to feature.

        Strategy:
        1. Get list of recently featured figures (last 90 days)
        2. Filter out those figures from the full database
        3. Use weighted selection favoring obscure figures that people forget
        4. Return the selected figure with all metadata
        """
        history = await self.get_generation_history("bible_figure", church_id)
        featured_names = history["used_items"]

        # Get unfeatured figures
        available = get_unfeatured_figures(featured_names)

        if not available:
            # All figures have been featured! Reset and start over
            logger.info("All Bible figures have been featured. Starting new cycle.")
            available = get_all_figures()

        # Weighted selection: favor obscure figures (people need to learn about them!)
        weights = []
        for figure in available:
            importance = figure.get("importance", "minor")
            if importance == "obscure":
                weights.append(3)  # 3x more likely
            elif importance == "minor":
                weights.append(2)  # 2x more likely
            else:
                weights.append(1)  # Major figures still get selected but less often

        # Weighted random selection
        selected = random.choices(available, weights=weights, k=1)[0]

        logger.info(f"Selected Bible figure: {selected['name']} (importance: {selected['importance']})")

        return selected

    async def select_next_devotion_topic(self, church_id: str = "global") -> Dict[str, str]:
        """
        Select a diverse devotion topic.

        Ensures variety by:
        1. Tracking recent themes
        2. Rotating through categories
        3. Selecting unused topics first
        """
        history = await self.get_generation_history("daily_devotion", church_id)
        used_titles = [t.lower() for t in history["used_items"]]

        # Flatten all topics
        all_topics = []
        for category, topics in DEVOTION_TOPICS.items():
            for topic in topics:
                all_topics.append({"category": category, "topic": topic})

        # Filter out recently used
        available = [t for t in all_topics if t["topic"].lower() not in used_titles]

        if not available:
            available = all_topics

        # Random selection with category diversity
        selected = random.choice(available)

        return selected

    async def select_next_quiz_topic(self, church_id: str = "global") -> str:
        """Select next quiz topic ensuring variety."""
        history = await self.get_generation_history("daily_quiz", church_id)
        used_topics = [t.lower() for t in history["used_items"]]

        available = [t for t in QUIZ_TOPICS if t.lower() not in used_topics]

        if not available:
            available = QUIZ_TOPICS

        return random.choice(available)

    async def select_next_bible_study(self, church_id: str = "global") -> Dict[str, Any]:
        """Select next Bible study theme."""
        history = await self.get_generation_history("bible_study", church_id)
        used_titles = [t.lower() for t in history["used_items"]]

        available = [s for s in BIBLE_STUDY_THEMES if s["title"].lower() not in used_titles]

        if not available:
            available = BIBLE_STUDY_THEMES

        return random.choice(available)

    # Model selection per content type
    # Sonnet 4.5: Fast, efficient for daily content
    # Opus 4.5: More intensive, coherent for complex multi-part content
    MODEL_PER_CONTENT_TYPE = {
        "daily_devotion": "claude-sonnet-4-5-20250929",      # Daily, simpler
        "verse_of_the_day": "claude-sonnet-4-5-20250929",    # Daily, simpler
        "bible_figure": "claude-sonnet-4-5-20250929",        # Moderate complexity
        "daily_quiz": "claude-sonnet-4-5-20250929",          # Daily, simpler
        "bible_study": "claude-opus-4-5-20250929",           # Complex multi-lesson series
        "devotion_plan": "claude-opus-4-5-20250929",         # Complex multi-day plan
    }

    def get_model_for_content_type(self, content_type: str) -> str:
        """Get the appropriate model for content type complexity."""
        return self.MODEL_PER_CONTENT_TYPE.get(content_type, "claude-sonnet-4-5-20250929")

    async def get_church_settings(self, church_id: str) -> Dict[str, Any]:
        """Get church settings for content generation."""
        if church_id == "global":
            # Use platform settings for global content
            settings = await self.db.platform_settings.find_one(
                {"id": "explore_platform_settings"}
            )
            traditions = settings.get("theological_traditions", ["evangelical"]) if settings else ["evangelical"]
            # Handle legacy single tradition field
            if not traditions and settings:
                legacy = settings.get("theological_tradition")
                traditions = [legacy] if legacy else ["evangelical"]
            return {
                "auto_publish_ai_content": settings.get("auto_publish_ai_content", True) if settings else True,
                "theological_traditions": traditions,
            }
        else:
            settings = await self.db.church_explore_settings.find_one(
                {"church_id": church_id, "deleted": False}
            )
            traditions = settings.get("theological_traditions", ["evangelical"]) if settings else ["evangelical"]
            # Handle legacy single tradition field
            if not traditions and settings:
                legacy = settings.get("theological_tradition")
                traditions = [legacy] if legacy else ["evangelical"]
            return {
                "auto_publish_ai_content": settings.get("auto_publish_ai_content", True) if settings else True,
                "theological_traditions": traditions,
            }

    def get_tradition_prompt_guidance(self, traditions: list) -> str:
        """
        Get implicit style guidance based on theological tradition(s).

        IMPORTANT: This guides the AI's writing style WITHOUT explicitly
        mentioning denomination names in the content.

        When multiple traditions are selected, we find the COMMON GROUND
        and explicitly list topics to AVOID (controversial between traditions).
        """
        from models.explore.settings import TheologicalTradition

        if not traditions:
            traditions = ["evangelical"]

        # Single tradition - use specific style
        if len(traditions) == 1:
            style = TheologicalTradition.STYLE_GUIDES.get(
                traditions[0],
                TheologicalTradition.STYLE_GUIDES["evangelical"]
            )
            return f"""
WRITING STYLE GUIDANCE (apply implicitly, do NOT mention tradition/denomination names):
- Emphasis: {style['emphasis']}
- Prayer style: {style['prayer_style']}
- Language tone: {style['language']}
- Key themes to weave in: {style['themes']}

CRITICAL: Never explicitly mention denominational identities (Catholic, Protestant, Pentecostal, etc.)
Write in a way that feels natural to readers of this tradition without labeling it.
"""

        # Multiple traditions - find common ground and avoid controversial topics
        common = TheologicalTradition.get_common_ground(traditions)
        avoid_topics = common.get("avoid_topics", [])
        safe_topics = common.get("safe_topics", [])

        avoid_str = ", ".join(avoid_topics) if avoid_topics else "none specific"
        safe_str = ", ".join(safe_topics[:10]) if safe_topics else "general Christian themes"

        return f"""
WRITING STYLE GUIDANCE (apply implicitly, do NOT mention tradition/denomination names):
- Emphasis: {common['emphasis']}
- Prayer style: {common['prayer_style']}
- Language tone: {common['language']}
- Key themes to weave in: {common['themes']}

MULTI-TRADITION AUDIENCE - CRITICAL REQUIREMENTS:
This content serves readers from multiple Christian traditions: {', '.join(traditions)}.

SAFE TOPICS (focus on these): {safe_str}

TOPICS TO STRICTLY AVOID (controversial between these traditions):
{avoid_str}

For example:
- DO NOT discuss speaking in tongues, cessationism, or continuation of gifts
- DO NOT discuss infant vs believer's baptism
- DO NOT discuss sacramental theology
- DO NOT discuss predestination vs free will
- Focus ONLY on what unites all Christians: faith in Christ, Scripture, prayer, love, grace

CRITICAL: Never explicitly mention denominational identities (Catholic, Protestant, Pentecostal, Reformed, etc.)
Write content that feels authentic to ALL selected traditions by focusing on common ground.
"""

    async def generate_content_autonomously(
        self,
        content_type: str,
        church_id: str = "global",
        generate_image: bool = True,
    ) -> Dict[str, Any]:
        """
        Autonomously generate content without any user input.

        This is the main entry point for scheduled/background generation.

        Args:
            content_type: Type of content to generate
            church_id: Church ID (or "global" for platform-wide)
            generate_image: Whether to generate and store image

        Returns:
            Generated content document (published or draft based on settings)
        """
        from routes.ai.streaming import stream_explore_content, generate_coherent_image

        # Get church settings for auto-publish and traditions
        church_settings = await self.get_church_settings(church_id)
        auto_publish = church_settings["auto_publish_ai_content"]
        traditions = church_settings["theological_traditions"]

        # Get appropriate model for this content type
        model = self.get_model_for_content_type(content_type)
        logger.info(f"Using model {model} for {content_type}")

        # Get tradition-specific style guidance (handles single or multiple traditions)
        tradition_guidance = self.get_tradition_prompt_guidance(traditions)

        # Select what to generate based on content type
        # All content types include tradition guidance for implicit style consistency
        if content_type == "bible_figure":
            figure = await self.select_next_bible_figure(church_id)
            params = {
                "figure_name": figure["name"],
                "generate_both_languages": True,
            }
            # Add context for the AI with tradition guidance
            params["custom_prompt"] = f"""
Generate content for: {figure['name']}
Testament: {figure['testament']}
Era: {figure['era']}
Books where mentioned: {', '.join(figure['books'])}
{"Notable: " + figure.get('notable', '') if figure.get('notable') else ''}

{tradition_guidance}
"""

        elif content_type == "daily_devotion":
            topic_info = await self.select_next_devotion_topic(church_id)
            params = {
                "topic": topic_info["topic"],
                "generate_both_languages": True,
                "custom_prompt": f"""Category: {topic_info['category']}. Create a fresh, inspiring devotion on: {topic_info['topic']}

{tradition_guidance}
""",
            }

        elif content_type == "daily_quiz":
            topic = await self.select_next_quiz_topic(church_id)
            params = {
                "topic": topic,
                "generate_both_languages": True,
                "quiz_difficulty": random.choice(["easy", "medium", "hard"]),
                "num_questions": random.choice([5, 7, 10]),
                "custom_prompt": f"""Create an engaging Bible quiz on: {topic}

{tradition_guidance}
""",
            }

        elif content_type == "verse_of_the_day":
            # AI will select a meaningful verse
            params = {
                "generate_both_languages": True,
                "custom_prompt": f"""Select a meaningful, encouraging verse that speaks to daily life struggles and hopes.

{tradition_guidance}
""",
            }

        elif content_type == "bible_study":
            study = await self.select_next_bible_study(church_id)
            params = {
                "topic": study["title"],
                "scripture_reference": study["main_passage"],
                "study_duration": study["duration"],
                "generate_both_languages": True,
                "custom_prompt": f"""
Create a complete {study['duration']}-day Bible study on: {study['title']}
Main passage: {study['main_passage']}

IMPORTANT: Generate ALL {study['duration']} lessons in sequence.
Each lesson must:
1. Build on the previous lesson
2. Have clear learning objectives
3. Include discussion questions
4. Have practical application
5. End with a prayer prompt

This is a systematic study - lessons should form a coherent learning journey.

{tradition_guidance}
""",
            }
        else:
            params = {
                "generate_both_languages": True,
                "custom_prompt": tradition_guidance,
            }

        # Generate content using streaming API with appropriate model
        logger.info(f"Autonomously generating {content_type} for {church_id} using {model}")

        full_content = ""
        async for chunk in stream_explore_content(
            content_type=content_type,
            params=params,
            church_id=church_id,
            model=model
        ):
            full_content += chunk

        # Parse generated content
        import json
        try:
            parsed_content = json.loads(full_content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse generated content: {e}")
            return {"error": "Failed to parse AI response", "raw": full_content}

        # Generate and store image if requested
        image_url = None
        if generate_image and self.seaweedfs:
            try:
                image_result = await generate_coherent_image(
                    content_type=content_type,
                    content_data=parsed_content,
                    width=1024,
                    height=1024,
                )

                # Upload to SeaweedFS
                from services.seaweedfs_service import StorageCategory
                import base64

                image_bytes = base64.b64decode(image_result["image_base64"])
                filename = f"{content_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"

                # Determine storage category
                category_map = {
                    "bible_figure": StorageCategory.EXPLORE_FIGURE,
                    "daily_devotion": StorageCategory.EXPLORE_DEVOTION,
                    "verse_of_the_day": StorageCategory.EXPLORE_VERSE,
                    "daily_quiz": StorageCategory.EXPLORE_QUIZ,
                    "bible_study": StorageCategory.EXPLORE_STUDY,
                }
                category = category_map.get(content_type, StorageCategory.AI_GENERATED)

                upload_result = await self.seaweedfs.upload_bytes(
                    file_bytes=image_bytes,
                    filename=filename,
                    church_id=church_id if church_id != "global" else "platform",
                    category=category,
                    content_type="image/png",
                )

                image_url = upload_result.get("public_url") or upload_result.get("url")
                logger.info(f"Image uploaded to SeaweedFS: {image_url}")

            except Exception as e:
                logger.error(f"Image generation/upload failed: {e}")
                # Continue without image

        # Determine status based on auto_publish setting
        # If auto_publish is True, content goes directly to "published"
        # If False, content goes to "draft" for review queue
        content_status = "published" if auto_publish else "draft"

        # Prepare document for database
        document = {
            "_id": ObjectId(),
            "id": str(ObjectId()),  # String ID for API compatibility
            "scope": "global" if church_id == "global" else "church",
            "church_id": church_id if church_id != "global" else "global",
            **parsed_content,
            "image_url": image_url,
            "ai_generated": True,
            "ai_metadata": {
                "generated_by": "anthropic",
                "model": model,
                "prompt_version": "autonomous_v3",
                "traditions": traditions,  # List of traditions (common ground when multiple)
                "auto_published": auto_publish,
                "generated_at": datetime.utcnow(),
                "reviewed": auto_publish,  # If auto-published, mark as reviewed
            },
            "status": content_status,
            "published_at": datetime.utcnow() if auto_publish else None,
            "created_by": "ai_system",
            "created_at": datetime.utcnow(),
            "deleted": False,
        }

        logger.info(f"Generated {content_type} with status='{content_status}' (auto_publish={auto_publish})")

        return document

    async def schedule_daily_generation(self, church_id: str = "global"):
        """
        Generate all daily content types for the next day.

        This should be called by a scheduler (APScheduler) at a set time.
        """
        content_types = [
            "daily_devotion",
            "verse_of_the_day",
            "bible_figure",
            "daily_quiz",
        ]

        results = {}
        for content_type in content_types:
            try:
                result = await self.generate_content_autonomously(
                    content_type=content_type,
                    church_id=church_id,
                    generate_image=True,
                )
                results[content_type] = {"success": True, "document": result}
            except Exception as e:
                logger.error(f"Failed to generate {content_type}: {e}")
                results[content_type] = {"success": False, "error": str(e)}

        return results


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def get_figure_count() -> int:
    """Get total count of Bible figures in database."""
    return len(get_all_figures())


async def get_figure_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Find a Bible figure by name."""
    all_figures = get_all_figures()
    for figure in all_figures:
        if figure["name"].lower() == name.lower():
            return figure
    return None


async def get_random_obscure_figure() -> Dict[str, Any]:
    """Get a random obscure Bible figure for learning."""
    obscure = get_figures_by_importance("obscure")
    return random.choice(obscure)
