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
DEFAULT_BIG_LOGO := default-big.svg
DEFAULT_SMALL_LOGO := default-small.svg

# Read journals from the journal list file
JOURNALS := $(shell cat $(JOURNAL_LIST_FILE) 2>/dev/null)

.PHONY: all clean list serve $(JOURNALS)

# Default target
all: $(JOURNALS)

# List available journals
list:
	@if [ -f $(JOURNAL_LIST_FILE) ]; then \
		echo "Available journals:"; \
		cat $(JOURNAL_LIST_FILE); \
	else \
		echo "No journals found. Check $(JOURNAL_LIST_FILE)"; \
	fi

# Clean build artifacts
clean:
	@rm -rf $(BUILD_DIR)
	@rm -rf $(NEXT_BUILD_DIR)
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
	@echo "Build completed for journal: $@ in $(BUILD_DIR)/$@"

# Serve static build with Python HTTP server
# Usage: make serve JOURNAL=epijinfo
# Usage: make serve JOURNAL=epijinfo PORT=8080 (default port is 3000)
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