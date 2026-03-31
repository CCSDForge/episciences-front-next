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
    .env            → environment file (create manually on first deploy)
    external-assets/  → journal assets (clone manually on first deploy)
    logs/
```

### First deploy — shared files to create manually on each server

```bash
# .env
touch /var/www/episciences-front-next/shared/.env
# fill it with the production environment variables

# external-assets
git clone <external-assets-repo> /var/www/episciences-front-next/shared/external-assets
```
