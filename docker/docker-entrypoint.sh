#!/bin/sh
set -e

# Default journals if not set
JOURNALS=${JOURNALS:-epijinfo}

echo "=== Episciences Apache Configuration ==="
echo "Journals: $JOURNALS"

# Generate vhosts configuration dynamically
cat > /usr/local/apache2/conf/extra/httpd-vhosts.conf <<EOF
# Auto-generated VirtualHost configuration
# Journals: $JOURNALS

<IfModule !macro_module>
    LoadModule macro_module modules/mod_macro.so
</IfModule>

Include /usr/local/apache2/conf/extra/episciences-macro.conf

EOF

# Add a vhost for each journal
IFS=','
for journal in $JOURNALS; do
    journal=$(echo "$journal" | tr -d ' ')  # trim whitespace
    echo "Configuring journal: $journal"
    cat >> /usr/local/apache2/conf/extra/httpd-vhosts.conf <<EOF
Use EpiHost test $journal
EOF
done

cat >> /usr/local/apache2/conf/extra/httpd-vhosts.conf <<EOF

UndefMacro EpiHost
EOF

echo "=== Configuration generated ==="
cat /usr/local/apache2/conf/extra/httpd-vhosts.conf
echo "=== Starting Apache ==="

exec "$@"
