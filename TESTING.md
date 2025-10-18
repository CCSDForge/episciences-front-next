# Testing Guide - Docker Apache Environment

Ce guide explique comment tester le build statique dans un environnement Apache identique à la production.

## 🚀 Quick Start

### 1. Build le journal

```bash
make epijinfo
```

### 2. Lancer l'environnement de test Apache

```bash
make docker-test JOURNAL=epijinfo PORT=8080
```

### 3. Tester dans le navigateur

Ouvrir : `http://localhost:8080/`

## 🧪 Tests à effectuer

### Test 1: Détection de langue (Accept-Language)

Le `.htaccess` détecte automatiquement la langue du navigateur.

```bash
# Navigateur français → redirige vers /fr/
curl -L -H "Accept-Language: fr-FR,fr;q=0.9" http://localhost:8080/

# Navigateur anglais → redirige vers /en/
curl -L -H "Accept-Language: en-US,en;q=0.9" http://localhost:8080/

# Sans langue préférée → utilise fallback (en)
curl -L http://localhost:8080/
```

**Résultat attendu** : Chaque requête redirige vers la bonne version linguistique.

---

### Test 2: Anciennes URLs (RedirectPermanent)

Vérifier que les anciennes URLs de Zend Framework redirigent correctement.

```bash
# Anciennes URLs /browse/*
curl -I http://localhost:8080/browse/latest
# Attendu: 301 → /articles puis 302 → /en/articles (ou /fr/ selon langue)

curl -I http://localhost:8080/browse/volumes
# Attendu: 301 → /volumes puis 302 → /en/volumes

curl -I http://localhost:8080/browse/section
# Attendu: 301 → /sections puis 302 → /en/sections

# Ancienne URL d'article par ID
curl -I http://localhost:8080/123
# Attendu: 301 → /articles/123 puis 302 → /en/articles/123

# Ancienne URL PDF d'article
curl -I http://localhost:8080/456/pdf
# Attendu: 301 → /articles/456/download puis 302 → /en/articles/456/download

# Ancienne URL de volume
curl -I http://localhost:8080/volume/view/id/718
# Attendu: 301 → /volumes/718 puis 302 → /en/volumes/718
```

---

### Test 3: Fichiers statiques (pas de redirection)

Les fichiers statiques ne doivent PAS être redirigés vers une langue.

```bash
# CSS
curl -I http://localhost:8080/_next/static/css/efb6bbc2c39490b8.css
# Attendu: 200 OK (pas de redirection)

# JavaScript
curl -I http://localhost:8080/_next/static/chunks/webpack-*.js
# Attendu: 200 OK

# Fonts
curl -I http://localhost:8080/fonts/Noto-Sans/NotoSans-Regular.woff
# Attendu: 200 OK

# Icons
curl -I http://localhost:8080/icons/caret-up-red.svg
# Attendu: 200 OK

# Logos
curl -I http://localhost:8080/logos/logo-big.svg
# Attendu: 200 OK

# Locales (fichiers de traduction)
curl -I http://localhost:8080/locales/en/translation.json
# Attendu: 200 OK
```

---

### Test 4: Headers de sécurité

Vérifier que les headers de sécurité sont présents (identiques à la production).

```bash
# Vérifier tous les headers de sécurité
curl -I http://localhost:8080/en/ | grep -E "(X-Content-Type-Options|Content-Security-Policy|Referrer-Policy)"

# Devrait afficher:
# X-Content-Type-Options: nosniff
# Referrer-Policy: no-referrer-when-downgrade
# Content-Security-Policy: default-src 'self'; ...
```

**Headers attendus** :
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer-when-downgrade`
- `Content-Security-Policy` (politique CSP complète)
- `Link: <https://inbox.episciences.org/>; rel="http://www.w3.org/ns/ldp#inbox"` (sur fichiers HTML)

---

### Test 5: Fichiers interdits (404)

Les fichiers sensibles doivent retourner 404.

```bash
# Fichiers markdown
curl -I http://localhost:8080/README.md
# Attendu: 404 Not Found

# Fichiers SQL
curl -I http://localhost:8080/backup.sql
# Attendu: 404

# Scripts shell
curl -I http://localhost:8080/deploy.sh
# Attendu: 404

# Fichiers .git
curl -I http://localhost:8080/.git/config
# Attendu: 404

# Fichiers de backup
curl -I http://localhost:8080/file.back
curl -I http://localhost:8080/file.save
curl -I http://localhost:8080/file~
# Attendu: 404 pour tous

# Archives
curl -I http://localhost:8080/backup.tar
curl -I http://localhost:8080/backup.bz2
curl -I http://localhost:8080/backup.rar
# Attendu: 404 pour tous
```

---

### Test 6: Cache headers (mod_expires)

Vérifier que les headers de cache sont configurés.

