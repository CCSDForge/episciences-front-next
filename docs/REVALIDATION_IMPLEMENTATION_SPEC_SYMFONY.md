# Specification: Next.js Cache Revalidation — Symfony Implementation

**Purpose** — Self-contained specification for implementing Next.js on-demand cache
revalidation in the Episciences **Symfony** application. A developer or LLM reading this
document should be able to produce production-ready code without consulting any other source.

> For the ZF1 implementation see [REVALIDATION_IMPLEMENTATION_SPEC_ZF1.md](./REVALIDATION_IMPLEMENTATION_SPEC_ZF1.md).
> For the operator guide (security config, Nginx, TTL) see [REVALIDATION_GUIDE.md](./REVALIDATION_GUIDE.md).

---

## 1. Architectural Overview

When data changes in the Symfony backend, the Next.js frontend must drop the relevant
cache entries. The mechanism is an authenticated HTTP `POST` to `/api/revalidate`.

```
Symfony  →  Messenger bus  →  MessageHandler  →  POST /api/revalidate  →  Next.js  →  revalidateTag()
```

### Design Constraints

| Constraint                                     | Solution                          |
| ---------------------------------------------- | --------------------------------- |
| Must not block the web request                 | Symfony Messenger async transport |
| Must log failures                              | Monolog (built-in)                |
| Must not crash on network error                | try/catch in service              |
| Must use journal-specific token when available | Token resolution in service       |
| Must retry on 5xx / network errors             | Messenger retry strategy          |
| CLI for manual revalidation                    | Symfony Console command           |

---

## 2. Environment Variables

```env
NEXT_BASE_URL=https://episciences.org
NEXT_REVALIDATION_SECRET=global_fallback_secret

# Per-journal tokens — uppercase, hyphens replaced by underscores
NEXT_REVALIDATION_TOKEN_EPIJINFO=secret_for_epijinfo
NEXT_REVALIDATION_TOKEN_JTAM=secret_for_jtam

# Messenger transport (pick one — see §5)
VALKEY_MESSENGER_DSN=redis://localhost:6379/messages
```

> **Naming note** — On the Next.js side these are `REVALIDATION_SECRET` and
> `REVALIDATION_TOKEN_*` (no `NEXT_` prefix). The PHP prefix avoids collisions.

**Token resolution order:**

1. `NEXT_REVALIDATION_TOKEN_<JOURNAL_UPPERCASE>` (hyphens → underscores)
2. Fall back to `NEXT_REVALIDATION_SECRET`

---

## 3. HTTP Contract

```
POST {NEXT_BASE_URL}/api/revalidate
Content-Type: application/json
x-episciences-token: {token}

{
  "journalId": "{rvcode}",
  "tag":       "{cache-tag}"
}
```

**Success** — HTTP 200, body `{ "revalidated": true, ... }`

| Status | Meaning              | Action                                     |
| ------ | -------------------- | ------------------------------------------ |
| 200    | OK                   | —                                          |
| 400    | Bad payload          | Log, do not retry                          |
| 401    | Wrong token          | Log, do not retry                          |
| 403    | IP not whitelisted   | Log, do not retry                          |
| 429    | Rate limit           | Log, do not retry (caller should throttle) |
| 5xx    | Server/network error | Log, Messenger will retry automatically    |

Send **one POST per tag** — the endpoint accepts only a single tag per call.

---

## 4. Tag Reference

### 4.1 Articles

| Symfony event                                            | Tags to send                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Article metadata updated (title, abstract, authors, DOI) | `article-{id}`                                                    |
| Article moved to "Accepted" status                       | `article-{id}`, `articles-accepted-{rvcode}`                      |
| Article published (Accepted → Published)                 | `article-{id}`, `articles-{rvcode}`, `articles-accepted-{rvcode}` |
| Article unpublished or deleted                           | `article-{id}`, `articles-{rvcode}`                               |

### 4.2 Volumes & Issues

| Symfony event                                       | Tags to send                      |
| --------------------------------------------------- | --------------------------------- |
| Volume metadata updated (title, description, cover) | `volume-{id}`                     |
| Article added to / removed from a volume            | `volume-{id}`, `volumes-{rvcode}` |
| Article order changed inside a volume               | `volume-{id}`                     |
| New volume created or volume deleted                | `volumes-{rvcode}`                |

### 4.3 Sections

