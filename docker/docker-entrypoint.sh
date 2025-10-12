#!/bin/sh
set -e

# Default to epijinfo if JOURNAL is not set
JOURNAL=${JOURNAL:-epijinfo}

echo "Starting Apache for journal: $JOURNAL"

# Generate the episciences-hosts.conf file dynamically
cat > /sites/conf/episciences-front/episciences-front-hosts.cnf <<EOF
# Configuration for Docker testing environment
# Adapted from episciences-front-hosts.cnf
# Auto-generated for journal: $JOURNAL

# Load macro module if not already loaded
<IfModule !macro_module>
    LoadModule macro_module modules/mod_macro.so
</IfModule>

# Include macro definition
Include /usr/local/apache2/conf/extra/episciences-macro.conf

# Use macro for test journal
# environment journal-code
Use EpiHost test $JOURNAL

# Cleanup macro after use
UndefMacro EpiHost
EOF

echo "Generated VirtualHost configuration for journal: $JOURNAL"

# Execute the original command (start Apache)
exec httpd-foreground