# Webhook System for On-Demand Resource Regeneration

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [API Reference](#api-reference)
5. [HTTP Status Codes](#http-status-codes)
6. [Concurrency Management](#concurrency-management)
7. [Error Handling](#error-handling)
8. [Usage Examples](#usage-examples)
9. [CMS Integration](#cms-integration)
10. [Monitoring](#monitoring)
11. [Deployment Configuration](#deployment-configuration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The webhook system enables **on-demand regeneration** of static site resources without rebuilding the entire site. This is essential for keeping content up-to-date efficiently in a multi-journal static site environment.

### Key Features

- ✅ **Targeted Rebuilds**: Regenerate individual articles, volumes, sections, or entire journals
- ✅ **Multi-Journal Support**: Manage multiple journals with isolated builds
- ✅ **Concurrent Builds**: Build different journals in parallel
- ✅ **Queue Management**: Per-journal queues with configurable limits (default: 10)
- ✅ **Build Tracking**: Monitor build progress with unique build IDs
- ✅ **API Error Handling**: Preserve existing files when API fails
- ✅ **Optional Deployment**: Trigger deployment scripts after successful builds
- ✅ **Comprehensive Logging**: Structured logs for debugging and monitoring

### Supported Resource Types

| Type | Description | Example |
|------|-------------|---------|
| `article` | Individual article page | Article ID: 12345 |
| `volume` | Individual volume page | Volume ID: 42 |
| `section` | Individual section page | Section ID: 7 |
| `static-page` | Individual static page | Page: about, news, home |
| `full` | Complete journal rebuild | All pages regenerated |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Webhook Server                          │
│                    (scripts/webhook-server.js)              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Build Manager                          │ │
│  │  - Concurrency control (per-journal locks)            │ │
│  │  - Queue management (max 10 per journal)              │ │
│  │  - Build history (last 100 builds)                    │ │
│  │  - Progress tracking                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   epijinfo  │  │    dmtcs    │  │     ops     │  ...    │
│  │  [ACTIVE]   │  │   [QUEUE:2] │  │   [IDLE]    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Rebuild Resource Script                        │
│         (scripts/rebuild-resource.js)                        │
│                                                              │
│  1. Load journal-specific .env file                         │
│  2. Set targeted build environment variables                │
│  3. Execute Next.js build with isolated environment         │
│  4. Handle API errors gracefully (preserve existing files)  │
│  5. Return structured logs for webhook parsing              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Static Build                       │
│  - generateStaticParams checks for target env vars          │
│  - Builds only specified resource (if targeted)             │
│  - Outputs to dist/<journal-code>/                          │
└─────────────────────────────────────────────────────────────┘
```

### Concurrency Strategy

**Per-Journal Locking:**
- ✅ One active build per journal at a time
- ✅ Parallel builds for different journals
- ✅ Automatic queue processing when builds complete
- ❌ No concurrent builds for the same journal (prevents file conflicts)

**Example Scenarios:**

| Time | Event | Result |
|------|-------|--------|
| T0 | Request: epijinfo article 123 | → **Starts immediately** (202) |
| T1 | Request: epijinfo article 456 | → **Queued position 1** (203) |
| T2 | Request: dmtcs volume 42 | → **Starts immediately** (202) |
| T3 | Request: epijinfo full rebuild | → **Queued position 2** (203) |
| T4 | epijinfo article 123 completes | → **article 456 starts** (auto) |

---

## Hybrid Rendering Architecture for Static Pages

### Overview

To optimize the user experience when updating static pages (like `/about`, `/for-authors`, `/boards`, etc.), the system now implements a **hybrid rendering architecture** that separates the user-perceived update time from the actual HTML rebuild time.

### The Problem

Previously, updating a static page from the back-office triggered a full `next build`, which took ~31 seconds. This created a frustrating experience for content editors who had to wait for the rebuild to complete before seeing their changes live.

### The Solution

**Dual-Layer Architecture:**

1. **Static HTML Layer** (SEO)
   - Full HTML generated at build time
   - Served instantly by Apache (< 100ms)
   - Perfect for search engines and AI bots
   - Provides fallback if API fails

2. **Dynamic Hydration Layer** (Freshness)
   - Client automatically fetches latest data from API
   - Updates content in < 1 second
   - Smooth invisible transitions
   - No visible loading states

### How It Works

```
┌────────────────────────────────────────────────────────┐
│  BACK-OFFICE: Editor updates /about page              │
└───────────────────┬────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  API saves content   │ < 1s
         └──────────┬───────────┘
                    │
          ┌─────────┴──────────┐
          │                    │
          ▼                    ▼
   ┌────────────┐      ┌──────────────────┐
   │ Response:  │      │  Webhook POST    │
   │ "✓ Saved"  │      │  /rebuild        │
   └────────────┘      │  (async)         │
                       └──────┬───────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  HTML Rebuild        │ ~31s
                    │  (transparent)       │ (background)
                    └──────────────────────┘

┌────────────────────────────────────────────────────────┐
│  PUBLIC SITE: Visitor loads /about                     │
└───────────────────┬────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Apache serves       │ < 100ms
         │  static HTML         │ ✅ SEO perfect
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Browser hydrates JS │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Fetch fresh data    │ < 500ms
         │  from API            │
         └──────────┬───────────┘
                    │
              ┌─────┴──────┐
              │            │
              ▼            ▼
         [Same data]  [New data]
              │            │
              ▼            ▼
         No change    Smooth update
```

### Pages Using Hybrid Rendering

The following static pages now use this architecture:

- `/about` - About page
- `/for-authors` - For authors page
- `/boards` - Editorial boards
- `/credits` - Credits page
- `/news` - News listing
- `/` - Homepage

**Note:** Individual articles, volumes, and sections continue to use the standard targeted rebuild system and do NOT use hybrid rendering.

### Webhook Integration

**Key Point:** The webhook rebuild for these pages is now **transparent to end users**:

1. **Content Update Flow:**
   ```bash
   # Editor saves changes in back-office
   → API saves (< 1s)
   → User sees "✓ Saved" immediately
   → Webhook triggers background rebuild
   → Public site shows fresh content via client-side fetch
   → HTML rebuild completes ~31s later (for SEO cache)
   ```

2. **When to Trigger Webhook:**
   - Still trigger webhook for all static page updates
   - Webhook ensures SEO-friendly HTML is updated
   - HTML rebuild happens in background
   - Users don't wait for rebuild to complete

3. **Example API Call:**
   ```bash
   # Back-office triggers this after saving content
   curl -X POST http://localhost:3001/rebuild \
     -H "Content-Type: application/json" \
     -d '{
       "journalCode": "epijinfo",
       "resourceType": "static-page",
       "pageName": "about"
     }'
   # Returns 202 (accepted) immediately
   # Build runs in background
   ```

### Benefits

| Metric | Before | After |
|--------|--------|-------|
| **Editor perceived time** | 31s | < 2s |
| **Public visitor time** | Instant | < 1s |
| **SEO impact** | ✅ | ✅ (preserved) |
| **Content freshness** | After rebuild | Immediate |
| **HTML static cache** | 31s | 31s (async) |

### Technical Implementation

**Client-Side Hook:**
```javascript
// src/hooks/useClientSideFetch.ts
// Automatically fetches fresh data on page load
// Falls back to static HTML if API fails
```

**Usage in Components:**
```javascript
const { data, isUpdating } = useClientSideFetch({
  fetchFn: () => fetchAboutPage(rvcode),
  initialData: staticHtmlData,
  enabled: !!rvcode
});
```

### Best Practices

1. **Always trigger webhook rebuilds**: Even though users see updates immediately via API, the webhook ensures SEO-friendly HTML is updated for search engines and AI bots.

2. **Don't wait for rebuild completion**: The back-office can return success immediately after API save without waiting for the webhook response.

3. **Monitor both systems**:
   - API health (for immediate updates)
   - Webhook health (for SEO cache updates)

4. **Graceful degradation**: If API fails, users still see the static HTML content (slightly outdated but functional).

### Documentation

For complete details on the hybrid rendering system:
- **Implementation Guide**: `HYBRID_RENDERING.md`
- **Project Instructions**: `CLAUDE.md` (section "Hybrid Rendering Architecture")

---

## Getting Started

### Prerequisites

- Node.js >= 18.17.0
- Journal environment files in `external-assets/.env.local.<journal-code>`
- Valid journal codes in `external-assets/journals.txt`

### Installation

No additional installation required. The webhook server uses existing project dependencies.

### Starting the Server

```bash
# Standard startup
npm run webhook

# Or directly
node scripts/webhook-server.js

# Custom port
WEBHOOK_PORT=8080 npm run webhook

# With deployment script
DEPLOY_SCRIPT=/path/to/deploy.sh npm run webhook

# Custom queue limit
MAX_QUEUE_PER_JOURNAL=20 npm run webhook
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBHOOK_PORT` | 3001 | Server listen port |
| `DEPLOY_SCRIPT` | null | Path to deployment script (optional) |
| `MAX_QUEUE_PER_JOURNAL` | 10 | Maximum queued builds per journal |

---

## API Reference

### Base URL

```
http://localhost:3001
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rebuild` | Trigger a resource rebuild |
| GET | `/rebuild/:buildId` | Track build progress |
| GET | `/status` | Get global server status |
| GET | `/health` | Health check |
| POST | `/rebuild-article` | Legacy endpoint (deprecated) |

---

### POST /rebuild

Trigger a rebuild for a specific resource or entire journal.

**Request Body:**

```json
{
  "journalCode": "epijinfo",
  "resourceType": "article",
  "resourceId": "12345",
  "deploy": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `journalCode` | string | ✅ Yes | Journal code (e.g., 'epijinfo', 'dmtcs') |
| `resourceType` | string | ✅ Yes | Resource type: 'article', 'volume', 'section', 'static-page', 'full' |
| `resourceId` | string | Conditional | Required for article/volume/section, not for static-page/full |
| `pageName` | string | Conditional | Required for static-page (e.g., 'about', 'news', 'home') |
| `deploy` | boolean | ❌ No | Trigger deployment script after build (default: false) |

**Success Response (202 Accepted):**

```json
{
  "status": "processing",
  "statusCode": 202,
  "message": "Build started for article 12345",
  "data": {
    "buildId": "epijinfo-article-12345-1729234567890",
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "12345",
    "deploy": false,
    "queuePosition": 0,
    "estimatedWaitTime": "0s",
    "trackingUrl": "/rebuild/epijinfo-article-12345-1729234567890",
    "outputPath": "dist/epijinfo/articles/12345"
  },
  "queue": {
    "thisJournal": {
      "active": 1,
      "queued": 0
    },
    "global": {
      "activeBuilds": 2,
      "queuedBuilds": 3
    }
  },
  "timestamp": "2025-10-18T14:23:45.123Z"
}
```

**Queued Response (203 Non-Authoritative):**

```json
{
  "status": "queued",
  "statusCode": 203,
  "message": "Build queued (position 1)",
  "data": {
    "buildId": "epijinfo-article-456-1729234567890",
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "456",
    "deploy": false,
    "queuePosition": 0,
    "estimatedWaitTime": "30s",
    "trackingUrl": "/rebuild/epijinfo-article-456-1729234567890"
  },
  "queue": {
    "thisJournal": {
      "active": 1,
      "queued": 1
    },
    "global": {
      "activeBuilds": 2,
      "queuedBuilds": 4
    }
  },
  "timestamp": "2025-10-18T14:23:46.123Z"
}
```

---

### GET /rebuild/:buildId

Track the progress and status of a specific build.

**Response (Build in Progress):**

```json
{
  "status": "processing",
  "buildId": "epijinfo-article-12345-1729234567890",
  "data": {
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "12345",
    "deploy": false,
    "queuedAt": "2025-10-18T14:23:45.000Z",
    "startedAt": "2025-10-18T14:23:45.100Z",
    "completedAt": null,
    "duration": "15.3s (ongoing)",
    "outputPath": "dist/epijinfo/articles/12345",
    "deployed": false
  },
  "progress": {
    "phase": "building",
    "percentage": 50
  },
  "logs": [
    "Build started...",
    "Generating pages...",
    "Compiling..."
  ],
  "error": null,
  "timestamp": "2025-10-18T14:24:00.123Z"
}
```

**Response (Build Completed):**

```json
{
  "status": "completed",
  "buildId": "epijinfo-article-12345-1729234567890",
  "data": {
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "12345",
    "deploy": false,
    "queuedAt": "2025-10-18T14:23:45.000Z",
    "startedAt": "2025-10-18T14:23:45.100Z",
    "completedAt": "2025-10-18T14:24:12.456Z",
    "duration": "27.3s",
    "outputPath": "dist/epijinfo/articles/12345",
    "deployed": false
  },
  "progress": {
    "phase": "completed",
    "percentage": 100
  },
  "logs": ["..."],
  "error": null,
  "timestamp": "2025-10-18T14:24:12.456Z"
}
```

---

### GET /status

Get global server status, active builds, and statistics.

**Response:**

```json
{
  "status": "ok",
  "uptime": "5h 23m",
  "builds": {
    "active": 2,
    "queued": 3,
    "total": 147,
    "successful": 142,
    "failed": 3,
    "apiErrors": 2
  },
  "activeBuilds": [
    {
      "journalCode": "epijinfo",
      "buildId": "epijinfo-article-123-1729234567890",
      "resourceType": "article",
      "resourceId": "123",
      "phase": "building",
      "startedAt": "2025-10-18T14:23:45.100Z"
    },
    {
      "journalCode": "dmtcs",
      "buildId": "dmtcs-full-full-1729234568000",
      "resourceType": "full",
      "resourceId": null,
      "phase": "building",
      "startedAt": "2025-10-18T14:24:00.000Z"
    }
  ],
  "queuedBuilds": [
    {
      "journalCode": "epijinfo",
      "buildId": "epijinfo-article-456-1729234569000",
      "resourceType": "article",
      "resourceId": "456",
      "queuePosition": 1,
      "queuedAt": "2025-10-18T14:24:15.000Z"
    }
  ],
  "byJournal": {
    "epijinfo": {
      "active": {
        "buildId": "epijinfo-article-123-1729234567890",
        "resourceType": "article",
        "resourceId": "123",
        "phase": "building"
      },
      "queued": 1
    },
    "dmtcs": {
      "active": {
        "buildId": "dmtcs-full-full-1729234568000",
        "resourceType": "full",
        "resourceId": null,
        "phase": "building"
      },
      "queued": 0
    }
  },
  "timestamp": "2025-10-18T14:25:00.123Z"
}
```

---

### GET /health

Simple health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "message": "Webhook server is operational",
  "uptime": "5h 23m",
  "timestamp": "2025-10-18T14:25:00.123Z"
}
```

---

## HTTP Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| **200** | OK | Health check successful |
| **202** | Accepted | Build started immediately |
| **203** | Non-Authoritative | Build queued for later execution |
| **400** | Bad Request | Invalid parameters (missing fields, invalid types) |
| **404** | Not Found | Invalid journal code or build ID not found |
| **422** | Unprocessable Entity | API error during build (existing files preserved) |
| **503** | Service Unavailable | Queue full for this journal (max 10) |
| **500** | Internal Server Error | Unexpected server error |

---

## Concurrency Management

### Locking Mechanism

**Per-Journal Isolation:**
- Each journal has independent build state
- Only one build per journal can execute at a time
- Prevents file conflicts in `dist/<journal>/` directory
- Prevents `.env.local` file conflicts

### Queue Management

**Queue Limits:**
- Maximum 10 queued builds per journal (configurable)
- Prevents resource exhaustion from excessive requests
- Returns 503 status when queue is full

**Queue Processing:**
- Automatic: When active build completes, next in queue starts
- FIFO: First in, first out processing
- Position tracking: Clients know their queue position
- Estimated wait time: Rough estimate based on position

### Example: Concurrent Requests

```bash
# T0: Start epijinfo article build
curl -X POST http://localhost:3001/rebuild \
  -d '{"journalCode":"epijinfo","resourceType":"article","resourceId":"123"}'
# Response: 202 (starts immediately)

# T1: Request another epijinfo article (same journal)
curl -X POST http://localhost:3001/rebuild \
  -d '{"journalCode":"epijinfo","resourceType":"article","resourceId":"456"}'
# Response: 203 (queued, position 1)

# T2: Request dmtcs volume (different journal)
curl -X POST http://localhost:3001/rebuild \
  -d '{"journalCode":"dmtcs","resourceType":"volume","resourceId":"42"}'
# Response: 202 (starts immediately - different journal!)

# T3: Request 11th build for epijinfo (queue full)
curl -X POST http://localhost:3001/rebuild \
  -d '{"journalCode":"epijinfo","resourceType":"full"}'
# Response: 503 (queue full, max 10)
```

---

## Error Handling

### API Errors

**Problem:** API returns 500, timeout, or is unreachable during build.

**Solution:** Preserve existing files instead of creating empty/corrupt pages.

**How it Works:**
1. Rebuild script detects API error (HTTP 500, ETIMEDOUT, ECONNREFUSED)
2. Exits with code 2 (distinct from build errors)
3. Webhook server receives exit code 2
4. Returns 422 status with detailed error information
5. Existing static files remain untouched

**Example Response:**

```json
{
  "status": "failed",
  "statusCode": 422,
  "buildId": "epijinfo-article-12345-1729234567890",
  "data": {
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "12345",
    "errorType": "api_error",
    "preservedExisting": true
  },
  "error": "API error: Unable to fetch resource data",
  "message": "Build failed due to API error - existing files preserved",
  "timestamp": "2025-10-18T14:24:12.456Z"
}
```

### Build Errors

**Problem:** Next.js build fails (syntax error, missing dependencies, etc.)

**Exit Code:** 1

**Response:** 500 Internal Server Error with build logs

### Validation Errors

**Problem:** Invalid parameters (missing journalCode, invalid resourceType, etc.)

**Exit Code:** 3 (for rebuild script)

**Response:** 400 Bad Request with error details

---

## Usage Examples

### Available Static Pages

The following static pages can be rebuilt individually using `resourceType: "static-page"`:

| Page Name | Route | Description |
|-----------|-------|-------------|
| `home` | `/` | Homepage |
| `about` | `/about` | About page |
| `news` | `/news` | News page |
| `credits` | `/credits` | Credits page |
| `authors` | `/authors` | Authors list |
| `boards` | `/boards` | Editorial boards |
| `articles` | `/articles` | Articles list |
| `articles-accepted` | `/articles-accepted` | Accepted articles |
| `volumes` | `/volumes` | Volumes list |
| `sections` | `/sections` | Sections list |
| `for-authors` | `/for-authors` | For authors page |
| `search` | `/search` | Search page |
| `statistics` | `/statistics` | Statistics page |

### Basic Article Rebuild

```bash
curl -X POST http://localhost:3001/rebuild \
  -H "Content-Type: application/json" \
  -d '{
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "12345"
  }'
```

### Volume Rebuild with Deployment

```bash
curl -X POST http://localhost:3001/rebuild \
  -H "Content-Type: application/json" \
  -d '{
    "journalCode": "dmtcs",
    "resourceType": "volume",
    "resourceId": "42",
    "deploy": true
  }'
```

### Static Page Rebuild

```bash
curl -X POST http://localhost:3001/rebuild \
  -H "Content-Type: application/json" \
  -d '{
    "journalCode": "epijinfo",
    "resourceType": "static-page",
    "pageName": "about"
  }'
```

### Full Journal Rebuild

```bash
curl -X POST http://localhost:3001/rebuild \
  -H "Content-Type: application/json" \
  -d '{
    "journalCode": "ops",
    "resourceType": "full"
  }'
```

### Track Build Progress

```bash
# Get buildId from POST /rebuild response
BUILD_ID="epijinfo-article-12345-1729234567890"

# Poll for status
curl http://localhost:3001/rebuild/$BUILD_ID

# Check every 5 seconds until completed
watch -n 5 curl http://localhost:3001/rebuild/$BUILD_ID
```

### Command Line (CLI) Examples

You can also trigger rebuilds directly from the command line using the rebuild script:

```bash
# Rebuild a specific article
node scripts/rebuild-resource.js --journal epijinfo --type article --id 12345

# Rebuild a specific volume
node scripts/rebuild-resource.js --journal dmtcs --type volume --id 42

# Rebuild a specific section
node scripts/rebuild-resource.js --journal ops --type section --id 7

# Rebuild a specific static page
node scripts/rebuild-resource.js --journal epijinfo --type static-page --page about

# Full journal rebuild
node scripts/rebuild-resource.js --journal epijinfo --type full

# Using npm scripts
npm run rebuild -- --journal epijinfo --type static-page --page news
```

### Monitor Server Status

```bash
# Get global status
curl http://localhost:3001/status

# Pretty print with jq
curl http://localhost:3001/status | jq

# Check specific journal
curl http://localhost:3001/status | jq '.byJournal.epijinfo'
```

---

## CMS Integration

### Node.js / JavaScript

```javascript
// Example: Trigger rebuild when article is updated
async function onArticleUpdate(article) {
  const response = await fetch('http://webhook-server:3001/rebuild', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journalCode: article.journalCode,
      resourceType: 'article',
      resourceId: article.id.toString(),
      deploy: true
    })
  });

  const result = await response.json();

  if (result.status === 'processing') {
    console.log(`Build started: ${result.data.buildId}`);

    // Track progress
    const buildId = result.data.buildId;
    const checkProgress = setInterval(async () => {
      const progress = await fetch(`http://webhook-server:3001/rebuild/${buildId}`)
        .then(r => r.json());

      if (progress.status === 'completed') {
        console.log('Build completed successfully!');
        clearInterval(checkProgress);
      } else if (progress.status === 'failed') {
        console.error('Build failed:', progress.error);
        clearInterval(checkProgress);
      }
    }, 5000); // Check every 5 seconds

  } else if (result.status === 'queued') {
    console.log(`Build queued at position ${result.data.queuePosition + 1}`);
  }
}
```

### PHP

```php
<?php
// Example: Trigger rebuild when content changes
function triggerRebuild($journalCode, $resourceType, $resourceId) {
    $url = 'http://webhook-server:3001/rebuild';
    $data = [
        'journalCode' => $journalCode,
        'resourceType' => $resourceType,
        'resourceId' => $resourceId,
        'deploy' => true
    ];

    $options = [
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode($data)
        ]
    ];

    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    $result = json_decode($response, true);

    if ($result['status'] === 'processing') {
        error_log("Build started: " . $result['data']['buildId']);
    } else if ($result['status'] === 'queued') {
        error_log("Build queued at position " . ($result['data']['queuePosition'] + 1));
    }

    return $result;
}