| Symfony event                                 | Tags to send                                 |
| --------------------------------------------- | -------------------------------------------- |
| Section metadata updated (title, description) | `section-{id}-{rvcode}`, `sections-{rvcode}` |
| Article added to / removed from a section     | `section-articles-{id}-{rvcode}`             |
| Article order changed inside a section        | `section-articles-{id}-{rvcode}`             |
| New section created or section deleted        | `sections-{rvcode}`                          |

### 4.4 News

| Symfony event                          | Tags to send    |
| -------------------------------------- | --------------- |
| News item created, updated, or deleted | `news-{rvcode}` |

### 4.5 Editorial Board

| Symfony event                                               | Tags to send       |
| ----------------------------------------------------------- | ------------------ |
| Board member added, updated (role, affiliation), or removed | `members-{rvcode}` |
| Board section structure changed (order, grouping)           | `boards-{rvcode}`  |

### 4.6 Editorial Pages

| Page                                   | Tags to send                         |
| -------------------------------------- | ------------------------------------ |
| About                                  | `about-{rvcode}`                     |
| Indexing editorial content             | `indexing-{rvcode}`                  |
| Indexation metrics                     | `indexation-{rvcode}`                |
| Credits                                | `credits-{rvcode}`                   |
| For editors                            | `for-editors-{rvcode}`               |
| For reviewers                          | `for-reviewers-{rvcode}`             |
| For conference organisers              | `for-conference-organisers-{rvcode}` |
| Proposing special issues               | `proposing-special-issues-{rvcode}`  |
| Acknowledgements                       | `acknowledgements-{rvcode}`          |
| For Authors: Editorial workflow        | `editorial-workflow-{rvcode}`        |
| For Authors: Ethical charter           | `ethical-charter-{rvcode}`           |
| For Authors: Prepare submission        | `prepare-submission-{rvcode}`        |
| Any other generic page (page_code = X) | `page-X-{rvcode}`                    |

### 4.7 Statistics

The homepage stats block and the full statistics page use **different** tags.

| Symfony event                | Tags to send                            |
| ---------------------------- | --------------------------------------- |
| Homepage stats block updated | `stats-{rvcode}`                        |
| Full statistics page updated | `statistics-{rvcode}`                   |
| Both updated at once         | `stats-{rvcode}`, `statistics-{rvcode}` |

### 4.8 Emergency — Broad Invalidation (All Journals)

Omit the `{rvcode}` suffix. Affects every journal — use only in emergencies.

| Tag                 | Effect                             |
| ------------------- | ---------------------------------- |
| `articles`          | All articles, all journals         |
| `articles-accepted` | All accepted lists, all journals   |
| `volumes`           | All volumes, all journals          |
| `news`              | All news, all journals             |
| `sections`          | All sections, all journals         |
| `boards`            | All board pages, all journals      |
| `members`           | All member lists, all journals     |
| `stats`             | All homepage stats, all journals   |
| `statistics`        | All statistics pages, all journals |
| `pages`             | All editorial pages, all journals  |

---

## 5. File Structure

```
src/
├── Service/
│   └── NextRevalidationService.php
├── Message/
│   └── RevalidateCacheMessage.php
├── MessageHandler/
│   └── RevalidateCacheMessageHandler.php
├── Command/
│   └── RevalidateCacheCommand.php
└── EventSubscriber/
    └── ArticleRevalidationSubscriber.php   (optional — see §9)
config/
├── packages/
│   └── messenger.yaml
└── services.yaml
```

---

## 6. NextRevalidationService

```php
<?php
// src/Service/NextRevalidationService.php

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class NextRevalidationService
{
    public function __construct(
        private readonly HttpClientInterface $client,
        private readonly LoggerInterface     $logger,
        private readonly string              $nextBaseUrl,
        private readonly string              $globalSecret,
    ) {}

    /**
     * Send a single revalidation request to the Next.js API.
     * Does NOT throw on failure — logs instead.
     */
    public function revalidate(string $journalId, string $tag): void
    {
        $token = $this->resolveToken($journalId);
        $url   = rtrim($this->nextBaseUrl, '/') . '/api/revalidate';

        try {
            $response = $this->client->request('POST', $url, [
                'headers' => [
                    'Content-Type'        => 'application/json',
                    'x-episciences-token' => $token,
                ],
                'json'    => ['journalId' => $journalId, 'tag' => $tag],
                'timeout' => 5,
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode !== 200) {
                $this->logger->warning('[Revalidation] Non-200 response', [
                    'status'  => $statusCode,
                    'journal' => $journalId,
                    'tag'     => $tag,
                    'body'    => $response->getContent(false),
                ]);
            }
        } catch (\Throwable $e) {
            $this->logger->error('[Revalidation] Request failed', [
                'journal' => $journalId,
                'tag'     => $tag,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send multiple tags in sequence.
     *
     * @param string[] $tags
     */
    public function revalidateMany(string $journalId, array $tags): void
    {
        foreach ($tags as $tag) {
            $this->revalidate($journalId, $tag);
        }
    }

    private function resolveToken(string $journalId): string
    {
        $envKey = 'NEXT_REVALIDATION_TOKEN_' . strtoupper(str_replace('-', '_', $journalId));
        return $_ENV[$envKey] ?? $this->globalSecret;
    }
}
```

