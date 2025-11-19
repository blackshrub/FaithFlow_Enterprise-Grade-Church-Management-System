# Member Import/Export API Documentation

## Overview

The import/export system provides a comprehensive multi-step wizard for importing members with photos and documents, and exporting member data.

---

## Import Workflow

### Step 1: Upload & Parse File

**Endpoint:** `POST /api/import-export/parse-file`

**Request:**
```
Content-Type: multipart/form-data

file: CSV or JSON file
```

**Response:**
```json
{
  "filename": "members.csv",
  "file_type": "csv",
  "headers": ["full_name", "phone_whatsapp", "photo_filename"],
  "total_records": 809,
  "sample_data": [{...}],
  "all_data": [{...}]
}
```

---

### Step 2: Validate Phone Duplicates

**Endpoint:** `POST /api/import-export/validate-phone-duplicates`

**Purpose:** Early validation of phone number duplicates (both within CSV and against database)

**Request:**
```
Content-Type: multipart/form-data

file_content: "full_name,phone_whatsapp\nJohn,628123..." 
file_type: "csv"
field_mappings: '{"full_name":"full_name","phone_whatsapp":"phone_whatsapp"}'
default_values: '{}'
```

**Response:**
```json
{
  "has_duplicates": true,
  "internal_duplicates": [
    {
      "phone": "628123456789",
      "first_occurrence": {"row": 1, "full_name": "John Doe"},
      "duplicate_occurrence": {"row": 2, "full_name": "Jane Doe"}
    }
  ],
  "external_duplicates": [
    {
      "phone": "628123456789",
      "csv_record": {"row": 3, "full_name": "Bob Smith"},
      "existing_member": {
        "id": "uuid",
        "full_name": "Alice Johnson",
        "email": "alice@example.com",
        "address": "123 Main St"
      }
    }
  ],
  "total_internal": 1,
  "total_external": 1,
  "total_records_checked": 809
}
```

**Features:**
- ✅ Normalizes phone numbers (+62, 0, plain formats)
- ✅ Checks duplicates within CSV
- ✅ Checks duplicates against existing database members
- ✅ Returns detailed info with row numbers and names
- ✅ Blocks import if duplicates found

---

### Step 3: Photo Matching

**Endpoint:** `POST /api/photo-document-sim/simulate-photo-matching`

**Request:**
```
Content-Type: multipart/form-data

photo_archive: ZIP file (up to 50MB)
csv_data: JSON string of parsed CSV
photo_filename_field: "photo_filename"
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_files": 733,
    "matched_count": 658,
    "unmatched_files_count": 75,
    "unmatched_members_count": 151
  },
  "matched": [{"filename": "...", "member_name": "...", "row_index": 1}],
  "unmatched_members": [...],
  "session_id": "uuid-session-id",
  "note": "Photos stored temporarily. Will be embedded during import."
}
```

**Features:**
- ✅ Extracts photos from ZIP
- ✅ Normalizes filenames for matching
- ✅ Converts photos to base64
- ✅ Stores in temp directory (`/tmp/photo_upload_{session_id}/`)
- ✅ Returns session_id for later retrieval
- ✅ Handles large files (no MongoDB 16MB limit)

---

### Step 4: Document Matching

**Endpoint:** `POST /api/photo-document-sim/simulate-document-matching`

**Similar to photo matching, but for documents (PDF, DOC, JPG)**

**Response includes:**
- session_id for document retrieval
- Match summary
- Stored in `/tmp/document_upload_{session_id}/`

---

### Step 5: Value Mapping

**Purpose:** Map raw CSV values to database values (e.g., "M" → "Male", "P" → "Female")

**No API call - frontend-only step**

---

### Step 6: Simulation

**Endpoint:** `POST /api/import-export/simulate`

**Purpose:** Validate all data before actual import

**Response:**
```json
{
  "total_records": 809,
  "valid_records": 805,
  "invalid_records": 4,
  "errors": ["Row 5: Invalid gender", "Row 12: Invalid date format"],
  "duplicate_conflicts": [],
  "sample_valid": [{...}],
  "ready_to_import": true
}
```

---

### Step 7: Import Members

**Endpoint:** `POST /api/import-export/import-members`

