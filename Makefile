.PHONY: build up down logs clean hosts rebuild help

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
	@echo "Usage:"
	@echo "  make build       Build everything (App + Docker)"
	@echo "  make build-app   Build only the Next.js application"
	@echo "  make build-docker Build only Docker images"
	@echo "  make up          Start containers"
	@echo "  make down        Stop containers"
	@echo "  make logs        Show container logs"
	@echo "  make rebuild     Rebuild and restart"
	@echo "  make clean       Remove images and volumes"
	@echo "  make test        Run application tests"
	@echo "  make lint        Check code style (ESLint)"
	@echo "  make format      Format code (Prettier)"
	@echo "  make format-check Check code formatting (Prettier)"
	@echo "  make quality     Run all quality checks (lint + format)"
	@echo "  make hosts       Show /etc/hosts entries"
	@echo "  valkey-status    Show Valkey cluster status"
	@echo ""
	@echo "Variables:"
	@echo "  JOURNALS=$(JOURNALS) (Used for /etc/hosts only)"
	@echo "  PORT=$(PORT)"
	@echo "  WITH_VALKEY=$(WITH_VALKEY) (1 to enable, 0 to disable)"
	@echo ""
	@echo "Examples:"
	@echo "  make build                              # Build images"
	@echo "  make up PORT=9000                       # Start on different port"

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