// Usage
triggerRebuild('epijinfo', 'article', '12345');
?>
```

### Python

```python
import requests
import time

def trigger_rebuild(journal_code, resource_type, resource_id=None, deploy=False):
    """Trigger a resource rebuild via webhook."""
    url = 'http://webhook-server:3001/rebuild'
    payload = {
        'journalCode': journal_code,
        'resourceType': resource_type,
        'deploy': deploy
    }

    if resource_id:
        payload['resourceId'] = str(resource_id)

    response = requests.post(url, json=payload)
    result = response.json()

    if result['status'] == 'processing':
        print(f"Build started: {result['data']['buildId']}")
        return track_build(result['data']['buildId'])
    elif result['status'] == 'queued':
        print(f"Build queued at position {result['data']['queuePosition'] + 1}")
        return result
    else:
        print(f"Error: {result['message']}")
        return result

def track_build(build_id, interval=5):
    """Track build progress until completion."""
    url = f'http://webhook-server:3001/rebuild/{build_id}'

    while True:
        response = requests.get(url)
        result = response.json()

        if result['status'] == 'completed':
            print(f"Build completed in {result['data']['duration']}")
            return result
        elif result['status'] == 'failed':
            print(f"Build failed: {result['error']}")
            return result
        else:
            print(f"Building... ({result['progress']['phase']})")
            time.sleep(interval)

