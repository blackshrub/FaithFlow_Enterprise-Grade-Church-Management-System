# Bible Data Import Instructions

## Summary

The Bible API on `https://flow.gkbj.org` is **working correctly**, but the MongoDB database is **empty**. You need to import the Bible data.

## Current Status

✅ Bible API endpoints are accessible
❌ Database collections are empty:
- `bible_versions` → `[]`
- `bible_books` → `[]`
- `bible_verses` → `[]`

✅ Mobile app now configured to use `https://flow.gkbj.org`

## Import Bible Data

### Option 1: Using the Complete Import Script (Recommended)

The script `backend/scripts/import_bible_complete.py` will import:
- TB (Terjemahan Baru - Indonesian)
- NIV (New International Version - English)
- NKJV (New King James Version - English)
- NLT (New Living Translation - English)

**Steps:**

1. **SSH into your production server** (where flow.gkbj.org is hosted)

2. **Navigate to backend directory:**
   ```bash
   cd /path/to/FaithFlow/backend
   ```

3. **Ensure environment variables are set:**
   ```bash
   # Check .env file has:
   # MONGO_URL=mongodb://...
   # DB_NAME=church_management
   ```

4. **Run the import script:**
   ```bash
   cd scripts
   python3 import_bible_complete.py
   ```

5. **Wait for completion** - This will take 15-30 minutes as it imports ~31,000 verses

6. **Verify import:**
   ```bash
   # Test the API
   curl https://flow.gkbj.org/api/bible/versions
   # Should return: [{"code":"TB",...}, {"code":"NIV",...}, ...]

   curl https://flow.gkbj.org/api/bible/books
   # Should return 66 books

   curl "https://flow.gkbj.org/api/bible/TB/Yohanes/3"
   # Should return John 3 verses in Indonesian
   ```

### Option 2: Import Specific Versions Only

**For Indonesian Bible only (TB):**
```bash
cd backend/scripts
python3 import_bible.py
```

**For English Bibles only (NIV, NKJV, NLT):**
```bash
cd backend/scripts
python3 import_english_bibles.py
```

**For Chinese Bible only (CHS):**
```bash
cd backend/scripts
python3 import_tb_chs.py
```

## What the Import Script Does

1. **Connects to MongoDB** using `MONGO_URL` from environment
2. **Imports Bible Versions** - Creates records in `bible_versions` collection
3. **Imports Bible Books** - Creates 66 book records in `bible_books` collection
4. **Imports Bible Verses** - Fetches from alkitab-api GraphQL and saves to `bible_verses` collection
   - TB: ~31,000 verses in Indonesian
   - NIV/NKJV/NLT: ~31,000 verses each in English

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

After importing all 4 versions (TB, NIV, NKJV, NLT):
- Bible versions: 4-5 documents
- Bible books: 66 documents
- Bible verses: ~124,000 documents (31,000 × 4 versions)
- Estimated size: ~50-100 MB

## Questions?

If you encounter any issues during import, check:
1. MongoDB connection is working
2. Server has internet access to fetch from alkitab-api
3. Backend `.env` file has correct `MONGO_URL` and `DB_NAME`
4. Python dependencies are installed: `pip install motor requests python-dotenv`