**Request:**
```
Content-Type: multipart/form-data

file_content: CSV/JSON content
file_type: "csv"
field_mappings: JSON string
value_mappings: JSON string
default_values: JSON string
duplicate_resolutions: JSON string
custom_fields: JSON array
date_format: "DD-MM-YYYY"
photo_session_id: "uuid" (from Step 3)
document_session_id: "uuid" (from Step 4)
```

**Process:**
1. Retrieves photos from temp storage using session_id
2. Retrieves documents from temp storage
3. For each member:
   - Sets default member_status if not provided
   - Merges matched photo (base64)
   - Merges matched document (base64)
   - Auto-assigns demographic
   - Generates personal QR code
   - Creates member in database

**Response:**
```json
{
  "success": true,
  "total_records": 809,
  "imported": 809,
  "failed": 0,
  "errors": []
}
```

**Features:**
- ✅ Photos embedded as base64
- ✅ Documents embedded as base64 with MIME types
- ✅ QR codes auto-generated
- ✅ Default member status applied
- ✅ Phone numbers normalized
- ✅ Demographics auto-assigned from age
- ✅ Duplicate prevention (useRef guard prevents double execution)

---

## Export Members

**Endpoint:** `GET /api/import-export/export-members`

**Query Parameters:**
- `format`: "csv" or "json"
- `status_filter`: Optional member status
- `demographic_filter`: Optional demographic category

**Response:** CSV or JSON file download

---

## Cleanup Temp Uploads

**Endpoint:** `POST /api/import-export/cleanup-temp-uploads`

**Purpose:** Clean up temporary photo/document files after import

**Request:**
```json
{
  "member_ids": ["uuid1", "uuid2"]
}
```

---

## Key Features

### Phone Normalization

**Input formats handled:**
- `+628123456789` → `628123456789`
- `08123456789` → `628123456789`
- `8123456789` → `628123456789`

**Applied in:**
- Member create/update
- Import validation
- Duplicate checking

### Duplicate Detection

**Two-level checking:**
1. **Internal** (within CSV): Finds duplicate phones in upload
2. **External** (vs database): Checks against existing members

**Both use normalized phone numbers for accurate comparison**

### File Storage Architecture

**Photos & Documents:**
- Temp storage: `/tmp/{type}_upload_{session_id}/`
- Session metadata: MongoDB collections
- Final storage: Base64 in member documents
- Auto-cleanup: Temp files expire after 2 hours

**Benefits:**
- ✅ No MongoDB 16MB document limit
- ✅ Scalable for large batches
- ✅ Fast and reliable

---

## Error Handling

### Duplicate Phone at Step 2

**Response:**
```json
{
  "has_duplicates": true,
  "internal_duplicates": [...],
  "external_duplicates": [...]
}
```

**Frontend:**
- Shows detailed modal with duplicate list
- Only "Cancel Import" option
- User must fix CSV and re-upload

### Duplicate Phone on Member Create

**Response:** `400 Bad Request`
```json
{
  "detail": "Member with this WhatsApp number already exists"
}
```

**Frontend:**
- Shows toast notification
- Form stays open
- User can change phone and retry

---

## Import Statistics

**Typical Performance:**
- 809 members with 658 photos: ~30 seconds
- Photo extraction: ~2 seconds
- Photo base64 conversion: ~10 seconds
- Import to database: ~15 seconds
- QR generation: ~3 seconds

---

## Best Practices

1. **CSV Format:**
   - Include `photo_filename` column for photo matching
   - Include `personal_document` column for document matching
   - Use normalized phone format: `628XXXXXXXXX`

2. **Photo ZIP:**
   - Name files to match `photo_filename` column
   - Example: CSV has "jemaat-od4hk.jpg" → ZIP contains "JEMAAT-OD4HK.jpg" or "jemaat-od4hk.jpg"
   - System normalizes filenames automatically

3. **Document ZIP:**
   - Similar to photos
   - Supports: PDF, DOC, DOCX, JPG, PNG
   - Max 10MB per file

4. **Validation:**
   - Always check Step 2 for phone duplicates
   - Fix CSV before proceeding
   - Review Step 6 simulation results

5. **Performance:**
   - Batch size: Up to 2000 members recommended
   - Photo ZIP: Up to 100MB
   - Document ZIP: Up to 100MB
