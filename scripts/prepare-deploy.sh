#!/bin/bash
# scripts/prepare-deploy.sh

# Colors for feedback
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

REF=$1

if [ -z "$REF" ]; then
    echo -e "${RED}Error: Missing branch or tag name.${NC}"
    echo "Usage: ./scripts/prepare-deploy.sh <branch-or-tag>"
    echo "Example: ./scripts/prepare-deploy.sh main"
    echo "Example: ./scripts/prepare-deploy.sh v1.0.1"
    exit 1
fi

echo -e "${BLUE}=== Episciences Production Build Preparation ===${NC}"

# 1. Refresh Git references
echo -e "--- Fetching latest branches and tags ---"
git fetch --all --tags --quiet

# 2. Validate reference
if ! git rev-parse --verify "$REF" >/dev/null 2>&1; then
    echo -e "${RED}Error: Reference '$REF' not found in git branches or tags.${NC}"
    exit 1
fi

# 3. Checkout reference
echo -e "--- Checking out: ${GREEN}$REF${NC} ---"
git checkout "$REF" --quiet || { echo -e "${RED}Error: Failed to checkout $REF${NC}"; exit 1; }

# 4. Generate Build ID (Date + Ref + Git Short Hash)
COMMIT_HASH=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
# Clean REF name for filename (replace / with -)
CLEAN_REF=$(echo "$REF" | sed 's/\//-/g')
BUILD_ID="${TIMESTAMP}-${CLEAN_REF}-${COMMIT_HASH}"

echo -e "${BLUE}Starting Build [ID: ${BUILD_ID}]${NC}"

# 5. Cleanup and Install
echo -e "--- Installing dependencies ---"
npm ci

# 6. Build the application
echo -e "--- Building Next.js (Standalone mode) ---"
npm run build

# 7. Prepare distribution directory
DIST_DIR="dist-deploy"
rm -rf $DIST_DIR
mkdir -p $DIST_DIR

echo -e "--- Assembling files ---"

# Save Build ID for runtime reference
echo "$BUILD_ID" > $DIST_DIR/BUILD_ID

# Copy standalone server (includes server.js and minimal node_modules)
cp -r .next/standalone/. $DIST_DIR/

# Copy static assets
mkdir -p $DIST_DIR/.next/static
cp -r .next/static/. $DIST_DIR/.next/static/
cp -r public/. $DIST_DIR/public/

# Copy journal-specific assets
cp -r external-assets/. $DIST_DIR/external-assets/

# Copy deployment tools
mkdir -p $DIST_DIR/scripts
cp scripts/server-deploy.sh $DIST_DIR/scripts/
cp deployment/production/episciences-next.service $DIST_DIR/scripts/
cp deployment/production/apache-episciences.conf $DIST_DIR/scripts/

# 8. Create archive
ARCHIVE_NAME="episciences-release-${BUILD_ID}.tar.gz"
echo -e "--- Creating release archive: ${GREEN}${ARCHIVE_NAME}${NC} ---"
tar -czf $ARCHIVE_NAME -C $DIST_DIR .

echo -e "${GREEN}Build Complete!${NC}"
echo -e "File: ${BLUE}${ARCHIVE_NAME}${NC}"