# Usage
trigger_rebuild('epijinfo', 'article', '12345', deploy=True)
```

---

## Monitoring

### Logs

**Log File Location:**
```
scripts/webhook-logs.txt
```

**Log Format:**
```
[2025-10-18T14:23:45.123Z] Webhook server started on port 3001
[2025-10-18T14:24:00.456Z] Build epijinfo-article-12345-1729234567890 started immediately
[2025-10-18T14:24:27.789Z] Build epijinfo-article-12345-1729234567890 completed successfully in 27.33s
```

**Viewing Logs:**
```bash
# Follow logs in real-time
tail -f scripts/webhook-logs.txt

# Search for specific journal
grep "epijinfo" scripts/webhook-logs.txt

# Show recent errors
grep -i "error\|failed" scripts/webhook-logs.txt | tail -20
```

### Metrics

**Key Metrics from /status endpoint:**

- `builds.total` - Total builds processed
- `builds.successful` - Successfully completed builds
- `builds.failed` - Failed builds (build errors)
- `builds.apiErrors` - API error builds (preserved existing)
- `uptime` - Server uptime

**Example Monitoring Script:**

```bash
#!/bin/bash
# monitor-webhook.sh

while true; do
  STATUS=$(curl -s http://localhost:3001/status)

  ACTIVE=$(echo $STATUS | jq '.builds.active')
  QUEUED=$(echo $STATUS | jq '.builds.queued')
  SUCCESS=$(echo $STATUS | jq '.builds.successful')
  FAILED=$(echo $STATUS | jq '.builds.failed')

  echo "[$(date)] Active: $ACTIVE, Queued: $QUEUED, Success: $SUCCESS, Failed: $FAILED"

  sleep 10
done
```

---

## Deployment Configuration

### Setting Up Deployment Script

**1. Create deployment script:**

```bash
#!/bin/bash
# deploy.sh

OUTPUT_PATH=$1

if [ -z "$OUTPUT_PATH" ]; then
  echo "Error: Output path required"
  exit 1
fi

# Example: rsync to production server
rsync -avz --delete "$OUTPUT_PATH/" user@production:/var/www/html/

# Or: Copy to CDN, S3, etc.
# aws s3 sync "$OUTPUT_PATH" s3://my-bucket/

echo "Deployment complete: $OUTPUT_PATH"
exit 0
```

**2. Make executable:**

```bash
chmod +x deploy.sh
```

**3. Configure webhook server:**

```bash
DEPLOY_SCRIPT=/path/to/deploy.sh npm run webhook
```

**4. Trigger build with deployment:**

```bash
curl -X POST http://localhost:3001/rebuild \
  -H "Content-Type: application/json" \
  -d '{
    "journalCode": "epijinfo",
    "resourceType": "article",
    "resourceId": "12345",
    "deploy": true
  }'