Register in `config/services.yaml`:

```yaml
App\Service\NextRevalidationService:
  arguments:
    $nextBaseUrl: '%env(NEXT_BASE_URL)%'
    $globalSecret: '%env(NEXT_REVALIDATION_SECRET)%'
```

---

## 7. Messenger: Message & Handler

```php
<?php
// src/Message/RevalidateCacheMessage.php

namespace App\Message;

final class RevalidateCacheMessage
{
    public function __construct(
        public readonly string $journalId,
        public readonly string $tag,
    ) {}
}
```

```php
<?php
// src/MessageHandler/RevalidateCacheMessageHandler.php

namespace App\MessageHandler;

use App\Message\RevalidateCacheMessage;
use App\Service\NextRevalidationService;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class RevalidateCacheMessageHandler
{
    public function __construct(
        private readonly NextRevalidationService $revalidation,
    ) {}

    public function __invoke(RevalidateCacheMessage $message): void
    {
        $this->revalidation->revalidate($message->journalId, $message->tag);
    }
}
```

---

## 8. Messenger Transport Configuration

`config/packages/messenger.yaml` — pick one transport option.

**Option A — Valkey/Redis** (recommended: already in the infrastructure):

```yaml
framework:
  messenger:
    failure_transport: failed
    transports:
      async:
        dsn: '%env(VALKEY_MESSENGER_DSN)%'
        # e.g. redis://localhost:6379/messages
        # or   redis://:password@sentinel-host:26379/messages?sentinel_master=mymaster
        retry_strategy:
          max_retries: 5
          delay: 1000 # ms
          multiplier: 2
          max_delay: 60000 # ms
      failed:
        dsn: 'doctrine://default?queue_name=failed'
    routing:
      'App\Message\RevalidateCacheMessage': async
```

**Option B — Doctrine** (no extra infrastructure, messages in the database):

```yaml
framework:
  messenger:
    failure_transport: failed
    transports:
      async:
        dsn: 'doctrine://default?queue_name=revalidation'
        retry_strategy:
          max_retries: 5
          delay: 1000
          multiplier: 2
          max_delay: 60000
      failed:
        dsn: 'doctrine://default?queue_name=failed'
    routing:
      'App\Message\RevalidateCacheMessage': async
```

With Doctrine transport, run the consumer as a background process (e.g. via supervisor):

```bash
php bin/console messenger:consume async --limit=100 --time-limit=3600
```

---

## 9. Dispatching from Application Code

Inject `MessageBusInterface` wherever data is persisted and dispatch one message per tag:

```php
use App\Message\RevalidateCacheMessage;
use Symfony\Component\Messenger\MessageBusInterface;

// Article published
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "article-{$articleId}"));
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-{$journalId}"));
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-accepted-{$journalId}"));

// Article accepted (not yet published)
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "article-{$articleId}"));
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-accepted-{$journalId}"));

// Volume metadata updated
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "volume-{$volumeId}"));

// New volume published
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "volumes-{$journalId}"));

// News created/updated/deleted
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "news-{$journalId}"));

// Board member updated
$this->bus->dispatch(new RevalidateCacheMessage($journalId, "members-{$journalId}"));
```

---

## 10. Doctrine Event Subscriber (Optional)

For automatic revalidation without touching controller/service code:

