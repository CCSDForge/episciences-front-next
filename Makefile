.PHONY: build up down logs clean hosts rebuild help dev-nginx dev-nginx-down dev-nginx-logs dev-nginx-rebuild deploy-preprod deploy-production rollback-preprod rollback-production

# Default journals for testing
JOURNALS ?= epijinfo,dmtcs
PORT ?= 8080
WITH_VALKEY ?= 1

COMPOSE_ARGS = -f docker-compose.yml
ifeq ($(WITH_VALKEY), 1)
	COMPOSE_ARGS += -f docker-compose.valkey.yml
endif

help:
	@echo "Episciences Nginx Test Environment"
	@echo ""
	@echo "--- Production-like (full Docker build) ---"
	@echo "  make build            Build everything (App + Docker)"
	@echo "  make build-app        Build only the Next.js application"
	@echo "  make build-docker     Build only Docker images"
	@echo "  make up               Start all containers (Nginx + Next.js)"
	@echo "  make down             Stop all containers"
	@echo "  make logs             Stream container logs"
	@echo "  make rebuild          Full rebuild and restart"
	@echo "  make clean            Remove images and volumes"
	@echo ""
	@echo "--- Dev mode (npm run dev + Nginx) ---"
	@echo "  make dev-nginx        Start Nginx only (proxy → localhost:3000)"
	@echo "  make dev-nginx-down   Stop dev Nginx"
	@echo "  make dev-nginx-logs   Stream dev Nginx logs"
	@echo "  make dev-nginx-rebuild Rebuild dev Nginx image and restart"
	@echo ""
	@echo "--- Code quality ---"
	@echo "  make test             Run application tests"
	@echo "  make lint             Check code style (ESLint)"
	@echo "  make format           Format code (Prettier)"
	@echo "  make format-check     Check code formatting (Prettier)"
	@echo "  make quality          Run all quality checks (lint + format)"
	@echo ""
	@echo "--- Deployment (Ansistrano) ---"
	@echo "  make deploy-preprod      Deploy to preprod (2 VMs)"
	@echo "  make deploy-production   Deploy to production"
	@echo "  make rollback-preprod    Rollback preprod to previous release"
	@echo "  make rollback-production Rollback production to previous release"
	@echo ""
	@echo "--- Misc ---"
	@echo "  make hosts            Show /etc/hosts entries"
	@echo "  make valkey-status    Show Valkey cluster status"
	@echo ""
	@echo "Variables:"
	@echo "  JOURNALS=$(JOURNALS)  (used for /etc/hosts)"
	@echo "  PORT=$(PORT)"
	@echo "  WITH_VALKEY=$(WITH_VALKEY) (1=enabled, 0=disabled)"
	@echo ""
	@echo "Examples:"
	@echo "  make build && make up           # Full production-like stack"
	@echo "  npm run dev & make dev-nginx    # Dev mode with hot-reload"
	@echo "  make up PORT=9000               # Custom port"

build: build-app build-docker

build-app:
	@echo "Building Next.js application..."
	npm run build

build-docker:
	@echo "Building Docker images..."
	docker compose $(COMPOSE_ARGS) build

up:
	@echo "Starting containers..."
	PORT=$(PORT) docker compose $(COMPOSE_ARGS) up -d
	@echo ""
	@echo "Services started on port $(PORT)"
	@$(MAKE) hosts --no-print-directory

down:
	docker compose $(COMPOSE_ARGS) down

logs:
	docker compose $(COMPOSE_ARGS) logs -f

rebuild: down build up

# ---------------------------------------------------------------------------
# Dev mode: Nginx in Docker → npm run dev on host (hot-reload friendly)
# ---------------------------------------------------------------------------

dev-nginx:
	@echo "Starting Nginx (dev mode → localhost:3000)..."
	@echo "Make sure 'npm run dev' is running first."
	PORT=$(PORT) docker compose -f docker-compose.dev.yml up -d --build
	@echo ""
	@$(MAKE) hosts --no-print-directory

dev-nginx-down:
	docker compose -f docker-compose.dev.yml down

dev-nginx-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-nginx-rebuild:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.dev.yml build --no-cache
	PORT=$(PORT) docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@$(MAKE) hosts --no-print-directory

test:
	@echo "Running tests..."
	npm run test

lint:
	@echo "Running linter..."
	npm run lint

format:
	@echo "Formatting code..."
	npm run format

format-check:
	@echo "Checking formatting..."
	npm run format:check

quality: lint format-check

clean:
	docker compose $(COMPOSE_ARGS) down -v --rmi local

valkey-status:
	@echo "Valkey Nodes:"
	@docker exec valkey-node-1 valkey-cli info replication | grep -E "role|connected_slaves"
	@echo ""
	@echo "Sentinel Status:"
	@docker exec sentinel-1 valkey-cli -p 26379 sentinel masters

# ---------------------------------------------------------------------------
# Deployment (Ansistrano)
# ---------------------------------------------------------------------------

ANSIBLE_DIR = deployment/ansible

deploy-preprod:
	@echo "Deploying to preprod..."
	cd $(ANSIBLE_DIR) && ansible-playbook deploy.yml -i inventory/preprod.ini

deploy-production:
	@echo "Deploying to production..."
	cd $(ANSIBLE_DIR) && ansible-playbook deploy.yml -i inventory/production.ini

rollback-preprod:
	@echo "Rolling back preprod..."
	cd $(ANSIBLE_DIR) && ansible-playbook rollback.yml -i inventory/preprod.ini

rollback-production:
	@echo "Rolling back production..."
	cd $(ANSIBLE_DIR) && ansible-playbook rollback.yml -i inventory/production.ini

hosts:
	@echo ""
	@echo "Add these entries to /etc/hosts:"
	@echo "-----------------------------------"
	@for journal in $$(echo "$(JOURNALS)" | tr ',' ' '); do \
		echo "127.0.0.1 $$journal.episciences.test"; \
	done
	@echo "-----------------------------------"
	@echo ""
	@echo "Then access:"
	@for journal in $$(echo "$(JOURNALS)" | tr ',' ' '); do \
		echo "  http://$$journal.episciences.test:$(PORT)"; \
	done
