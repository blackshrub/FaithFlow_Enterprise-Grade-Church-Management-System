# Bible Feature Backend Requirements

## Overview
The mobile app now has a fully functional YouVersion-style Bible reader. The backend needs to provide the necessary API endpoints and database setup to support this feature.

## Required API Endpoints

### 1. GET `/api/bible/versions`
Returns list of available Bible versions/translations.

**Response:**
```json
[
  {
    "id": "tb",
    "code": "TB",
    "name": "Terjemahan Baru",
    "language": "id",
    "description": "Indonesian Protestant Bible translation"
  },
  {
    "id": "niv",
    "code": "NIV",
    "name": "New International Version",
    "language": "en",
    "description": "Popular modern English translation"
  },
  {
    "id": "nkjv",
    "code": "NKJV",
    "name": "New King James Version",
    "language": "en",
    "description": "Modern language with KJV tradition"
  },
  {
    "id": "nlt",
    "code": "NLT",
    "name": "New Living Translation",
    "language": "en",
    "description": "Easy to read, thought-for-thought translation"
  },
  {
    "id": "esv",
    "code": "ESV",
    "name": "English Standard Version",
    "language": "en",
    "description": "Literal word-for-word translation"
  }
]
```

### 2. GET `/api/bible/books?version=TB`
Returns list of all Bible books for a specific version.

**Response:**
```json
[
  {
    "id": "gen",
    "name": "Genesis",
    "name_local": "Kejadian",
    "testament": "OT",
    "book_number": 1,
    "chapter_count": 50
  },
  {
    "id": "exo",
    "name": "Exodus",
    "name_local": "Keluaran",
    "testament": "OT",
    "book_number": 2,
    "chapter_count": 40
  }
  // ... all 66 books
]
```

### 3. GET `/api/bible/{version}/{book}/{chapter}`
Returns all verses for a specific chapter.

**Example:** `/api/bible/TB/Kejadian/1`

**Response:**
```json
[
  {
    "verse": 1,
    "text": "Pada mulanya Allah menciptakan langit dan bumi.",
    "book": "Kejadian",
    "chapter": 1
  },
  {
    "verse": 2,
    "text": "Bumi belum berbentuk dan kosong; gelap gulita menutupi samudera raya, dan Roh Allah melayang-layang di atas permukaan air.",
    "book": "Kejadian",
    "chapter": 1
  }
  // ... all verses in the chapter
]
```

### 4. GET `/api/bible/search?version=TB&q=kasih`
Searches for verses containing the query text.

**Response:**
```json
[
  {
    "book": "Yohanes",
    "chapter": 3,
    "verse": 16,
    "text": "Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal..."
  }
  // ... more matching verses
]
```

## Database Schema

### Bible Versions Table
```sql
CREATE TABLE bible_versions (
    id VARCHAR(10) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Bible Books Table
```sql
CREATE TABLE bible_books (
    id VARCHAR(10) PRIMARY KEY,
    version_id VARCHAR(10) REFERENCES bible_versions(id),
    name VARCHAR(100) NOT NULL,
    name_local VARCHAR(100),
    testament VARCHAR(2) CHECK (testament IN ('OT', 'NT')),
    book_number INT NOT NULL,
    chapter_count INT NOT NULL,
    INDEX idx_version_testament (version_id, testament)
);
```

### Bible Verses Table
```sql
CREATE TABLE bible_verses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    version_id VARCHAR(10) REFERENCES bible_versions(id),
    book VARCHAR(100) NOT NULL,
    chapter INT NOT NULL,
    verse INT NOT NULL,
    text TEXT NOT NULL,
    INDEX idx_version_book_chapter (version_id, book, chapter),
    INDEX idx_search (version_id, text(255)),
    FULLTEXT INDEX ft_text (text)
);
```

## Data Sources

### Indonesian Bible (TB - Terjemahan Baru)
- Available from: https://alkitab.mobi/
- Alternative: Bible API at https://bible-api.com/
- Contains all 66 books in Indonesian

### English Bibles
1. **NIV (New International Version)**
   - Most popular modern translation
   - Available from: https://www.biblegateway.com/versions/New-International-Version-NIV-Bible/

2. **NLT (New Living Translation)**
   - Easy to read
   - Available from: https://www.biblegateway.com/versions/New-Living-Translation-NLT-Bible/

3. **NKJV (New King James Version)**
   - Traditional language
   - Available from: https://www.biblegateway.com/versions/New-King-James-Version-NKJV-Bible/

4. **ESV (English Standard Version)**
   - Literal translation
   - Available from: https://www.esv.org/

### Using Bible API Services
Instead of storing the entire Bible in your database, you can use third-party APIs:

1. **Bible API** (https://bible-api.com/)
   - Free, no API key required
   - Supports multiple versions
   - Example: `https://bible-api.com/john+3:16`

2. **API.Bible** (https://scripture.api.bible/)
   - Official API from American Bible Society
   - Requires free API key
   - Multiple translations available

3. **Bible Gateway API** (Commercial)
   - Most comprehensive
   - Requires paid subscription

## Implementation Priority

### Phase 1: Essential (Immediate)
1. ✅ Mobile UI already implemented
2. 🔴 Backend: Create Bible API endpoints
3. 🔴 Backend: Add Indonesian TB version
4. 🔴 Backend: Setup database tables

### Phase 2: English Versions
1. Add NIV translation
2. Add NLT translation
3. Add NKJV translation
4. Add ESV translation

### Phase 3: Advanced Features
1. Search functionality with full-text search
2. Cross-reference support
3. Multiple language support beyond English/Indonesian

## Testing

Test URLs (once backend is ready):
- `GET https://flow.gkbj.org/api/bible/versions`
- `GET https://flow.gkbj.org/api/bible/books?version=TB`
- `GET https://flow.gkbj.org/api/bible/TB/Kejadian/1`
- `GET https://flow.gkbj.org/api/bible/search?version=TB&q=kasih`

## Notes

- All Bible data should be cached heavily (mobile app caches for 1 week)
- Search should support Indonesian and English languages
- Consider using a Bible API service initially, then migrate to self-hosted if needed
- Ensure proper copyright compliance for each translation
