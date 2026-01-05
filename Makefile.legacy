# Directory configurations
LOGO_SRC_DIR := external-assets/logos
LOGO_TEMP_DIR := tmp/logos
JOURNAL_LIST_FILE := external-assets/journals.txt
ENV_FILE_PREFIX := external-assets/.env.local.
BUILD_DIR := dist
NEXT_BUILD_DIR := .next
PUBLIC_SRC_DIR := public
LOCALES_SRC_DIR := public/locales
ICONS_SRC_DIR := public/icons
FONTS_SRC_DIR := src/styles/fonts

# Ces variables seront définies dynamiquement pour chaque journal
PUBLIC_DEST_DIR = $(BUILD_DIR)/$(1)
LOCALES_DEST_DIR = $(BUILD_DIR)/$(1)/locales
ICONS_DEST_DIR = $(BUILD_DIR)/$(1)/icons
FONTS_DEST_DIR = $(BUILD_DIR)/$(1)/fonts

# Default logo configurations
DEFAULT_BIG_LOGO := logo-default-big.svg
DEFAULT_SMALL_LOGO := logo-default-small.svg

# Read journals from the journal list file
JOURNALS := $(shell cat $(JOURNAL_LIST_FILE) 2>/dev/null)

# Color codes for help
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RESET := \033[0m

.PHONY: help all clean list serve $(JOURNALS) docker-build docker-test docker-stop docker-logs docker-shell

# Default target - show help
.DEFAULT_GOAL := help

## help: Display this help message
help:
	@echo ""
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════════$(RESET)"
	@echo "$(BLUE)  Episciences Front - Multi-Journal Static Site Generator$(RESET)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════════════════$(RESET)"
	@echo ""
	@echo "$(GREEN)BUILD COMMANDS:$(RESET)"
	@echo "  $(YELLOW)make all$(RESET)                       Build all journals from journals.txt"
	@echo "  $(YELLOW)make <journal>$(RESET)                 Build specific journal (e.g., make epijinfo)"
	@echo "  $(YELLOW)make clean$(RESET)                     Remove all build artifacts (dist/, .next/)"
	@echo "  $(YELLOW)make list$(RESET)                      List all available journals"
	@echo ""
	@echo "$(GREEN)DEVELOPMENT:$(RESET)"
	@echo "  $(YELLOW)make serve JOURNAL=<name>$(RESET)      Serve built site with Python HTTP server"
	@echo "                                   $(YELLOW)PORT=<port>$(RESET) (optional, default: 3000)"
	@echo ""
	@echo "$(GREEN)DOCKER TESTING (Apache):$(RESET)"
	@echo "  $(YELLOW)make docker-build JOURNAL=<name>$(RESET)  Build Docker image for journal"
	@echo "  $(YELLOW)make docker-test JOURNAL=<name>$(RESET)   Run Apache test server in Docker"
	@echo "                                      $(YELLOW)PORT=<port>$(RESET) (optional, default: 8080)"
	@echo "  $(YELLOW)make docker-stop$(RESET)                  Stop Docker test server"
	@echo "  $(YELLOW)make docker-logs$(RESET)                  View Apache logs (follow mode)"
	@echo "  $(YELLOW)make docker-shell$(RESET)                 Open shell in Apache container"
	@echo ""
	@echo "$(GREEN)EXAMPLES:$(RESET)"
	@echo "  make epijinfo                    # Build epijinfo journal"
	@echo "  make jsedi                       # Build jsedi journal"
	@echo "  make serve JOURNAL=epijinfo      # Serve epijinfo on port 3000"
	@echo "  make serve JOURNAL=jsedi PORT=8080"
	@echo "  make docker-test JOURNAL=epijinfo PORT=8080"
	@echo ""
	@echo "$(GREEN)AVAILABLE JOURNALS:$(RESET)"
	@if [ -f $(JOURNAL_LIST_FILE) ]; then \
		cat $(JOURNAL_LIST_FILE) | sed 's/^/  - /'; \
	else \
		echo "  No journals found. Check $(JOURNAL_LIST_FILE)"; \
	fi
	@echo ""
	@echo "For more information, see README.md or CLAUDE.md"
	@echo ""

## all: Build all journals
all: $(JOURNALS)

## list: List available journals
list:
	@if [ -f $(JOURNAL_LIST_FILE) ]; then \
		echo "Available journals:"; \
		cat $(JOURNAL_LIST_FILE); \
	else \
		echo "No journals found. Check $(JOURNAL_LIST_FILE)"; \
	fi

## clean: Remove all build artifacts
clean:
	@rm -rf $(BUILD_DIR)
	@rm -rf $(NEXT_BUILD_DIR)
	@rm -rf .next/cache-*
	@rm -f .env.local

# Per-journal build
$(JOURNALS):
	@if ! grep -q "^$@$$" $(JOURNAL_LIST_FILE) 2>/dev/null; then \
		echo "Error: Journal '$@' does not exist. Use 'make list' to see available journals."; \
		exit 1; \
	fi
	@echo "Building website for journal: $@"
	# Ensure public logos directory exists
	@mkdir -p $(LOGO_TEMP_DIR) public/logos
	# Copy big logo (use default if not found)
	@cp $(LOGO_SRC_DIR)/logo-$@-big.svg public/logos/logo-big.svg 2>/dev/null || \
		cp $(LOGO_SRC_DIR)/$(DEFAULT_BIG_LOGO) public/logos/logo-big.svg
	# Copy small logo (use default if not found)
	@cp $(LOGO_SRC_DIR)/logo-$@-small.svg public/logos/logo-small.svg 2>/dev/null || \
		cp $(LOGO_SRC_DIR)/$(DEFAULT_SMALL_LOGO) public/logos/logo-small.svg
	# Copy the environment file for the journal
	@if [ ! -f $(ENV_FILE_PREFIX)$@ ]; then \
		echo "Error: Environment file '$(ENV_FILE_PREFIX)$@' not found for journal '$@'."; \
		exit 1; \
	fi
	@cp $(ENV_FILE_PREFIX)$@ .env.local
	# Build the website with Next.js (with output: export in next.config.js)
	@echo "Building Next.js application..."
	@NEXT_PUBLIC_JOURNAL_CODE=$@ NEXT_PUBLIC_JOURNAL_RVCODE=$@ npx next build || { echo "Build failed for journal $@"; exit 1; }
	# Copy all public files to the build directory
	@echo "Copying all public files..."
	@cp -r $(PUBLIC_SRC_DIR)/* $(call PUBLIC_DEST_DIR,$@)/ || { echo "Failed to copy public files"; exit 1; }
	# Copy locales files to the build directory
	@echo "Copying locales files..."
	@mkdir -p $(call LOCALES_DEST_DIR,$@)
	@cp -r $(LOCALES_SRC_DIR)/* $(call LOCALES_DEST_DIR,$@)/ || { echo "Failed to copy locales files"; exit 1; }
	# Copy icons to the build directory
	@echo "Copying icons..."
	@mkdir -p $(call ICONS_DEST_DIR,$@)
	@cp -r $(ICONS_SRC_DIR)/* $(call ICONS_DEST_DIR,$@)/ || { echo "Failed to copy icons"; exit 1; }
	# Copy fonts to the build directory
	@echo "Copying fonts..."
	@mkdir -p $(call FONTS_DEST_DIR,$@)
	@cp -r $(FONTS_SRC_DIR)/* $(call FONTS_DEST_DIR,$@)/ || { echo "Failed to copy fonts"; exit 1; }
	# Generate .htaccess for language routing
	@echo "Generating .htaccess for intelligent language routing..."
	@DEFAULT_LANG=$$(grep NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs); \
	ACCEPTED_LANGS=$$(grep NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs); \
	HTACCESS_FILE="$(call PUBLIC_DEST_DIR,$@)/.htaccess"; \
	LANGS_ARRAY=$$(echo "$$ACCEPTED_LANGS" | tr ',' ' '); \
	NUM_LANGS=$$(echo "$$LANGS_ARRAY" | wc -w); \
	echo "# Auto-generated .htaccess for $@ - language routing" > $$HTACCESS_FILE; \
	echo "# Default language: $$DEFAULT_LANG" >> $$HTACCESS_FILE; \
	echo "# Accepted languages: $$ACCEPTED_LANGS" >> $$HTACCESS_FILE; \
	echo "# Number of languages: $$NUM_LANGS" >> $$HTACCESS_FILE; \
	echo "" >> $$HTACCESS_FILE; \
	if [ "$$NUM_LANGS" -eq 1 ]; then \
		echo "# Monolingual site - transparent rewrite (no visible language prefix)" >> $$HTACCESS_FILE; \
		echo "RewriteEngine On" >> $$HTACCESS_FILE; \
		echo "RewriteBase /" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Article tracking for statistics (before other rules)" >> $$HTACCESS_FILE; \
		echo "# Track article previews: /articles/123/preview -> 1x1 transparent pixel" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^articles/([0-9]+)/preview$$ /tracking-pixel.gif [L]" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Skip if already has language prefix (direct access to /$$DEFAULT_LANG/...)" >> $$HTACCESS_FILE; \
		echo "RewriteCond %{REQUEST_URI} ^/$$DEFAULT_LANG/ [NC]" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^ - [L]" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Skip actual static files" >> $$HTACCESS_FILE; \
		echo "RewriteCond %{REQUEST_FILENAME} -f" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^ - [L]" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Transparently rewrite to language prefix (internal, URL stays clean)" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^(.*)$$ /$$DEFAULT_LANG/\$$1 [L]" >> $$HTACCESS_FILE; \
	else \
		echo "# Multilingual site - redirect to default language" >> $$HTACCESS_FILE; \
		echo "RewriteEngine On" >> $$HTACCESS_FILE; \
		echo "RewriteBase /" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Article tracking for statistics (before other rules)" >> $$HTACCESS_FILE; \
		echo "# Track article previews: /articles/123/preview -> 1x1 transparent pixel" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^articles/([0-9]+)/preview$$ /tracking-pixel.gif [L]" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Skip if already has language prefix" >> $$HTACCESS_FILE; \
		LANG_PATTERN=$$(echo "$$LANGS_ARRAY" | tr ' ' '|'); \
		echo "RewriteCond %{REQUEST_URI} ^/($$LANG_PATTERN)/ [NC]" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^ - [L]" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Skip actual static files (but not the root directory)" >> $$HTACCESS_FILE; \
		echo "RewriteCond %{REQUEST_FILENAME} -f" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^ - [L]" >> $$HTACCESS_FILE; \
		echo "" >> $$HTACCESS_FILE; \
		echo "# Redirect to default language ($$DEFAULT_LANG)" >> $$HTACCESS_FILE; \
		echo "RewriteRule ^(.*)$$ /$$DEFAULT_LANG/\$$1 [R=302,L]" >> $$HTACCESS_FILE; \
	fi; \
	echo ".htaccess generated successfully for $$NUM_LANGS language(s)"
	@echo "Build completed for journal: $@ in $(BUILD_DIR)/$@"

## serve: Serve static build with Python HTTP server (requires JOURNAL parameter)
serve:
	@if [ -z "$(JOURNAL)" ]; then \
		echo "Error: JOURNAL parameter is required."; \
		echo "Usage: make serve JOURNAL=<journal_name>"; \
		echo "Available journals:"; \
		cat $(JOURNAL_LIST_FILE) | grep -v '^$$'; \
		exit 1; \
	fi
	@if ! grep -q "^$(JOURNAL)$$" $(JOURNAL_LIST_FILE) 2>/dev/null; then \
		echo "Error: Journal '$(JOURNAL)' does not exist in $(JOURNAL_LIST_FILE)."; \
		echo "Available journals:"; \
		cat $(JOURNAL_LIST_FILE) | grep -v '^$$'; \
		exit 1; \
	fi
	@if [ ! -d "$(BUILD_DIR)/$(JOURNAL)" ]; then \
		echo "Error: Build directory '$(BUILD_DIR)/$(JOURNAL)' does not exist."; \
		echo "Please build the journal first with: make $(JOURNAL)"; \
		exit 1; \
	fi
	@echo "Starting Python HTTP server for journal '$(JOURNAL)' on port $(or $(PORT),3000)..."
	@echo "Open your browser at: http://localhost:$(or $(PORT),3000)"
	@echo "Press Ctrl+C to stop the server"
	@cd $(BUILD_DIR)/$(JOURNAL) && python3 -m http.server $(or $(PORT),3000)

## docker-build: Build Docker image for journal (requires JOURNAL parameter)
docker-build:
	@if [ -z "$(JOURNAL)" ]; then \
		echo "Error: JOURNAL parameter is required."; \
		echo "Usage: make docker-build JOURNAL=<journal_name>"; \
		exit 1; \
	fi
	@if [ ! -d "$(BUILD_DIR)/$(JOURNAL)" ]; then \
		echo "Error: Build directory '$(BUILD_DIR)/$(JOURNAL)' does not exist."; \
		echo "Please build the journal first with: make $(JOURNAL)"; \
		exit 1; \
	fi
	@echo "Building Docker image for $(JOURNAL)..."
	JOURNAL=$(JOURNAL) docker compose -f docker-compose.test.yml build

## docker-test: Run Apache test server in Docker (requires JOURNAL parameter)
docker-test:
	@if [ -z "$(JOURNAL)" ]; then \
		echo "Error: JOURNAL parameter is required."; \
		echo "Usage: make docker-test JOURNAL=<journal_name> [PORT=8080]"; \
		echo ""; \
		echo "Available journals:"; \
		cat $(JOURNAL_LIST_FILE) | grep -v '^$$'; \
		exit 1; \
	fi
	@if [ ! -d "$(BUILD_DIR)/$(JOURNAL)" ]; then \
		echo "Error: Build directory '$(BUILD_DIR)/$(JOURNAL)' does not exist."; \
		echo "Please build the journal first with: make $(JOURNAL)"; \
		exit 1; \
	fi
	@echo "========================================"
	@echo "Starting Apache test server for: $(JOURNAL)"
	@echo "Port: $(or $(PORT),8080)"
	@echo "========================================"
	@echo ""
	@echo "Test URLs:"
	@echo "  Homepage:        http://localhost:$(or $(PORT),8080)/"
	@echo ""
	@echo "Language detection tests:"
	@echo "  French:          curl -L -H 'Accept-Language: fr-FR' http://localhost:$(or $(PORT),8080)/"
	@echo "  English:         curl -L -H 'Accept-Language: en-US' http://localhost:$(or $(PORT),8080)/"
	@echo "  No language:     curl -L http://localhost:$(or $(PORT),8080)/"
	@echo ""
	@echo "Old URL tests:"
	@echo "  Browse latest:   curl -I http://localhost:$(or $(PORT),8080)/browse/latest"
	@echo "  Article by ID:   curl -I http://localhost:$(or $(PORT),8080)/123"
	@echo ""
	@echo "Press Ctrl+C to stop the server"
	@echo "========================================"
	@echo ""
	JOURNAL=$(JOURNAL) PORT=$(or $(PORT),8080) docker compose -f docker-compose.test.yml up

## docker-stop: Stop Docker test server
docker-stop:
	@echo "Stopping Apache test server..."
	docker compose -f docker-compose.test.yml down

## docker-logs: View Apache logs in follow mode
docker-logs:
	@echo "Following Apache logs (Ctrl+C to exit)..."
	docker compose -f docker-compose.test.yml logs -f apache-test

## docker-shell: Open shell in Apache container for debugging
docker-shell:
	@echo "Opening shell in Apache container..."
	@echo "Useful commands inside container:"
	@echo "  cat /usr/local/apache2/conf/extra/episciences-macro.conf"
	@echo "  cat /sites/episciences-front/dist/*/htaccess"
	@echo "  ls -la /sites/episciences-front/dist/"
	@echo ""
	docker compose -f docker-compose.test.yml exec apache-test /bin/sh