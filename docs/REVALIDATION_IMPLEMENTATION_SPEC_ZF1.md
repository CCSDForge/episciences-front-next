# Specification: Next.js Cache Revalidation — Zend Framework 1 Implementation

**Purpose** — Self-contained specification for implementing Next.js on-demand cache
revalidation in the Episciences **Zend Framework 1** application. A developer or LLM
reading this document should be able to produce production-ready code without consulting
any other source.

> For the Symfony implementation see [REVALIDATION_IMPLEMENTATION_SPEC_SYMFONY.md](./REVALIDATION_IMPLEMENTATION_SPEC_SYMFONY.md).
> For the operator guide (security config, Nginx, TTL) see [REVALIDATION_GUIDE.md](./REVALIDATION_GUIDE.md).

---

## 1. Architectural Overview

When data changes in the ZF1 backend, the Next.js frontend must drop the relevant cache
entries. The mechanism is an authenticated HTTP `POST` to `/api/revalidate`.

```
ZF1 Model/Controller  →  Service_Next_Revalidation  →  POST /api/revalidate  →  Next.js  →  revalidateTag()
```

ZF1 has no built-in async bus or DI container. This implementation uses two standalone
Composer packages that require no framework changes:

- **`monolog/monolog`** — same logging library as Symfony (PSR-3 compliant)
- **`symfony/console`** — same Console component as Symfony

### Design Constraints

| Constraint                                     | Solution                                            |
| ---------------------------------------------- | --------------------------------------------------- |
| Must not block the web request                 | Short timeout (3 s) or fire-and-forget via `exec()` |
| Must log failures                              | Monolog with PSR-3 `LoggerInterface`                |
| Must not crash on network error                | try/catch in service                                |
| Must use journal-specific token when available | Token resolution in service                         |
| CLI for manual revalidation                    | Symfony Console component via `bin/console`         |

---

## 2. Composer Dependencies

```bash
composer require monolog/monolog symfony/console
```

---

## 3. Environment Variables

```env
NEXT_BASE_URL=https://episciences.org
NEXT_REVALIDATION_SECRET=global_fallback_secret

# Per-journal tokens — uppercase, hyphens replaced by underscores
NEXT_REVALIDATION_TOKEN_EPIJINFO=secret_for_epijinfo
NEXT_REVALIDATION_TOKEN_JTAM=secret_for_jtam
```

> **Naming note** — On the Next.js side these are `REVALIDATION_SECRET` and
> `REVALIDATION_TOKEN_*` (no `NEXT_` prefix). The PHP prefix avoids collisions.

**Token resolution order:**

1. `NEXT_REVALIDATION_TOKEN_<JOURNAL_UPPERCASE>` (hyphens → underscores)
2. Fall back to `NEXT_REVALIDATION_SECRET`

---

## 4. HTTP Contract

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

| Status        | Meaning              | Action                                 |
| ------------- | -------------------- | -------------------------------------- |
| 200           | OK                   | —                                      |
| 400           | Bad payload          | Log, do not retry                      |
| 401           | Wrong token          | Log, do not retry                      |
| 403           | IP not whitelisted   | Log, do not retry                      |
| 429           | Rate limit           | Log, do not retry                      |
| 5xx / timeout | Server/network error | Log (retry manually via CLI if needed) |

Send **one POST per tag** — the endpoint accepts only a single tag per call.

---

## 5. Tag Reference

### 5.1 Articles

| ZF1 event                                                | Tags to send                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Article metadata updated (title, abstract, authors, DOI) | `article-{id}`                                                    |
| Article moved to "Accepted" status                       | `article-{id}`, `articles-accepted-{rvcode}`                      |
| Article published (Accepted → Published)                 | `article-{id}`, `articles-{rvcode}`, `articles-accepted-{rvcode}` |
| Article unpublished or deleted                           | `article-{id}`, `articles-{rvcode}`                               |

### 5.2 Volumes & Issues

