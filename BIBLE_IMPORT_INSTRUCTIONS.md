# Bible Data Import Instructions

## Summary

The Bible API on `https://flow.gkbj.org` is **working correctly**, but the MongoDB database is **empty**. You need to import the Bible data from the local JSON files.

## Current Status

✅ Bible API endpoints are accessible
❌ Database collections are empty:
- `bible_versions` → `[]`
- `bible_books` → `[]`
- `bible_verses` → `[]`

✅ Mobile app now configured to use `https://flow.gkbj.org`
✅ Bible data available as JSON files in `backend/data/bible/`:
- indo_tb.json (6.5M - Indonesian TB)
- niv.json (4.5M - English NIV)
- nkjv.json (4.6M - English NKJV)
- nlt.json (4.7M - English NLT)
- esv.json (4.5M - English ESV)
- chinese_union_simp.json (9.4M - Chinese)

## Import Bible Data from Local JSON Files

**Just run this single command:**

```bash
./IMPORT_BIBLE_FROM_JSON.sh
```

This automated script will:
1. ✅ Check that `.env` file exists with `MONGO_URL` and `DB_NAME`
2. ✅ Create Python virtual environment (if needed)
3. ✅ Install dependencies (motor, requests, python-dotenv)
4. ✅ Import all Bible versions from local JSON files:
   - TB (Terjemahan Baru - Indonesian)
   - NIV (New International Version - English)
   - NKJV (New King James Version - English)
   - NLT (New Living Translation - English)
   - ESV (English Standard Version - English)
   - CHS (Chinese Union Simplified)
5. ✅ Show import progress and summary

**Estimated Time:** 5-10 minutes (imports ~180,000 verses from local files)

### Manual Import (Alternative)

If you prefer to run the import script directly:

1. **SSH into your production server** (where flow.gkbj.org is hosted)

2. **Navigate to backend directory:**
   ```bash
   cd /root/FaithFlow_Enterprise-Grade-Church-Management-System/backend
   ```

3. **Ensure environment variables are set:**
   ```bash
   # Check .env file exists:
   cat .env
   # Should contain:
   # MONGO_URL=mongodb://localhost:27017
   # DB_NAME=church_management
   ```

4. **Create virtual environment and install dependencies:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install motor requests python-dotenv
   ```

5. **Run the import script:**
   ```bash
   cd scripts
   python import_bible_from_json.py
   ```

6. **Wait for completion** - Takes 5-10 minutes to import ~180,000 verses

### Verify Import

After import completes, test the API:

```bash
# Check Bible versions
curl https://flow.gkbj.org/api/bible/versions
# Should return: [{"id":"...","code":"TB","name":"Terjemahan Baru",...}, ...]

# Check Bible books
curl https://flow.gkbj.org/api/bible/books
# Should return 66 books

# Test Indonesian Bible (TB)
curl "https://flow.gkbj.org/api/bible/TB/Kejadian/1"
# Should return Genesis 1 verses in Indonesian

# Test English Bible (NIV)
curl "https://flow.gkbj.org/api/bible/NIV/Genesis/1"
# Should return Genesis 1 verses in English
```

## What the Import Script Does

1. **Connects to MongoDB** using `MONGO_URL` from `.env` file
2. **Imports Bible Books** - Creates 66 book records in `bible_books` collection with:
   - English names (Genesis, Exodus, etc.)
   - Local names (Kejadian, Keluaran, etc. for Indonesian)
   - Testament (OT/NT)
   - Chapter counts
3. **Imports Bible Versions** - Creates version records in `bible_versions` collection:
   - TB (Indonesian), NIV/NKJV/NLT/ESV (English), CHS (Chinese)
4. **Imports Bible Verses** - Reads from local JSON files and imports to `bible_verses` collection:
   - TB: ~31,000 verses in Indonesian
   - NIV/NKJV/NLT/ESV: ~31,000 verses each in English
   - CHS: ~31,000 verses in Chinese
   - Total: ~180,000+ verses

## Mobile App Configuration

✅ **Already Updated** - Mobile app production URL now points to:
```typescript
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://flow.gkbj.org';
```

When you build the mobile app for production (non-DEV mode), it will automatically use `https://flow.gkbj.org`.

## After Import

Once the Bible data is imported:

1. ✅ Bible versions will appear in app
2. ✅ Bible books will be selectable
3. ✅ Bible chapters will load and display
4. ✅ Verse of the Day will work
5. ✅ Bible reading will be fully functional

## Troubleshooting

### If import fails with MongoDB connection error:
```bash
# Check MongoDB is running
systemctl status mongod

# Check MONGO_URL in .env
cat backend/.env | grep MONGO_URL
```

### If import fails with network error:
```bash
# The script fetches from https://graphql-alkitabapi.herokuapp.com/v1/graphql
# Ensure server has internet access
curl -I https://graphql-alkitabapi.herokuapp.com/v1/graphql
```

### If you want to re-import:
```bash
# Delete existing data first
mongo church_management
db.bible_versions.deleteMany({})
db.bible_books.deleteMany({})
db.bible_verses.deleteMany({})
exit

# Then run import again
python3 import_bible_complete.py
```

## Expected Database Size

After importing all 6 versions (TB, NIV, NKJV, NLT, ESV, CHS):
- Bible versions: 6 documents
- Bible books: 66 documents
- Bible verses: ~180,000+ documents (31,000 × 6 versions)
- Estimated size: ~80-150 MB

## Troubleshooting

### If MongoDB connection fails:
```bash
# Check MongoDB is running
systemctl status mongod

# Check MONGO_URL in .env
cat backend/.env | grep MONGO_URL
```

### If .env file is missing:
Create `backend/.env` with:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=church_management
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
```

### If Python dependencies fail to install:
The script automatically creates a virtual environment. If you still encounter issues:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install motor requests python-dotenv
```

### If you want to re-import:
The import script will ask if you want to delete existing data before importing. Answer "yes" to re-import.
