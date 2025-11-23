# 📁 File Upload Reorganization Plan

## Current Problems

### 1. Mixed Storage Strategy
- **Documents**: File system (`/app/uploads/{church_id}/filename.ext`)
- **Images**: Base64 in MongoDB (member photos, group covers, article images)
- **Inconsistent**: No clear pattern for what goes where

### 2. Database Bloat
- Member profile photos stored as base64 in `members.photo_base64`
- Group cover images stored as base64 in `groups.cover_image`
- Article featured images stored as base64 in `articles.featured_image`
- QR codes stored as base64 in `members.personal_qr_code`
- Documents stored as base64 in `members.personal_document_base64`

### 3. No Folder Organization
- All files in single church directory: `/app/uploads/{church_id}/`
- No separation by module (members, events, articles, etc.)
- No separation by type (photos, documents, covers, etc.)

### 4. Inconsistent Limits
- Documents: 10MB max (file_service.py)
- Images: No clear limit for base64 (leads to MongoDB bloat)

---

## Proposed New Structure

### Directory Layout

```
/app/uploads/
├── {church-id}/
│   ├── members/
│   │   ├── photos/                    # Profile photos
│   │   │   ├── {member-id}_profile.jpg
│   │   │   └── {member-id}_profile_thumb.jpg
│   │   ├── documents/                 # ID cards, baptism certs, etc.
│   │   │   └── {member-id}_{doc-type}_{uuid}.pdf
│   │   └── qrcodes/                   # QR code images
│   │       └── {member-id}_qr.png
│   ├── groups/
│   │   └── covers/
│   │       ├── {group-id}_cover.jpg
│   │       └── {group-id}_cover_thumb.jpg
│   ├── events/
│   │   └── covers/
│   │       ├── {event-id}_cover.jpg
│   │       └── {event-id}_cover_thumb.jpg
│   ├── articles/
│   │   └── images/
│   │       ├── {article-id}_featured.jpg
│   │       └── {uuid}_inline.jpg       # Inline images
│   ├── devotions/
│   │   └── covers/
│   │       └── {devotion-id}_cover.jpg
│   ├── gallery/
│   │   └── {album-id}/
│   │       ├── {photo-id}.jpg
│   │       └── {photo-id}_thumb.jpg
│   └── documents/                     # General church documents
│       └── {category}/{filename}
```

### File Size Limits

| Type | Format | Max Size | Dimensions |
|------|--------|----------|------------|
| Profile Photos | JPG, PNG | 2MB | 800x800 (auto-resize) |
| Cover Images | JPG, PNG | 5MB | 1920x1080 (auto-resize) |
| QR Codes | PNG | 100KB | 300x300 |
| Documents | PDF, DOCX | 10MB | N/A |
| Gallery Photos | JPG, PNG | 5MB | 1920x1080 (auto-resize) |

---

## Implementation Plan

### Phase 1: Create New File Service (Enhanced)

**File:** `backend/services/file_storage_service.py`

Features:
- ✅ Church-based folder organization
- ✅ Module-specific subdirectories
- ✅ Automatic image optimization (Pillow)
- ✅ Thumbnail generation
- ✅ File type validation
- ✅ Virus scanning (optional - ClamAV)
- ✅ CDN-ready (relative URLs)
- ✅ Cleanup orphaned files

### Phase 2: Migration Script

**File:** `backend/scripts/migrate_base64_to_files.py`

Process:
1. Query all members with `photo_base64`
2. Decode base64 → Save to `/uploads/{church_id}/members/photos/{member_id}_profile.jpg`
3. Generate thumbnail
4. Update member record: `photo_base64 → photo_url`
5. Repeat for groups, articles, documents
6. Log migration results
7. Keep base64 for 30 days (rollback safety)

### Phase 3: Update Backend Routes

Files to update:
- `backend/routes/members.py` - Photo upload endpoint
- `backend/routes/groups.py` - Cover image endpoint
- `backend/routes/articles.py` - Featured image endpoint
- `backend/routes/events.py` - Event cover endpoint
- `backend/routes/devotions.py` - Devotion cover endpoint

Changes:
- Replace base64 string handling with file uploads
- Use new `file_storage_service.py`
- Return URLs instead of base64
- Add thumbnail URLs

### Phase 4: Update Frontend

Files to update:
- Member profile upload component
- Group cover upload component
- Article image upload component

Changes:
- Use `multipart/form-data` instead of JSON base64
- Display images from URL endpoints
- Show upload progress
- Handle thumbnail vs full-size

### Phase 5: Add File Serving Endpoint

**Route:** `GET /api/files/{church_id}/{module}/{type}/{filename}`

Features:
- Church ID validation (multi-tenant security)
- Public files (articles, devotions) vs private (member photos)
- Image resizing on-the-fly (query param: `?size=thumb`)
- Cache headers (1 year for immutable files)
- Content-Disposition headers

---

## Database Schema Changes

### New Collection: `file_metadata`

