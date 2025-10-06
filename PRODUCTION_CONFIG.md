# EZUI Framework - Production Configuration

## Environment Variables

### Production Environment (.env.production)
```bash
# Application Configuration
NODE_ENV=production
APP_NAME=EZUI Framework
APP_VERSION=2.0.0
APP_DOMAIN=yourdomain.com
APP_URL=https://yourdomain.com

# API Configuration
API_BASE_URL=https://api.yourdomain.com
API_VERSION=v2
API_TIMEOUT=30000
API_RATE_LIMIT=1000

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=30000
DATABASE_SSL=true

# Redis Configuration (for caching and sessions)
REDIS_URL=redis://username:password@host:port
REDIS_PREFIX=ezui:
REDIS_TTL=3600

# Authentication & Security
JWT_SECRET=your-super-secure-jwt-secret-key-min-256-bits
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
SESSION_SECRET=your-super-secure-session-secret-key
BCRYPT_ROUNDS=12
CSRF_SECRET=your-csrf-secret-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-oauth-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-oauth-client-secret

# Email Configuration
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
EMAIL_FROM=EZUI Framework <noreply@yourdomain.com>

# File Storage (AWS S3, Google Cloud, etc.)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# Monitoring & Logging
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ANALYTICS_ID=your-google-analytics-id
MONITORING_ENDPOINT=https://monitoring.yourdomain.com

# Rate Limiting & Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,app.yourdomain.com

# CDN Configuration
CDN_URL=https://cdn.yourdomain.com
STATIC_URL=https://static.yourdomain.com
ASSETS_VERSION=v2.0.0

# WebSocket Configuration
WS_PORT=3001
WS_PATH=/socket.io
WS_CORS_ORIGINS=https://yourdomain.com

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_URL=s3://your-backup-bucket/backups/
```