| ZF1 event                                           | Tags to send                      |
| --------------------------------------------------- | --------------------------------- |
| Volume metadata updated (title, description, cover) | `volume-{id}`                     |
| Article added to / removed from a volume            | `volume-{id}`, `volumes-{rvcode}` |
| Article order changed inside a volume               | `volume-{id}`                     |
| New volume created or volume deleted                | `volumes-{rvcode}`                |

### 5.3 Sections

| ZF1 event                                     | Tags to send                                 |
| --------------------------------------------- | -------------------------------------------- |
| Section metadata updated (title, description) | `section-{id}-{rvcode}`, `sections-{rvcode}` |
| Article added to / removed from a section     | `section-articles-{id}-{rvcode}`             |
| Article order changed inside a section        | `section-articles-{id}-{rvcode}`             |
| New section created or section deleted        | `sections-{rvcode}`                          |

### 5.4 News

| ZF1 event                              | Tags to send    |
| -------------------------------------- | --------------- |
| News item created, updated, or deleted | `news-{rvcode}` |

### 5.5 Editorial Board

| ZF1 event                                                   | Tags to send       |
| ----------------------------------------------------------- | ------------------ |
| Board member added, updated (role, affiliation), or removed | `members-{rvcode}` |
| Board section structure changed (order, grouping)           | `boards-{rvcode}`  |

### 5.6 Editorial Pages

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

### 5.7 Statistics

The homepage stats block and the full statistics page use **different** tags.

| ZF1 event                    | Tags to send                            |
| ---------------------------- | --------------------------------------- |
| Homepage stats block updated | `stats-{rvcode}`                        |
| Full statistics page updated | `statistics-{rvcode}`                   |
| Both updated at once         | `stats-{rvcode}`, `statistics-{rvcode}` |

### 5.8 Emergency — Broad Invalidation (All Journals)

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

## 6. File Structure

```
application/
├── services/
│   └── Next/
│       ├── LoggerFactory.php         ← Monolog factory
│       └── Revalidation.php          ← HTTP service
└── commands/
    └── RevalidateCacheCommand.php    ← Symfony Console command
bin/
└── console                           ← CLI entry point (chmod +x)
```

---

## 7. Logger Factory

Creates a Monolog logger and shares it via the ZF1 registry.

```php
<?php
// application/services/Next/LoggerFactory.php

use Monolog\Handler\StreamHandler;
use Monolog\Logger;
use Psr\Log\LoggerInterface;

class Service_Next_LoggerFactory
{
    public static function getLogger(): LoggerInterface
    {
        if (Zend_Registry::isRegistered('monolog')) {
            return Zend_Registry::get('monolog');
        }

        $logger = new Logger('revalidation');
        $logger->pushHandler(new StreamHandler(
            APPLICATION_PATH . '/../logs/revalidation.log',
            Logger::DEBUG
        ));

        return $logger;
    }
}
```

Register it early in `Bootstrap.php` to share the log file with the rest of the application:

```php
// application/Bootstrap.php (excerpt)
protected function _initMonolog(): void
{
    $logger = Service_Next_LoggerFactory::getLogger();
    Zend_Registry::set('monolog', $logger);
}
```

---

## 8. Service Class

The service accepts an optional PSR-3 `LoggerInterface` (injected or auto-resolved from
the factory). It uses `Zend_Http_Client` with a short timeout.

