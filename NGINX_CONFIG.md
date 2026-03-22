# Nginx Configuration for Staging

**Correct nginx configuration for staging.absenin.com**

---

## Server Configuration

File: `/etc/nginx/sites-available/staging.absenin.com`

```nginx
# Upstream for Next.js Web App (port 3000)
upstream absenin_web {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Upstream for Express API (port 3001)
upstream absenin_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

# Main server block
server {
    listen 80;
    listen [::]:80;
    server_name staging.absenin.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name staging.absenin.com;

    # SSL configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/staging.absenin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.absenin.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/staging.absenin.com-access.log;
    error_log /var/log/nginx/staging.absenin.com-error.log;

    # Client body size limit (for file uploads)
    client_max_body_size 10M;

    # Root location - proxy to Next.js web app
    location / {
        proxy_pass http://absenin_web;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
    }

    # API endpoints - proxy to Express API
    location /api {
        proxy_pass http://absenin_api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health endpoint - proxy to Express API
    location /health {
        proxy_pass http://absenin_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WhatsApp webhooks - proxy to Express API (no auth required)
    location /api/webhook {
        proxy_pass http://absenin_api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Allow webhook providers to call without authentication
        # (handled by API middleware)
    }

    # Static files (uploads)
    location /uploads {
        alias /var/www/absenin/apps/api/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://absenin_web;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## Installation Steps

### 1. Create Configuration File

```bash
sudo nano /etc/nginx/sites-available/staging.absenin.com
```

Paste the configuration above.

### 2. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/staging.absenin.com /etc/nginx/sites-enabled/
```

### 3. Test Configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4. Reload Nginx

```bash
sudo systemctl reload nginx
```

### 5. Verify Configuration

```bash
# Check nginx status
sudo systemctl status nginx

# Test web app
curl -I http://127.0.0.1:3000

# Test API
curl -I http://127.0.0.1:3001/health

# Test public URL
curl -I https://staging.absenin.com
```

---

## Troubleshooting

### Issue 1: 502 Bad Gateway

**Symptom:** `nginx 502 Bad Gateway`

**Cause:** Upstream service not running

**Solution:**
```bash
# Check PM2 status
pm2 status

# Start web app
pm2 start "pnpm --filter @absenin/web start -p 3000" --name absenin-web

# Start API
pm2 start "pnpm --filter @absenin/api start" --name absenin-api

# Save PM2 process list
pm2 save
```

### Issue 2: Connection Refused

**Symptom:** `curl: (7) Failed to connect to 127.0.0.1 port 3000: Connection refused`

**Cause:** Service not listening on port

**Solution:**
```bash
# Check what's listening on port 3000
sudo lsof -i :3000

# Check if PM2 process is running
pm2 list | grep absenin-web

# Restart PM2 process
pm2 restart absenin-web
```

### Issue 3: 404 Not Found

**Symptom:** `nginx 404 Not Found`

**Cause:** Location block misconfiguration

**Solution:**
```bash
# Check nginx configuration
sudo nginx -T | grep -A 10 "location /"

# Verify proxy_pass is correct
# Should be: proxy_pass http://absenin_web; (for web)
# Should be: proxy_pass http://absenin_api; (for API)
```

### Issue 4: SSL Certificate Error

**Symptom:** `nginx: [emerg] cannot load certificate`

**Cause:** SSL certificate not found

**Solution:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d staging.absenin.com

# Auto-renewal (configured by certbot)
sudo certbot renew --dry-run
```

---

## Verification Checklist

- [ ] Nginx configuration test passes: `sudo nginx -t`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] PM2 processes are running: `pm2 status`
- [ ] Port 3000 is accessible: `curl -I http://127.0.0.1:3000`
- [ ] Port 3001 is accessible: `curl -I http://127.0.0.1:3001/health`
- [ ] Public URL is accessible: `curl -I https://staging.absenin.com`
- [ ] API is accessible: `curl -I https://staging.absenin.com/health`
- [ ] No errors in nginx log: `sudo tail -f /var/log/nginx/error.log`
- [ ] No errors in PM2 logs: `pm2 logs --lines 50`

---

## Next Steps After Fix

1. ✅ Verify nginx configuration is correct
2. ✅ Verify PM2 processes are running
3. ✅ Test internal connections (127.0.0.1:3000, 127.0.0.1:3001)
4. ✅ Test public URL (https://staging.absenin.com)
5. ✅ Run Fonnte functional tests

---

**Document Version:** 1.0
**Last Updated:** 2026-03-23
**Status:** Ready for implementation