```bash
# Fonts (1 an)
curl -I http://localhost:8080/fonts/Noto-Sans/NotoSans-Regular.woff | grep -E "(Expires|Cache-Control)"

# CSS (1 an)
curl -I http://localhost:8080/_next/static/css/*.css | grep -E "(Expires|Cache-Control)"

# JavaScript (1 an)
curl -I http://localhost:8080/_next/static/chunks/*.js | grep -E "(Expires|Cache-Control)"

# SVG (1 mois)
curl -I http://localhost:8080/icons/logo.svg | grep -E "(Expires|Cache-Control)"
```

---

### Test 7: Trailing slashes

Vérifier la suppression des trailing slashes (sauf racine).

```bash
# URL avec trailing slash → redirige sans slash
curl -I http://localhost:8080/en/articles/
# Attendu: 301 → /en/articles (sans slash)

# Racine garde le slash
curl -I http://localhost:8080/
# Attendu: 302 → /en/ (avec slash)
```

---

## 🔧 Commandes utiles

### Voir les logs Apache en temps réel

```bash
make docker-logs
```

**Utilisation** : Voir les requêtes et les redirections en direct.

---

### Accéder au shell du conteneur

```bash
make docker-shell
```

**Dans le shell** :

```bash
# Voir la configuration Apache
cat /usr/local/apache2/conf/extra/episciences-macro.conf

# Voir le .htaccess généré
cat /sites/episciences-front/dist/epijinfo/.htaccess

# Lister les fichiers du build
ls -la /sites/episciences-front/dist/epijinfo/

# Voir les logs Apache
tail -f /usr/local/apache2/logs/error.log
tail -f /usr/local/apache2/logs/access.log
```

---

### Redémarrer après modification de configuration

```bash
# Arrêter le conteneur
make docker-stop

# Reconstruire l'image (si Dockerfile ou configs Apache changent)
make docker-build JOURNAL=epijinfo

# Relancer
make docker-test JOURNAL=epijinfo
```

**Note** : Les modifications du `.htaccess` dans `dist/epijinfo/` sont appliquées instantanément (volume monté).

---

### Tester avec un autre journal

Si vous avez construit plusieurs journaux :

```bash
# Tester jsedi
make docker-test JOURNAL=jsedi PORT=8081

# Tester epijinfo en parallèle
make docker-test JOURNAL=epijinfo PORT=8080
```

---

## 🐛 Debugging

### Problème : 404 sur toutes les pages

**Causes possibles** :
1. Le build n'existe pas
2. Le volume Docker n'est pas monté correctement

**Solution** :

```bash
# Vérifier que le build existe
ls -la dist/epijinfo/

# Reconstruire si nécessaire
make clean
make epijinfo

# Vérifier dans le conteneur
make docker-shell
ls -la /sites/episciences-front/dist/epijinfo/
```

---

### Problème : .htaccess ignoré (pas de détection de langue)

**Causes possibles** :
1. `AllowOverride` pas activé
2. Module `mod_rewrite` désactivé

**Solution** :

```bash
# Vérifier AllowOverride dans le conteneur
make docker-shell
cat /usr/local/apache2/conf/extra/episciences-macro.conf | grep AllowOverride
# Devrait afficher: AllowOverride FileInfo

# Vérifier que mod_rewrite est chargé
cat /usr/local/apache2/conf/httpd.conf | grep rewrite_module
# Devrait afficher (sans #): LoadModule rewrite_module modules/mod_rewrite.so
```

---

### Problème : Redirections infinies

**Causes possibles** :
1. Conflit entre règles Apache et .htaccess
2. Erreur de logique dans .htaccess

**Solution** :

```bash
# Voir les logs de rewrite
make docker-logs

# Dans le conteneur, activer le debug rewrite
make docker-shell
echo "LogLevel alert rewrite:trace3" >> /usr/local/apache2/conf/httpd.conf
httpd -k restart
```

---

### Problème : Headers de sécurité manquants

**Causes possibles** :
1. Module `mod_headers` désactivé
2. Configuration non chargée

**Solution** :

```bash
make docker-shell
cat /usr/local/apache2/conf/httpd.conf | grep headers_module
# Devrait afficher (sans #): LoadModule headers_module modules/mod_headers.so
```

---

## 📊 Différences avec la production

| Aspect | Production | Docker Test |
|--------|-----------|-------------|
| **ServerName** | `journal.episciences.org` | `localhost` |
| **Données `/data/epi/`** | Vraies données (PDFs, sitemaps) | Mockées (vides) |
| **HTTPS** | Oui (certificat) | Non (HTTP uniquement) |
| **RemoteIP** | IPs production spécifiques | Réseau Docker (172.x.x.x) |
| **Modules Apache** | Tous les modules | Modules essentiels uniquement |
| **Volumes externes** | Montés depuis NFS/stockage | Dossiers locaux mockés |

