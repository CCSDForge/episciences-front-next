#!/bin/bash
# scripts/server-deploy.sh
# To be run ON THE SERVER to manage releases.

APP_ROOT="/var/www/episciences-front-next"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
SERVICE_NAME="episciences-next"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

command=$1
arg=$2

ensure_dirs() {
    if [ ! -d "$RELEASES_DIR" ]; then
        echo "Creating releases directory: $RELEASES_DIR"
        mkdir -p "$RELEASES_DIR"
        chown www-data:www-data "$RELEASES_DIR"
    fi
}

deploy() {
    ARCHIVE_PATH=$1
    if [ -z "$ARCHIVE_PATH" ]; then
        echo -e "${RED}Error: Missing archive path.${NC}"
        echo "Usage: ./server-deploy.sh deploy <path-to-tar.gz>"
        exit 1
    fi

    ensure_dirs

    # Extract Build ID from filename if possible, otherwise generate one
    FILENAME=$(basename "$ARCHIVE_PATH")
    # Expected format: episciences-release-ID.tar.gz
    BUILD_ID=$(echo "$FILENAME" | sed -E 's/episciences-release-(.*).tar.gz/\1/')
    
    if [ "$BUILD_ID" == "$FILENAME" ]; then
        BUILD_ID="manual-$(date +%Y%m%d-%H%M%S)"
    fi

    TARGET_DIR="$RELEASES_DIR/$BUILD_ID"

    echo -e "${BLUE}Deploying Build ID: $BUILD_ID${NC}"
    
    if [ -d "$TARGET_DIR" ]; then
        echo -e "${RED}Error: Version $BUILD_ID already exists.${NC}"
        exit 1
    fi

    mkdir -p "$TARGET_DIR"
    echo "Extracting..."
    tar -xzf "$ARCHIVE_PATH" -C "$TARGET_DIR"
    
    # Fix permissions
    chown -R www-data:www-data "$TARGET_DIR"

    # Link
    echo "Updating symlink..."
    ln -sfn "$TARGET_DIR" "$CURRENT_LINK"

    # Restart
    echo "Restarting service..."
    systemctl restart "$SERVICE_NAME"
    
    echo -e "${GREEN}Success! Deployed version $BUILD_ID${NC}"
}

rollback() {
    # Find the second most recent directory
    # ls -dt sorts by time (newest first)
    CURRENT_REAL_PATH=$(readlink -f "$CURRENT_LINK")
    PREVIOUS_DIR=$(ls -dt "$RELEASES_DIR"/* | grep -v "$CURRENT_REAL_PATH" | head -n 1)

    if [ -z "$PREVIOUS_DIR" ]; then
        echo -e "${RED}No previous release found to rollback to.${NC}"
        exit 1
    fi

    PREVIOUS_ID=$(basename "$PREVIOUS_DIR")
    echo -e "${BLUE}Rolling back to: $PREVIOUS_ID${NC}"
    
    ln -sfn "$PREVIOUS_DIR" "$CURRENT_LINK"
    systemctl restart "$SERVICE_NAME"

    echo -e "${GREEN}Rollback complete.${NC}"
}

list() {
    echo -e "${BLUE}Available releases:${NC}"
    ls -lht "$RELEASES_DIR" | grep "^d" | awk '{print $9}'
    
    echo -e "
${BLUE}Current active:${NC}"
    readlink -f "$CURRENT_LINK"
}

case "$command" in
    deploy)
        deploy "$arg"
        ;;
    rollback)
        rollback
        ;;
    list)
        list
        ;;
    *)
        echo "Usage: $0 {deploy <archive.tar.gz> | rollback | list}"
        exit 1
        ;;
esac