```

### Example Deployment Scripts

**rsync to Multiple Servers:**

```bash
#!/bin/bash
OUTPUT_PATH=$1
SERVERS=("server1.example.com" "server2.example.com")

for SERVER in "${SERVERS[@]}"; do
  echo "Deploying to $SERVER..."
  rsync -avz --delete "$OUTPUT_PATH/" user@$SERVER:/var/www/html/
done
```

**AWS S3 with CloudFront Invalidation:**

```bash
#!/bin/bash
OUTPUT_PATH=$1
BUCKET="s3://my-bucket"
DISTRIBUTION_ID="EXXXXXXXXXXXXX"

# Sync to S3
aws s3 sync "$OUTPUT_PATH" "$BUCKET" --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"
```

---

## Troubleshooting

### Common Issues

#### 1. Build Stuck in Queue

**Symptoms:**
- Build shows `status: "queued"` for extended period
- Queue position not decreasing

**Diagnosis:**
```bash
# Check active builds
curl http://localhost:3001/status | jq '.activeBuilds'

# Check server logs
tail -f scripts/webhook-logs.txt
```

**Solutions:**
- Check if active build is hung (look for stalled builds in logs)
- Restart webhook server if necessary
- Check for build errors in logs

#### 2. API Errors During Build

**Symptoms:**
- Build fails with `status: "failed"`, `phase: "api_error"`
- Error message: "API error: Unable to fetch resource data"

**Diagnosis:**
```bash
# Check build details
curl http://localhost:3001/rebuild/<buildId>

