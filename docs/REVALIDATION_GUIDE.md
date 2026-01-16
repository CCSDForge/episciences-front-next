# Revalidation & Security Guide

This document details how to configure webhook security and how to trigger revalidation for different content types (Articles, Pages, Volumes, etc.).

## 1. Security Configuration

Webhook security relies on 3 levels. Variables must be defined in the `.env` or `.env.local` file.

### A. IP Restriction (Network Level)

Define the IP addresses authorized to call the webhook (e.g., your Symfony server IP).

```env
# List of IPs separated by commas
ALLOWED_IPS=127.0.0.1,192.168.1.50,10.0.0.1
```

### B. Tokens per Journal (Recommended)

You can define a specific token for each journal. The format is `REVALIDATION_TOKEN_[JOURNAL_CODE_UPPERCASE]`.
Hyphens `-` in the journal code must be replaced by underscores `_`.

```env
# For the journal 'epijinfo'
REVALIDATION_TOKEN_EPIJINFO=long_and_complex_secret_123

# For the journal 'jsedi-preprod'
REVALIDATION_TOKEN_JSEDI_PREPROD=other_secret_456
```

### C. Global Token (Fallback)

A fallback token if no specific token is found.

```env
REVALIDATION_SECRET=my_global_default_secret
```

---

## 2. Using the Webhook (Symfony Side)

To invalidate the cache, perform a **POST** request to `/api/revalidate`.

### Required Headers

- `Content-Type: application/json`
- `x-episciences-token`: The token corresponding to the journal (or the global one).

### Body Structure (JSON)

| Field       | Required | Description                                                      |
| ----------- | -------- | ---------------------------------------------------------------- |
| `journalId` | **YES**  | The journal code (e.g., `epijinfo`). Used to validate the token. |
| `tag`       | **YES**  | The cache tag to invalidate (see list below).                    |

### Call Example (PHP / Symfony)

```php
$client->request('POST', 'https://journal.episciences.org/api/revalidate', [
    'headers' => [
        'x-episciences-token' => $_ENV['REVALIDATION_TOKEN_EPIJINFO'],
    ],
    'json' => [
        'journalId' => 'epijinfo',
        'tag' => 'article-123', // Invalidates the specific article
    ],
]);
```

---

## 3. Revalidation Strategy by Content

Here is which tag to call depending on what you modified in the Back-Office.

### 📄 Static Pages (About, Credits, etc.)

To update a specific content page.

- **Target:** Page `/about`, `/credits`, etc.
- **Specific Tag:** `page-[page_code]` (e.g., `page-about`, `page-credits`)
- **Journal Tag:** `page-[page_code]-[journalId]` (e.g., `page-about-epijinfo`)
- **Action:**
  ```json
  { "journalId": "epijinfo", "tag": "page-about-epijinfo" }
  ```

### 📝 Articles

When an article is modified, published, or unpublished.

- **Target:** The article detail page AND the lists where it appears.
- **Unit Tag:** `article-[ID]` (e.g., `article-4256`)
- **Global Journal Tag:** `articles-[journalId]` (to refresh article lists)
- **Recommendation:** It is often necessary to invalidate the article AND the list. You can make two calls or use the collection tag.
- **Action (Article only):**
  ```json
  { "journalId": "epijinfo", "tag": "article-4256" }
  ```
- **Action (Refresh all):**
  ```json
  { "journalId": "epijinfo", "tag": "articles-epijinfo" }
  ```

### 📚 Volumes & Sections

To update a volume (title, intro) or the table of contents.

- **Target:** Volume detail page `/volumes/10`.
- **Unit Tag:** `volume-[ID]` (e.g., `volume-12`)
- **Global Tag:** `volumes-[journalId]`
- **Action:**
  ```json
  { "journalId": "epijinfo", "tag": "volume-12" }
  ```

### 📰 News

- **Target:** Homepage and `/news` page.
- **Tag:** `news-[journalId]`
- **Action:**
  ```json
  { "journalId": "epijinfo", "tag": "news-epijinfo" }
  ```

### 🏠 Full Homepage

To update everything on the homepage (stats, edito, latest articles).

- **Involved Tags:** `home`, `stats-[journalId]`, `news-[journalId]`, `articles-[journalId]`.
- **Note:** The homepage is composed of several blocks. Invalidate the specific block that changed.

---

## 4. Summary of Tags and Concrete Examples

Here is the comprehensive list of tags to use. Replace `{rvcode}` with the journal code (e.g., `epijinfo`) and `{id}` with the numeric identifier.

### 📝 Single Article

Update of a title, abstract, or metadata of a specific article.

- **Tag:** `article-{id}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "article-4256"
  }
  ```

### 📑 Articles List

Update of the article list (new paper published), impacts Homepage and Articles page.

- **Tag:** `articles-{rvcode}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "articles-epijinfo"
  }
  ```

### 📚 Single Volume

Update of the title or description of a volume.

- **Tag:** `volume-{id}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "volume-12"
  }
  ```

### 📦 Volumes List

Addition of a new volume to the global list.

- **Tag:** `volumes-{rvcode}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "volumes-epijinfo"
  }
  ```

### 📰 News

Addition or modification of news on Homepage or News page.

- **Tag:** `news-{rvcode}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "news-epijinfo"
  }
  ```

