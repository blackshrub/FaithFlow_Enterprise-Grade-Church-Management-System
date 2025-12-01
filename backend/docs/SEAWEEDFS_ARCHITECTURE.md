# FaithFlow SeaweedFS Architecture

## Enterprise-Grade File Storage System

This document defines the enterprise-grade file storage architecture for FaithFlow using SeaweedFS.

---

## Storage Hierarchy

```
/faithflow/
├── global/                              # Global assets (shared across all churches)
│   ├── system/                          # System assets
│   │   ├── logos/                       # FaithFlow logos
│   │   ├── icons/                       # App icons
│   │   └── defaults/                    # Default images
│   └── bible/                           # Bible-related assets
│       └── figures/                     # Bible figure illustrations
│
└── {church_id}/                         # Church-specific storage (multi-tenant)
    │
    ├── members/                         # Member-related files
    │   ├── photos/                      # Profile photos
    │   │   └── {member_id}/
    │   │       ├── {uuid}.jpg           # Optimized photo
    │   │       └── thumb_{uuid}.jpg     # Thumbnail (150x150)
    │   ├── documents/                   # Personal documents
    │   │   └── {member_id}/
    │   │       └── {document_type}/     # baptism_cert, id_card, marriage_cert, other
    │   │           └── {uuid}.{ext}
    │   └── qrcodes/                     # Personal QR codes
    │       └── {member_id}/
    │           └── {uuid}.png
    │
    ├── groups/                          # Cell groups / Small groups
    │   └── {group_id}/
    │       ├── cover/                   # Cover image
    │       │   ├── {uuid}.jpg
    │       │   └── thumb_{uuid}.jpg
    │       └── gallery/                 # Group photo gallery
    │           └── {uuid}.jpg
    │
    ├── communities/                     # Communities (chat groups)
    │   └── {community_id}/
    │       ├── cover/                   # Community cover
    │       │   ├── {uuid}.jpg
    │       │   └── thumb_{uuid}.jpg
    │       ├── subgroups/               # Subgroup covers
    │       │   └── {subgroup_id}/
    │       │       └── cover/
    │       └── messages/                # Chat message attachments
    │           └── {message_id}/
    │               ├── {uuid}.jpg       # Images
    │               ├── {uuid}.mp4       # Videos
    │               ├── {uuid}.mp3       # Audio
    │               ├── {uuid}.pdf       # Documents
    │               └── thumb_{uuid}.jpg # Thumbnails
    │
    ├── events/                          # Church events
    │   └── {event_id}/
    │       ├── cover/                   # Event cover/poster
    │       │   ├── {uuid}.jpg
    │       │   └── thumb_{uuid}.jpg
    │       ├── gallery/                 # Event photos
    │       │   └── {uuid}.jpg
    │       └── materials/               # Event materials (PDFs, etc)
    │           └── {uuid}.{ext}
    │
    ├── articles/                        # News & announcements
    │   └── {article_id}/
    │       ├── featured/                # Featured image
    │       │   ├── {uuid}.jpg
    │       │   └── thumb_{uuid}.jpg
    │       └── content/                 # Inline images
    │           └── {uuid}.jpg
    │
    ├── devotions/                       # Daily devotions
    │   └── {devotion_id}/
    │       └── cover/
    │           ├── {uuid}.jpg
    │           └── thumb_{uuid}.jpg
    │
    ├── explore/                         # Explore tab content
    │   ├── daily-devotions/
    │   │   └── {devotion_id}/
    │   │       └── cover/
    │   ├── bible-figures/
    │   │   └── {figure_id}/
    │   │       └── portrait/
    │   ├── verse-of-day/
    │   │   └── {verse_id}/
    │   │       └── background/
    │   ├── quizzes/
    │   │   └── {quiz_id}/
    │   │       └── cover/
    │   └── bible-studies/
    │       └── {study_id}/
    │           └── cover/
    │
    ├── sermons/                         # Sermon recordings
    │   └── {sermon_id}/
    │       ├── audio/                   # Audio recordings
    │       │   └── {uuid}.mp3
    │       ├── video/                   # Video recordings
    │       │   └── {uuid}.mp4
    │       ├── slides/                  # Presentation slides
    │       │   └── {uuid}.pdf
    │       └── thumbnail/
    │           └── {uuid}.jpg
    │
    ├── giving/                          # Financial records
    │   └── receipts/                    # Donation receipts
    │       └── {year}/
    │           └── {month}/
    │               └── {uuid}.pdf
    │
    ├── forms/                           # Form submissions
    │   └── {form_id}/
    │       └── attachments/
    │           └── {submission_id}/
    │               └── {uuid}.{ext}
    │
    ├── ai/                              # AI-generated content
    │   └── generated/
    │       └── {generation_id}/
    │           ├── {uuid}.jpg
    │           └── thumb_{uuid}.jpg
    │
    ├── imports/                         # Bulk import files (temporary)
    │   └── {import_session_id}/
    │       ├── photos/                  # Extracted photos pending import
    │       └── documents/               # Extracted documents pending import
    │
    └── exports/                         # Export files (temporary)
        └── {export_id}/
            └── {filename}
```

