# Apache Integration Guide

This document explains how to integrate the automatically generated `.htaccess` file with your existing Apache configuration.

## 📋 Overview

The system automatically generates a `.htaccess` file during the build that handles:

* ✅ Browser language detection via `Accept-Language`
* ✅ Smart redirection to `/en/` or `/fr/`
* ✅ Fallback to the default language
* ✅ Monolingual sites (no detection if only one language)

## 🔧 Architecture

### Apache Rule Execution Order

```
1. Server configuration (<VirtualHost> or <Directory>) ← Your existing rules
   ├── RedirectPermanent (old URLs)
   ├── RewriteRule (migrations)
   └── AllowOverride FileInfo

2. .htaccess (in dist/journal/) ← Our language detection
   ├── Language detection
   └── Redirection to /en/ or /fr/
```

## 📝 Example Apache Configuration

Here’s how to integrate it with your existing macro:

```apache
<Macro Journal $journal-code $app_path $manager>
    <Directory "${app_path}">
        # ============================================
        # SECTION 1: Redirection of old URLs
        # These rules execute FIRST
        # ============================================

        RedirectPermanent /browse/latest https://$journal-code.episciences.org/articles
        RedirectPermanent /browse/accepted-docs https://$journal-code.episciences.org/articles-accepted
        RedirectPermanent /browse/volumes https://$journal-code.episciences.org/volumes
        RedirectPermanent /browse/section https://$journal-code.episciences.org/sections
        RedirectPermanent /page/about https://$journal-code.episciences.org/about
        RedirectPermanent /user/login https://${manager}.episciences.org/$journal-code/user/login
        RedirectPermanent /user/logout https://${manager}.episciences.org/$journal-code/user/login
        RedirectPermanent /user/create https://${manager}.episciences.org/$journal-code/user/create
        RedirectPermanent /user/lostlogin https://${manager}.episciences.org/$journal-code/user/lostlogin
        RedirectPermanent /user/lostpassword https://${manager}.episciences.org/$journal-code/user/lostpassword
        RedirectPermanent /user/permissions https://${manager}.episciences.org/$journal-code/user/permissions

        # ============================================
        # SECTION 2: URL Rewrites (before .htaccess)
        # ============================================

        RewriteEngine On
        RewriteBase /

        # Remove trailing slashes (except root)
        RewriteCond %{REQUEST_URI} !^/$
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^(.*)/$ /$1 [R=301,L]

        # Redirection of old articles
        RewriteRule ^([0-9]+)$ https://$journal-code.episciences.org/articles/$1 [R=301,L]
        RewriteRule ^([0-9]+)/pdf$ https://$journal-code.episciences.org/articles/$1/download [R=301,L]
        RewriteRule ^volume/view/id/([0-9]+)$ https://$journal-code.episciences.org/volumes/$1 [R=301,L]
        RewriteRule ^section/view/id/([0-9]+)$ https://$journal-code.episciences.org/sections/$1 [R=301,L]

        # Bypass for direct files (PDFs)
        RewriteCond %{REQUEST_URI} !^/volumes/.*\.(pdf)$ [NC]

        # ============================================
        # SECTION 3: Allow .htaccess to take over
        # IMPORTANT: AllowOverride MUST be enabled
        # ============================================

        AllowOverride FileInfo
        Options -Indexes
        Require all granted

        # Note: The .htaccess in dist/journal/ handles language detection
        # and redirects to /en/ or /fr/ depending on the browser
    </Directory>
</Macro>
```

## 🌐 Request Flow

### Example 1: French user visiting the root

```
1. Browser → GET /
   Header: Accept-Language: fr-FR,fr;q=0.9,en;q=0.8

2. Apache Directory rules → No match
   (no old URL)

3. .htaccess language detection → Detects "fr"
   RewriteRule: / → /fr/ [R=302,L]

4. Browser → GET /fr/
   Displays the homepage in French
```

### Example 2: Old URL migrated to new

```
1. Browser → GET /browse/latest

2. Apache Directory rules → MATCH!
   RedirectPermanent → https://journal.episciences.org/articles [R=301]

3. Browser → GET /articles (new request)

4. Apache Directory rules → No match

5. .htaccess language detection → Detects "en" (default)
   RewriteRule: /articles → /en/articles [R=302,L]

6. Browser → GET /en/articles
   Displays the article list in English
```

### Example 3: curl without Accept-Language

```bash
$ curl -I https://journal.episciences.org/

# .htaccess → No language detected, uses default
# Redirects to /en/ (default language)
HTTP/1.1 302 Found
Location: /en/
```

### Example 4: curl with Accept-Language