```php
<?php
// application/services/Next/Revalidation.php

use Psr\Log\LoggerInterface;

class Service_Next_Revalidation
{
    /** @var string */
    private $_nextBaseUrl;

    /** @var string */
    private $_globalSecret;

    /** @var LoggerInterface */
    private $_logger;

    public function __construct(?LoggerInterface $logger = null)
    {
        $this->_nextBaseUrl  = getenv('NEXT_BASE_URL') ?: '';
        $this->_globalSecret = getenv('NEXT_REVALIDATION_SECRET') ?: '';
        $this->_logger       = $logger ?? Service_Next_LoggerFactory::getLogger();
    }

    /**
     * Send a revalidation request (blocking, short timeout).
     *
     * @param string $journalId  Journal code, e.g. "epijinfo"
     * @param string $tag        Cache tag, e.g. "article-1234"
     */
    public function revalidate(string $journalId, string $tag): void
    {
        if (empty($this->_nextBaseUrl)) {
            $this->_logger->warning('[Revalidation] NEXT_BASE_URL not configured');
            return;
        }

        $token = $this->_resolveToken($journalId);
        $url   = rtrim($this->_nextBaseUrl, '/') . '/api/revalidate';

        try {
            $client = new Zend_Http_Client($url, [
                'timeout'      => 3,    // seconds — fail fast
                'maxredirects' => 0,
            ]);
            $client->setHeaders([
                'Content-Type'        => 'application/json',
                'x-episciences-token' => $token,
            ]);
            $client->setRawData(
                json_encode(['journalId' => $journalId, 'tag' => $tag]),
                'application/json'
            );

            $response = $client->request(Zend_Http_Client::POST);

            if ($response->getStatus() !== 200) {
                $this->_logger->warning('[Revalidation] Non-200 response', [
                    'status'  => $response->getStatus(),
                    'journal' => $journalId,
                    'tag'     => $tag,
                    'body'    => substr($response->getBody(), 0, 200),
                ]);
            }
        } catch (Exception $e) {
            $this->_logger->error('[Revalidation] Request failed', [
                'journal' => $journalId,
                'tag'     => $tag,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send multiple tags in sequence.
     *
     * @param string   $journalId
     * @param string[] $tags
     */
    public function revalidateMany(string $journalId, array $tags): void
    {
        foreach ($tags as $tag) {
            $this->revalidate($journalId, $tag);
        }
    }

    private function _resolveToken(string $journalId): string
    {
        $envKey = 'NEXT_REVALIDATION_TOKEN_' . strtoupper(str_replace('-', '_', $journalId));
        return getenv($envKey) ?: $this->_globalSecret;
    }
}
```

---

## 9. Non-Blocking: fire-and-forget via exec()

On critical paths where even a 3-second timeout is unacceptable, dispatch the console
command in the background:

```php
// In a Model or Controller action — after a successful DB write:
$php  = PHP_BINARY;
$bin  = escapeshellarg(APPLICATION_PATH . '/../bin/console');
$jArg = escapeshellarg($journalId);
$tArg = escapeshellarg($tag);

exec("{$php} {$bin} app:revalidate-cache {$jArg} {$tArg} > /dev/null 2>&1 &");
```

The child process reads env vars, instantiates the service, and exits. PHP does not wait.

---

## 10. Console Command

```php
<?php
// application/commands/RevalidateCacheCommand.php

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class RevalidateCacheCommand extends Command
{
    protected static $defaultName = 'app:revalidate-cache';

    protected function configure(): void
    {
        $this
            ->setDescription('Trigger on-demand Next.js cache revalidation for a specific tag')
            ->addArgument('journalId', InputArgument::REQUIRED, 'Journal code (e.g. epijinfo)')
            ->addArgument('tag',       InputArgument::REQUIRED, 'Cache tag (e.g. article-1234)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $journalId = $input->getArgument('journalId');
        $tag       = $input->getArgument('tag');

        $output->writeln("Revalidating <info>{$tag}</info> for journal <info>{$journalId}</info>…");

        $service = new Service_Next_Revalidation();
        $service->revalidate($journalId, $tag);

        $output->writeln('<comment>Done (check logs/revalidation.log for errors).</comment>');

        return Command::SUCCESS;
    }
}
```

---

## 11. Console Entry Point

```php
<?php
// bin/console  (chmod +x)

define('APPLICATION_PATH', __DIR__ . '/../application');
define('APPLICATION_ENV',  getenv('APPLICATION_ENV') ?: 'production');

require_once __DIR__ . '/../vendor/autoload.php';

// Load env vars — adapt to the project's actual dotenv setup
if (class_exists(\Dotenv\Dotenv::class)) {
    \Dotenv\Dotenv::createImmutable(__DIR__ . '/..')->safeLoad();
}

// Load service classes — no full Zend bootstrap needed
require_once APPLICATION_PATH . '/services/Next/LoggerFactory.php';
require_once APPLICATION_PATH . '/services/Next/Revalidation.php';
require_once APPLICATION_PATH . '/commands/RevalidateCacheCommand.php';

use Symfony\Component\Console\Application;

$app = new Application('Episciences CLI', '1.0.0');
$app->add(new RevalidateCacheCommand());
$app->run();
```

