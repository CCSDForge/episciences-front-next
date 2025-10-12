FROM httpd:2.4

# Install required utilities
RUN apt-get update && \
    apt-get install -y \
    apache2-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Enable required Apache modules
RUN sed -i \
    -e 's/^#\(LoadModule rewrite_module .*\)/\1/' \
    -e 's/^#\(LoadModule expires_module .*\)/\1/' \
    -e 's/^#\(LoadModule headers_module .*\)/\1/' \
    -e 's/^#\(LoadModule remoteip_module .*\)/\1/' \
    -e 's/^#\(LoadModule macro_module .*\)/\1/' \
    -e 's/^#\(LoadModule setenvif_module .*\)/\1/' \
    -e 's/^#\(LoadModule alias_module .*\)/\1/' \
    /usr/local/apache2/conf/httpd.conf

# Enable VirtualHosts configuration
RUN echo "" >> /usr/local/apache2/conf/httpd.conf && \
    echo "# Include virtual hosts configuration" >> /usr/local/apache2/conf/httpd.conf && \
    echo "Include conf/extra/httpd-vhosts.conf" >> /usr/local/apache2/conf/httpd.conf

# Create directory structure simulating production environment
RUN mkdir -p /sites/episciences-front/dist \
    /sites/conf/episciences-front \
    /data/epi/test \
    /data/user_photo/test/uuid

# Copy Apache configurations
COPY docker/apache-config/episciences-macro.conf /usr/local/apache2/conf/extra/
COPY docker/apache-config/episciences-hosts.conf /sites/conf/episciences-front/episciences-front-hosts.cnf
COPY docker/apache-config/httpd-vhosts.conf /usr/local/apache2/conf/extra/httpd-vhosts.conf

# Copy mock data
COPY docker/mock-data/ /data/

# Copy entrypoint script
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set proper permissions
RUN chown -R www-data:www-data /data /sites

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