### 📄 Content Page (About, Credits...)

Update of the text of a static page. Common codes are: `about`, `credits`, `mentions-legales`.

- **Tag:** `page-{code}-{rvcode}`
- **Example Payload (About Page):**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "page-about-epijinfo"
  }
  ```

### 👥 Editorial Board (Board)

Update of the board members list.

- **Tag:** `members-{rvcode}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "members-epijinfo"
  }
  ```

### 📊 Statistics

Update of figures on the Homepage.

- **Tag:** `stats-{rvcode}`
- **Example Payload:**
  ```json
  {
    "journalId": "epijinfo",
    "tag": "stats-epijinfo"
  }
  ```

### 🗺️ Sitemap (XML)

The `sitemap.xml` is automatically generated and cached. It uses the same cache tags as the content lists.

- **Automatic Update:**
  - Invalidating `articles-{rvcode}` will update the sitemap with new articles.
  - Invalidating `volumes-{rvcode}` will update the sitemap with new volumes.
- **Specific Tag:** You can also force a sitemap-only update (though rarely needed).
  - **Tag:** `sitemap-{rvcode}`
  - **Action:**
    ```json
    { "journalId": "epijinfo", "tag": "sitemap-epijinfo" }
    ```

---

## 5. Architecture Recommendation (Symfony)

To ensure system robustness, especially during mass imports or frequent modifications, it is **strongly recommended** not to call the webhook synchronously (blocking).

### Using Symfony Messenger

Use the **Symfony Messenger** component to offload API calls to a queue.

**Benefits:**

1.  **Performance:** The user does not wait for the Next.js response during saving.
2.  **Reliability (Retries):** If Next.js is restarting or temporarily unavailable, Symfony Messenger will automatically retry sending (using _Exponential Backoff_) until success.

**Suggested Workflow:**

1.  An `EntityListener` detects the change (e.g., `postUpdate` on an Article).
2.  Dispatch a `RevalidateCacheMessage` to the bus.
3.  A Worker consumes the message and performs the HTTP `POST` call to Next.js.
4.  In case of error (HTTP 500/503), the message is placed back in the queue for a later retry.

---

## 6. Multi-Server Deployment

When deploying Next.js across multiple servers behind a load balancer, cache invalidation must propagate to all instances. The revalidation API supports automatic broadcast to peer servers.

### The Problem

Each Next.js instance maintains its own local ISR cache. Without coordination:

```
┌─────────────────┐
│  Load Balancer  │
└───────┬─────────┘
        │
   ┌────┼────┬────┐
   │    │    │    │
  VM1  VM2  VM3  VM4
   │    │    │    │
Cache1 Cache2 Cache3 Cache4
```

When a webhook hits VM2, only VM2 clears its cache. VM1, VM3, and VM4 continue serving stale content until their ISR period expires (up to 7 days for articles).

### The Solution: Peer Broadcast

Configure each server to broadcast revalidation requests to its peers.

```
Webhook → VM2 → Local revalidation
              → Broadcast to VM1, VM3, VM4
```

### Configuration

On each server, set the `PEER_SERVERS` environment variable with the URLs of all OTHER servers (not itself):

```env
# VM1 configuration
PEER_SERVERS="http://vm2:3000,http://vm3:3000,http://vm4:3000"

# VM2 configuration
PEER_SERVERS="http://vm1:3000,http://vm3:3000,http://vm4:3000"

# VM3 configuration
PEER_SERVERS="http://vm1:3000,http://vm2:3000,http://vm4:3000"

# VM4 configuration
PEER_SERVERS="http://vm1:3000,http://vm2:3000,http://vm3:3000"
```

### How It Works

1. **Original request arrives** at one server (e.g., VM2)
2. VM2 **validates credentials** (IP whitelist, rate limit, token)
3. VM2 **revalidates its local cache**
4. VM2 **broadcasts** to all peer servers with header `x-forwarded-revalidation: true`
5. Peer servers **skip IP/rate-limit checks** for forwarded requests (token still required)
6. Peer servers **revalidate their local caches**
7. Original server **returns success** (broadcast runs asynchronously)

### Response Format

The API response includes a `broadcast` field indicating if broadcast was triggered:

```json
{
  "revalidated": true,
  "now": 1704067200000,
  "journalId": "epijinfo",
  "tag": "article-123",
  "broadcast": true
}
```

### Logs

Monitor broadcast activity in server logs:

```
[Revalidate API] Revalidating tag: article-123
[Revalidate API] Broadcast complete: 3/3 peers updated
```

If a peer is unavailable:

```
[Revalidate API] Broadcast complete: 2/3 peers updated, 1 failed
[Revalidate API] Broadcast to http://vm3:3000 failed: [Error details]
```

### Network Requirements

- Peer servers must be able to reach each other on port 3000 (or your configured port)
- If using Apache as reverse proxy, peers can communicate via internal IPs
- Ensure firewall rules allow inter-server communication

### Important Notes

1. **Single-server deployments**: Leave `PEER_SERVERS` empty or unset
2. **Broadcast is fire-and-forget**: The API returns immediately without waiting for peer responses
3. **Token is required**: Peer servers still validate the authentication token
4. **No infinite loops**: The `x-forwarded-revalidation` header prevents cascading broadcasts
