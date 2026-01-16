.PHONY: build up down logs clean hosts rebuild help

# Default journals for testing
JOURNALS ?= epijinfo,dmtcs
PORT ?= 8080
COMPOSE_FILE = docker-compose.apache.yml

help:
	@echo "Episciences Apache Test Environment"
	@echo ""
	@echo "Usage:"
	@echo "  make build       Build Next.js app and Docker images"
	@echo "  make up          Start containers"
	@echo "  make down        Stop containers"
	@echo "  make logs        Show container logs"
	@echo "  make rebuild     Rebuild and restart"
	@echo "  make clean       Remove images and volumes"
	@echo "  make hosts       Show /etc/hosts entries"
	@echo ""
	@echo "Variables:"
	@echo "  JOURNALS=$(JOURNALS)"
	@echo "  PORT=$(PORT)"
	@echo ""
	@echo "Examples:"
	@echo "  make build                              # Build with default journals"
	@echo "  make rebuild JOURNALS=epijinfo,jtcam    # Rebuild with specific journals"
	@echo "  make up PORT=9000                       # Start on different port"

build:
	@echo "Building Next.js application..."
	npm run build
	@echo "Building Docker images..."
	JOURNALS=$(JOURNALS) docker compose -f $(COMPOSE_FILE) build

up:
	@echo "Starting containers..."
	JOURNALS=$(JOURNALS) PORT=$(PORT) docker compose -f $(COMPOSE_FILE) up -d
	@echo ""
	@echo "Services started on port $(PORT)"
	@$(MAKE) hosts --no-print-directory

down:
	docker compose -f $(COMPOSE_FILE) down

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

rebuild: down build up

clean:
	docker compose -f $(COMPOSE_FILE) down -v --rmi local

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
