# Deployment Guide for Scribe Tree Writer

## Overview

This guide covers deployment of Scribe Tree Writer using Docker containers. The application consists of:
- PostgreSQL database
- Redis cache
- FastAPI backend
- React frontend served by Nginx
- Nginx reverse proxy (production only)

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Domain name with DNS configured (production)
- SSL certificates (production)
- At least 2GB RAM
- 10GB storage

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/scribe-tree-writer.git
cd scribe-tree-writer
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:
- `POSTGRES_PASSWORD`: Strong database password
- `SECRET_KEY`: 32+ character secret for JWT tokens
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `CORS_ORIGINS`: Allowed frontend URLs

## Development Deployment

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Database Admin: http://localhost:8080 (if debug profile enabled)

### Development Commands

```bash
# Rebuild after code changes
docker-compose build backend frontend

# Run database migrations
docker-compose exec backend alembic upgrade head

# Access backend shell
docker-compose exec backend python

# Run tests
docker-compose exec backend pytest
docker-compose exec frontend npm test

# View container resource usage
docker stats
```

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSL Certificates

#### Option A: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/
```

#### Option B: Self-signed (Development only)

```bash
mkdir -p nginx/ssl
cd nginx/ssl

# Generate private key
openssl genrsa -out server.key 2048

# Generate certificate
openssl req -new -x509 -key server.key -out server.crt -days 365
```

### 3. Configure Nginx

Create `nginx/nginx.prod.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API routes
        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts for AI requests
            proxy_read_timeout 60s;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
        }

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 4. Deploy to Production

```bash
# Set production environment
export COMPOSE_FILE=docker-compose.prod.yml

# Pull latest code
git pull origin main

# Build images
docker-compose build

# Start services
docker-compose up -d

# Check service health
docker-compose ps
curl https://yourdomain.com/health
```

### 5. Database Backup

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="scribe_tree_writer"

# Create backup
docker-compose exec -T db pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/health

# Detailed health check
curl http://localhost:8000/health/detailed

# Container health
docker-compose ps
```

### Logs

```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f backend

# Export logs
docker-compose logs > logs_$(date +%Y%m%d).txt
```

### Resource Monitoring

```bash
# Real-time stats
docker stats

# Container inspection
docker inspect scribe-backend

# Disk usage
docker system df
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database is running
docker-compose ps db

# View database logs
docker-compose logs db

# Test connection
docker-compose exec db psql -U postgres -d scribe_tree_writer
```

#### 2. Frontend Can't Connect to Backend
```bash
# Check CORS settings
docker-compose exec backend env | grep CORS

# Test backend directly
docker-compose exec frontend curl http://backend:8000/health
```

#### 3. High Memory Usage
```bash
# Limit container resources in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

#### 4. Slow AI Responses
- Check API rate limits
- Monitor response times in logs
- Consider implementing response caching

### Rollback Procedure

```bash
# Stop current deployment
docker-compose down

# Checkout previous version
git checkout <previous-commit>

# Rebuild and deploy
docker-compose build
docker-compose up -d
```

## Scaling

### Horizontal Scaling

For high traffic, scale the backend:

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);
```

### Redis Configuration

```redis
# Persistence
save 900 1
save 300 10
save 60 10000

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL certificates configured
- [ ] Firewall rules configured
- [ ] Regular security updates
- [ ] Database backups encrypted
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets not in version control
- [ ] Container images regularly updated
- [ ] Monitoring alerts configured

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review logs for errors
   - Check disk space
   - Verify backups

2. **Monthly**
   - Update dependencies
   - Review security alerts
   - Performance analysis

3. **Quarterly**
   - Update base images
   - Security audit
   - Capacity planning

### Update Procedure

```bash
# 1. Backup database
./backup.sh

# 2. Pull latest code
git pull origin main

# 3. Build new images
docker-compose build

# 4. Deploy with zero downtime
docker-compose up -d --no-deps backend
docker-compose up -d --no-deps frontend

# 5. Verify deployment
curl https://yourdomain.com/health
```

## Support

For issues or questions:
1. Check application logs
2. Review this documentation
3. Search existing issues
4. Contact support team

---

Remember: Always test deployments in a staging environment first!