```php
<?php
// src/EventSubscriber/ArticleRevalidationSubscriber.php

namespace App\EventSubscriber;

use App\Entity\Article;
use App\Message\RevalidateCacheMessage;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Messenger\MessageBusInterface;

class ArticleRevalidationSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly MessageBusInterface $bus) {}

    public static function getSubscribedEvents(): array
    {
        return [
            Events::postUpdate  => 'onArticleChange',
            Events::postPersist => 'onArticleChange',
            Events::postRemove  => 'onArticleRemove',
        ];
    }

    public function onArticleChange(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof Article) {
            return;
        }

        $journalId = $entity->getRvcode();
        $articleId = $entity->getId();

        $this->bus->dispatch(new RevalidateCacheMessage($journalId, "article-{$articleId}"));

        if ($entity->isPublished()) {
            $this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-{$journalId}"));
            $this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-accepted-{$journalId}"));
        } elseif ($entity->isAccepted()) {
            $this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-accepted-{$journalId}"));
        }
    }

    public function onArticleRemove(LifecycleEventArgs $args): void
    {
        $entity = $args->getObject();
        if (!$entity instanceof Article) {
            return;
        }

        $journalId = $entity->getRvcode();
        $articleId = $entity->getId();

        $this->bus->dispatch(new RevalidateCacheMessage($journalId, "article-{$articleId}"));
        $this->bus->dispatch(new RevalidateCacheMessage($journalId, "articles-{$journalId}"));
    }
}
```

---

## 11. CLI Command

```php
<?php
// src/Command/RevalidateCacheCommand.php

namespace App\Command;

use App\Service\NextRevalidationService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:revalidate',
    description: 'Trigger on-demand Next.js cache revalidation for a specific tag',
)]
class RevalidateCacheCommand extends Command
{
    public function __construct(private readonly NextRevalidationService $revalidation)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('journalId', InputArgument::REQUIRED, 'Journal code (e.g. epijinfo)')
            ->addArgument('tag',       InputArgument::REQUIRED, 'Cache tag (e.g. article-1234)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $journalId = $input->getArgument('journalId');
        $tag       = $input->getArgument('tag');

        $output->writeln("Revalidating <info>{$tag}</info> for journal <info>{$journalId}</info>…");
        $this->revalidation->revalidate($journalId, $tag);
        $output->writeln('<comment>Done (check logs for errors).</comment>');

        return Command::SUCCESS;
    }
}
```

Usage:

```bash
php bin/console app:revalidate epijinfo article-1234
php bin/console app:revalidate epijinfo articles-epijinfo
```

---

## 12. Implementation Checklist

- [ ] `NEXT_BASE_URL` configured per environment
- [ ] `NEXT_REVALIDATION_SECRET` set
- [ ] `NEXT_REVALIDATION_TOKEN_*` set for each journal
- [ ] Token resolution: per-journal first, global fallback second
- [ ] `NextRevalidationService` registered in `services.yaml`
- [ ] Messenger transport configured (Valkey or Doctrine)
- [ ] Messenger consumer running as a background process
- [ ] Every mutation dispatches the correct tags (see §4)
- [ ] "Accepted → Published" dispatches 3 tags: `article-{id}`, `articles-{j}`, `articles-accepted-{j}`
- [ ] Statistics dispatches both `stats-{j}` and `statistics-{j}` when both are affected
- [ ] Network errors caught and logged — never crash the main request
- [ ] 4xx responses logged, not retried
- [ ] 5xx responses retried by Messenger retry strategy
- [ ] `app:revalidate` console command works for manual revalidation

---

## 13. Security Requirements

1. Never commit tokens — environment variables only
2. Log all 4xx/5xx responses with journal ID and tag
3. Always prefer the per-journal token over the global one
4. Keep HTTP timeout short (5 s) to avoid holding Symfony workers
5. Ensure the Symfony server's IP is in `ALLOWED_IPS` on the Next.js side

---

## 14. Smoke Test

```bash
# Direct curl test (bypasses Messenger — useful for verifying credentials)
curl -s -X POST https://epijinfo.episciences.org/api/revalidate \
  -H 'Content-Type: application/json' \
  -H 'x-episciences-token: YOUR_TOKEN' \
  -d '{"journalId":"epijinfo","tag":"news-epijinfo"}'
# Expected: {"revalidated":true,"now":...,"journalId":"epijinfo","tag":"news-epijinfo"}

# Via console command
php bin/console app:revalidate epijinfo news-epijinfo
```

---

## Related Documentation

- [ZF1 Implementation Spec](./REVALIDATION_IMPLEMENTATION_SPEC_ZF1.md)
- [Revalidation Guide (operator)](./REVALIDATION_GUIDE.md) — tag reference, security config, Nginx setup
- [ISR Strategy](./ISR_STRATEGY.md)
- [Valkey Cache Strategy](./VALKEY_CACHE_STRATEGY.md)