```bash
$ curl -I -H "Accept-Language: fr" https://journal.episciences.org/

# .htaccess → Detects "fr"
HTTP/1.1 302 Found
Location: /fr/
```

## 🔍 Language Detection

The `.htaccess` detects the language via the `Accept-Language` header:

```apache
# Detects "fr" in these formats:
# - Accept-Language: fr
# - Accept-Language: fr-FR
# - Accept-Language: en,fr;q=0.9
# - Accept-Language: en;q=0.8,fr;q=0.7,de;q=0.6

RewriteCond %{HTTP:Accept-Language} ^fr [NC,OR]
RewriteCond %{HTTP:Accept-Language} ^fr- [NC,OR]
RewriteCond %{HTTP:Accept-Language} [,;]fr[,;-] [NC]
RewriteRule ^(.*)$ /fr/$1 [R=302,L]
```

## 🏗️ Monolingual vs Multilingual Sites

### Multilingual Site (EN + FR)

Generated `.htaccess` with detection:

```apache
# Multilingual site - intelligent language detection
RewriteEngine On

# Skip if already has language prefix
RewriteCond %{REQUEST_URI} ^/(en|fr)/ [NC]
RewriteRule ^ - [L]

# Detect browser language
RewriteCond %{HTTP:Accept-Language} ^fr [NC,OR]
RewriteCond %{HTTP:Accept-Language} ^fr- [NC,OR]
RewriteCond %{HTTP:Accept-Language} [,;]fr[,;-] [NC]
RewriteRule ^(.*)$ /fr/$1 [R=302,L]

# Fallback to default
RewriteRule ^(.*)$ /en/$1 [R=302,L]
```

### Monolingual Site (EN only)

Simplified `.htaccess` without detection:

```apache
# Monolingual site - simple redirect to en
RewriteEngine On

# Skip if already has language prefix
RewriteCond %{REQUEST_URI} ^/en/ [NC]
RewriteRule ^ - [L]

# Skip static files
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Redirect everything to language prefix
RewriteRule ^(.*)$ /en/$1 [R=302,L]
```

## 🔄 Changing the Default Language

To change a journal’s default language:

1. Edit `external-assets/.env.local.journal-code`:

   ```bash
   NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE="fr"  # instead of "en"
   ```

2. Rebuild the journal:

   ```bash
   make journal-code
   ```

3. The generated `.htaccess` will automatically use FR as fallback:

   ```apache
   # Fallback: redirect to default language (fr)
   RewriteRule ^(.*)$ /fr/$1 [R=302,L]
   ```

## 🚨 Key Points

### ✅ What Works

* Old URLs with `RedirectPermanent` in the macro
* Automatic browser language detection
* Monolingual and multilingual sites
* curl and wget (use fallback)
* All SEO bots (Google, Bing, etc.)

### ⚠️ Requires AllowOverride

The `.htaccess` **will NOT work** if:

```apache
AllowOverride None  # ❌ BLOCKS .htaccess
```

Make sure you have:

```apache
AllowOverride FileInfo  # ✅ Enables .htaccess
```

### 📌 Static Files

Static files (JS, CSS, images, fonts) are automatically excluded:

```apache
# Skip static files and directories
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
```

This allows `/icons/logo.svg` to be served directly without redirection.

## 🧪 Testing the Configuration

### Test 1: Language Detection

```bash
# French
curl -I -H "Accept-Language: fr-FR" https://journal.episciences.org/
# Should redirect to /fr/

# English
curl -I -H "Accept-Language: en-US" https://journal.episciences.org/
# Should redirect to /en/

# No language (fallback)
curl -I https://journal.episciences.org/
# Should redirect to /en/ (default language)
```

### Test 2: Old URLs

```bash
# Test old URL
curl -I https://journal.episciences.org/browse/latest
# Should do 301 → /articles then 302 → /en/articles
```

### Test 3: Static Files

```bash
# Test static file
curl -I https://journal.episciences.org/icons/logo.svg
# Should return 200 without redirection
```

## 📚 Apache Logs for Debugging

To debug rewrite rules:

```apache
LogLevel alert rewrite:trace3

# Then in the logs:
tail -f /var/log/apache2/error.log | grep rewrite
```

## 🎯 Summary

| Component       | Responsibility               | File                   |
| --------------- | ---------------------------- | ---------------------- |
| Apache Macro    | Redirection of old URLs      | VirtualHost config     |
| Directory rules | Specific URL rewrites        | VirtualHost config     |
| .htaccess       | Language detection + routing | dist/journal/.htaccess |
| Next.js         | Static page generation       | src/app/[lang]/*       |

✅ **The system is fully compatible with your existing Apache rules.**
