# Ansistrano Deployment — Setup Guide

## Prerequisites

### 1. Install ansible-core

On Debian, install via `pipx` (do **not** use the `ansible` package — it only exposes `ansible-community`):

```bash
pipx install ansible-core
```

Verify:

```bash
ansible --version
ansible-galaxy --version
```

### 2. Install Ansistrano roles and required collections

From the `deployment/ansible/` directory:

```bash
ansible-galaxy install -r requirements.yml
ansible-galaxy collection install community.general ansible.posix
# Note: if ansistrano.rollback fails, install it separately:
# ansible-galaxy install ansistrano.rollback,4.0.1
```

---

## First-time configuration

### Ansible inventory and SSH user

Copy the example files and fill in the real values (these files are gitignored):

```bash
cd deployment/ansible

# Preprod
cp inventory/preprod.ini.example inventory/preprod.ini
cp group_vars/preprod/secrets.yml.example group_vars/preprod/secrets.yml

# Production
cp inventory/production.ini.example inventory/production.ini
cp group_vars/production/secrets.yml.example group_vars/production/secrets.yml
```

Edit `inventory/preprod.ini` — replace `<VM1_IP_OR_HOSTNAME>` and `<VM2_IP_OR_HOSTNAME>` with the real hostnames.

Edit `group_vars/preprod/secrets.yml` — set `ansible_user` to the real deploy user.

Repeat for production files.

### Environment secrets (.env.local)

Each environment reads its secrets from a gitignored file at the root of the project.
Copy the example and fill in the real values before your first deploy:

```bash
# Preprod
cp .env.preprod.local.example .env.preprod.local
# edit .env.preprod.local: set REVALIDATION_SECRET, VALKEY_* credentials, etc.

# Production
cp .env.production.local.example .env.production.local
# edit .env.production.local: set REVALIDATION_SECRET, VALKEY_* credentials, etc.
```

Ansible uploads the relevant file to `shared/.env.local` on the server at each deploy
(via `tasks/upload-env.yml`, run before shared symlinks are created).
The public `.env` (common constants, no secrets) is deployed automatically via git.

---

## Deploy

```bash
cd deployment/ansible

# Preprod
ansible-playbook deploy.yml -i inventory/preprod.ini

# Production
ansible-playbook deploy.yml -i inventory/production.ini
```

## Rollback

```bash
# Preprod
ansible-playbook rollback.yml -i inventory/preprod.ini

# Production
ansible-playbook rollback.yml -i inventory/production.ini
```

---

## Shared directory structure on servers

Ansistrano creates the following layout under `deploy_to`:

```
/var/www/episciences-front-next/
  current/          → symlink to the active release
  releases/         → timestamped release directories (keep_releases kept)
  shared/
    .env.local      → secrets (uploaded automatically by Ansible from local .env.*.local)
    external-assets/  → journal assets (clone manually on first deploy — production only)
    logs/
```

Each release directory also contains `.env` (public constants, deployed via git clone).

### First deploy — shared files to create manually on each server

```bash
# external-assets (production only — preprod uses local sync)
git clone <external-assets-repo> /var/www/episciences-front-next/shared/external-assets
```

`shared/.env.local` is created/updated automatically at each deploy — no manual step needed.
