#!/bin/bash
# SSL Certificate Setup for Staging Absenin.com
# Usage: ./scripts/setup-ssl.sh staging.absenin.com admin@absenin.com

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DOMAIN="${1:-staging.absenin.com}"
EMAIL="${2:-admin@absenin.com}"
WEBROOT="/var/www/absenin.com/staging/letsencrypt"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Certbot is installed
log "Checking Certbot installation..."
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot is not installed"
    log "Installing Certbot..."

    # Detect OS and install
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    else
        print_error "Unsupported OS. Please install Certbot manually."
        exit 1
    fi

    print_success "Certbot installed"
fi

# Create webroot directory
log "Creating webroot directory..."
mkdir -p "$WEBROOT"
print_success "Webroot created: $WEBROOT"

# Stop Nginx if running to release port 80
log "Stopping Nginx..."
if systemctl is-active --quiet nginx; then
    systemctl stop nginx
    print_success "Nginx stopped"
fi

# Obtain SSL certificate
log "Obtaining SSL certificate for $DOMAIN..."

certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    --webroot-path "$WEBROOT" \
    --preferred-challenges http \
    --keep-until-expiring

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained for $DOMAIN"
else
    print_error "Failed to obtain SSL certificate"
    exit 1
fi

# Verify certificate
log "Verifying certificate..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && \
   [ -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]; then
    print_success "Certificate files verified"

    # Show certificate expiry
    EXPIRY=$(openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -enddate | cut -d= -f2)
    print_success "Certificate expires on: $EXPIRY"
else
    print_error "Certificate files not found"
    exit 1
fi

# Set up auto-renewal
log "Setting up auto-renewal..."

# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

# Test renewal
certbot renew --dry-run

if [ $? -eq 0 ]; then
    print_success "Auto-renewal configured successfully"
else
    print_warning "Auto-renewal test failed"
fi

# Restart Nginx
log "Starting Nginx..."
systemctl start nginx
print_success "Nginx started"

# Verify SSL is working
log "Verifying SSL configuration..."
if nginx -t 2>&1 | grep -q "successful"; then
    print_success "Nginx configuration with SSL is valid"
else
    print_error "Nginx configuration has errors"
    nginx -t
    exit 1
fi

log "=========================================="
log "SSL Setup Complete"
log "=========================================="
log "Domain: $DOMAIN"
log "Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
log "Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
log "Auto-renewal: Configured"
log "=========================================="