---

## 12. Hooking into ZF1 Models

Place calls at the end of `save()` / `update()` / `delete()` methods, after the database
operation succeeds. Use `revalidateMany()` to send several tags at once.

```php
<?php
// application/models/Article.php (excerpt)

class Model_Article extends Zend_Db_Table_Abstract
{
    public function publish(int $articleId, string $journalId): bool
    {
        $rows = $this->update(
            ['status' => 'published'],
            $this->getAdapter()->quoteInto('id = ?', $articleId)
        );

        if ($rows > 0) {
            (new Service_Next_Revalidation())->revalidateMany($journalId, [
                "article-{$articleId}",
                "articles-{$journalId}",
                "articles-accepted-{$journalId}",
            ]);
        }

        return $rows > 0;
    }

    public function accept(int $articleId, string $journalId): bool
    {
        $rows = $this->update(
            ['status' => 'accepted'],
            $this->getAdapter()->quoteInto('id = ?', $articleId)
        );

        if ($rows > 0) {
            (new Service_Next_Revalidation())->revalidateMany($journalId, [
                "article-{$articleId}",
                "articles-accepted-{$journalId}",
            ]);
        }

        return $rows > 0;
    }

    public function updateMetadata(int $articleId, string $journalId, array $data): bool
    {
        $rows = $this->update(
            $data,
            $this->getAdapter()->quoteInto('id = ?', $articleId)
        );

        if ($rows > 0) {
            (new Service_Next_Revalidation())->revalidate($journalId, "article-{$articleId}");
        }

        return $rows > 0;
    }
}
```

---

## 13. Implementation Checklist

- [ ] `composer require monolog/monolog symfony/console` done
- [ ] `NEXT_BASE_URL` configured per environment
- [ ] `NEXT_REVALIDATION_SECRET` set
- [ ] `NEXT_REVALIDATION_TOKEN_*` set for each journal
- [ ] Token resolution: per-journal first, global fallback second
- [ ] `_initMonolog()` in Bootstrap registers the logger in the ZF1 registry
- [ ] `bin/console` is executable (`chmod +x bin/console`)
- [ ] Every mutation calls the correct tags (see §5)
- [ ] "Accepted → Published" sends 3 tags: `article-{id}`, `articles-{j}`, `articles-accepted-{j}`
- [ ] Statistics sends both `stats-{j}` and `statistics-{j}` when both are affected
- [ ] Network errors caught and logged — never crash the main request
- [ ] 4xx responses logged, not retried
- [ ] `app:revalidate-cache` console command works for manual revalidation

---

## 14. Security Requirements

1. Never commit tokens — environment variables only
2. Log all 4xx/5xx responses with journal ID and tag
3. Always prefer the per-journal token over the global one
4. Keep HTTP timeout short (3 s) to avoid holding PHP-FPM workers
5. Ensure the ZF1 server's IP is in `ALLOWED_IPS` on the Next.js side

---

## 15. Smoke Test

```bash
# Direct curl test (useful for verifying credentials without going through PHP)
curl -s -X POST https://epijinfo.episciences.org/api/revalidate \
  -H 'Content-Type: application/json' \
  -H 'x-episciences-token: YOUR_TOKEN' \
  -d '{"journalId":"epijinfo","tag":"news-epijinfo"}'
# Expected: {"revalidated":true,"now":...,"journalId":"epijinfo","tag":"news-epijinfo"}

# Via console command
php bin/console app:revalidate-cache epijinfo news-epijinfo

# List all available commands
php bin/console list
```

---

## Related Documentation

- [Symfony Implementation Spec](./REVALIDATION_IMPLEMENTATION_SPEC_SYMFONY.md)
- [Revalidation Guide (operator)](./REVALIDATION_GUIDE.md) — tag reference, security config, Nginx setup
- [ISR Strategy](./ISR_STRATEGY.md)
- [Valkey Cache Strategy](./VALKEY_CACHE_STRATEGY.md)
