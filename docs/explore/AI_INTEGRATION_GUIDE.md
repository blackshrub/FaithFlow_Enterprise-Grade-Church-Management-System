# FaithFlow Explore - AI Integration Guide

## Overview

Phase 8 of the Explore feature implements world-class AI-powered content generation using **Anthropic Claude** for text content and **Stability AI** for cover images. This guide covers setup, usage, architecture, and troubleshooting.

## Table of Contents
1. [Features](#features)
2. [Architecture](#architecture)
3. [Environment Setup](#environment-setup)
4. [API Endpoints](#api-endpoints)
5. [Content Generation Workflow](#content-generation-workflow)
6. [Frontend Interface](#frontend-interface)
7. [Troubleshooting](#troubleshooting)
8. [Cost Management](#cost-management)

---

## Features

### Text Generation (Anthropic Claude)
- **3 Model Options**:
  - `claude-3-5-sonnet-20241022` (Recommended) - Best balance of speed and quality
  - `claude-3-opus-20240229` (Most Capable) - Highest quality, slower
  - `claude-3-haiku-20240307` (Fastest) - Quick generation, good quality

- **4 Content Types**:
  - **Daily Devotions**: Title, Bible reference, reflection, prayer, questions
  - **Verse of the Day**: Reference, verse text, commentary, application
  - **Bible Figures**: Name, biography, timeline, life lessons, references
  - **Daily Quiz**: Questions, options, correct answers, explanations

- **Multi-Language Support**: Generates both English and Indonesian content simultaneously

### Image Generation (Stability AI)
- **Automatic Cover Images**: Every generated content includes a 16:9 cover image
- **Stability AI Ultra**: Highest quality image generation model
- **4 Image Styles**:
  - `spiritual-art` (Default): Soft lighting, warm colors, peaceful atmosphere
  - `biblical`: Classical painting style, divine light, reverent mood
  - `modern`: Minimalist design, contemporary spiritual theme
  - `photorealistic`: Natural lighting, high detail, professional photography

- **Content-Specific Prompts**: Images tailored to the content type and actual generated text

### Queue System
- **Asynchronous Processing**: Non-blocking background job execution
- **Job Statuses**: pending → generating → completed/failed
- **Real-Time Monitoring**: Frontend polls every 5 seconds for updates
- **Accept/Reject/Regenerate**: Full content review workflow

---

## Architecture

### Backend Components

```
backend/
├── services/
│   └── ai_service.py           # Core AI service (750+ lines)
│       ├── AIService class
│       │   ├── __init__()         # API key initialization
│       │   ├── generate_content() # Start generation job
│       │   ├── generate_image()   # Stability AI integration
│       │   ├── accept_generated_content()
│       │   ├── reject_generated_content()
│       │   ├── regenerate_content()
│       │   ├── get_ai_config()
│       │   └── get_generation_queue()
│       ├── _process_generation_job()  # Async job processor
│       ├── _generate_devotion()       # Content-specific generators
│       ├── _generate_verse()
│       ├── _generate_figure()
│       ├── _generate_quiz()
│       ├── _get_devotion_prompt()     # Specialized prompts
│       ├── _get_verse_prompt()
│       ├── _get_figure_prompt()
│       ├── _get_quiz_prompt()
│       └── _get_image_prompt_for_content()
│
└── routes/
    └── explore_ai.py           # API endpoints (324 lines)
        ├── POST /api/explore/admin/ai/generate
        ├── GET  /api/explore/admin/ai/queue
        ├── GET  /api/explore/admin/ai/status/{job_id}
        ├── POST /api/explore/admin/ai/accept/{job_id}
        ├── POST /api/explore/admin/ai/reject/{job_id}
        ├── POST /api/explore/admin/ai/regenerate/{job_id}
        ├── GET  /api/explore/admin/ai/config
        └── GET  /api/explore/admin/ai/admin/stats
```

### Frontend Components

```
frontend/src/
├── pages/Explore/
│   └── AIGenerationHub.js      # Main UI (689 lines)
│       ├── Generation form (model, type, prompt)
│       ├── Queue monitoring (real-time polling)
│       ├── Content preview (EN/ID tabs)
│       └── Accept/Reject/Regenerate actions
│
└── services/
    └── exploreService.js       # API client
        ├── getAIConfig()
        ├── generateContent()
        ├── getGenerationQueue()
        ├── getGenerationStatus()
        ├── acceptGeneratedContent()
        ├── rejectGeneratedContent()
        └── regenerateContent()
```

### Database Schema

```javascript
// MongoDB collection: ai_generation_queue
{
  _id: ObjectId,
  church_id: string,
  user_id: string,
  content_type: "devotion" | "verse" | "figure" | "quiz",
  model: string,
  status: "pending" | "generating" | "completed" | "failed",
  custom_prompt?: string,
  generate_both_languages: boolean,
  generated_content?: {
    title?: { en: string, id: string },
    content?: { en: string, id: string },
    image_url?: string,  // base64 data URI
    // ... content-specific fields
  },
  error?: string,
  created_at: datetime,
  updated_at: datetime,
  completed_at?: datetime
}
```

---

## Environment Setup

### 1. Backend Environment Variables

Create or update `backend/.env`:

```bash
# Anthropic Claude API (Required for text generation)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stability AI API (Required for image generation)
STABILITY_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Existing environment variables...
MONGO_URL=mongodb://...
DB_NAME=church_management
JWT_SECRET=...
```

### 2. Obtain API Keys

#### Anthropic Claude API Key
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

**Pricing** (as of 2024):
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Claude 3 Opus: $15 per million input tokens, $75 per million output tokens
- Claude 3 Haiku: $0.25 per million input tokens, $1.25 per million output tokens

**Estimate**: Generating one devotion (~500 tokens) costs approximately $0.01 with Sonnet.

#### Stability AI API Key
1. Visit https://platform.stability.ai/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

**Pricing** (as of 2024):
- Stability AI Ultra: $0.08 per image (1024x576 or 16:9 aspect ratio)

**Estimate**: Each generated content includes 1 cover image at $0.08.

### 3. Install Backend Dependencies

The required package is already in `requirements.txt`:

```bash
cd backend
pip install -r requirements.txt
```

Specifically installs:
- `anthropic>=0.39.0` - Anthropic Python SDK

For Stability AI, we use `httpx` which is already in requirements.

### 4. Verify Installation

Start the backend server:

```bash
cd backend
uvicorn server:app --reload
```

Check logs for:
```
INFO: AI Service initialized (Claude: ✓, Stability: ✓)
```

If you see `✗` instead of `✓`, check your environment variables.

---

## API Endpoints

### 1. Get AI Configuration

**Endpoint**: `GET /api/explore/admin/ai/config`

**Description**: Check if API keys are configured and working.

**Response**:
```json
{
  "anthropic_enabled": true,
  "stability_enabled": true,
  "provider": "Anthropic Claude + Stability AI",
  "models": [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307"
  ]
}
```

### 2. Generate Content

**Endpoint**: `POST /api/explore/admin/ai/generate`

**Description**: Queue a new content generation job.

**Request Body**:
```json
{
  "content_type": "devotion",
  "model": "claude-3-5-sonnet-20241022",
  "custom_prompt": "Focus on hope and perseverance",
  "generate_both_languages": true
}
```

**Response**:
```json
{
  "job_id": "507f1f77bcf86cd799439011",
  "status": "pending",
  "message": "Generation job queued successfully"
}
```

### 3. Get Generation Queue

**Endpoint**: `GET /api/explore/admin/ai/queue`

**Description**: List all generation jobs for the current user.

**Response**:
```json
{
  "jobs": [
    {
      "id": "507f1f77bcf86cd799439011",
      "content_type": "devotion",
      "model": "claude-3-5-sonnet-20241022",
      "status": "completed",
      "generated_content": {
        "title": {
          "en": "Finding Hope in Difficult Times",
          "id": "Menemukan Harapan di Masa Sulit"
        },
        "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        // ... additional fields
      },
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:31:45Z"
    }
  ]
}
```

### 4. Accept Generated Content

**Endpoint**: `POST /api/explore/admin/ai/accept/{job_id}`

**Description**: Accept generated content and save it as actual content.

**Request Body**:
```json
{
  "edits": {
    "title": {
      "en": "Modified Title"
    }
  }
}
```

**Response**:
```json
{
  "content_id": "507f1f77bcf86cd799439012",
  "content_type": "devotion",
  "message": "Content saved successfully"
}
```

### 5. Reject Generated Content

**Endpoint**: `POST /api/explore/admin/ai/reject/{job_id}`

**Description**: Reject and discard generated content.

**Response**:
```json
{
  "message": "Content rejected successfully"
}
```

### 6. Regenerate Content

**Endpoint**: `POST /api/explore/admin/ai/regenerate/{job_id}`

**Description**: Create a new generation job with the same parameters.

**Response**:
```json
{
  "job_id": "507f1f77bcf86cd799439013",
  "message": "Regeneration job created"
}
```

---

## Content Generation Workflow

### 1. Admin Triggers Generation

1. Navigate to `/explore/ai` in the admin web interface
2. Select content type (devotion, verse, figure, quiz)
3. Choose AI model (Sonnet recommended)
4. Optionally add custom instructions
5. Ensure "Generate both languages" is checked
6. Click "Generate Content"

### 2. Backend Processing

```
User Request
    ↓
API Route (/api/explore/admin/ai/generate)
    ↓
AIService.generate_content()
    ├─ Validate parameters
    ├─ Create job in MongoDB (status: pending)
    └─ Start async task
        ↓
    _process_generation_job()
        ├─ Update status to "generating"
        ├─ Generate text content (Claude API)
        │   ├─ Load specialized prompt
        │   ├─ Call Anthropic API
        │   └─ Parse JSON response
        ├─ Generate cover image (Stability AI)
        │   ├─ Create content-specific prompt
        │   ├─ Call Stability AI API
        │   └─ Encode as base64 data URI
        ├─ Save generated content to job
        └─ Update status to "completed"
```

**Timing**: Typical generation takes 30-90 seconds:
- Text generation: 20-60 seconds
- Image generation: 10-30 seconds

### 3. Admin Reviews Content

1. Frontend polls queue every 5 seconds
2. Job appears with status "completed"
3. Admin clicks "Preview" to view content
4. Content displayed in tabs (English/Indonesian)
5. Cover image shown at top

### 4. Admin Takes Action

**Option A: Accept & Publish**
- Click "Accept & Publish"
- Content saved to appropriate collection (`explore_devotions`, `explore_verses`, etc.)
- Content marked as unpublished (draft)
- Admin can schedule via calendar

**Option B: Edit First**
- Click "Edit Before Saving"
- Navigates to content editor with pre-filled data
- Admin makes manual adjustments
- Saves as draft

**Option C: Regenerate**
- Click "Regenerate"
- Creates new job with same parameters
- New content generated with different output

**Option D: Reject**
- Click "Reject"
- Content discarded
- Job marked as rejected

---

## Frontend Interface

### AIGenerationHub (/explore/ai)

#### Configuration Status Card
Shows whether API keys are configured:
- ✓ Text Generation (Anthropic): Active/Not configured
- ✓ Image Generation (Stability): Active/Not configured

If not configured, displays warning with link to documentation.

#### Generation Form
- **Content Type**: Dropdown (Devotion, Verse, Figure, Quiz)
- **AI Model**: Dropdown (Sonnet, Opus, Haiku)
- **Custom Instructions**: Optional textarea for custom prompts
- **Languages**: Checkbox for bilingual generation
- **Generate Button**: Starts generation job

#### Generation Queue
Real-time list of all jobs for current user:
- **Job Header**: Content type icon, status badge, timestamp
- **Custom Prompt**: Displayed if provided
- **Status Indicators**:
  - Pending: Clock icon, "Queued for generation..."
  - Generating: Spinning loader, "Generating content... This may take up to 2 minutes."
  - Completed: Preview card with image, title, excerpt
  - Failed: Error message with retry button
- **Actions**: Preview, Accept, Edit, Regenerate, Reject

#### Preview Dialog
- **Tabs**: English / Indonesian
- **Content Display**: All fields formatted and styled
- **Image Display**: Cover image at 16:9 aspect ratio
- **Actions**: Close, Edit Before Saving, Accept & Publish

---

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY not set" Warning

**Symptom**: Backend logs show:
```
WARNING: ANTHROPIC_API_KEY not set - AI text generation will not work
```

**Solution**:
1. Check `backend/.env` file exists
2. Verify `ANTHROPIC_API_KEY=sk-ant-...` is present
3. Restart backend server: `uvicorn server:app --reload`

### Issue: "STABILITY_API_KEY not set" Warning

**Symptom**: Backend logs show:
```
WARNING: STABILITY_API_KEY not set - Image generation will not work
```

**Solution**:
1. Check `backend/.env` file has `STABILITY_API_KEY=sk-...`
2. Restart backend server

### Issue: Generation Fails with "Invalid API Key"

**Symptom**: Job status changes to "failed" with error message about API key.

**Solution**:
1. Verify API key format:
   - Anthropic: Should start with `sk-ant-`
   - Stability: Should start with `sk-`
2. Check API key has not expired
3. Verify API key has correct permissions
4. Test API key using curl:

```bash
# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Test"}]}'

# Test Stability AI
curl -f https://api.stability.ai/v2beta/stable-image/generate/ultra \
  -H "authorization: Bearer $STABILITY_API_KEY" \
  -H "accept: image/*" \
  -F prompt="test image" \
  -F output_format=png \
  --output test.png
```

### Issue: Generation Takes Too Long

**Symptom**: Job stays in "generating" status for >5 minutes.

**Possible Causes**:
1. **API Rate Limiting**: You've exceeded your API rate limits
2. **Network Issues**: Connection to Anthropic/Stability APIs is slow
3. **Server Load**: Background task queue is overloaded

**Solution**:
1. Check API dashboard for rate limits
2. Wait 5-10 minutes and try again
3. Monitor backend logs for detailed error messages
4. Consider using Haiku model for faster generation

### Issue: Image Generation Returns Empty String

**Symptom**: Content generated but `image_url` is empty or missing.

**Possible Causes**:
1. Stability API key not configured
2. API request failed (network, rate limit, invalid prompt)
3. Image encoding failed

**Solution**:
1. Check backend logs for image generation errors
2. Verify Stability API key is valid
3. System continues without image - content can still be accepted
4. Can manually upload image later via content editor

### Issue: Frontend Shows "No generation jobs yet"

**Symptom**: After clicking generate, queue remains empty.

**Possible Causes**:
1. Request failed before creating job
2. Church ID mismatch
3. User permission issue

**Solution**:
1. Check browser console for errors
2. Check network tab for failed API requests
3. Verify user is logged in as admin
4. Check backend logs for error details

---

## Cost Management

### Estimating Costs

**Per Devotion** (Claude 3.5 Sonnet + Stability AI Ultra):
- Text generation: ~$0.01 (avg 500 tokens)
- Image generation: $0.08
- **Total: ~$0.09 per devotion**

**Monthly for Daily Content** (30 days):
- 30 devotions: $2.70
- 30 verses: $2.70
- 30 figures: $2.70
- 30 quizzes: $2.70
- **Total: ~$10.80/month for all daily content**

### Cost Optimization Tips

1. **Use Haiku for Drafts**: Generate with Haiku first ($0.001/devotion), review, regenerate with Sonnet if needed
2. **Batch Generation**: Generate multiple pieces at once during off-peak hours
3. **Review Before Regenerating**: Carefully review content before clicking regenerate to avoid duplicate costs
4. **Custom Prompts**: Specific prompts reduce need for regeneration
5. **Monitor Usage**: Track API usage via Anthropic/Stability dashboards

### Setting Budget Limits

Configure usage limits in your API dashboards:
- Anthropic: https://console.anthropic.com/settings/limits
- Stability AI: https://platform.stability.ai/account

Recommended limits:
- Start with $50/month budget
- Monitor actual usage for first month
- Adjust based on content volume

---

## Best Practices

### Content Quality
1. **Use Custom Prompts**: Add specific themes or focus areas
2. **Review Generated Content**: Always review before publishing
3. **Edit When Needed**: Use "Edit First" to refine content
4. **Consistent Model**: Stick with Sonnet for consistent quality

### Workflow Efficiency
1. **Batch Generation**: Generate week's content on Monday
2. **Schedule Immediately**: After accepting, schedule via calendar
3. **Monitor Queue**: Check queue daily for completed jobs
4. **Clean Up Rejected**: Regularly remove rejected jobs

### Security
1. **Never Expose API Keys**: Keep keys in `.env`, never commit to git
2. **Rotate Keys Quarterly**: Generate new API keys every 3 months
3. **Monitor Usage**: Watch for unexpected spikes in API usage
4. **Restrict Access**: Only super admins should access AI generation

### Multi-Language
1. **Always Enable Both Languages**: Generates EN+ID simultaneously
2. **Review Both Versions**: Check quality of both languages
3. **Culturally Appropriate**: Ensure content works for both audiences

---

## Future Enhancements

### Planned Features
- [ ] Fine-tuning Claude models on church-specific content
- [ ] Image style presets (traditional, modern, photorealistic)
- [ ] Bulk generation (generate week/month of content at once)
- [ ] A/B testing for devotion titles
- [ ] Quality scoring and automatic retry for low-quality content
- [ ] Integration with content calendar (auto-schedule)
- [ ] Member feedback integration (improve prompts based on engagement)

### API Provider Alternatives
If desired, the architecture supports adding:
- OpenAI GPT-4 for text generation
- DALL-E 3 for image generation
- Midjourney via API for advanced images
- Custom fine-tuned models

---

## Support

### Getting Help
- **Documentation**: See `docs/explore/` for architecture docs
- **API Reference**: http://localhost:8000/docs (when backend running)
- **Issues**: Check backend logs and frontend console first

### Reporting Issues
When reporting generation issues, include:
1. Content type being generated
2. Model used
3. Custom prompt (if any)
4. Error message from backend logs
5. Job ID from queue

---

## Summary

✅ **Phase 8 Complete**: AI-powered content generation is production-ready!

**What You Get**:
- Text generation via Claude (3 model options)
- Image generation via Stability AI (automatic cover images)
- Multi-language support (EN + ID)
- Full admin interface with preview/accept/reject
- Asynchronous job queue system
- Comprehensive error handling

**Cost**: ~$11/month for daily content across all types

**Setup Time**: 10 minutes (get API keys, configure .env, restart server)

**Ready to Use**: Navigate to `/explore/ai` and start generating!