---

## ✅ Checklist de validation complète

Avant de déployer en production, vérifier :

### Navigation
- [ ] Homepage accessible via `/`
- [ ] Toutes les routes EN accessibles (`/en/articles`, `/en/volumes`, etc.)
- [ ] Toutes les routes FR accessibles (`/fr/articles`, `/fr/volumes`, etc.)

### Détection de langue
- [ ] Redirection FR fonctionne (`Accept-Language: fr`)
- [ ] Redirection EN fonctionne (`Accept-Language: en`)
- [ ] Fallback vers EN sans langue configurée
- [ ] Navigateur avec `fr-FR` → `/fr/`
- [ ] Navigateur avec `en-US` → `/en/`

### Anciennes URLs
- [ ] `/browse/latest` → `/articles`
- [ ] `/browse/volumes` → `/volumes`
- [ ] `/browse/section` → `/sections`
- [ ] `/123` → `/articles/123`
- [ ] `/456/pdf` → `/articles/456/download`
- [ ] `/volume/view/id/718` → `/volumes/718`

### Fichiers statiques
- [ ] CSS servis sans redirection (200 OK)
- [ ] JS servis sans redirection (200 OK)
- [ ] Fonts servies sans redirection (200 OK)
- [ ] Icons servis sans redirection (200 OK)
- [ ] Logos servis sans redirection (200 OK)
- [ ] Locales servies sans redirection (200 OK)

### Sécurité
- [ ] Fichiers `.md` bloqués (404)
- [ ] Fichiers `.sql` bloqués (404)
- [ ] Fichiers `.sh` bloqués (404)
- [ ] Fichiers `.git` bloqués (404)
- [ ] Fichiers backup (`.back`, `.save`, `~`) bloqués (404)
- [ ] Archives (`.tar`, `.bz2`, `.rar`) bloquées (404)

### Headers
- [ ] `X-Content-Type-Options: nosniff` présent
- [ ] `Referrer-Policy` présent
- [ ] `Content-Security-Policy` présent et correct
- [ ] `Link: <inbox>` présent sur HTML

### Cache
- [ ] Headers `Expires` présents sur fonts
- [ ] Headers `Expires` présents sur CSS
- [ ] Headers `Expires` présents sur JS
- [ ] Headers `Expires` présents sur SVG

### Règles spéciales
- [ ] Trailing slashes supprimés (sauf racine)
- [ ] `.htaccess` fonctionne (langue détectée)
- [ ] Bypass pour `/volumes/*.pdf` fonctionne

---

## 🎯 Workflow complet de test

### Workflow recommandé avant production

```bash
# 1. Nettoyer et rebuild complet
make clean
make epijinfo

# 2. Tester avec Python (rapide, sans Apache)
make serve JOURNAL=epijinfo PORT=3000
# Ouvrir http://localhost:3000/en/ dans navigateur
# Ctrl+C pour arrêter

# 3. Tester avec Docker Apache (production-like)
make docker-test JOURNAL=epijinfo PORT=8080

# Dans un autre terminal:
# Test détection langue FR
curl -L -H "Accept-Language: fr-FR" http://localhost:8080/

# Test ancienne URL
curl -I http://localhost:8080/browse/latest

# Test fichier statique
curl -I http://localhost:8080/fonts/Noto-Sans/NotoSans-Regular.woff

# Test fichier interdit
curl -I http://localhost:8080/README.md

# 4. Valider tous les tests de la checklist
# 5. Si OK → Déployer en production
```

---

## 📚 Ressources

- **Apache Integration** : Voir `APACHE_INTEGRATION.md` pour la configuration serveur production
- **Configuration macro** : `docker/apache-config/episciences-macro.conf`
- **Dockerfile** : `docker/Dockerfile`
- **docker-compose** : `docker-compose.test.yml`

---

## 💡 Astuces

### Tester plusieurs langues rapidement

```bash
# Script bash pour tester toutes les langues
for lang in fr en; do
  echo "Testing language: $lang"
  curl -L -H "Accept-Language: $lang" http://localhost:8080/ | grep -o "<html[^>]*>" | head -1
done
```

### Comparer avec la production

```bash
# Tester en local
curl -I http://localhost:8080/articles

# Tester en production
curl -I https://epijinfo.episciences.org/articles

# Comparer les headers
diff <(curl -I http://localhost:8080/en/ 2>&1) <(curl -I https://epijinfo.episciences.org/en/ 2>&1)
```

### Surveiller les performances

```bash
# Temps de réponse
time curl -o /dev/null -s http://localhost:8080/en/articles

# Avec détails de timing
curl -w "@-" -o /dev/null -s http://localhost:8080/en/ <<'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
EOF
```