# Test API directly
curl https://api.episciences.org/...
```

**Solutions:**
- Verify API is accessible from build server
- Check API credentials in `.env.local.<journal>` file
- Ensure network connectivity
- Check API rate limits

#### 3. Queue Full (503 Errors)

**Symptoms:**
- Webhook returns 503 status
- Error: "Queue full for journal X (max 10)"

**Diagnosis:**
```bash
# Check queue length
curl http://localhost:3001/status | jq '.byJournal.<journal>.queued'
```

**Solutions:**
- Wait for queue to clear
- Increase `MAX_QUEUE_PER_JOURNAL` environment variable
- Investigate why builds are queuing (slow builds, too many requests)

#### 4. Build Fails Immediately

**Symptoms:**
- Build fails within seconds
- Exit code 3 (validation error)

**Diagnosis:**
Check webhook server logs and build response:
```bash
tail -f scripts/webhook-logs.txt
```

**Solutions:**
- Verify journal environment file exists: `external-assets/.env.local.<journal>`
- Check journal code is valid (listed in `external-assets/journals.txt`)
- Ensure all required parameters are provided

#### 5. Deployment Fails

**Symptoms:**
- Build completes successfully
- `deployed: false` in response
- Deployment errors in logs

**Diagnosis:**
```bash
# Check build details
curl http://localhost:3001/rebuild/<buildId> | jq '.data.deployed'

