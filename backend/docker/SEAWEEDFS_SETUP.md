# SeaweedFS Setup Guide

SeaweedFS is a self-hosted, distributed file storage system used by FaithFlow for storing community media (images, videos, audio, documents).

## Quick Start

### 1. Start SeaweedFS

```bash
cd backend/docker
docker-compose -f docker-compose.seaweedfs.yml up -d
```

### 2. Verify Installation

```bash
# Check cluster status
curl http://localhost:9333/cluster/status

# Expected output:
# {"IsLeader":true,"Leader":"...","Peers":null}
```

### 3. Test File Upload

```bash
# Upload a test file
curl -F file=@/path/to/test.jpg http://localhost:9333/submit

# Expected output:
# {"fid":"1,01a2b3c4d5","fileName":"test.jpg","fileUrl":"localhost:8080/1,01a2b3c4d5","size":12345}
```

### 4. Retrieve File

```bash
# Using the fid from upload response
curl -o downloaded.jpg http://localhost:8080/1,01a2b3c4d5
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Master Server  │────▶│  Volume Server  │◀───▶│  Filer Server   │
│  Port: 9333     │     │  Port: 8080     │     │  Port: 8888     │
│  (manages fids) │     │  (stores data)  │     │  (filesystem)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| 9333 | Master HTTP | File ID allocation, cluster management |
| 19333 | Master gRPC | Internal communication |
| 8080 | Volume HTTP | **Main file access endpoint** |
| 18080 | Volume gRPC | Internal communication |
| 8888 | Filer HTTP | File system interface |
| 8333 | S3 API | S3-compatible access (optional) |

## API Usage in FaithFlow

### Upload File (from FastAPI backend)

```python
import httpx

async def upload_to_seaweedfs(file_bytes: bytes, filename: str) -> dict:
    """Upload file to SeaweedFS and return file info."""
    async with httpx.AsyncClient() as client:
        # Get file ID assignment
        assign_resp = await client.get("http://localhost:9333/dir/assign")
        assign_data = assign_resp.json()

        fid = assign_data["fid"]
        url = f"http://{assign_data['url']}/{fid}"

        # Upload file
        files = {"file": (filename, file_bytes)}
        upload_resp = await client.post(url, files=files)

        return {
            "fid": fid,
            "size": upload_resp.json().get("size"),
            "url": f"http://localhost:8080/{fid}"
        }
```

### Download File

```python
async def get_seaweedfs_url(fid: str) -> str:
    """Get public URL for a file."""
    return f"http://localhost:8080/{fid}"
```

### Delete File

```python
async def delete_from_seaweedfs(fid: str) -> bool:
    """Delete file from SeaweedFS."""
    async with httpx.AsyncClient() as client:
        resp = await client.delete(f"http://localhost:8080/{fid}")
        return resp.status_code == 202
```

## Environment Variables

Add to your `.env`:

```bash
# SeaweedFS Configuration
SEAWEEDFS_MASTER_URL=http://localhost:9333
SEAWEEDFS_VOLUME_URL=http://localhost:8080
SEAWEEDFS_FILER_URL=http://localhost:8888

# For production, use internal Docker network or actual server IPs
# SEAWEEDFS_MASTER_URL=http://seaweedfs-master:9333
# SEAWEEDFS_VOLUME_URL=http://seaweedfs-volume:8080
```

## Production Considerations

### 1. Data Persistence

The Docker volumes persist data. For production, consider:

```yaml
volumes:
  seaweedfs-volume-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/your/storage
```

### 2. Replication (Optional)

For data redundancy, change `defaultReplication`:

```yaml
command: master -defaultReplication=001  # 1 replica on different rack
```

Replication codes:
- `000` = No replication (development)
- `001` = 1 replica on different rack
- `010` = 1 replica on different server
- `100` = 1 replica on different data center

### 3. Resource Limits

```yaml
services:
  seaweedfs-volume:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
```

### 4. Backup

```bash
# Backup volume data
docker exec faithflow-seaweedfs-volume tar -cvzf /backup/volumes.tar.gz /data

# Backup filer metadata
docker exec faithflow-seaweedfs-filer tar -cvzf /backup/filer.tar.gz /data
```

## Troubleshooting

### Container not starting

```bash
# Check logs
docker logs faithflow-seaweedfs-master
docker logs faithflow-seaweedfs-volume

# Common issue: port already in use
lsof -i :9333
lsof -i :8080
```

### File upload fails

```bash
# Check if volume server is connected
curl http://localhost:9333/dir/status

# Check volume server health
curl http://localhost:8080/status
```

### Clean restart

```bash
docker-compose -f docker-compose.seaweedfs.yml down -v
docker-compose -f docker-compose.seaweedfs.yml up -d
```

## File Size Limits

Default: 100MB per file (configured via `-fileSizeLimitMB=100`)

To change, update the volume server command:

```yaml
command: volume ... -fileSizeLimitMB=500
```

## Storage Calculation

Estimate storage needs:
- Average image: 500KB
- Average video (1 min): 10MB
- Average voice message: 500KB

For 1000 active users with moderate usage:
- ~50GB for first year
- Plan for 100GB+ with growth