### Development Environment (.env.development)
```bash
NODE_ENV=development
APP_NAME=EZUI Framework (Dev)
APP_VERSION=2.0.0-dev
APP_DOMAIN=localhost
APP_URL=http://localhost:3000

API_BASE_URL=http://localhost:3001
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/ezui_dev
REDIS_URL=redis://localhost:6379

JWT_SECRET=dev-jwt-secret-change-in-production
SESSION_SECRET=dev-session-secret-change-in-production
LOG_LEVEL=debug

# Development OAuth (use development apps)
GOOGLE_CLIENT_ID=your-dev-google-client-id
GITHUB_CLIENT_ID=your-dev-github-client-id

# Development email (use MailHog or similar)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=dev@localhost

# Disable security features for development
RATE_LIMIT_MAX_REQUESTS=10000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Production Deployment Checklist

### Security
- [ ] All secrets are stored in environment variables, not in code
- [ ] JWT secrets are cryptographically secure (256+ bits)
- [ ] Database connections use SSL/TLS
- [ ] CORS is configured for specific domains only
- [ ] Rate limiting is enabled and configured appropriately
- [ ] Input validation and sanitization is implemented
- [ ] CSP (Content Security Policy) headers are configured
- [ ] HTTPS is enforced with proper SSL certificates

### Performance
- [ ] Database connection pooling is configured
- [ ] Redis caching is enabled for sessions and data
- [ ] CDN is configured for static assets
- [ ] Gzip/Brotli compression is enabled
- [ ] Database indexes are optimized
- [ ] Asset minification and bundling is configured
- [ ] Image optimization is implemented

### Monitoring & Logging
- [ ] Application performance monitoring (APM) is configured
- [ ] Error tracking (Sentry or similar) is set up
- [ ] Structured logging is implemented
- [ ] Health check endpoints are configured
- [ ] Metrics collection is enabled
- [ ] Uptime monitoring is configured

### Backup & Recovery
- [ ] Automated database backups are scheduled
- [ ] Backup restoration procedures are tested
- [ ] File storage backups are configured
- [ ] Disaster recovery plan is documented
- [ ] Regular backup integrity checks are performed

### Scaling & Infrastructure
- [ ] Load balancer is configured (if applicable)
- [ ] Auto-scaling policies are set up
- [ ] Container orchestration is configured (Docker/Kubernetes)
- [ ] Database read replicas are configured (if needed)
- [ ] Cache invalidation strategies are implemented

## API Endpoints (Production Ready)

### Authentication Endpoints
```
POST /api/v2/auth/login              - User login
POST /api/v2/auth/register           - User registration  
POST /api/v2/auth/logout             - User logout
POST /api/v2/auth/refresh            - Refresh JWT token
POST /api/v2/auth/forgot-password    - Password reset request
POST /api/v2/auth/reset-password     - Password reset confirmation
POST /api/v2/auth/verify-email       - Email verification
POST /api/v2/auth/resend-verification - Resend verification email
POST /api/v2/auth/two-factor/enable  - Enable 2FA
POST /api/v2/auth/two-factor/verify  - Verify 2FA code
DELETE /api/v2/auth/two-factor       - Disable 2FA
```

### User Management Endpoints
```
GET    /api/v2/users/profile         - Get current user profile
PUT    /api/v2/users/profile         - Update user profile
POST   /api/v2/users/avatar          - Upload user avatar
DELETE /api/v2/users/avatar          - Remove user avatar
GET    /api/v2/users/sessions        - Get active sessions
DELETE /api/v2/users/sessions/:id    - Revoke specific session
DELETE /api/v2/users/sessions        - Revoke all sessions
PUT    /api/v2/users/password        - Change password
PUT    /api/v2/users/preferences     - Update user preferences
```

### Data Management Endpoints
```
GET    /api/v2/data                  - Get paginated data with filters
POST   /api/v2/data                  - Create new record
GET    /api/v2/data/:id              - Get specific record
PUT    /api/v2/data/:id              - Update record
DELETE /api/v2/data/:id              - Delete record
POST   /api/v2/data/bulk-create      - Bulk create records
POST   /api/v2/data/bulk-update      - Bulk update records
POST   /api/v2/data/bulk-delete      - Bulk delete records
POST   /api/v2/data/export           - Export data (CSV/Excel)
POST   /api/v2/data/import           - Import data from file
```

### Dashboard & Analytics Endpoints
```
GET /api/v2/dashboard/metrics        - Get dashboard metrics
GET /api/v2/dashboard/charts/:type   - Get chart data
GET /api/v2/analytics/users          - User analytics
GET /api/v2/analytics/usage          - Usage analytics  
GET /api/v2/analytics/performance    - Performance metrics
GET /api/v2/notifications            - Get user notifications
PUT /api/v2/notifications/:id/read   - Mark notification as read
DELETE /api/v2/notifications/:id     - Delete notification
```

### System Endpoints
```
GET /api/v2/health                   - Health check
GET /api/v2/status                   - System status
GET /api/v2/version                  - API version info
GET /api/v2/config                   - Public configuration
POST /api/v2/feedback                - Submit user feedback
```

## Database Schema (Production)

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Sessions Table
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
```

### Data Table (Generic)
```sql
CREATE TABLE data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_data_user_id ON data_records(user_id);
CREATE INDEX idx_data_status ON data_records(status);
CREATE INDEX idx_data_created_at ON data_records(created_at);
CREATE INDEX idx_data_metadata ON data_records USING GIN(metadata);
```

## Security Best Practices

### Input Validation
- All user inputs are validated and sanitized
- Use parameterized queries to prevent SQL injection
- Implement proper file upload validation
- Rate limiting on all endpoints
- CSRF protection on state-changing operations

### Authentication & Authorization
- Strong password requirements enforced
- Multi-factor authentication support
- JWT tokens with appropriate expiration
- Role-based access control (RBAC)
- Session management with secure cookies

### Data Protection
- Encryption at rest for sensitive data
- TLS 1.3 for data in transit
- Personal data anonymization/pseudonymization
- GDPR compliance for EU users
- Regular security audits and penetration testing

## Performance Optimization

### Caching Strategy
- Redis for session storage and frequently accessed data
- CDN for static assets and images
- Database query result caching
- API response caching with appropriate TTL
- Browser caching headers

### Database Optimization
- Proper indexing strategy
- Connection pooling
- Read replicas for scaling reads
- Query optimization and monitoring
- Regular VACUUM and ANALYZE operations

### Frontend Optimization  
- Code splitting and lazy loading
- Asset minification and compression
- Image optimization and responsive images
- Service worker for offline functionality
- Performance monitoring and alerting