```python
{
    "id": "file-uuid",
    "church_id": "church-123",
    "module": "members",           # members, groups, events, articles, etc.
    "type": "photo",               # photo, cover, document, qr, etc.
    "reference_id": "member-456",  # ID of related entity
    "original_filename": "profile.jpg",
    "stored_filename": "member-456_profile.jpg",
    "storage_path": "/app/uploads/church-123/members/photos/member-456_profile.jpg",
    "url": "/api/files/church-123/members/photos/member-456_profile.jpg",
    "thumbnail_path": "/app/uploads/church-123/members/photos/member-456_profile_thumb.jpg",
    "thumbnail_url": "/api/files/church-123/members/photos/member-456_profile_thumb.jpg",
    "mime_type": "image/jpeg",
    "file_size": 245678,
    "width": 800,
    "height": 800,
    "uploaded_by": "user-789",
    "uploaded_at": "2025-01-15T10:30:00Z",
    "metadata": {
        "optimized": true,
        "original_size": 1024000,
        "compression_ratio": 0.76
    }
}
```

### Updated Model Fields

**Before:**
```python
# Member
photo_base64: Optional[str] = None
personal_document_base64: Optional[str] = None
personal_qr_code: Optional[str] = None  # Base64

# Group
cover_image: Optional[str] = None  # Base64

# Article
featured_image: Optional[str] = None  # Base64
```

**After:**
```python
# Member
photo_url: Optional[str] = None                    # /api/files/church-123/members/photos/member-456_profile.jpg
photo_thumbnail_url: Optional[str] = None          # /api/files/church-123/members/photos/member-456_profile_thumb.jpg
personal_document_url: Optional[str] = None
personal_qr_url: Optional[str] = None

# Group
cover_image_url: Optional[str] = None
cover_image_thumbnail_url: Optional[str] = None

# Article
featured_image_url: Optional[str] = None
featured_image_thumbnail_url: Optional[str] = None
```

---

## Backward Compatibility Strategy

### Option 1: Dual Field Support (30 days)
- Keep both `photo_base64` and `photo_url` fields
- Read from URL first, fallback to base64
- Migration script runs, populates URL fields
- After 30 days, remove base64 fields

### Option 2: Migration Flag
- Add `migrated_to_files: bool` flag
- Old data uses base64, new data uses files
- Background job migrates gradually
- Remove base64 after 100% migration

**Recommended:** Option 1 (safer, faster)

---

## Security Considerations

### 1. Multi-Tenant Isolation
- File paths include `church_id`
- Serving endpoint validates church access
- Cannot access other church files via URL manipulation

### 2. File Type Validation
- Check MIME type from file headers (not just extension)
- Block executable files (.exe, .sh, .bat)
- Whitelist safe types only

### 3. Virus Scanning (Optional)
- Integrate ClamAV for uploaded files
- Quarantine suspicious files
- Notify admin of threats

### 4. Access Control
- Public files: Articles, devotions (anyone can view)
- Private files: Member photos, documents (auth required)
- Check permissions before serving

### 5. Rate Limiting
- Limit upload requests (10 files/minute per user)
- Prevent DoS via large uploads
- Block repeated failed attempts

---

## Performance Optimization

### 1. Image Optimization
- Auto-resize large images (max 1920px width)
- Convert PNG → JPG for photos (smaller size)
- Strip EXIF data (privacy + size)
- Use quality 85 for JPG (good balance)

### 2. Thumbnail Generation
- Create thumbnails on upload (async)
- Sizes: 150x150, 300x300, 800x800
- Use lazy loading in frontend

### 3. CDN Integration (Future)
- Upload files to S3/CloudFront
- Serve images from CDN (faster)
- Keep local copy as backup

### 4. Caching
- Set Cache-Control headers (1 year for immutable)
- Use ETags for validation
- Browser caches images automatically

---

## Rollback Plan

If migration fails:

1. **Immediate Rollback** (Day 1-3)
   - Revert code to use base64 fields
   - Files remain on disk (no harm)
   - Deploy previous version

2. **Partial Rollback** (Day 4-30)
   - Keep new file system
   - Re-enable base64 reading as fallback
   - Fix bugs without full rollback

3. **No Rollback Needed** (After 30 days)
   - Migration complete
   - Remove base64 fields
   - Delete old data

---

## Testing Strategy

### Unit Tests
- File upload validation
- Image resizing
- Thumbnail generation
- MIME type detection

### Integration Tests
- Upload member photo → Check file exists
- Retrieve photo via URL → Verify content
- Multi-tenant isolation → Cannot access other church
- Migration script → Base64 → File successful

### Manual Testing
- Upload profile photo via frontend
- View photo in member list
- Upload article featured image
- Verify thumbnails load correctly

---

## Deployment Checklist

- [ ] Run tests (pytest, integration)
- [ ] Create backup of production database
- [ ] Deploy new file service code
- [ ] Run migration script (dry-run first)
- [ ] Verify sample files migrated correctly
- [ ] Update frontend to use new URLs
- [ ] Monitor error logs for 48 hours
- [ ] Remove base64 fields after 30 days
- [ ] Clean up orphaned files

---

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: File Service | 2 hours | `file_storage_service.py` |
| Phase 2: Migration Script | 3 hours | `migrate_base64_to_files.py` |
| Phase 3: Backend Routes | 4 hours | Updated upload endpoints |
| Phase 4: Frontend Updates | 4 hours | Upload components |
| Phase 5: File Serving | 2 hours | GET endpoint + tests |
| Testing & QA | 3 hours | Integration tests |
| **Total** | **18 hours** | ~2-3 days |

---

## Success Metrics

- ✅ All member photos migrated (0 base64 remaining)
- ✅ Database size reduced by 30-40%
- ✅ Image load time < 500ms (thumbnails < 200ms)
- ✅ No broken images in production
- ✅ 100% test coverage for file service
- ✅ Zero security vulnerabilities (file access)