---

## Storage Categories

Each category has specific settings for optimization, thumbnails, and size limits:

| Category | Path | Max Size | Optimize | Thumbnail | Thumbnail Size |
|----------|------|----------|----------|-----------|----------------|
| `MEMBER_PHOTO` | members/photos | 2MB | Yes | Yes | 150x150 |
| `MEMBER_DOCUMENT` | members/documents | 10MB | No | No | - |
| `MEMBER_QRCODE` | members/qrcodes | 100KB | No | No | - |
| `GROUP_COVER` | groups/{id}/cover | 5MB | Yes | Yes | 400x200 |
| `COMMUNITY_COVER` | communities/{id}/cover | 5MB | Yes | Yes | 400x200 |
| `COMMUNITY_SUBGROUP_COVER` | communities/{id}/subgroups/{sid}/cover | 5MB | Yes | Yes | 400x200 |
| `MESSAGE_MEDIA` | communities/{id}/messages | 100MB | Yes* | Yes | 300x300 |
| `EVENT_COVER` | events/{id}/cover | 5MB | Yes | Yes | 400x200 |
| `EVENT_GALLERY` | events/{id}/gallery | 10MB | Yes | Yes | 300x300 |
| `ARTICLE_FEATURED` | articles/{id}/featured | 5MB | Yes | Yes | 400x225 |
| `ARTICLE_CONTENT` | articles/{id}/content | 5MB | Yes | No | - |
| `DEVOTION_COVER` | devotions/{id}/cover | 5MB | Yes | Yes | 400x267 |
| `EXPLORE_DEVOTION` | explore/daily-devotions | 5MB | Yes | Yes | 400x267 |
| `EXPLORE_FIGURE` | explore/bible-figures | 5MB | Yes | Yes | 400x400 |
| `EXPLORE_VERSE` | explore/verse-of-day | 5MB | Yes | Yes | 400x267 |
| `EXPLORE_QUIZ` | explore/quizzes | 5MB | Yes | Yes | 400x267 |
| `EXPLORE_STUDY` | explore/bible-studies | 5MB | Yes | Yes | 400x267 |
| `SERMON_AUDIO` | sermons/{id}/audio | 200MB | No | No | - |
| `SERMON_VIDEO` | sermons/{id}/video | 2GB | No | Yes | 400x225 |
| `SERMON_SLIDES` | sermons/{id}/slides | 50MB | No | No | - |
| `AI_GENERATED` | ai/generated | 10MB | No | Yes | 400x400 |
| `IMPORT_TEMP` | imports/{session_id} | 100MB | No | No | - |
| `GENERAL` | general/uploads | 10MB | No | No | - |

*MESSAGE_MEDIA: Images optimized, videos/audio not optimized

---

## URL Structure

### Internal URLs (within Docker network)
```
http://seaweedfs-filer:8888/faithflow/{church_id}/{path}
```

### Public URLs (via reverse proxy)
```
https://files.{domain}/faithflow/{church_id}/{path}
```

Example:
```
https://files.flow.gkbj.org/faithflow/d5166828-2e45-4c7d-b5e6-cf811a86edf8/members/photos/abc123/photo.jpg
```

### Environment Configuration

Configure the public URL via environment variable:

```bash
# Backend .env file
SEAWEEDFS_MASTER_URL=http://seaweedfs-master:9333
SEAWEEDFS_VOLUME_URL=http://seaweedfs-volume:8080
SEAWEEDFS_FILER_URL=http://seaweedfs-filer:8888
SEAWEEDFS_PUBLIC_URL=https://files.yourdomain.com
```

The `SEAWEEDFS_PUBLIC_URL` is used for generating URLs that clients can access.
If not set, the system falls back to using `SEAWEEDFS_FILER_URL`.

### Traefik Configuration (docker-compose.prod.yml)

The production docker-compose includes Traefik labels for SeaweedFS:

```yaml
seaweedfs-filer:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.seaweedfs.rule=Host(`files.${DOMAIN}`)"
    - "traefik.http.routers.seaweedfs.entrypoints=websecure"
    - "traefik.http.routers.seaweedfs.tls.certresolver=letsencrypt"
    - "traefik.http.services.seaweedfs.loadbalancer.server.port=8888"
```

This routes `https://files.yourdomain.com/*` to the SeaweedFS Filer service.

### Thumbnail URLs
Append `thumb_` prefix to filename:
```
https://files.flow.gkbj.org/faithflow/{church_id}/members/photos/{member_id}/thumb_{uuid}.jpg
```

---

## Database Schema

### Member Document
```json
{
  "id": "member-uuid",
  "church_id": "church-uuid",
  "full_name": "John Doe",

  // NEW: SeaweedFS file references
  "photo_url": "https://files.domain.com/faithflow/{church_id}/members/photos/{id}/{uuid}.jpg",
  "photo_thumbnail_url": "https://files.domain.com/faithflow/{church_id}/members/photos/{id}/thumb_{uuid}.jpg",
  "photo_fid": "3,01abc123",           // SeaweedFS file ID (for direct access)
  "photo_path": "/faithflow/{church_id}/members/photos/{id}/{uuid}.jpg",

  "documents": [
    {
      "id": "doc-uuid",
      "type": "baptism_certificate",
      "name": "Baptism Certificate 2020",
      "url": "https://files.domain.com/faithflow/{church_id}/members/documents/{id}/baptism_cert/{uuid}.pdf",
      "fid": "3,02def456",
      "path": "/faithflow/{church_id}/members/documents/{id}/baptism_cert/{uuid}.pdf",
      "mime_type": "application/pdf",
      "file_size": 245000,
      "uploaded_at": "2024-01-15T10:30:00Z"
    }
  ],

  // DEPRECATED: Will be removed after migration
  "photo_base64": null,
  "personal_document_base64": null
}
```

### Community Message Document
```json
{
  "id": "message-uuid",
  "community_id": "community-uuid",
  "sender_id": "member-uuid",
  "content": "Check out this photo!",

  "attachments": [
    {
      "id": "attachment-uuid",
      "type": "image",
      "url": "https://files.domain.com/faithflow/{church_id}/communities/{id}/messages/{msg_id}/{uuid}.jpg",
      "thumbnail_url": "https://files.domain.com/faithflow/{church_id}/communities/{id}/messages/{msg_id}/thumb_{uuid}.jpg",
      "fid": "3,03ghi789",
      "path": "/faithflow/{church_id}/communities/{id}/messages/{msg_id}/{uuid}.jpg",
      "mime_type": "image/jpeg",
      "file_size": 156000,
      "width": 1200,
      "height": 800
    }
  ]
}
```

---

## Security

### Multi-Tenant Isolation
- All file paths include `{church_id}` for tenant isolation
- Backend validates `church_id` before file operations
- No cross-tenant file access allowed

### Access Control
- Files are accessed via authenticated API endpoints
- Direct SeaweedFS access only from backend (internal network)
- Public URLs require valid session or API key

### File Validation
- MIME type validation before upload
- File size limits enforced per category
- Image dimension limits enforced
- No executable files allowed

---

## Migration Strategy

### Phase 1: New Uploads to SeaweedFS
- All new file uploads go to SeaweedFS
- Store both URL and base64 during transition

### Phase 2: Background Migration
- Run migration script to move existing base64 to SeaweedFS
- Update document references
- Keep base64 for 30-day rollback safety

### Phase 3: Cleanup
- Remove base64 fields from documents
- Update models to remove base64 fields
- Archive migration logs

---

## Backup & Recovery

### Daily Backup
```bash
# Backup filer metadata
docker exec faithflow-seaweedfs-filer weed backup -dir /backup -collection ""

# Backup volume data
docker exec faithflow-seaweedfs-volume tar -cvzf /backup/volumes.tar.gz /data
```

### Disaster Recovery
1. Restore filer metadata from backup
2. Restore volume data from backup
3. Run `weed volume.fix.replication` to verify integrity

---

## Monitoring

### Health Checks
- Master: `GET /cluster/status`
- Volume: `GET /status`
- Filer: `GET /`

### Metrics
- Storage utilization per church
- Upload/download rates
- Error rates
- Latency percentiles

---

## Performance Optimization

### CDN Integration (Future)
- CloudFlare/AWS CloudFront for edge caching
- Cache headers on static files
- Geographic distribution

### Image Processing
- WebP conversion for modern browsers
- Lazy loading thumbnails
- Progressive JPEG for large images