# Test deployment script manually
/path/to/deploy.sh dist/epijinfo/
```

**Solutions:**
- Verify `DEPLOY_SCRIPT` path is correct
- Check deployment script has execute permissions (`chmod +x`)
- Test deployment script manually
- Check deployment script logs/errors

### Debug Mode

**Enable verbose logging:**

Modify `scripts/webhook-server.js` to add debug logs:
```javascript
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Debug info:', ...);
}
```

**Run with debug:**
```bash
DEBUG=true npm run webhook
```

### Health Checks

**Verify server is running:**
```bash
curl http://localhost:3001/health
```

**Check if port is listening:**
```bash
lsof -i :3001
# or
netstat -an | grep 3001
```

**Test rebuild script directly:**
```bash
node scripts/rebuild-resource.js \
  --journal epijinfo \
  --type article \
  --id 12345
```

---

## Best Practices

1. **Always specify `journalCode`**: Required for proper isolation
2. **Use build IDs for tracking**: Store buildId from response for progress tracking
3. **Handle queue scenarios**: Implement retry logic for 503 responses
4. **Monitor API health**: Regularly check API availability to prevent build failures
5. **Set appropriate timeouts**: Don't expect instant completion for full rebuilds
6. **Log webhook calls**: Keep audit trail of rebuild requests
7. **Test deployment scripts**: Verify deployment scripts work before enabling auto-deploy
8. **Monitor queue lengths**: Set up alerts for consistently full queues
9. **Use structured logging**: Parse JSON logs for monitoring and alerting
10. **Implement error handling**: Handle all status codes appropriately in client code

---

## Support

For issues, questions, or feature requests:
- Check logs: `scripts/webhook-logs.txt`
- Review API responses for error details
- Test components individually (rebuild script, deployment script)
- Consult this documentation for troubleshooting steps

---

**Last Updated:** 2025-10-18
**Version:** 2.0.0
